import React, { useEffect, useRef, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import Slider from '@mui/material/Slider';
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
const worldVolumeTasks = new WeakMap();
const worldScanTasks = new WeakMap();

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

function createImageCycle(images, seed) {
  const cycle = [...images];
  for (let index = cycle.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(mediaRandom(seed, index, 11) * (index + 1));
    [cycle[index], cycle[swapIndex]] = [cycle[swapIndex], cycle[index]];
  }
  return cycle;
}

function cycleImageIndex(sector, length) {
  const sectorIndex = ((sector % length) + length) % length;
  return sectorIndex;
}

function getWorldVolume(world) {
  let task = worldVolumeTasks.get(world);
  if (!task) {
    task = invoke('get_install_ntfs_volume').catch((error) => {
      if (worldVolumeTasks.get(world) === task) worldVolumeTasks.delete(world);
      throw error;
    });
    worldVolumeTasks.set(world, task);
  }
  return task;
}

function scanWorld(world, volumeId, seed, selection) {
  let task = worldScanTasks.get(world);
  if (!task) {
    task = invoke('scan_ntfs_free_space', {
      volumeId,
      worldName: world.name,
      seed,
      scanId: selection.scanId,
      startBasisPoints: selection.startBasisPoints,
      endBasisPoints: selection.endBasisPoints,
    }).catch((error) => {
      if (worldScanTasks.get(world) === task) worldScanTasks.delete(world);
      throw error;
    });
    worldScanTasks.set(world, task);
  }
  return task;
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

export default function VoidGame({ cellWidth, cellHeight, world, onExit }) {
  const engine = useEngine();
  const [notice, setNotice] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scanPhase, setScanPhase] = useState('checking');
  const [scanStatus, setScanStatus] = useState('');
  const [scanProgress, setScanProgress] = useState(null);
  const [scanVolume, setScanVolume] = useState(null);
  const [scanStartBasisPoints, setScanStartBasisPoints] = useState(0);
  const [scanEndBasisPoints, setScanEndBasisPoints] = useState(10_000);
  const [scanSelection, setScanSelection] = useState(null);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [sourceLabel, setSourceLabel] = useState('СИНТЕТИЧЕСКИЕ ДАННЫЕ');
  const roomRef = useRef(null);
  const terrainDirtyRef = useRef(false);
  const scanReadyRef = useRef(false);
  const mediaAssetsRef = useRef([]);
  const imageAssetsRef = useRef([]);
  const imageCycleRef = useRef([]);
  const videoAssetsRef = useRef([]);
  const keys = useRef(new Set());
  const jumpRequested = useRef(false);
  const noticeTimer = useRef(null);
  const activeScanIdRef = useRef(null);

  const beginScan = () => {
    setScanSelection({
      scanId: crypto.randomUUID(),
      startBasisPoints: scanStartBasisPoints,
      endBasisPoints: scanEndBasisPoints,
    });
  };

  const stopScan = async () => {
    const scanId = activeScanIdRef.current;
    if (!scanId || cancelRequested) return;
    setCancelRequested(true);
    setScanStatus('Останавливаем сканирование и сохраняем уже найденное…');
    try {
      await invoke('cancel_disk_scan', { scanId });
    } catch (error) {
      setCancelRequested(false);
      setScanStatus(`Не удалось остановить сканирование: ${String(error)}`);
    }
  };

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
    imageAssetsRef.current = [];
    imageCycleRef.current = [];
    videoAssetsRef.current = [];
  }, []);

  useEffect(() => {
    const seed = world?.seed ?? Math.floor(Math.random() * 0x100000000);
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
    let activeTextOverlays = new Set();
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
      const nextTextOverlays = new Set();
      const imageCycle = imageCycleRef.current;
      const videoAssets = videoAssetsRef.current;
      const recoveredFragments = room.data.recoveredFragments ?? [];
      const recoveredDataCount = room.data.recoveredDataCount ?? recoveredFragments.length;
      const sectorSize = Math.max(
        14,
        48 - Math.floor(Math.log2(recoveredDataCount + 1) * 6),
      );
      const firstSector = Math.floor((cameraX - 8) / sectorSize);
      const lastSector = Math.floor((cameraX + engine.width + 8) / sectorSize);
      for (let sector = firstSector; sector <= lastSector; sector++) {
        if (imageCycle.length > 0) {
          const image = imageCycle[cycleImageIndex(sector, imageCycle.length)];
          const worldX = sector * sectorSize
            + mediaRandom(seed, sector, 6) * sectorSize;
          const maxScale = Math.min(
            1,
            (engine.width * cellWidth) / image.width,
            (engine.height * cellHeight) / image.height,
          );
          const baseScale = maxScale * (0.2 + mediaRandom(seed, sector, 8) * 0.75);
          const pulse = 0.975 + 0.025 * (
            1 + Math.sin(performance.now() / 900 + sector * 1.7)
          ) / 2;
          const scale = Math.min(maxScale, baseScale * pulse);
          const width = image.width * scale;
          const height = image.height * scale;
          const worldY = surfaceAt(worldX, seed) + 1
            + mediaRandom(seed, sector, 7) * 12;
          const x = (worldX - cameraX) * cellWidth - (image.width * (baseScale - scale)) / 2;
          const y = (worldY - cameraY) * cellHeight;
          if (x + width >= 0 && y + height >= 0
            && x <= engine.width * cellWidth && y <= engine.height * cellHeight) {
            const overlayId = `${image.id}:stratum:${sector}`;
            grid.setMediaOverlay(overlayId, {
              source: image.element,
              x,
              y,
              width,
              height,
              alpha: 0.76,
            });
            nextMediaOverlays.add(overlayId);
          }
        }

        if (recoveredFragments.length > 0) {
          const fragment = recoveredFragments[
            Math.floor(mediaRandom(seed, sector, 3) * recoveredFragments.length)
          ];
          const text = Array.from(fragment.text);
          const visibleLength = Math.min(sectorSize - 4, text.length);
          const start = Math.floor(
            mediaRandom(seed, sector, 4) * Math.max(1, text.length - visibleLength + 1),
          );
          const anchorX = sector * sectorSize + 2;
          const textY = Math.floor(surfaceAt(anchorX, seed)) + 1;
          for (let index = 0; index < visibleLength; index++) {
            const sourceChar = text[start + index];
            if (/\s/u.test(sourceChar)) continue;
            const char = room.glyphs.includes(sourceChar)
              ? sourceChar
              : room.glyphs[sourceChar.codePointAt(0) % room.glyphs.length];
            if (!char) continue;

            const worldX = anchorX + index;
            const x = (worldX - cameraX) * cellWidth;
            const y = (textY - cameraY) * cellHeight;
            if (x + cellWidth < 0 || y + cellHeight < 0
              || x > engine.width * cellWidth || y > engine.height * cellHeight) {
              continue;
            }
            const overlayId = `recovered-text:${sector}:${index}`;
            grid.setOverlay(overlayId, {
              char,
              x,
              y,
              fg: 0x9e91b5,
              alpha: 0.9,
            });
            nextTextOverlays.add(overlayId);
          }
        }

        if (videoAssets.length === 0) continue;
        const asset = videoAssets[
          Math.floor(mediaRandom(seed, sector, 0) * videoAssets.length)
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
      for (const id of activeTextOverlays) {
        if (!nextTextOverlays.has(id)) grid.removeOverlay(id);
      }
      activeTextOverlays = nextTextOverlays;
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
      for (const id of activeTextOverlays) engine.pixiGrid?.removeOverlay(id);
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
  }, [cellHeight, cellWidth, engine, world?.seed]);

  useEffect(() => {
    let cancelled = false;
    let unlisten;

    const initializeWorld = async () => {
      if (!isTauri()) {
        throw new Error('Создание и загрузка миров доступны только в настольном приложении.');
      }

      const room = roomRef.current;
      if (!room) throw new Error('Игровая комната ещё не готова принять данные мира.');

      let report = world?.report;
      if (report) {
        setScanPhase('loading');
        setScanStatus('Загружаем сохранённые данные мира…');
      }
      if (!report) {
        setScanPhase('checking');
        setScanStatus('Определяем диск установки…');
        const volume = await getWorldVolume(world);
        if (cancelled) return;
        setScanVolume(volume);
        if (!scanSelection) {
          setScanPhase('selecting');
          setScanStatus('');
          return;
        }

        setScanPhase('scanning');
        setScanStatus(
          `Проверяем выбранный диапазон диска ${volume.id} `
          + `(${(scanSelection.startBasisPoints / 100).toFixed(2)}–`
          + `${(scanSelection.endBasisPoints / 100).toFixed(2)}%)…`,
        );
        setScanProgress({
          bytesProcessed: 0,
          totalBytes: Math.floor(
            volume.totalBytes
            * (scanSelection.endBasisPoints - scanSelection.startBasisPoints)
            / 10_000,
          ),
          bytesRead: 0,
        });
        const stopListening = await listen('disk-scan-progress', (event) => {
          if (!cancelled) setScanProgress(event.payload);
        });
        if (cancelled) {
          stopListening();
          return;
        }
        unlisten = stopListening;
        activeScanIdRef.current = scanSelection.scanId;
        setCancelRequested(false);
        try {
          report = await scanWorld(world, volume.id, room.seed, scanSelection);
        } finally {
          if (activeScanIdRef.current === scanSelection.scanId) {
            activeScanIdRef.current = null;
          }
          setCancelRequested(false);
        }
        if (cancelled) return;
        setScanPhase('loading');
        setScanStatus(report.scanCompleted === false
          ? 'Сканирование остановлено. Сохраняем найденные данные мира…'
          : 'Сканирование завершено. Подготавливаем данные мира…');
      }

      if (!Array.isArray(report.fragments) || !Array.isArray(report.media)) {
        throw new Error('Файл мира не содержит корректные списки восстановленных данных.');
      }
      const availableGlyphs = new Set(room.glyphs);
      const recoveredFragments = report.fragments.map(({ text, offset }) => ({
        text,
        offset,
        terrainChars: Array.from(text).filter((character) => (
          !/\s/u.test(character) && availableGlyphs.has(character)
        )),
      }));
      const mediaAssets = [];
      let undecodableMedia = 0;
      let undecodableVideo = 0;
      for (const [index, media] of report.media.entries()) {
        try {
          mediaAssets.push(await createMediaAsset(media, index));
        } catch {
          undecodableMedia++;
          if (media.mimeType.startsWith('video/')) undecodableVideo++;
        }
        if (cancelled) {
          for (const asset of mediaAssets) {
            if (asset.element instanceof HTMLVideoElement) asset.element.pause();
            URL.revokeObjectURL(asset.url);
          }
          return;
        }
      }

      mediaAssetsRef.current = mediaAssets;
      imageAssetsRef.current = mediaAssets.filter((asset) => asset.mimeType.startsWith('image/'));
      imageCycleRef.current = createImageCycle(imageAssetsRef.current, room.seed);
      videoAssetsRef.current = mediaAssets.filter((asset) => asset.mimeType.startsWith('video/'));
      room.setData({
        recoveredFragments,
        recoveredDataCount: recoveredFragments.length + mediaAssets.length,
        scanCompleted: true,
      });
      terrainDirtyRef.current = true;
      scanReadyRef.current = true;
      setSourceLabel(
        `${report.volumeId} // ${recoveredFragments.length} ФРАГ. / ${mediaAssets.length} МЕДИА`,
      );
      setScanStatus(
        `${world.name} сохранён${report.scanCompleted === false ? ' (частичное сканирование)' : ''}; `
        + `прочитано ${formatBytes(report.bytesScanned)} свободного места; `
        + `текст: ${recoveredFragments.length}, картинки: ${imageAssetsRef.current.length}, `
        + `видео: ${videoAssetsRef.current.length}`
        + (undecodableVideo ? `, видео не декодировано: ${undecodableVideo}` : '')
        + (undecodableMedia > undecodableVideo
          ? `, прочее медиа не декодировано: ${undecodableMedia - undecodableVideo}`
          : '')
        + (videoAssetsRef.current.length === 0 && undecodableVideo === 0
          ? '; в просмотренном диапазоне целые видеоконтейнеры не найдены'
          : '')
        + '.',
      );
      setScanPhase('ready');
    };

    initializeWorld().catch((error) => {
      if (cancelled) return;
      setScanStatus(`Не удалось создать или открыть мир: ${String(error)}`);
      setScanPhase('error');
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [retryToken, scanSelection, world]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === 'Escape') {
        event.preventDefault();
        if (scanPhase === 'ready' || scanPhase === 'error') onExit();
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
  }, [onExit, scanPhase]);

  return (
    <section className="void-game" aria-label="Локация Пустота">
      <div className="void-game__status">
        <span>ПУСТОТА</span>
        <span>{world?.name}</span>
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
            {scanPhase === 'loading' && <p>{scanStatus}</p>}
            {scanPhase === 'selecting' && scanVolume && (
              <>
                <p>
                  Выбери границы участка диска {scanVolume.id}, который нужно проверить.
                  По умолчанию выбран весь диск; будет прочитано только свободное пространство.
                </p>
                <div className="void-game__range">
                  <span>
                    Начать с {(scanStartBasisPoints / 100).toFixed(2)}%
                    {' · '}{formatBytes(scanVolume.totalBytes * scanStartBasisPoints / 10_000)}
                  </span>
                  <Slider
                    min={0}
                    max={10_000}
                    step={1}
                    value={[scanStartBasisPoints, scanEndBasisPoints]}
                    onChange={(_, value) => {
                      if (Array.isArray(value)) {
                        setScanStartBasisPoints(value[0]);
                        setScanEndBasisPoints(value[1]);
                      }
                    }}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${(value / 100).toFixed(2)}%`}
                    disableSwap
                    getAriaLabel={(index) => (
                      index === 0 ? 'Начало диапазона сканирования' : 'Конец диапазона сканирования'
                    )}
                    sx={{
                      color: '#72aeb5',
                      padding: '13px 0',
                      '& .MuiSlider-rail': {
                        backgroundColor: '#8195a5',
                        opacity: 0.35,
                      },
                      '& .MuiSlider-track': { border: 0 },
                      '& .MuiSlider-thumb': {
                        width: 16,
                        height: 16,
                        backgroundColor: '#ffd36a',
                        border: '2px solid #080d16',
                        '&:hover, &.Mui-focusVisible': {
                          boxShadow: '0 0 0 7px #ffd36a33',
                        },
                      },
                      '& .MuiSlider-valueLabel': {
                        border: '1px solid #8195a5',
                        backgroundColor: '#080d16',
                        color: '#ffdca0',
                      },
                    }}
                  />
                  <span>
                    Закончить на {(scanEndBasisPoints / 100).toFixed(2)}%
                    {' · '}{formatBytes(scanVolume.totalBytes * scanEndBasisPoints / 10_000)}
                  </span>
                </div>
                <div className="void-game__gate-actions">
                  <button type="button" onClick={beginScan}>Начать сканирование</button>
                  <button type="button" onClick={onExit}>В меню</button>
                </div>
              </>
            )}
            {scanPhase === 'scanning' && (
              <>
                <p>
                  Сканируем свободное пространство выбранного диапазона. Данные читаются только
                  для восстановления и сохраняются в файл этого мира.
                </p>
                <p>{scanStatus}</p>
                {scanProgress && (
                  <>
                    <progress
                      className="void-game__progress"
                      max="100"
                      value={scanProgress.totalBytes
                        ? Math.min(100, scanProgress.bytesProcessed / scanProgress.totalBytes * 100)
                        : 100}
                      aria-label="Прогресс сканирования диска"
                    />
                    <p className="void-game__progress-label">
                      Обработано {formatBytes(scanProgress.bytesProcessed)} из {formatBytes(scanProgress.totalBytes)}
                      {' · '}прочитано {formatBytes(scanProgress.bytesRead)} свободных данных
                    </p>
                  </>
                )}
                <div className="void-game__gate-actions">
                  <button type="button" onClick={stopScan} disabled={cancelRequested}>
                    {cancelRequested ? 'Останавливаем…' : 'бля хватит'}
                  </button>
                </div>
              </>
            )}
            {scanPhase === 'error' && (
              <>
                <p>{scanStatus}</p>
                <div className="void-game__gate-actions">
                  <button type="button" onClick={() => {
                    setScanStatus('');
                    setScanPhase('checking');
                    setScanProgress(null);
                    setScanSelection(null);
                    setScanStartBasisPoints(0);
                    setScanEndBasisPoints(10_000);
                    setRetryToken((token) => token + 1);
                  }}>Повторить</button>
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
