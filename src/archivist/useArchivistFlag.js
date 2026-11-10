// src/archivist/useArchivistFlag.js
import { useCallback, useEffect, useState } from 'react';
import {
  setFlag,
  bumpCounter,
  subscribeArchivist,
  getState,
  markSpoiled,
  setFullySpoiled,
} from './archivistStore.js';

// Старый API. Внутри — уже не localStorage, а .arkh. Снаружи
// не изменилось ничего: те же имена, те же подписи.
export function setArchivistFlag(name, value = true) {
  setFlag(name, value);
}

export function useArchivistFlag() {
  return useCallback((name, value = true) => {
    setFlag(name, value);
  }, []);
}

export function bumpArchivistCounter(name, by = 1) {
  return bumpCounter(name, by);
}

// Новое: состояние книги для ArchivistBook.
// Возвращает ровно тот контракт, который я заложил в компонент.
export function useArchivistBookState() {
  const [snap, setSnap] = useState(() => getState());

  useEffect(() => subscribeArchivist(setSnap), []);

  const onSpoil = useCallback((id) => markSpoiled(id), []);
  const onSpoilAll = useCallback(() => setFullySpoiled(true), []);

  return {
    spoiledAt: snap.spoiledAt,
    fullySpoiled: snap.fullySpoiled,
    onSpoil,
    onSpoilAll,
  };
}