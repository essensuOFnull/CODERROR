import React, { useEffect, useRef, useState } from 'react';
import { PixiGrid } from '../../engine/PixiGrid.js';
import { useEngine } from '../../context/EngineContext.jsx';
import LoadingOverlay from '../LoadingOverlay.jsx';

export default function PixiLayer({ width, height, cellWidth, cellHeight, fontFamily }) {
  const holderRef = useRef(null);
  const gridRef = useRef(null);
  const engine = useEngine();
  const [ready, setReady] = useState(false);

  // Создание grid — один раз при монтировании
  useEffect(() => {
    const holder = holderRef.current;
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
      matrix: engine.matrix,
      fontFamily,
    });
    gridRef.current = grid;
    grid.bindRenderHooks(() => engine.getRenderHooks());

    let cancelled = false;
    grid.load()
      .then(() => {
        if (cancelled) return;
        engine.setGrid(grid);
        setReady(true);
      })
      .catch((e) => console.error('[PixiLayer] load failed:', e));

    return () => {
      cancelled = true;
      engine.setGrid(null);
      grid.destroy();
      gridRef.current = null;
      canvas.remove();
    };
  }, [engine]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ресайз
  useEffect(() => {
    if (!gridRef.current) return;
    engine.resize(width, height);
    gridRef.current.resize(width, height, cellWidth, cellHeight);
    const canvas = gridRef.current.canvas;
    canvas.style.width = `${width * cellWidth}px`;
    canvas.style.height = `${height * cellHeight}px`;
  }, [engine, width, height, cellWidth, cellHeight]);

  // Указатель
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
      <div ref={holderRef} style={{background:'transparent'}}/>
      {!ready && <LoadingOverlay />}
    </>
  );
}