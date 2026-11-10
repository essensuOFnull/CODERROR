import React, { useEffect, useRef } from 'react';
import { ThreeBackground } from '../../engine/ThreeBackground.js';

export default function ThreeLayer({ width, height, faces, speedX = 1, speedY = 0.5, fov = 75 }) {
  const canvasRef = useRef(null);
  const bgRef = useRef(null);

  useEffect(() => {
    const bg = new ThreeBackground({ canvas: canvasRef.current, fov, speedX, speedY });
    bgRef.current = bg;
    bg.resize(width, height);
    bg.start();
    bg.loadCubemap(faces).catch((e) => console.error('[ThreeLayer] cubemap:', e));
    return () => {
      bg.destroy();
      bgRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bgRef.current?.resize(width, height);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        left: 0, top: 0,
        width: `${width}px`,
        height: `${height}px`,
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  );
}