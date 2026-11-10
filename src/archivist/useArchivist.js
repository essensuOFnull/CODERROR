// src/archivist/useArchivist.js
import { useEffect, useMemo, useState } from 'react';
import { archivistLines } from './dialogue.js';
// Раньше здесь был allEntries — такого экспорта нет.
// entries.js отдаёт дерево; в плоскую последовательность его
// разворачивает flattenBook в Archivist.jsx.
import { entries } from './entries/index.js';

// Ключ комнаты. Отделён от archivistStore (там .arkh и флаги книги).
// Раньше они жили под одним 'archivist:state:v1' и затирали друг друга.
const STORE_KEY = 'archivist:room:v1';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const DEFAULT = {
  opened: 0,
  firstOpenedAt: null,
  greeted: false,
  lastPage: 0,
  flags: {
    hasRulon: false,
    hasShinjo: false,
    metShinjo: false,
    metArtifact: false,
    artefactAttitude: null,
    hasEnding: false,
    putDownPapers: false,
  },
  counters: {},
};

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT,
      ...parsed,
      flags: { ...DEFAULT.flags, ...(parsed.flags || {}) },
    };
  } catch {
    return DEFAULT;
  }
}

function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

function shouldPutDownPapers(state) {
  if (state.flags.putDownPapers) return false;
  if (state.opened < 50) return false;
  if (!state.firstOpenedAt) return false;
  return Date.now() - state.firstOpenedAt >= WEEK_MS;
}

function selectScene(state) {
  const f = state.flags;

  if (shouldPutDownPapers(state)) {
    return { stage: 'moment', lines: archivistLines.putDownPapers };
  }

  if (state.opened > 50 && Math.random() < 0.1) {
    return { stage: 'idle', lines: [pick(archivistLines.rare)] };
  }

  if (f.hasEnding) return { stage: 'idle', lines: [pick(archivistLines.hasEnding)] };
  if (f.metArtifact && f.artefactAttitude === 'positive')
    return { stage: 'idle', lines: [pick(archivistLines.artefactPositive)] };
  if (f.metArtifact && f.artefactAttitude === 'negative')
    return { stage: 'idle', lines: [pick(archivistLines.artefactNegative)] };
  if (f.metArtifact) return { stage: 'idle', lines: [pick(archivistLines.metArtifact)] };
  if (f.metShinjo) return { stage: 'idle', lines: [pick(archivistLines.metShinjo)] };
  if (f.hasRulon) return { stage: 'idle', lines: [pick(archivistLines.hasRulon)] };
  if (f.hasShinjo) return { stage: 'idle', lines: [pick(archivistLines.hasShinjo)] };
  if (state.opened > 20) return { stage: 'idle', lines: [pick(archivistLines.frequent)] };
  return { stage: 'idle', lines: [pick(archivistLines.idle)] };
}

export function useArchivist(isOpen) {
  const [state, setState] = useState(load);
  const [lines, setLines] = useState([]);
  const [stage, setStage] = useState('greeting');

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  useEffect(() => {
    if (!isOpen) return;
    if (!state.greeted) {
      setLines(archivistLines.first);
      setStage('greeting');
      return;
    }
    const scene = selectScene(state);
    setLines(scene.lines);
    setStage(scene.stage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const advance = () => {
    setState((s) => {
      const next = {
        ...s,
        greeted: true,
        opened: s.opened + 1,
        firstOpenedAt: s.firstOpenedAt ?? Date.now(),
      };
      if (stage === 'moment') {
        next.flags = { ...next.flags, putDownPapers: true };
      }
      return next;
    });
  };

  return { stage, lines, entries, advance, state };
}