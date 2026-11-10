import './utils/audioWorkletPatch.js';

import React from 'react';
import { EngineProvider } from './context/EngineContext.jsx';
import ThreeLayer from './components/layers/ThreeLayer.jsx';
import PixiLayer from './components/layers/PixiLayer.jsx';
import UILayer from './components/layers/UILayer.jsx';
import MainMenu from './components/MainMenu.jsx';
import { useWindowSize } from './hooks/useWindowSize.js';
import { CUBEMAP_FACES } from './config/cubemap.js';
import musicCode from './music/MainMenu.js?raw';

const CELL_W = 16;
const CELL_H = 16;
const FONT_FAMILY = 'Terminus';
const TPS = 60;
export default function App() {
  const { width: winW, height: winH } = useWindowSize();
  const cols = Math.max(1, Math.ceil(winW / CELL_W));
  const rows = Math.max(1, Math.ceil(winH / CELL_H));

  return (
    <EngineProvider
      width={cols} height={rows}
      tps={TPS}
      musicCode={musicCode}
    >
      <ThreeLayer
        width={winW} height={winH}
        faces={CUBEMAP_FACES}
        speedX={1} speedY={0.5} fov={75}
      />
      <PixiLayer
        width={cols} height={rows}
        cellWidth={CELL_W} cellHeight={CELL_H}
        fontFamily={FONT_FAMILY}
      />
      <UILayer>
        <MainMenu cellWidth={CELL_W} cellHeight={CELL_H} />
      </UILayer>
    </EngineProvider>
  );
}