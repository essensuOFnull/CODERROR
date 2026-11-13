import React, { useEffect, useState } from 'react';
import playerFile from '../textures/first_scene/player_js.png';
import emptyRecycleBin from '../textures/first_scene/recycle_bin.png';
import fullRecycleBin from '../textures/first_scene/recycle_bin1.png';
import './first-scene.css';

const SCENE_DURATION_MS = 4400;
const BIN_FILLED_AT_MS = 2250;
const BIN_EMPTIED_AT_MS = 2750;

export default function FirstScene({ onComplete }) {
  const [phase, setPhase] = useState('throwing');

  useEffect(() => {
    const fullTimer = window.setTimeout(() => setPhase('discarded'), BIN_FILLED_AT_MS);
    const emptyTimer = window.setTimeout(() => setPhase('emptied'), BIN_EMPTIED_AT_MS);
    const completeTimer = window.setTimeout(onComplete, SCENE_DURATION_MS);
    return () => {
      window.clearTimeout(fullTimer);
      window.clearTimeout(emptyTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`first-scene first-scene--${phase}`} role="status" aria-live="polite">
      <div className="first-scene__stage" aria-hidden="true">
        <img className="first-scene__bin first-scene__bin--empty" src={emptyRecycleBin} alt="" />
        <img className="first-scene__bin first-scene__bin--full" src={fullRecycleBin} alt="" />
        {phase === 'throwing' && (
          <div className="first-scene__drag">
            <img className="first-scene__player" src={playerFile} alt="" />
            <svg
              className="first-scene__cursor"
              viewBox="0 0 32 40"
              aria-hidden="true"
            >
              <path
                d="M4 3v26l7-7 5 12 6-3-5-11h10L4 3z"
                fill="#fff"
                stroke="#10151b"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </div>
        )}
      </div>
      <p className="first-scene__caption">
        {phase === 'throwing' && 'ФАЙЛ ИГРОКА ПЕРЕМЕЩЁН В КОРЗИНУ'}
        {phase === 'discarded' && 'ФАЙЛ ИГРОКА УДАЛЁН'}
        {phase === 'emptied' && 'ВХОД В ПУСТОТУ'}
      </p>
      <button className="first-scene__skip" type="button" onClick={onComplete}>
        Пропустить
      </button>
    </div>
  );
}
