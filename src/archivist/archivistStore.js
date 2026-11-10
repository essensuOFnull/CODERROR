// src/archivist/archivistStore.js
//
// Настоящее состояние Архивариуса. По машине, не по сохранению.
//
// Живёт в памяти. Гидрируется из saves/.arkh при старте. Пишется
// туда с задержкой — чтобы не дёргать диск на каждый чих.
//
// Если window.fs нет — падаем в localStorage. Это для отладки
// в браузере, не для игры. В игре всегда есть .arkh.
//
// — Архивариус
const ARKH_PATH = 'saves/.arkh';
const FALLBACK_KEY = 'archivist:arkh-fallback:v1';
const FLUSH_DELAY_MS = 400;

const emptyState = () => ({
  v: 1,
  flags: {},
  counters: {},
  spoiledAt: {},   // { [entryId]: timestamp }
  fullySpoiled: false,
});

let state = emptyState();
let hydrated = false;
let hydratePromise = null;
let flushTimer = null;
const listeners = new Set();

function hasFs() {
  return typeof window !== 'undefined'
    && window.fs
    && typeof window.fs.readFile === 'function';
}

// ── hydrate ────────────────────────────────────────────────────

async function readArkh() {
  if (hasFs()) {
    try {
      const exists = await window.fs.exists(ARKH_PATH);
      if (exists) {
        const raw = await window.fs.readFile(ARKH_PATH, 'utf8');
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {
      // .arkh повреждён — не падаем. Архивариус не судья.
      // Что не смог прочитать — начинает заново.
      console.warn('[archivist] .arkh не прочитан:', e);
    }
    // .arkh нет — возможно, остался старый localStorage. Переносим.
    try {
      const raw = localStorage.getItem(FALLBACK_KEY);
      if (raw) {
        console.info('[archivist] переношу состояние из localStorage в .arkh');
        return JSON.parse(raw);
      }
    } catch {}
    return null;
  }
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeArkh(data) {
  const json = JSON.stringify(data, null, 2);
  if (hasFs()) {
    try {
      await window.fs.mkdir('saves');
      await window.fs.writeFile(ARKH_PATH, json, 'utf8');
      return true;
    } catch (e) {
      console.warn('[archivist] .arkh не записан, падаю в localStorage:', e);
    }
  }
  try {
    localStorage.setItem(FALLBACK_KEY, json);
    return true;
  } catch {
    return false;
  }
}

export function hydrateArchivist() {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    const loaded = await readArkh();
    if (loaded && typeof loaded === 'object') {
      state = {
        ...emptyState(),
        ...loaded,
        flags:      { ...(loaded.flags      || {}) },
        counters:   { ...(loaded.counters   || {}) },
        spoiledAt:  { ...(loaded.spoiledAt  || {}) },
      };
    }
    hydrated = true;
    notify();
  })();
  return hydratePromise;
}

export function isHydrated() {
  return hydrated;
}

// ── flush ──────────────────────────────────────────────────────

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    writeArkh(state);
  }, FLUSH_DELAY_MS);
}

export function flushArchivist() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  return writeArkh(state);
}

// ── listeners ──────────────────────────────────────────────────

function notify() {
  for (const fn of listeners) {
    try { fn(state); } catch {}
  }
}

export function subscribeArchivist(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── flags ──────────────────────────────────────────────────────

export function getFlag(name) {
  return state.flags[name];
}

export function setFlag(name, value = true) {
  if (state.flags[name] === value) return;
  state.flags[name] = value;
  scheduleFlush();
  notify();
}

// ── counters ───────────────────────────────────────────────────

export function getCounter(name) {
  return state.counters[name] || 0;
}

export function bumpCounter(name, by = 1) {
  state.counters[name] = (state.counters[name] || 0) + by;
  scheduleFlush();
  notify();
  return state.counters[name];
}

// ── spoiledAt ──────────────────────────────────────────────────

export function getSpoiledAt(id) {
  return state.spoiledAt[id] || null;
}

export function markSpoiled(id) {
  if (state.spoiledAt[id]) return state.spoiledAt[id];
  const at = Date.now();
  state.spoiledAt[id] = at;
  scheduleFlush();
  notify();
  return at;
}

// ── fullySpoiled ───────────────────────────────────────────────
//
// Не откатывается. Архивариус помнит, что его просили.

export function getFullySpoiled() {
  return !!state.fullySpoiled;
}

export function setFullySpoiled(value = true) {
  if (state.fullySpoiled === value) return;
  state.fullySpoiled = value;
  scheduleFlush();
  notify();
}

// ── прямой доступ (осторожно) ──────────────────────────────────

export function getState() {
  return state;
}

// Гидратация на импорте. Если window.fs уже есть — прочитает .arkh.
// Если нет — прочитает localStorage. Если и его нет — начнёт с пустого.
if (typeof window !== 'undefined') {
  hydrateArchivist();
}