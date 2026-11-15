const COLORS = {
  residue: 0x83a6b8,
  deepRock: 0x343b49,
  seam: 0x927c9f,
  player: 0xffd36a,
};

const SAFE_RADIUS = 50;
const BARRIER_SPACING = 256;
const WORLD_RADIUS = SAFE_RADIUS + BARRIER_SPACING * 7;
export const VOID_SHIELD_LAYOUT = {
  safeRadius: SAFE_RADIUS,
  barrierSpacing: BARRIER_SPACING,
  worldRadius: WORLD_RADIUS,
};
const BIOME_TINTS = [
  0xd4d8df,
  0xffd95e,
  0xff67e8,
  0xff6964,
  0x5beaff,
  0x70ed70,
  0x6487ff,
];
const COURSE_LENGTHS = [0, 0, 0, 15, 18, 16, 14];
const COURSE_GAP_WIDTHS = [0, 0, 0, 3, 5, 4, 4];

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

export function difficultyAt(x) {
  const radius = Math.abs(x);
  if (radius < SAFE_RADIUS) return 0;
  return Math.min(6, Math.floor((radius - SAFE_RADIUS) / BARRIER_SPACING) + 1);
}

function baselineAt(seed) {
  return Math.floor(16 + Math.sin(seed * 0.00001) * 1.5);
}

function courseAt(radius, difficulty, seed, baseline) {
  const start = SAFE_RADIUS + (difficulty - 1) * BARRIER_SPACING;
  const length = COURSE_LENGTHS[difficulty];
  const offset = radius - start;
  const segment = Math.floor(offset / length);
  const local = positiveMod(offset, length);
  const random = hash(segment, difficulty, seed + 31);
  const platformLength = length - COURSE_GAP_WIDTHS[difficulty]
    - Math.floor(hash(segment, difficulty, seed + 37) * 2);
  const height = Math.floor(random * 3) - 1;
  const platformSurface = baseline + height;
  const inPit = local >= platformLength;
  const pitDepth = difficulty === 3 ? 1 : difficulty === 4 ? 10 : 9;

  return {
    difficulty,
    segment,
    length,
    local,
    platformLength,
    platformSurface,
    inPit,
    pitDepth,
    surface: platformSurface + (inPit ? pitDepth : 0),
  };
}

function terrainProfile(x, seed) {
  const radius = Math.abs(x);
  const baseline = baselineAt(seed);
  const difficulty = difficultyAt(x);
  let surface = baseline;
  let course = null;

  if (difficulty === 1) {
    surface += valueNoise(radius, seed, 24, 5) * 1.2
      + valueNoise(radius, seed, 8, 6) * 0.5;
  } else if (difficulty === 2) {
    surface += valueNoise(radius, seed, 44, 7) * 3.2
      + valueNoise(radius, seed, 15, 8) * 1.9
      + valueNoise(radius, seed, 5, 9) * 0.9;
  } else if (difficulty >= 3) {
    course = courseAt(radius, difficulty, seed, baseline);
    surface = course.surface;
  }

  return {
    radius,
    difficulty,
    surface: Math.floor(surface),
    course,
  };
}

export function surfaceAt(x, seed) {
  return terrainProfile(x, seed).surface;
}

export function fallRecoveryAt(x, y, seed) {
  const profile = terrainProfile(x, seed);
  const course = profile.course;
  if (profile.difficulty !== 4 || !course?.inPit
    || y < course.platformSurface + course.pitDepth - 2) return null;

  const zoneStart = SAFE_RADIUS + (profile.difficulty - 1) * BARRIER_SPACING;
  const retryRadius = zoneStart + course.segment * course.length + 1;
  const retryX = Math.sign(x || 1) * retryRadius;
  return { x: retryX, y: surfaceAt(retryX, seed) };
}

function isMazeWall(profile, y, seed) {
  const course = profile.course;
  if (profile.difficulty !== 6 || !course || course.inPit) return false;
  const wallPosition = course.platformLength - 2;
  if (course.local < wallPosition || course.local >= wallPosition + 1) return false;
  const wallHeight = 1 + Math.floor(hash(course.segment, 0, seed + 43) * 2);
  return y >= course.platformSurface - wallHeight && y < course.platformSurface;
}

function spikeAt(profile, x, seed) {
  const course = profile.course;
  if (!course || profile.difficulty < 5) return false;
  if (course.inPit) {
    return hash(x, course.segment, seed + 47) > (profile.difficulty === 6 ? 0.28 : 0.48);
  }
  return profile.difficulty === 6
    && hash(x, course.segment, seed + 53) > 0.94;
}

function blendColors(first, second, amount) {
  const red = Math.round(((first >> 16) & 0xff) * (1 - amount) + ((second >> 16) & 0xff) * amount);
  const green = Math.round(((first >> 8) & 0xff) * (1 - amount) + ((second >> 8) & 0xff) * amount);
  const blue = Math.round((first & 0xff) * (1 - amount) + (second & 0xff) * amount);
  return (red << 16) | (green << 8) | blue;
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
        if (Math.abs(x) >= WORLD_RADIUS) {
          return {
            char: '█',
            fg: 0x262626,
            bg: 0x000000,
            bgAlpha: 1,
          };
        }

        const profile = terrainProfile(x, seed);
        if (isMazeWall(profile, y, seed)) {
          return {
            char: '▓',
            fg: BIOME_TINTS[profile.difficulty],
            bg: COLORS.deepRock,
            bgAlpha: 1,
          };
        }

        const depth = y - profile.surface;
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

        if (surface && spikeAt(profile, x, seed)) {
          return {
            char: glyphs.includes('▲') ? '▲' : '^',
            fg: 0x7dff83,
            bg: COLORS.deepRock,
            bgAlpha: 1,
            hazard: 'spike',
          };
        }

        const unicodeGlyph = glyphs[Math.floor(random('unicode-glyph') * glyphs.length)];
        const strataColor = strataColors[Math.floor(random('strata-color') * strataColors.length)];
        return {
          char: unicodeGlyph ?? (surface ? '▓' : depth < 3 ? '▒' : '░'),
          fg: blendColors(
            seam ? COLORS.seam : surface ? COLORS.deepRock : depth < 3 ? 0x626e83 : strataColor,
            BIOME_TINTS[profile.difficulty],
            0.28,
          ),
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
