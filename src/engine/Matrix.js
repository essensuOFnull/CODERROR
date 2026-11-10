const EMPTY = Object.freeze({
  char: ' ',
  fg: null,
  alpha: 1,
  bg: null,
  bgAlpha: 0,
});

const isColor = (v) => Number.isInteger(v) && v >= 0 && v <= 0xffffff;
const isAlpha = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;

export class Matrix {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.cells = new Array(width * height).fill(null);

    this._dirty = new Set();
    this._batchDirty = new Set();
    this._batchDepth = 0;
    this._listeners = new Map();
  }

  inBounds(x, y) {
    return Number.isInteger(x) && Number.isInteger(y)
      && x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  _idx(x, y) {
    return y * this.width + x;
  }

  get(x, y) {
    return this.inBounds(x, y) ? this.cells[this._idx(x, y)] || EMPTY : EMPTY;
  }

  /**
   * Единственная точка записи в мир.
   *
   *   set(x, y, 'Ж')                    — только символ
   *   set(x, y, 'Ж', { fg: 0xff0000 })  — символ + атрибуты
   *   set(x, y, { alpha: 0 })           — только атрибут
   *
   * Указанные поля обязаны быть валидными — иначе TypeError.
   * Неуказанные поля не трогаем.
   */
  set(x, y, charOrPatch, opts) {
    if (!this.inBounds(x, y)) {
      throw new RangeError(`[Matrix.set] out of bounds: (${x}, ${y}) for ${this.width}x${this.height}`);
    }

    const patch = typeof charOrPatch === 'string'
      ? { ...(opts || {}), char: charOrPatch }
      : charOrPatch;

    if (!patch || typeof patch !== 'object') {
      throw new TypeError(`[Matrix.set] patch must be object or char, got ${typeof patch}`);
    }
    if (patch.char !== undefined && (typeof patch.char !== 'string' || patch.char.length === 0)) {
      throw new TypeError(`[Matrix.set] char must be non-empty string, got ${JSON.stringify(patch.char)}`);
    }
    if (patch.fg !== undefined && patch.fg !== null && !isColor(patch.fg)) {
      throw new TypeError(`[Matrix.set] fg must be int 0..0xffffff or null, got ${patch.fg}`);
    }
    if (patch.bg !== undefined && patch.bg !== null && !isColor(patch.bg)) {
      throw new TypeError(`[Matrix.set] bg must be int 0..0xffffff or null, got ${patch.bg}`);
    }
    if (patch.alpha !== undefined && !isAlpha(patch.alpha)) {
      throw new TypeError(`[Matrix.set] alpha must be number 0..1, got ${patch.alpha}`);
    }
    if (patch.bgAlpha !== undefined && !isAlpha(patch.bgAlpha)) {
      throw new TypeError(`[Matrix.set] bgAlpha must be number 0..1, got ${patch.bgAlpha}`);
    }

    const idx = this._idx(x, y);
    const prev = this.cells[idx] || EMPTY;

    const next = {
      char:    patch.char    !== undefined ? patch.char    : prev.char,
      fg:      patch.fg      !== undefined ? patch.fg      : prev.fg,
      alpha:   patch.alpha   !== undefined ? patch.alpha   : prev.alpha,
      bg:      patch.bg      !== undefined ? patch.bg      : prev.bg,
      bgAlpha: patch.bgAlpha !== undefined ? patch.bgAlpha : prev.bgAlpha,
    };

    if (prev.char === next.char
        && prev.fg === next.fg
        && prev.alpha === next.alpha
        && prev.bg === next.bg
        && prev.bgAlpha === next.bgAlpha) {
      return false;
    }

    this.cells[idx] = next;

    if (this._batchDepth > 0) {
      this._batchDirty.add(idx);
    } else {
      this._dirty.add(idx);
      this._emit('change', { idx, x, y, ...next });
    }
    return true;
  }

  write(x, y, text, opts) {
    for (let i = 0; i < text.length; i++) {
      this.set(x + i, y, text[i], opts);
    }
  }

  clear() {
    this.batch(() => {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          this.set(x, y, ' ');
        }
      }
    });
  }

  batch(fn) {
    this._batchDepth++;
    try { fn(); }
    finally {
      this._batchDepth--;
      if (this._batchDepth === 0 && this._batchDirty.size > 0) {
        for (const idx of this._batchDirty) this._dirty.add(idx);
        this._batchDirty.clear();
      }
    }
  }

  flushDirty() {
    if (this._dirty.size === 0) return null;
    const arr = Array.from(this._dirty);
    this._dirty.clear();
    return arr;
  }

  resize(width, height) {
    if (width === this.width && height === this.height) return;

    const oldCells = this.cells;
    const oldW = this.width;
    const oldH = this.height;

    this.cells = new Array(width * height).fill(null);

    const copyW = Math.min(width, oldW);
    const copyH = Math.min(height, oldH);
    for (let y = 0; y < copyH; y++) {
      for (let x = 0; x < copyW; x++) {
        this.cells[y * width + x] = oldCells[y * oldW + x];
      }
    }

    this.width = width;
    this.height = height;

    this._dirty.clear();
    this._batchDirty.clear();
    for (let i = 0; i < this.cells.length; i++) this._dirty.add(i);

    this._emit('resize', { width, height });
  }

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
}