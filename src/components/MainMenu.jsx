import React, { useEffect, useRef, useState } from 'react';
import Logo from './Logo.jsx';
import Info from './Info.jsx';
import MusicEditor from './MusicEditor.jsx';
import { useEngine } from '../context/EngineContext.jsx';
import {
  updateMiniLocations,
  highlightMiniLocations,
} from './CodeMirror6.jsx';

import Archivist from '../archivist/Archivist.jsx';

export default function MainMenu({
  cellWidth,
  cellHeight,
  cursorRadius = 120,
  cursorFalloff = 1,
}) {
  const engine = useEngine();
  const viewRef = useRef(null);

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
  }, [engine, cursorRadius, cursorFalloff]);

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
      <Logo cellHeight={cellHeight} />
      <Info />
      {musicReady && (
        <MusicEditor
          value={musicCode}
          cellWidth={cellWidth}
          cellHeight={cellHeight}
          onCreateEditor={(view) => { viewRef.current = view; }}
        />
      )}
      <Archivist/>
    </>
  );
}