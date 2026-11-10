import { Matrix } from './Matrix.js';
import { PhysicsLoop } from './PhysicsLoop.js';
import { Music } from './Music.js';

export class Engine {
  constructor({ width, height, tps = 60 }) {
    this.width = width;
    this.height = height;

    this.matrix = new Matrix(width, height);
    this.physics = new PhysicsLoop({ tps });
    this.music = new Music();

    this.pointer = { px: -9999, py: -9999, cx: -1, cy: -1, inside: false };

    this.pixiGrid = null;
    this._gridReadyListeners = new Set();

    this._renderHooks = new Set();
    this._listeners = new Map();

    this._unsubMatrixChange = this.matrix.on('change', (c) => this._emit('cell:change', c));
    this._unsubTick = this.physics.onTick((dt, frame) => this._emit('tick', { dt, frame }));
  }

  // ─── ЕДИНАЯ ТОЧКА ЗАПИСИ ────────────────────────────────────────────

  setCell(x, y, charOrPatch, opts) { return this.matrix.set(x, y, charOrPatch, opts); }
  getCell(x, y)                    { return this.matrix.get(x, y); }
  write(x, y, text, opts)          { return this.matrix.write(x, y, text, opts); }
  clear()                          { return this.matrix.clear(); }
  batch(fn)                        { return this.matrix.batch(fn); }

  // ─── УКАЗАТЕЛЬ ──────────────────────────────────────────────────────

  setPointer(px, py, inside = true) {
    if (!Number.isFinite(px) || !Number.isFinite(py)) {
      throw new TypeError(`[Engine.setPointer] px/py must be finite, got (${px}, ${py})`);
    }
    this.pointer.px = px;
    this.pointer.py = py;
    this.pointer.cx = Math.floor(px / 16);
    this.pointer.cy = Math.floor(py / 16);
    this.pointer.inside = !!inside;
  }

  clearPointer() {
    this.pointer.px = -9999;
    this.pointer.py = -9999;
    this.pointer.cx = -1;
    this.pointer.cy = -1;
    this.pointer.inside = false;
  }

  // ─── РАЗМЕР ─────────────────────────────────────────────────────────

  resize(width, height) {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.matrix.resize(width, height);
    this._emit('resize', { width, height });
  }

  // ─── ЦИКЛЫ ──────────────────────────────────────────────────────────

  onTick(fn)   { return this.physics.onTick(fn); }

  onRender(fn) {
    this._renderHooks.add(fn);
    return () => this._renderHooks.delete(fn);
  }

  getRenderHooks() { return this._renderHooks; }

  // ─── PIXI GRID ──────────────────────────────────────────────────────

  setGrid(grid) {
    this.pixiGrid = grid;
    if (!grid) return;
    for (const fn of this._gridReadyListeners) fn(grid);
  }

  onGridReady(fn) {
    if (this.pixiGrid) fn(this.pixiGrid);
    else this._gridReadyListeners.add(fn);
    return () => this._gridReadyListeners.delete(fn);
  }

  // ─── СОБЫТИЯ ────────────────────────────────────────────────────────

  on(evt, fn) {
    if (!this._listeners.has(evt)) this._listeners.set(evt, new Set());
    this._listeners.get(evt).add(fn);
    return () => {
      const s = this._listeners.get(evt);
      if (s) s.delete(fn);
    };
  }

  _emit(evt, payload) {
    const s = this._listeners.get(evt);
    if (s) for (const fn of s) fn(payload);
  }

  // ─── ЖИЗНЕННЫЙ ЦИКЛ ─────────────────────────────────────────────────

  start() { this.physics.start(); }
  stop()  { this.physics.stop(); }

  destroy() {
    this._unsubMatrixChange?.();
    this._unsubTick?.();
    this.physics.stop();
    this.music.destroy();
    this._gridReadyListeners.clear();
    this._renderHooks.clear();
    this._listeners.clear();
    this.pixiGrid = null;
  }
}