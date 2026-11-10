export class PhysicsLoop {
  constructor({ tps = 60, maxStepsPerFrame = 5 } = {}) {
    this.tps = tps;
    this._step = 1000 / tps;
    this._maxSteps = maxStepsPerFrame;
    this._handlers = new Set();
    this._frame = 0;
    this._acc = 0;
    this._last = 0;
    this._raf = null;
    this._running = false;
  }

  onTick(fn) {
    this._handlers.add(fn);
    return () => this._handlers.delete(fn);
  }

  setTPS(tps) {
    this.tps = tps;
    this._step = 1000 / tps;
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._last = performance.now();

    const loop = (now) => {
      if (!this._running) return;
      const dt = now - this._last;
      this._last = now;
      this._acc += dt;
      let steps = 0;
      while (this._acc >= this._step && steps < this._maxSteps) {
        this._acc -= this._step;
        this._frame++;
        for (const fn of this._handlers) fn(this._step, this._frame);
        steps++;
      }
      if (steps === this._maxSteps) this._acc = 0;
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }
}