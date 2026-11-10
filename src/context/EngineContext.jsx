import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Engine } from '../engine/Engine.js';

const EngineCtx = createContext(null);

export function EngineProvider({ width, height, tps = 60, musicCode, children }) {
  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = new Engine({ width, height, tps });
    if (typeof window !== 'undefined') window.__engine = engineRef.current;
  }

  useEffect(() => {
    const e = engineRef.current;
    e.start();
    if (musicCode) e.music.load(musicCode);
    return () => e.stop();
  }, [musicCode]);

  return (
    <EngineCtx.Provider value={engineRef.current}>
      {children}
    </EngineCtx.Provider>
  );
}

export function useEngine() {
  const e = useContext(EngineCtx);
  if (!e) throw new Error('useEngine must be used inside <EngineProvider>');
  return e;
}