import * as PIXI from 'pixi.js';
import { getFontAtlas } from './FontAtlas.js';
import { createVoidGroundFilter } from './VoidGroundFilter.js';

const PIXI_V8 = parseInt((PIXI.VERSION || '7').split('.')[0], 10) >= 8;

async function createPixiApp(canvas, width, height) {
  if (PIXI_V8) {
    const app = new PIXI.Application();
    await app.init({
      canvas,
      width,
      height,
      resolution: 1,
      autoDensity: false,
      backgroundAlpha: 0,
      antialias: false,
      preference: 'webgl',
    });
    return app;
  }
  return new PIXI.Application({
    view: canvas,
    width, height,
    resolution: 1,
    autoDensity: false,
    backgroundAlpha: 0,
    antialias: false,
  });
}

export class PixiGrid {
  constructor({ canvas, width, height, cellWidth, cellHeight, matrix, fontFamily }) {
    this.canvas = canvas;
    this.matrix = matrix;
    this.width = width;
    this.height = height;
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;

    this.app = null;
    this.container = null;
    this.overlayContainer = null;
    this.textures = null;
    this._pages = [];
    this._voidFilter = null;
    this._voidUniforms = null;
    this._voidEffectsEnabled = false;
    this._voidTime = 0;

    // Публичное: используется рендер-эффектами снаружи
    this.cells = [];
    this.overlays = new Map();

    this._fontFamily = fontFamily;
    this._ready = false;
    this._destroyed = false;
    this._getRenderHooks = null;
    this._tickerFn = null;
  }

  async load() {
    if (this._destroyed) return;

    const app = await createPixiApp(
      this.canvas,
      this.width * this.cellWidth,
      this.height * this.cellHeight,
    );

    if (this._destroyed) { try { app.destroy(true); } catch (_) {} return; }
    this.app = app;

    this.container = new PIXI.Container();
    this.app.stage.addChild(this.container);
    this.overlayContainer = new PIXI.Container();
    this.app.stage.addChild(this.overlayContainer);
    const voidShader = createVoidGroundFilter();
    this._voidFilter = voidShader.filter;
    this._voidUniforms = voidShader.uniforms;

    this.textures = await getFontAtlas(
      this.cellWidth,
      this.cellHeight,
      this._fontFamily,
      1024,
    );
    if (this._destroyed) return;
    this._pages = this.textures.pages || [];

    this._buildCells();
    this._ready = true;

    this._tickerFn = () => {
      const deltaMs = this.app.ticker.deltaMS;
      this._voidTime += deltaMs / 1000;
      if (this._voidUniforms) {
        this._voidUniforms.uniforms.uTime = this._voidTime;
      }
      const hooks = this._getRenderHooks?.();
      if (hooks) for (const fn of hooks) fn(deltaMs, this);
      this.applyDirty();
    };
    this.app.ticker.add(this._tickerFn);
    if (!this.app.ticker.started) this.app.ticker.start();
  }

