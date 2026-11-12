const COLORS = {
  residue: 0x83a6b8,
  deepRock: 0x343b49,
  seam: 0x927c9f,
  player: 0xffd36a,
};

const fragments = [
  'НЕ НАЙДЕНО',
  'старый индекс',
  'черновик',
  'без имени',
  '0000 0101',
  'обрывок памяти',
];
const strataColors = [0x343b49, 0x465367, 0x586579, 0x6a587b, 0x455f72];
const recoveredColors = [0x72aeb5, 0x9e91b5, 0xc49b70, 0x6f94bf];
const oreDepositsByData = new WeakMap();

function recoveredOreAt(x, y, depth, seed, recovered, glyphs) {
  if (depth < 2 || recovered.length === 0) return null;

  let oreCache = oreDepositsByData.get(recovered);
  if (!oreCache) {
    const maxFragmentLength = recovered.reduce(
      (max, fragment) => Math.max(max, fragment.terrainChars?.length ?? 0),
      0,
    );
    if (maxFragmentLength === 0) return null;
    const cellSize = Math.max(18, Math.ceil(Math.sqrt(maxFragmentLength) * 2) + 12);
    oreCache = { cellSize, deposits: new Map() };
    oreDepositsByData.set(recovered, oreCache);
  }
  const { cellSize, deposits } = oreCache;
  const regionX = Math.floor(x / cellSize);
  const regionDepth = Math.floor((depth - 12) / cellSize);

  for (let candidateDepth = regionDepth - 1; candidateDepth <= regionDepth + 1; candidateDepth++) {
    for (let candidateX = regionX - 1; candidateX <= regionX + 1; candidateX++) {
      const key = `${seed}:${cellSize}:${candidateX}:${candidateDepth}`;
      let deposit = deposits.get(key);
      if (deposit === undefined) {
        deposit = createRecoveredOre(
          candidateX,
          candidateDepth,
          cellSize,
          seed,
          recovered,
          glyphs,
        );
        if (deposits.size >= 512) deposits.delete(deposits.keys().next().value);
        deposits.set(key, deposit);
      }
      const tile = deposit?.get(`${x}:${y}`);
      if (tile) return tile;
    }
  }
  return null;
}

function createRecoveredOre(regionX, regionDepth, cellSize, seed, recovered, glyphs) {
  const depthParity = Math.floor(hash(regionX, 0, seed + 29) * 2);
  if (((regionDepth % 2) + 2) % 2 !== depthParity) return null;

  const fragment = recovered[
    Math.floor(hash(regionX, regionDepth, seed + 53) * recovered.length)
  ];
  const text = fragment.terrainChars;
  if (!text?.length) return null;

  const centerX = Math.floor(cellSize / 2)
    + Math.floor(hash(regionX, regionDepth, seed + 37) * 3) - 1;
  const centerY = Math.floor(cellSize / 2)
    + Math.floor(hash(regionX, regionDepth, seed + 41) * 3) - 1;
  const selected = new Set([centerY * cellSize + centerX]);
  const frontier = new Set();
  const addNeighbors = (index) => {
    const tileX = index % cellSize;
    const tileY = Math.floor(index / cellSize);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nextX = tileX + dx;
      const nextY = tileY + dy;
      const next = nextY * cellSize + nextX;
      if (nextX >= 0 && nextX < cellSize && nextY >= 0 && nextY < cellSize
        && !selected.has(next)) {
        frontier.add(next);
      }
    }
  };
  addNeighbors(centerY * cellSize + centerX);

  while (selected.size < text.length && frontier.size > 0) {
    let bestIndex = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const index of frontier) {
      const tileX = index % cellSize;
      const tileY = Math.floor(index / cellSize);
      const dx = tileX - centerX;
      const dy = tileY - centerY;
      const score = dx * dx + dy * dy
        + hash(regionX * cellSize + tileX, regionDepth * cellSize + tileY, seed + selected.size) * 3;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    frontier.delete(bestIndex);
    selected.add(bestIndex);
    addNeighbors(bestIndex);
  }

  const localTiles = Array.from(selected, (index, charIndex) => ({
    x: regionX * cellSize + index % cellSize,
    y: index,
    charIndex,
  }));
  const anchorX = regionX * cellSize + centerX;
  const anchorY = Math.floor(surfaceAt(anchorX, seed)) + 12 + regionDepth * cellSize;
  const verticalOffset = Math.max(
    0,
    ...localTiles.map(({ x, y }) => (
      surfaceAt(x, seed) + 2 - (anchorY + Math.floor(y / cellSize))
    )),
  );
  const color = recoveredColors[
    Math.floor(hash(regionX, regionDepth, seed + 61) * recoveredColors.length)
  ];
  const tiles = new Map();
  for (const { x, y, charIndex } of localTiles) {
    const sourceChar = text[charIndex];
    const char = glyphs.includes(sourceChar)
      ? sourceChar
      : glyphs[sourceChar.codePointAt(0) % glyphs.length];
    tiles.set(`${x}:${anchorY + verticalOffset + Math.floor(y / cellSize)}`, {
      char: char ?? '▒',
      fg: color,
      bg: COLORS.deepRock,
      bgAlpha: 1,
    });
  }
  return tiles;
}

