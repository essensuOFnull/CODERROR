function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFor(seed, x, y, salt = '') {
  let value = (seed ^ Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca77)
    ^ hashString(salt)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000;
}

export class RoomRuntime {
  constructor(definition, seed = Math.floor(Math.random() * 0x100000000), glyphs = []) {
    if (!definition || !Array.isArray(definition.layers)) {
      throw new TypeError('Room definition must provide a layers array');
    }

    this.definition = definition;
    this.seed = seed >>> 0;
    this.glyphs = glyphs;
    this.chunkSize = definition.chunkSize ?? 32;
    if (!Number.isInteger(this.chunkSize) || this.chunkSize < 1) {
      throw new RangeError('Room chunkSize must be a positive integer');
    }

    this.layers = [...definition.layers].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    this.chunks = new Map();
    this.approached = new Set();
  }

  getTile(layer, x, y) {
    const chunkX = Math.floor(x / this.chunkSize);
    const chunkY = Math.floor(y / this.chunkSize);
    const key = `${layer.id}:${chunkX}:${chunkY}`;
    let chunk = this.chunks.get(key);

    if (chunk) {
      this.chunks.delete(key);
      this.chunks.set(key, chunk);
    } else {
      chunk = new Array(this.chunkSize * this.chunkSize);
      for (let localY = 0; localY < this.chunkSize; localY++) {
        for (let localX = 0; localX < this.chunkSize; localX++) {
          const worldX = chunkX * this.chunkSize + localX;
          const worldY = chunkY * this.chunkSize + localY;
          chunk[localY * this.chunkSize + localX] = layer.generateTile?.({
            x: worldX,
            y: worldY,
            seed: this.seed,
            glyphs: this.glyphs,
            random: (salt) => randomFor(this.seed, worldX, worldY, salt),
          }) ?? null;
        }
      }
      this.chunks.set(key, chunk);
      if (this.chunks.size > 128) {
        this.chunks.delete(this.chunks.keys().next().value);
      }
    }

    const localX = ((x % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const localY = ((y % this.chunkSize) + this.chunkSize) % this.chunkSize;
    return chunk[localY * this.chunkSize + localX];
  }

  getCell(x, y) {
    const cell = {};
    for (const layer of this.layers) {
      const tile = this.getTile(layer, x, y);
      if (!tile) continue;
      if (layer.kind === 'text' && tile.char !== undefined) {
        cell.char = tile.char;
        cell.fg = tile.fg ?? layer.fg;
        cell.bg = tile.bg ?? layer.bg;
        cell.bgAlpha = tile.bgAlpha ?? layer.bgAlpha;
      }
      if (layer.collision && tile.solid !== false) cell.solid = true;
      if (tile.onApproach) cell.onApproach = tile.onApproach;
    }
    return cell;
  }

  isSolid(x, y) {
    return this.getCell(Math.floor(x), Math.floor(y)).solid === true;
  }

  update(context) {
    this.definition.hooks?.onTick?.({ ...context, room: this });

    const radius = this.definition.approachRadius ?? 1.5;
    const minX = Math.floor(context.player.x - radius);
    const maxX = Math.ceil(context.player.x + radius);
    const minY = Math.floor(context.player.y - radius);
    const maxY = Math.ceil(context.player.y + radius);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const key = `${x}:${y}`;
        if (this.approached.has(key)) continue;
        const tile = this.getCell(x, y);
        if (!tile.onApproach || Math.hypot(context.player.x - x - 0.5, context.player.y - y - 0.5) > radius) continue;
        this.approached.add(key);
        tile.onApproach({ ...context, room: this, x, y });
      }
    }
  }

  dispose() {
    this.definition.hooks?.onExit?.({ room: this, seed: this.seed });
    this.chunks.clear();
    this.approached.clear();
  }
}