  _buildCells() {
    for (const c of this.cells) {
      try { c.bg.destroy(); c.sprite.destroy(); } catch (_) {}
    }
    for (const sprite of this.overlays.values()) {
      try { sprite.destroy(); } catch (_) {}
    }
    this.overlays.clear();
    this.cells = [];
    this.container.removeChildren();
    this.overlayContainer.removeChildren();
    this.container.filterArea = new PIXI.Rectangle(
      0,
      0,
      this.width * this.cellWidth,
      this.height * this.cellHeight,
    );

    const chars = Array.from(this.textures.keys());
    if (chars.length === 0) throw new Error('[PixiGrid] font atlas is empty');

    const { cellWidth: cw, cellHeight: ch, width: cols, height: rows } = this;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = x * cw;
        const py = y * ch;

        const bg = new PIXI.Sprite(PIXI.Texture.WHITE);
        bg.x = px; bg.y = py;
        bg.width = cw; bg.height = ch;
        bg.alpha = 0;
        this.container.addChild(bg);

        const ch0 = chars[(x + y * cols) % chars.length];
        const sprite = new PIXI.Sprite(this.textures.get(ch0));
        sprite.x = px; sprite.y = py;
        sprite.width = cw; sprite.height = ch;
        sprite.alpha = 1;
        this.container.addChild(sprite);

        this.cells.push({ bg, sprite });
      }
    }
  }

  bindRenderHooks(getHooks) {
    this._getRenderHooks = getHooks;
  }

  setCameraOffset(x, y) {
    this.canvas.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  setVoidEffects(enabled) {
    this._voidEffectsEnabled = Boolean(enabled);
    this.canvas.style.background = this._voidEffectsEnabled ? '#03050b' : 'rgba(0, 0, 0, 0)';
    if (this.container) {
      this.container.filters = this._voidEffectsEnabled ? [this._voidFilter] : [];
    }
  }

  setOverlay(id, {
    char,
    x,
    y,
    width = this.cellWidth,
    height = this.cellHeight,
    fg = 0xffffff,
    alpha = 1,
  }) {
    if (!this._ready) return;
    const texture = this.textures.get(char);
    if (!texture) return;
    if (![x, y, width, height, alpha].every(Number.isFinite) || width <= 0 || height <= 0) {
      throw new TypeError('Overlay coordinates and dimensions must be finite and dimensions positive');
    }

    let sprite = this.overlays.get(id);
    if (!sprite) {
      sprite = new PIXI.Sprite(texture);
      this.overlays.set(id, sprite);
      this.overlayContainer.addChild(sprite);
    }

    sprite.texture = texture;
    sprite.x = x;
    sprite.y = y;
    sprite.width = width;
    sprite.height = height;
    sprite.tint = fg;
    sprite.alpha = alpha;
    sprite.visible = true;
  }

  removeOverlay(id) {
    const sprite = this.overlays.get(id);
    if (!sprite) return;
    this.overlays.delete(id);
    this.overlayContainer.removeChild(sprite);
    sprite.destroy();
  }

  applyDirty() {
    if (!this._ready) return;
    const dirty = this.matrix.flushDirty();
    if (!dirty) return;
    for (const idx of dirty) this._applyCell(idx);
  }

  _applyCell(idx) {
    const m = this.matrix.cells[idx];
    const t = this.cells[idx];
    if (!t || !m) return;

    if (m.char === ' ') {
      t.sprite.visible = false;
    } else {
      const tex = this.textures.get(m.char);
      if (tex) {
        t.sprite.texture = tex;
        t.sprite.visible = true;
      }
    }

    t.sprite.tint = m.fg ?? 0xffffff;
    t.sprite.alpha = m.alpha;

    t.bg.tint = m.bg ?? 0xffffff;
    t.bg.alpha = m.bgAlpha;
  }

  resize(width, height, cellWidth, cellHeight) {
    this.width = width;
    this.height = height;
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;

    if (!this.app) return;
    this.app.renderer.resize(width * cellWidth, height * cellHeight);
    if (this._ready) {
      this._buildCells();
      this.container.filterArea = new PIXI.Rectangle(
        0,
        0,
        width * cellWidth,
        height * cellHeight,
      );
      this.setVoidEffects(this._voidEffectsEnabled);
    }
  }

  destroy() {
    this._destroyed = true;
    if (!this.app) return;

    if (this._tickerFn) {
      try { this.app.ticker.remove(this._tickerFn); } catch (_) {}
      this._tickerFn = null;
    }

    this.cells = [];
    this.overlays.clear();
    this.textures = null;
    this.canvas.style.transform = '';
    this._voidFilter?.destroy();
    this._voidFilter = null;
    this._voidUniforms = null;

    for (const p of this._pages) {
      try { p.source?.destroy?.(); p.destroy?.(); } catch (_) {}
    }
    this._pages = null;

    this._ready = false;
    try {
      this.app.destroy(true, { children: true, texture: true, baseTexture: true });
    } catch (_) {}
    this.app = null;
    this.container = null;
    this.overlayContainer = null;
  }
}