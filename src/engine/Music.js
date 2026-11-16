import { initStrudel, evaluate, stack } from '@strudel/web';

const TRANSITION_CYCLES = 3;

function fadePattern(pattern, startCycle, duration, direction) {
  return pattern.withHaps((haps) => haps.map((hap) => {
    if (!hap.value || typeof hap.value !== 'object') return hap;
    const cycle = Number(hap.whole?.begin);
    if (!Number.isFinite(cycle)) return hap;

    const progress = Math.max(0, Math.min(1, (cycle - startCycle) / duration));
    const envelope = direction === 'in'
      ? Math.sin(progress * Math.PI / 2)
      : Math.cos(progress * Math.PI / 2);
    const gain = typeof hap.value.gain === 'number' ? hap.value.gain : 1;
    return hap.withValue({ ...hap.value, gain: gain * envelope });
  }));
}

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
    this._activePattern = null;
    this._activeCode = '';
    this._desiredCode = '';
    this._transitionPromise = null;
    this._transitionTimer = null;
    this._transitionToken = 0;
  }

  async load(code) {
    if (this._loading || this.ready || this._destroyed) return;
    this._loading = true;
    this.code = code;

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
      const result = await evaluate(code);
      if (this._destroyed) return;

      this.pattern =
        result?.pattern ||
        result?.meta?.pattern ||
        repl?.state?.pattern ||
        null;
      this._activePattern = this.pattern;
      this._activeCode = code;

      this.miniLocations =
        result?.miniLocations ||
        result?.meta?.miniLocations ||
        repl?.state?.meta?.miniLocations ||
        repl?.state?.miniLocations ||
        null;

      this.ready = true;
      for (const fn of this._readyListeners) fn(this);
      if (this._desiredCode && this._desiredCode !== this._activeCode) {
        this.transitionTo(this._desiredCode).catch((error) => {
          console.error('[Music] Failed to apply queued transition:', error);
        });
      }
    } finally {
      this._loading = false;
    }
  }

  onReady(fn) {
    if (this.ready) fn(this);
    else this._readyListeners.add(fn);
    return () => this._readyListeners.delete(fn);
  }

  transitionTo(code) {
    if (typeof code !== 'string' || !code.trim()) {
      return Promise.reject(new TypeError('Music transition requires non-empty Strudel code.'));
    }

    this._desiredCode = code;
    if (!this.ready || this._destroyed || code === this._activeCode) {
      return Promise.resolve();
    }
    if (this._transitionPromise) return this._transitionPromise;

    this._transitionPromise = this._drainTransitions().finally(() => {
      this._transitionPromise = null;
      if (this.ready && !this._destroyed && this._desiredCode !== this._activeCode) {
        this.transitionTo(this._desiredCode).catch((error) => {
          console.error('[Music] Failed to apply queued transition:', error);
        });
      }
    });
    return this._transitionPromise;
  }

  async _drainTransitions() {
    while (this.ready && !this._destroyed && this._desiredCode !== this._activeCode) {
      const code = this._desiredCode;
      const outgoing = this._activePattern;
      const incoming = await this.repl.evaluate(code, false, false);
      if (!incoming?._Pattern) {
        throw new Error('Strudel did not produce a pattern for the requested zone.');
      }
      if (code !== this._desiredCode) {
        await this.repl.setPattern(outgoing, false);
        continue;
      }

      const startCycle = Math.ceil(this.repl.scheduler.now());
      const duration = TRANSITION_CYCLES;
      const mixed = stack(
        fadePattern(outgoing, startCycle, duration, 'out'),
        fadePattern(incoming, startCycle, duration, 'in'),
      );
      await this.repl.setPattern(mixed, true);

      clearTimeout(this._transitionTimer);
      const token = ++this._transitionToken;
      this._activePattern = mixed;
      this._activeCode = code;
      this.pattern = mixed;
      this._transitionTimer = setTimeout(() => {
        if (token !== this._transitionToken || this._destroyed) return;
        this.repl.setPattern(incoming, false);
        this._activePattern = incoming;
        this.pattern = incoming;
        this._transitionTimer = null;
      }, (duration / this.repl.scheduler.cps) * 1000);
    }
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
    clearTimeout(this._transitionTimer);
    this._readyListeners.clear();
    this.repl = null;
    this.pattern = null;
    this.miniLocations = null;
    this._activePattern = null;
  }
}