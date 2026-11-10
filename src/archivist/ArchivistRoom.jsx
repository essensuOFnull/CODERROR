import React, { useEffect, useRef, useState } from 'react';
import ArchivistFigure from './ArchivistFigure.jsx';
import ArchivistDecorations from './ArchivistDecorations.jsx';
import { useSpeechTypewriter } from '../speech/index.js';

const CHAIR_IMAGE = new URL('./archivist_chair.png', import.meta.url).href;
const TABLE_IMAGE = new URL('./archivist_table.png', import.meta.url).href;

export default function ArchivistRoom({
  lines, variant = 'idle', onDone, bookOpen, onToggleBook,
}) {
  const [index, setIndex] = useState(0);
  const [sceneDone, setSceneDone] = useState(false);
  const text = lines[index] || '';

  const voice = variant === 'moment' ? 'archivist_moment' : 'archivist';
  const { typed, done, skip } = useSpeechTypewriter(text, { voice });

  // ── рамка сцены: соотношение сторон берём из натуральных
  //    размеров картинки стула. Если картинки ещё не загружены —
  //    работает дефолт 1, потом пересчитается.
  const frameRef = useRef(null);
  const chairRef = useRef(null);

  useEffect(() => {
    const img = chairRef.current;
    if (!img) return;
    const apply = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0 && frameRef.current) {
        frameRef.current.style.setProperty(
          '--workspace-aspect',
          String(img.naturalWidth / img.naturalHeight)
        );
      }
    };
    if (img.complete) apply();
    else img.addEventListener('load', apply, { once: true });
    return () => img.removeEventListener('load', apply);
  }, []);

  // Сброс при смене сцены.
  useEffect(() => {
    setIndex(0);
    setSceneDone(false);
  }, [lines]);

  const handleClick = () => {
    if (bookOpen) return;
    if (!done) {
      // Досрочно раскрыть — и заткнуть голос.
      skip();
      return;
    }
    if (index + 1 >= lines.length) {
      if (!sceneDone) {
        setSceneDone(true);
        onDone?.();
      }
      return;
    }
    setIndex((i) => i + 1);
  };

  return (
    <div
      className={`archivist-room archivist-room--${variant}`}
      onClick={handleClick}
    >
      <div className="archivist-flicker" />

      <div ref={frameRef} className="archivist-workspace-frame">
        <img
          ref={chairRef}
          className="archivist-layer"
          src={CHAIR_IMAGE}
          alt=""
          draggable={false}
        />
        <ArchivistFigure className="archivist-figure" />
        <img
          className="archivist-layer"
          src={TABLE_IMAGE}
          alt=""
          draggable={false}
        />
        <ArchivistDecorations />
      </div>

      <div className="archivist-text">
        <span>{typed}</span>
        {!done && <span className="archivist-caret">▌</span>}
      </div>

      <div className="archivist-hint">
        {done && !bookOpen ? 'нажми, чтобы продолжить' : ''}
      </div>

      <button
        className={`archivist-book-toggle ${bookOpen ? 'is-open' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleBook?.();
        }}
      >
        {bookOpen ? 'закрыть книгу' : 'открыть книгу'}
      </button>
    </div>
  );
}