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

export function surfaceAt(x, seed) {
  const baseline = Math.floor(16 + Math.sin(seed * 0.00001) * 1.5);
  if (x >= -4 && x <= 12) return baseline;

  const distance = x < -4 ? x + 4 : x - 12;
  const fade = Math.min(1, Math.abs(distance) / 8);
  const broad = Math.sin(distance * 0.035 + seed * 0.00001) * 3;
  const small = Math.sin(distance * 0.09 + seed * 0.00003) * 1.1;
  return Math.floor(baseline + (broad + small) * fade);
}

function hash(x, y, salt = 0) {
  let value = (x * 374761393 + y * 668265263 + salt * 1442695041) | 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000;
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
      generateTile({ x, y, seed, random, glyphs }) {
        if (random('residue') > 0.0017) return null;
        const label = fragments[Math.floor(random('fragment') * fragments.length)];
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
      generateTile({ x, y, seed, random, glyphs }) {
        const depth = y - surfaceAt(x, seed);
        if (depth < 0) return null;

        if (depth > 4 && hash(x, y, seed) < 0.09) return null;
        const seam = hash(x, y, seed + 7) > 0.97;
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
      emit({ type: 'notice', text: 'ПРОЦЕДУРНАЯ СИМУЛЯЦИЯ // реальные данные диска ещё не подключены' });
    },
  },
};

export default voidRoom;
