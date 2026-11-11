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

        if (depth > 4 && hash(x, y, seed) < 0.075) return null;
        if (depth > 6 && hash(Math.floor(x / 3), Math.floor(y / 3), seed + 19) > 0.84) {
          return null;
        }
        const seam = hash(x, y, seed + 7) > 0.92;
        const surface = depth === 0;
        const recovered = data.recoveredFragments ?? [];
        const recoveredCount = data.recoveredDataCount ?? recovered.length;
        const variety = Math.min(0.3, Math.log2(recoveredCount + 1) * 0.04);
        const recoveredChance = surface
          ? Math.min(0.82, 0.38 + variety)
          : Math.min(0.58, 0.24 + variety);
        if (recoveredCount > 0 && random('recovered-strata') < recoveredChance) {
          const regionX = Math.floor(x / 12);
          const regionDepth = Math.floor(depth / 8);
          const fragment = recovered.length
            ? recovered[Math.floor(hash(regionX, regionDepth, seed + 31) * recovered.length)]
            : null;
          const text = fragment?.terrainChars;
          if (text?.length) {
            const shift = Math.floor(hash(regionX, regionDepth, seed + 57) * text.length);
            const charIndex = positiveMod(x + depth * 32 + shift, text.length);
            const sourceChar = text[charIndex];
            const char = glyphs.includes(sourceChar)
              ? sourceChar
              : glyphs[sourceChar.codePointAt(0) % glyphs.length];
            return {
              char: char ?? (surface ? '▓' : '▒'),
              fg: recoveredColors[Math.floor(random('recovered-color') * recoveredColors.length)],
              bg: COLORS.deepRock,
              bgAlpha: 1,
            };
          }
          return {
            char: glyphs[Math.floor(random('recovered-media-glyph') * glyphs.length)]
              ?? (surface ? '▓' : '▒'),
            fg: recoveredColors[Math.floor(random('recovered-color') * recoveredColors.length)],
            bg: COLORS.deepRock,
            bgAlpha: 1,
          };
        }

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
