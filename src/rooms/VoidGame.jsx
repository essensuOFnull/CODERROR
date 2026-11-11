import React, { useEffect, useRef, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { useEngine } from '../context/EngineContext.jsx';
import { RoomRuntime } from './RoomRuntime.js';
import voidRoom, { surfaceAt } from './void/index.js';

const PLAYER_HALF_WIDTH = 0.36;
const PLAYER_HALF_HEIGHT = 0.42;
const PLAYER_GLYPHS = ['目', '口', '日', '人'];
const MOVE_SPEED = 5.2;
const JUMP_SPEED = 10.5;
const GRAVITY = 26;
const HORIZONTAL_ACCELERATION = 30;
const AIR_ACCELERATION = 12;

function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} ГиБ`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} МиБ`;
  return `${(bytes / 1024).toFixed(0)} КиБ`;
}

function mediaRandom(seed, sector, salt) {
  let value = (
    seed
    ^ Math.imul(sector | 0, 0x9e3779b1)
    ^ Math.imul(salt, 0x85ebca77)
  ) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000;
}

async function createMediaAsset(media, index) {
  const binary = atob(media.dataBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: media.mimeType }));

  try {
    if (media.mimeType.startsWith('image/')) {
      const image = new Image();
      image.decoding = 'async';
      image.src = url;
      await image.decode();
      return {
        id: `recovered-media:${index}`,
        element: image,
        url,
        width: image.naturalWidth,
        height: image.naturalHeight,
        mimeType: media.mimeType,
        offset: media.offset,
      };
    }

    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;
    await new Promise((resolve, reject) => {
      video.addEventListener('loadedmetadata', resolve, { once: true });
      video.addEventListener('error', () => reject(new Error('Фрагмент не удалось декодировать как видео.')), {
        once: true,
      });
      video.load();
    });
    await video.play();
    return {
      id: `recovered-media:${index}`,
      element: video,
      url,
      width: video.videoWidth,
      height: video.videoHeight,
      mimeType: media.mimeType,
      offset: media.offset,
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export default function VoidGame({ cellWidth, cellHeight, onExit }) {
  const engine = useEngine();
  const [notice, setNotice] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [installVolume, setInstallVolume] = useState(null);
  const [scanPhase, setScanPhase] = useState('checking');
  const [scanStatus, setScanStatus] = useState('');
  const [sourceLabel, setSourceLabel] = useState('СИНТЕТИЧЕСКИЕ ДАННЫЕ');
  const roomRef = useRef(null);
  const terrainDirtyRef = useRef(false);
  const scanReadyRef = useRef(false);
  const mediaAssetsRef = useRef([]);
  const keys = useRef(new Set());
  const jumpRequested = useRef(false);
  const noticeTimer = useRef(null);

  const locateInstallVolume = async () => {
    setScanPhase('checking');
    setScanStatus('');
    try {
      const volume = await invoke('get_install_ntfs_volume');
      setInstallVolume(volume);
      setScanPhase('consent');
    } catch (error) {
      setScanStatus(`Не удалось определить NTFS-диск приложения: ${String(error)}`);
      setScanPhase('error');
    }
  };

  useEffect(() => {
    if (!isTauri()) {
      setScanStatus('Запуск игры доступен только в настольном приложении CODERROR.');
      setScanPhase('error');
      return;
    }
    locateInstallVolume();
  }, []);

  useEffect(() => () => {
    for (const asset of mediaAssetsRef.current) {
      if (asset.element instanceof HTMLVideoElement) {
        asset.element.pause();
        asset.element.removeAttribute('src');
        asset.element.load();
      }
      URL.revokeObjectURL(asset.url);
    }
    mediaAssetsRef.current = [];
  }, []);

  useEffect(() => {
    const seed = Math.floor(Math.random() * 0x100000000);
    const glyphs = Array.from(engine.pixiGrid?.textures?.keys() ?? [])
      .filter((char) => Array.from(char).length === 1 && !/[\p{C}\p{M}\p{Z}]/u.test(char));
    const playerGlyphs = PLAYER_GLYPHS.filter((char) => engine.pixiGrid?.textures?.has(char));
    if (playerGlyphs.length !== PLAYER_GLYPHS.length) {
      throw new Error('The font atlas is missing square CJK glyphs for the player');
    }
    const room = new RoomRuntime(voidRoom, seed, glyphs, {
      recoveredFragments: [],
      scanCompleted: false,
    });
    roomRef.current = room;
    const player = {
      x: 0.5,
      y: surfaceAt(0, seed) - PLAYER_HALF_HEIGHT - 0.001,
      vx: 0,
      vy: 0,
      grounded: false,
    };
    const emit = (event) => {
      if (event.type !== 'notice' && event.type !== 'fragment-found') return;
      const text = event.type === 'fragment-found'
        ? `ФРАГМЕНТ: ${event.title}`
        : event.text;
      setNotice(text);
      clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setNotice(''), 3500);
    };

    const isSolidAt = (x, y) => room.isSolid(Math.floor(x), Math.floor(y));
    const overlapsSolid = (x, y) => (
      isSolidAt(x - PLAYER_HALF_WIDTH, y - PLAYER_HALF_HEIGHT)
      || isSolidAt(x + PLAYER_HALF_WIDTH, y - PLAYER_HALF_HEIGHT)
      || isSolidAt(x - PLAYER_HALF_WIDTH, y + PLAYER_HALF_HEIGHT - 0.001)
      || isSolidAt(x + PLAYER_HALF_WIDTH, y + PLAYER_HALF_HEIGHT - 0.001)
    );
    const moveAxis = (amount, axis) => {
      const steps = Math.max(1, Math.ceil(Math.abs(amount) / 0.12));
      const step = amount / steps;
      for (let i = 0; i < steps; i++) {
        const next = player[axis] + step;
        const hit = axis === 'x'
          ? overlapsSolid(next, player.y)
          : isSolidAt(player.x - PLAYER_HALF_WIDTH, next + (step > 0 ? PLAYER_HALF_HEIGHT : -PLAYER_HALF_HEIGHT))
            || isSolidAt(player.x + PLAYER_HALF_WIDTH, next + (step > 0 ? PLAYER_HALF_HEIGHT : -PLAYER_HALF_HEIGHT));

        if (hit) {
          if (axis === 'y') {
            if (step > 0) player.grounded = true;
            player.vy = 0;
          } else {
            player.vx = 0;
          }
          return;
        }
        player[axis] = next;
        if (axis === 'y') player.grounded = false;
      }
    };

    const visibleCols = Math.max(1, engine.width - 2);
    const visibleRows = Math.max(1, engine.height - 2);
    let cameraX = Math.floor(player.x - visibleCols / 2);
    let cameraY = Math.floor(player.y - visibleRows / 2);
    let lastCameraX = Number.NaN;
    let lastCameraY = Number.NaN;
    let activePlayerOverlays = new Set();
    let activeMediaOverlays = new Set();
    engine.pixiGrid?.setVoidEffects(voidRoom.effects?.ground === 'corruption');
    const drawTerrain = (cameraX, cameraY) => {
      engine.batch(() => {
        for (let screenY = 0; screenY < engine.height; screenY++) {
          for (let screenX = 0; screenX < engine.width; screenX++) {
            const tile = room.getCell(cameraX + screenX, cameraY + screenY);
            engine.setCell(screenX, screenY, {
              char: tile.char ?? ' ',
              fg: tile.fg ?? 0xc3d0d5,
              alpha: 1,
              bg: tile.bg ?? voidRoom.backgroundColor,
              bgAlpha: tile.bgAlpha ?? 1,
            });
          }
        }
      });
      lastCameraX = cameraX;
      lastCameraY = cameraY;
    };

    const unsubscribeTick = engine.onTick((deltaMs) => {
      if (!scanReadyRef.current) return;
      const dt = Math.min(deltaMs / 1000, 0.04);

      const left = keys.current.has('ArrowLeft') || keys.current.has('KeyA');
      const right = keys.current.has('ArrowRight') || keys.current.has('KeyD');
      const direction = Number(right) - Number(left);
      const acceleration = player.grounded ? HORIZONTAL_ACCELERATION : AIR_ACCELERATION;
      const targetVelocity = direction * MOVE_SPEED;
      player.vx += (targetVelocity - player.vx) * Math.min(1, acceleration * dt);

      if (jumpRequested.current && player.grounded) {
        player.vy = -JUMP_SPEED;
        player.grounded = false;
      }
      jumpRequested.current = false;
      player.vy = Math.min(player.vy + GRAVITY * dt, 18);

      moveAxis(player.vx * dt, 'x');
      moveAxis(player.vy * dt, 'y');
      room.update({ player, delta: dt, emit });
      setPosition((previous) => (
        Math.abs(previous.x - player.x) > 0.4 || Math.abs(previous.y - player.y) > 0.4
          ? { x: player.x, y: player.y }
          : previous
      ));
    });

    const unsubscribeRender = engine.onRender((_deltaMs, grid) => {
      const renderedX = Math.round(player.x * 2) / 2;
      const renderedY = Math.round(player.y * 2) / 2;
      const cameraFloatX = renderedX - visibleCols / 2;
      const cameraFloatY = renderedY - visibleRows / 2;
      cameraX = Math.floor(cameraFloatX);
      cameraY = Math.floor(cameraFloatY);
      const fractionX = cameraFloatX - cameraX;
      const fractionY = cameraFloatY - cameraY;

      grid.setCameraOffset(-fractionX * cellWidth, -fractionY * cellHeight);
      if (terrainDirtyRef.current || cameraX !== lastCameraX || cameraY !== lastCameraY) {
        drawTerrain(cameraX, cameraY);
        terrainDirtyRef.current = false;
      }

      const left = renderedX - PLAYER_HALF_WIDTH;
      const right = renderedX + PLAYER_HALF_WIDTH;
      const top = renderedY - PLAYER_HALF_HEIGHT;
      const bottom = renderedY + PLAYER_HALF_HEIGHT;
      const cells = [];

      for (let worldY = Math.floor(top * 2); worldY < Math.ceil(bottom * 2); worldY++) {
        for (let worldX = Math.floor(left * 2); worldX < Math.ceil(right * 2); worldX++) {
          const subLeft = worldX / 2;
          const subTop = worldY / 2;
          if (left >= subLeft + 0.5 || right <= subLeft || top >= subTop + 0.5 || bottom <= subTop) continue;

          const id = `player:${worldX}:${worldY}`;
          cells.push(id);
          grid.setOverlay(id, {
            char: playerGlyphs[((worldY & 1) * 2 + (worldX & 1))],
            x: (subLeft - cameraX) * cellWidth,
            y: (subTop - cameraY) * cellHeight,
            width: cellWidth / 2,
            height: cellHeight / 2,
            fg: 0xffd36a,
          });
        }
      }

      const nextPlayerOverlays = new Set(cells);
      for (const id of activePlayerOverlays) {
        if (!nextPlayerOverlays.has(id)) grid.removeOverlay(id);
      }
      activePlayerOverlays = nextPlayerOverlays;

      const nextMediaOverlays = new Set();
      const mediaAssets = mediaAssetsRef.current;
      const sectorSize = 48;
      const firstSector = Math.floor((cameraX - 8) / sectorSize);
      const lastSector = Math.floor((cameraX + engine.width + 8) / sectorSize);
      for (let sector = firstSector; sector <= lastSector; sector++) {
        if (mediaAssets.length === 0) break;
        const asset = mediaAssets[
          Math.floor(mediaRandom(seed, sector, 0) * mediaAssets.length)
        ];
        const ratio = asset.width / asset.height;
        const maxWidth = cellWidth * 6;
        const maxHeight = cellHeight * 4;
        let width = maxWidth;
        let height = width / ratio;
        if (height > maxHeight) {
          height = maxHeight;
          width = height * ratio;
        }
        const worldX = sector * sectorSize + 4
          + mediaRandom(seed, sector, 1) * (sectorSize - 14);
        const worldY = surfaceAt(worldX, seed) - height / cellHeight - 1
          - mediaRandom(seed, sector, 2) * 2.5;
        const x = (worldX - cameraX) * cellWidth;
        const y = (worldY - cameraY) * cellHeight;
        if (x + width < 0 || y + height < 0 || x > engine.width * cellWidth || y > engine.height * cellHeight) {
          continue;
        }
        const overlayId = `${asset.id}:sector:${sector}`;
        grid.setMediaOverlay(overlayId, {
          source: asset.element,
          x,
          y,
          width,
          height,
          alpha: 0.88,
        });
        nextMediaOverlays.add(overlayId);
      }
      for (const id of activeMediaOverlays) {
        if (!nextMediaOverlays.has(id)) grid.removeOverlay(id);
      }
      activeMediaOverlays = nextMediaOverlays;
    });

    voidRoom.hooks?.onEnter?.({ room, player, emit, seed });
    drawTerrain(
      Math.floor(player.x - Math.max(1, engine.width - 2) / 2),
      Math.floor(player.y - Math.max(1, engine.height - 2) / 2),
    );

    return () => {
      unsubscribeTick();
      unsubscribeRender();
      clearTimeout(noticeTimer.current);
      keys.current.clear();
      for (const id of activePlayerOverlays) engine.pixiGrid?.removeOverlay(id);
      for (const id of activeMediaOverlays) engine.pixiGrid?.removeOverlay(id);
      engine.pixiGrid?.setCameraOffset(0, 0);
      engine.pixiGrid?.setVoidEffects(false);
      room.dispose();
      roomRef.current = null;
      engine.batch(() => {
        for (let y = 0; y < engine.height; y++) {
          for (let x = 0; x < engine.width; x++) {
            engine.setCell(x, y, { char: ' ', fg: null, alpha: 1, bg: null, bgAlpha: 0 });
          }
        }
      });
    };
  }, [cellHeight, cellWidth, engine]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === 'Escape') {
        event.preventDefault();
        onExit();
        return;
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      keys.current.add(event.code);
      if (['Space', 'ArrowUp', 'KeyW'].includes(event.code) && !event.repeat) {
        jumpRequested.current = true;
      }
    };
    const onKeyUp = (event) => keys.current.delete(event.code);
    const clearKeys = () => keys.current.clear();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
    };
  }, [onExit]);

  const scanInstallVolume = async () => {
    if (!installVolume || scanPhase === 'scanning') return;
    setScanPhase('scanning');
    setScanStatus(`Чтение свободных кластеров диска ${installVolume.id}…`);
    try {
      const report = await invoke('scan_ntfs_free_space', { volumeId: installVolume.id });
      const room = roomRef.current;
      if (!room) throw new Error('Игровая комната ещё не готова принять данные диска.');
      const availableGlyphs = new Set(room.glyphs);
      if (!Array.isArray(report.media)) {
        throw new Error('Сканер вернул отчёт без раздела медиафрагментов.');
      }
      const recoveredFragments = report.fragments.map(({ text, offset }) => ({
        text,
        offset,
        terrainChars: Array.from(text).filter((character) => (
          !/\s/u.test(character) && availableGlyphs.has(character)
        )),
      }));
      const mediaAssets = [];
      let undecodableMedia = 0;
      for (const [index, media] of report.media.entries()) {
        try {
          mediaAssets.push(await createMediaAsset(media, index));
        } catch {
          undecodableMedia++;
        }
      }
      const seed = room.seed;
      mediaAssetsRef.current = mediaAssets;
      room.setData({ recoveredFragments, scanCompleted: true });
      terrainDirtyRef.current = true;
      scanReadyRef.current = true;
      setSourceLabel(
        `${report.volumeId} // ${recoveredFragments.length} ФРАГ. / ${mediaAssets.length} МЕДИА`,
      );
      setScanStatus(
        `Прочитано ${formatBytes(report.bytesScanned)} свободного пространства; `
        + `текст: ${recoveredFragments.length}, медиа: ${mediaAssets.length}`
        + (undecodableMedia ? `, не декодировано: ${undecodableMedia}` : '')
        + '.',
      );
      setScanPhase('ready');
    } catch (error) {
      setScanStatus(`Сканирование ${installVolume.id} не удалось: ${String(error)}`);
      setScanPhase('error');
    }
  };

  const declineDiskRead = () => {
    setScanStatus('Без чтения диска установки игра не запустится.');
    setScanPhase('denied');
  };

  return (
    <section className="void-game" aria-label="Локация Пустота">
      <div className="void-game__status">
        <span>ПУСТОТА</span>
        <span>ЧАНК 32×32</span>
        <span>{sourceLabel}</span>
        <span>{Math.floor(position.x)} : {Math.floor(position.y)}</span>
      </div>
      {notice && <div className="void-game__notice" role="status">{notice}</div>}
      {scanPhase === 'ready' && scanStatus && (
        <div className="void-game__scan-status" role="status">{scanStatus}</div>
      )}
      {scanPhase === 'ready' && (
        <div className="void-game__controls">
          A / D или ← / → — идти&nbsp; · &nbsp;Space / W / ↑ — прыгнуть
          <button type="button" onClick={onExit}>В меню (Esc)</button>
        </div>
      )}
      {scanPhase !== 'ready' && (
        <div className="void-game__gate" role="dialog" aria-modal="true" aria-labelledby="void-gate-title">
          <div className="void-game__gate-panel">
            <h2 id="void-gate-title">ВХОД В ПУСТОТУ</h2>
            {scanPhase === 'checking' && <p>Определяем диск, на котором установлена игра…</p>}
            {scanPhase === 'consent' && installVolume && (
              <>
                <p>
                  Игра установлена на <strong>{installVolume.id}</strong> · {installVolume.label}.
                  Для входа требуется прочитать свободное пространство этого NTFS-диска.
                </p>
                <p>
                  Будет случайно прочитано до 64 МиБ свободного пространства только на чтение.
                  Это ускоряет поиск, но часть удалённых данных может не попасть в выборку.
                  Будут восстановлены до четырёх изображений и двух видеофрагментов; найденные
                  фрагменты могут содержать личные данные и станут частью игрового ландшафта.
                  Они останутся только в памяти игры и не будут отправлены или записаны на диск.
                  На SSD после TRIM удалённые данные могут быть недоступны.
                </p>
                <div className="void-game__gate-actions">
                  <button type="button" onClick={scanInstallVolume}>Разрешить чтение и начать</button>
                  <button type="button" onClick={declineDiskRead}>Не разрешать</button>
                </div>
              </>
            )}
            {scanPhase === 'scanning' && (
              <>
                <p>Читаем свободные кластеры {installVolume?.id}. Игра начнётся после завершения.</p>
                <p>{scanStatus}</p>
              </>
            )}
            {scanPhase === 'denied' && (
              <>
                <p>Для начала игры необходимо разрешить чтение диска установки.</p>
                <div className="void-game__gate-actions">
                  <button type="button" onClick={() => setScanPhase('consent')}>Вернуться к запросу</button>
                  <button type="button" onClick={onExit}>В меню</button>
                </div>
              </>
            )}
            {scanPhase === 'error' && (
              <>
                <p>{scanStatus}</p>
                <div className="void-game__gate-actions">
                  <button type="button" onClick={installVolume ? scanInstallVolume : locateInstallVolume}>
                    Повторить
                  </button>
                  <button type="button" onClick={onExit}>В меню</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
