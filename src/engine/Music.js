import { initStrudel, evaluate, stack } from '@strudel/web';

const DEFAULT_CROSSFADE_SECONDS = 4;

function fadePattern(pattern, startCycle, durationCycles, direction) {
  return pattern.withHaps((haps) => haps.map((hap) => {
    if (!hap.value || typeof hap.value !== 'object') return hap;
    const cycle = Number(hap.whole?.begin);
    if (!Number.isFinite(cycle)) return hap;

    const progress = Math.max(0, Math.min(1, (cycle - startCycle) / durationCycles));
    const envelope = direction === 'in'
      ? Math.sin(progress * Math.PI / 2)
      : Math.cos(progress * Math.PI / 2);
    return hap.withValue((value) => ({
      ...value,
      gain: (typeof value.gain === 'number' ? value.gain : 1) * envelope,
    }));
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
    this._desiredDuration = DEFAULT_CROSSFADE_SECONDS;
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
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (this._destroyed || !code) return;

      const result = await evaluate(code);
      if (this._destroyed) return;

      this.pattern =
        result?.pattern ||
        result?.meta?.pattern ||
        repl?.state?.pattern ||
        result;
      if (!this.pattern?._Pattern) {
        throw new Error('Strudel did not produce a pattern for the initial track.');
      }
      this._activePattern = this.pattern;
      this._activeCode = code;

      this.miniLocations =
        result?.miniLocations ||
        result?.meta?.miniLocations ||
        repl?.state?.meta?.miniLocations ||
        repl?.state?.miniLocations ||
        null;

      this.ready = true;
      for (const listener of this._readyListeners) listener(this);
      if (this._desiredCode && this._desiredCode !== this._activeCode) {
        this._startQueuedTransition().catch((error) => {
          console.error('[Music] Failed to apply queued transition:', error);
        });
      }
    } finally {
      this._loading = false;
    }
  }

  onReady(listener) {
    if (this.ready) listener(this);
    else this._readyListeners.add(listener);
    return () => this._readyListeners.delete(listener);
  }

  transitionTo(code, { duration = DEFAULT_CROSSFADE_SECONDS } = {}) {
    if (typeof code !== 'string' || !code.trim()) {
      return Promise.reject(new TypeError('Music transition requires non-empty Strudel code.'));
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      return Promise.reject(new TypeError('Music crossfade duration must be a positive number.'));
    }

    this._desiredCode = code;
    this._desiredDuration = duration;
    if (!this.ready || this._destroyed || code === this._activeCode) {
      return Promise.resolve();
    }
    return this._startQueuedTransition();
  }

  _startQueuedTransition() {
    if (this._transitionPromise) return this._transitionPromise;

    this._transitionPromise = this._drainTransitions().catch((error) => {
      this._desiredCode = this._activeCode;
      throw error;
    }).finally(() => {
      this._transitionPromise = null;
      if (
        this.ready &&
        !this._destroyed &&
        this._desiredCode &&
        this._desiredCode !== this._activeCode
      ) {
        this._startQueuedTransition().catch((error) => {
          console.error('[Music] Failed to apply queued transition:', error);
        });
      }
    });
    return this._transitionPromise;
  }

  async _drainTransitions() {
    while (
      this.ready &&
      !this._destroyed &&
      this._desiredCode !== this._activeCode
    ) {
      const code = this._desiredCode;
      const outgoing = this._activePattern;
      const incoming = await this.repl.evaluate(code, false, false);
      await this.repl.setPattern(outgoing, false);
      if (!incoming?._Pattern) {
        throw new Error('Strudel did not produce a pattern for the requested track.');
      }
      if (code !== this._desiredCode) {
        continue;
      }

      const duration = this._desiredDuration;
      const startCycle = this.repl.scheduler.now();
      const durationCycles = duration * this.repl.scheduler.cps;
      const mixed = stack(
        fadePattern(outgoing, startCycle, durationCycles, 'out'),
        fadePattern(incoming, startCycle, durationCycles, 'in'),
      );
      await this.repl.setPattern(mixed, true);

      clearTimeout(this._transitionTimer);
      const token = ++this._transitionToken;
      const endCycle = startCycle + durationCycles;
      this._activePattern = mixed;
      this._activeCode = code;
      this.pattern = mixed;
      this._transitionTimer = setTimeout(() => {
        if (token !== this._transitionToken || this._destroyed) return;
        this.repl.setPattern(incoming, false);
        this._activePattern = incoming;
        this.pattern = incoming;
        this._transitionTimer = null;
      }, Math.max(0, (endCycle - startCycle) / this.repl.scheduler.cps) * 1000);
    }
  }

  queryHaps() {
    if (!this.repl || !this.pattern) return null;
    const now = typeof this.repl.scheduler?.now === 'function'
      ? this.repl.scheduler.now()
      : 0;
    const haps = this.pattern
      .queryArc(now, now + 1 / 120)
      .filter((hap) => hap.hasOnset());
    return { now, haps };
  }

  destroy() {
    this._destroyed = true;
    clearTimeout(this._transitionTimer);
    this._transitionToken += 1;
    this._readyListeners.clear();
    this.repl?.stop?.();
    this.repl = null;
    this.pattern = null;
    this.miniLocations = null;
    this._activePattern = null;
  }
}
