import React, { useCallback, useEffect, useRef, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import Logo from './Logo.jsx';
import Info from './Info.jsx';
import MusicEditor from './MusicEditor.jsx';
import { useEngine } from '../context/EngineContext.jsx';
import {
  updateMiniLocations,
  highlightMiniLocations,
} from './CodeMirror6.jsx';

import Archivist from '../archivist/Archivist.jsx';
import VoidGame from '../rooms/VoidGame.jsx';

function formatWorldSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} КиБ`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} МиБ`;
  return `${(bytes / 1024 ** 3).toFixed(1)} ГиБ`;
}

export default function MainMenu({
  cellWidth,
  cellHeight,
  cursorRadius = 120,
  cursorFalloff = 1,
}) {
  const engine = useEngine();
  const viewRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [activeWorld, setActiveWorld] = useState(null);
  const [worldMenuOpen, setWorldMenuOpen] = useState(false);
  const [worldName, setWorldName] = useState('');
  const [savedWorlds, setSavedWorlds] = useState([]);
  const [worldMenuError, setWorldMenuError] = useState('');
  const [loadingWorldId, setLoadingWorldId] = useState('');
  const [deletingWorldId, setDeletingWorldId] = useState('');
  const exitGame = useCallback(() => {
    setPlaying(false);
    setActiveWorld(null);
  }, []);

  const openWorldMenu = async () => {
    setWorldMenuOpen(true);
    setWorldMenuError('');
    if (!isTauri()) {
      setWorldMenuError('Создание и загрузка миров доступны только в настольном приложении.');
      return;
    }
    try {
      setSavedWorlds(await invoke('list_worlds'));
    } catch (error) {
      setWorldMenuError(`Не удалось загрузить список миров: ${String(error)}`);
    }
  };

  const createWorld = (event) => {
    event.preventDefault();
    const name = worldName.trim();
    if (!name) {
      setWorldMenuError('Введите название мира.');
      return;
    }
    setActiveWorld({
      name,
      seed: Math.floor(Math.random() * 0x100000000),
    });
    setWorldMenuOpen(false);
    setPlaying(true);
  };

  const openSavedWorld = async (id) => {
    setLoadingWorldId(id);
    setWorldMenuError('');
    try {
      setActiveWorld(await invoke('load_world', { id }));
      setWorldMenuOpen(false);
      setPlaying(true);
    } catch (error) {
      setWorldMenuError(`Не удалось открыть мир: ${String(error)}`);
    } finally {
      setLoadingWorldId('');
    }
  };

  const deleteSavedWorld = async (world) => {
    if (!window.confirm(`Удалить мир «${world.name}» и его сохранённые данные?`)) return;
    setDeletingWorldId(world.id);
    setWorldMenuError('');
    try {
      await invoke('delete_world', { id: world.id });
      setSavedWorlds((worlds) => worlds.filter((savedWorld) => savedWorld.id !== world.id));
    } catch (error) {
      setWorldMenuError(`Не удалось удалить мир «${world.name}»: ${String(error)}`);
    } finally {
      setDeletingWorldId('');
    }
  };

  // ─── Код музыки и готовность ───────────────────────────────────────
  const [musicCode, setMusicCode] = useState(engine.music.code);
  const [musicReady, setMusicReady] = useState(engine.music.ready);

  useEffect(() => engine.music.onReady(() => {
    setMusicCode(engine.music.code);
    setMusicReady(true);
  }), [engine]);

  // ─── Подсветка haps в CodeMirror (60 tps) ──────────────────────────
  useEffect(() => {
    let appliedMini = false;
    return engine.onTick(() => {
      const m = engine.music;
      if (!m.ready) return;
      const view = viewRef.current;
      if (!view) return;

      if (m.miniLocations && !appliedMini) {
        updateMiniLocations(view, m.miniLocations);
        appliedMini = true;
      }

      const q = m.queryHaps();
      if (q) highlightMiniLocations(view, q.now, q.haps);
    });
  }, [engine]);

  // ─── Рендер-эффекты на Pixi ticker ─────────────────────────────────
  useEffect(() => {
    if (playing) return undefined;
    let detach = null;

    const unsubGrid = engine.onGridReady((grid) => {
      const tick = () => {
        const map = grid.textures;
        if (!map || map.size === 0) return;

        const entries = Array.from(map.entries());
        const n = entries.length;
        const cols = engine.width;
        const rows = engine.height;

        // (2) Случайные символы в случайных ячейках
        engine.batch(() => {
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              if (Math.random() < 0.9) continue;
              const [ch] = entries[(Math.random() * n) | 0];
              engine.setCell(x, y, {
                char: ch,
                fg: (Math.random() * 0xffffff) | 0,
                alpha: 1,
                bg: (Math.random() * 0xffffff) | 0,
                bgAlpha: Math.random(),
              });
            }
          }
        });

        // (3) Эффект курсора
        const c = engine.pointer;
        if (!c.inside) return;

        const cw = grid.cellWidth;
        const chh = grid.cellHeight;
        const r2 = cursorRadius * cursorRadius;

        engine.batch(() => {
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              const dx = c.px - (x * cw + cw / 2);
              const dy = c.py - (y * chh + chh / 2);
              const d2 = dx * dx + dy * dy;
              if (!(d2 < r2)) continue;

              const t = Math.pow(Math.sqrt(d2) / cursorRadius, cursorFalloff);
              engine.setCell(x, y, { alpha: 0, bgAlpha: t });
            }
          }
        });
      };

      grid.app.ticker.add(tick);
      detach = () => grid.app.ticker.remove(tick);
    });

    return () => {
      unsubGrid();
      if (detach) detach();
    };
  }, [engine, cursorRadius, cursorFalloff, playing]);

  // ─── Заголовок окна: TPS / FPS ─────────────────────────────────────
  useEffect(() => {
    let lastUpdate = performance.now();
    let ticks = 0;
    let frames = 0;

    const unsubTick = engine.onTick(() => { ticks++; });
    const unsubRender = engine.onRender(() => { frames++; });

    const id = setInterval(() => {
      const now = performance.now();
      const dt = (now - lastUpdate) / 1000;
      const tps = (ticks / dt).toFixed(2);
      const fps = (frames / dt).toFixed(2);
      document.title = `CODERROR - очередная попытка - TPS: ${tps} - FPS: ${fps}`;
      ticks = 0;
      frames = 0;
      lastUpdate = now;
    }, 1000);

    return () => {
      unsubTick();
      unsubRender();
      clearInterval(id);
    };
  }, [engine]);

  return (
    <>
      {playing ? (
        <VoidGame
          cellWidth={cellWidth}
          cellHeight={cellHeight}
          world={activeWorld}
          onExit={exitGame}
        />
      ) : (
        <>
          <Logo cellHeight={cellHeight} />
          <Info />
          <button className="game-start-button" type="button" onClick={openWorldMenu}>
            Миры
          </button>
          {worldMenuOpen && (
            <div className="world-menu" role="dialog" aria-modal="true" aria-labelledby="world-menu-title">
              <div className="world-menu__panel">
                <h2 id="world-menu-title">МИРЫ</h2>
                <form onSubmit={createWorld}>
                  <label htmlFor="world-name">Название нового мира</label>
                  <input
                    id="world-name"
                    value={worldName}
                    maxLength={64}
                    onChange={(event) => setWorldName(event.target.value)}
                    placeholder="Например, Первый мир"
                    required
                  />
                  <p className="world-menu__warning">
                    Будет полностью проверено свободное пространство диска, на котором установлена
                    игра; занятые файлы не читаются. Это может занять от нескольких минут до нескольких
                    часов — зависит от размера и скорости диска. Найденные фрагменты могут содержать
                    личные данные и сохраняются локально в файле мира. На SSD с TRIM часть удалённых
                    данных может быть недоступна.
                  </p>
                  <div className="world-menu__actions">
                    <button type="submit" disabled={!isTauri() || !worldName.trim()}>
                      Создать и сканировать диск
                    </button>
                  </div>
                </form>

                <h3>Сохранённые миры</h3>
                {savedWorlds.length === 0 && <p>Сохранённых миров пока нет.</p>}
                {savedWorlds.length > 0 && (
                  <ul className="world-menu__list">
                    {savedWorlds.map((world) => (
                      <li key={world.id}>
                        <div>
                          <strong>{world.name}</strong>
                          <span>
                            {world.fragmentCount} фрагм. · {world.mediaCount} медиа · {world.volumeId}
                            {' · размер мира: '}{formatWorldSize(world.fileSizeBytes)}
                          </span>
                        </div>
                        <div className="world-menu__world-actions">
                          <button
                            type="button"
                            disabled={Boolean(loadingWorldId) || Boolean(deletingWorldId)}
                            onClick={() => openSavedWorld(world.id)}
                          >
                            {loadingWorldId === world.id ? 'Открываем…' : 'Открыть'}
                          </button>
                          <button
                            className="world-menu__delete"
                            type="button"
                            disabled={Boolean(loadingWorldId) || Boolean(deletingWorldId)}
                            onClick={() => deleteSavedWorld(world)}
                          >
                            {deletingWorldId === world.id ? 'Удаляем…' : 'Удалить'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {worldMenuError && <p className="world-menu__error" role="alert">{worldMenuError}</p>}
                <div className="world-menu__actions">
                  <button type="button" onClick={() => setWorldMenuOpen(false)}>Назад</button>
                </div>
              </div>
            </div>
          )}
          {musicReady && (
            <MusicEditor
              value={musicCode}
              cellWidth={cellWidth}
              cellHeight={cellHeight}
              onCreateEditor={(view) => { viewRef.current = view; }}
            />
          )}
          <Archivist />
        </>
      )}
    </>
  );
}