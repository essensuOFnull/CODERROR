import { initStrudel, evaluate } from '@strudel/web';

export class Music {
  constructor() {
    this.repl = null;
    this.pattern = null;
    this.miniLocations = null;
    this.code = '';
    this.ready = false;

    this._loading = false;
    this._destroyed = false;
    this._readyListeners = new Set();
  }

  async load(code) {
    if (this._loading || this.ready || this._destroyed) return;
    this._loading = true;

    try {
      const repl = await initStrudel();
      if (this._destroyed) return;
      this.repl = repl;

      const resume = () => window.__strudelCtx?.resume?.();
      resume();
      document.addEventListener('click', resume, { once: true });

      await evaluate('stack()');
      await new Promise((r) => setTimeout(r, 800));
      if (this._destroyed) return;

      if (this._destroyed || !code) return;
      this.code = code;

      const result = await evaluate(code);
      if (this._destroyed) return;

      this.pattern =
        result?.pattern ||
        result?.meta?.pattern ||
        repl?.state?.pattern ||
        null;

      this.miniLocations =
        result?.miniLocations ||
        result?.meta?.miniLocations ||
        repl?.state?.meta?.miniLocations ||
        repl?.state?.miniLocations ||
        null;

      this.ready = true;
      for (const fn of this._readyListeners) fn(this);
    } finally {
      this._loading = false;
    }
  }

  onReady(fn) {
    if (this.ready) fn(this);
    else this._readyListeners.add(fn);
    return () => this._readyListeners.delete(fn);
  }

  queryHaps() {
    if (!this.repl || !this.pattern) return null;
    const now = typeof this.repl.scheduler?.now === 'function'
      ? this.repl.scheduler.now()
      : 0;
    const haps = this.pattern
      .queryArc(now, now + 1 / 120)
      .filter((h) => h.hasOnset());
    return { now, haps };
  }

  destroy() {
    this._destroyed = true;
    this._readyListeners.clear();
    this.repl = null;
    this.pattern = null;
    this.miniLocations = null;
  }
}