export function surfaceAt(x, seed) {
  const baseline = Math.floor(16 + Math.sin(seed * 0.00001) * 1.5);
  if (x >= -4 && x <= 12) return baseline;

  const distance = x < -4 ? x + 4 : x - 12;
  const fade = Math.min(1, Math.abs(distance) / 8);
  const broad = valueNoise(x, seed, 48, 1) * 4.5;
  const medium = valueNoise(x, seed, 16, 2) * 2.2;
  const fine = valueNoise(x, seed, 5, 3) * 1.1;
  return Math.floor(baseline + (broad + medium + fine) * fade);
}

function hash(x, y, salt = 0) {
  let value = (x * 374761393 + y * 668265263 + salt * 1442695041) | 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000;
}

function valueNoise(x, seed, scale, salt) {
  const position = x / scale;
  const left = Math.floor(position);
  const amount = position - left;
  const blend = amount * amount * (3 - 2 * amount);
  const first = hash(left, seed, salt) * 2 - 1;
  const second = hash(left + 1, seed, salt) * 2 - 1;
  return first + (second - first) * blend;
}

function positiveMod(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

const voidRoom = {
  id: 'void',
  title: 'Пустота',
  chunkSize: 32,
  backgroundColor: 0x03050b,
  approachRadius: 2,
  effects: {
    ground: 'corruption',
  },
  layers: [
    {
      id: 'residue',
      kind: 'text',
      zIndex: 1,
      collision: false,
      generateTile({ x, y, random, glyphs, data }) {
        const recovered = data.recoveredFragments ?? [];
        if (data.scanCompleted && recovered.length === 0) return null;
        const residueChance = Math.min(
          0.035,
          0.0045 + Math.log2(recovered.length + 1) * 0.003,
        );
        if (random('residue') > residueChance) return null;
        const fragment = recovered.length
          ? recovered[Math.floor(random('fragment') * recovered.length)]
          : null;
        const label = fragment?.text ?? fragments[Math.floor(random('fragment') * fragments.length)];
        return {
          char: glyphs[Math.floor(random('unicode-glyph') * glyphs.length)] ?? label[0],
          fg: COLORS.residue,
          onApproach({ emit }) {
            emit({ type: 'fragment-found', title: label, x, y });
          },
        };
      },
    },
    {
      id: 'ground',
      kind: 'text',
      zIndex: 2,
      collision: true,
      generateTile({ x, y, seed, random, glyphs, data }) {
        const depth = y - surfaceAt(x, seed);
        if (depth < 0) return null;

        const recovered = data.recoveredFragments ?? [];
        const ore = recoveredOreAt(x, y, depth, seed, recovered, glyphs);
        if (ore) return ore;

        if (depth > 4 && hash(x, y, seed) < 0.075) return null;
        if (depth > 6 && hash(Math.floor(x / 3), Math.floor(y / 3), seed + 19) > 0.84) {
          return null;
        }
        const seam = hash(x, y, seed + 7) > 0.92;
        const surface = depth === 0;

        const unicodeGlyph = glyphs[Math.floor(random('unicode-glyph') * glyphs.length)];
        const strataColor = strataColors[Math.floor(random('strata-color') * strataColors.length)];
        return {
          char: unicodeGlyph ?? (surface ? '▓' : depth < 3 ? '▒' : '░'),
          fg: seam ? COLORS.seam : surface ? COLORS.deepRock : depth < 3 ? 0x626e83 : strataColor,
          bg: COLORS.deepRock,
          bgAlpha: 1,
        };
      },
    },
  ],
  hooks: {
    onEnter({ emit }) {
      emit({ type: 'notice', text: 'СИМБИОЗ СИСТЕМЫ И ПАМЯТИ // найденное становится ландшафтом' });
    },
  },
};

export default voidRoom;
