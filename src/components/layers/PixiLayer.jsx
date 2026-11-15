import React, { useEffect, useRef, useState } from 'react';
import { PixiGrid } from '../../engine/PixiGrid.js';
import { useEngine } from '../../context/EngineContext.jsx';
import LoadingOverlay from '../LoadingOverlay.jsx';

export default function PixiLayer({ width, height, cellWidth, cellHeight, fontFamily }) {
  const holderRef = useRef(null);
  const gridRef = useRef(null);
  const engine = useEngine();
  const engineRef = useRef(engine);
  const [ready, setReady] = useState(false);

  // Держим engineRef актуальным, НЕ пересоздавая сетку.
  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  // Создаём сетку ОДИН раз за монтирование.
  // Зависимость от `engine` специально убрана: открытие оверлеев
  // (комната Архивариуса по F1) пересоздаёт значение контекста,
  // а раньше это триггерило cleanup → destroy → сломанный повторный load().
  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = `${width * cellWidth}px`;
    canvas.style.height = `${height * cellHeight}px`;
    canvas.style.display = 'block';
    canvas.style.background = '#00000000';
    holder.appendChild(canvas);

    const grid = new PixiGrid({
      canvas,
      width, height, cellWidth, cellHeight,
      matrix: engineRef.current.matrix,
      fontFamily,
    });
    gridRef.current = grid;

    // Замыкание читает engineRef.current — всегда свежий engine,
    // без необходимости пересоздавать сетку.
    grid.bindRenderHooks(() => engineRef.current.getRenderHooks());

    let cancelled = false;
    grid.load()
      .then(() => {
        if (cancelled) return;
        engineRef.current.setGrid(grid);
        setReady(true);
      })
      .catch((e) => console.error('[PixiLayer] load failed:', e));

    return () => {
      // Выполняется только при реальном unmount (или StrictMode double-invoke в dev).
      cancelled = true;
      if (engineRef.current) engineRef.current.setGrid(null);
      grid.destroy();
      if (gridRef.current === grid) gridRef.current = null;
      canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← было [engine]

  // Resize — можно оставить зависимость от engine, тут ничего не уничтожается.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    engine.resize(width, height);
    grid.resize(width, height, cellWidth, cellHeight);
    const canvas = grid.canvas;
    if (canvas) {
      canvas.style.width = `${width * cellWidth}px`;
      canvas.style.height = `${height * cellHeight}px`;
    }
  }, [engine, width, height, cellWidth, cellHeight]);

  // Указатель — тоже безопасно.
  useEffect(() => {
    const onMove = (e) => {
      const c = gridRef.current?.canvas;
      if (!c) return;
      const r = c.getBoundingClientRect();
      engine.setPointer(e.clientX - r.left, e.clientY - r.top, true);
    };
    const onLeave = () => engine.clearPointer();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, [engine]);

  return (
    <>
      <div ref={holderRef} style={{ background: 'transparent' }} />
      {!ready && <LoadingOverlay />}
    </>
  );
}