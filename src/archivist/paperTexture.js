// src/archivist/paperTexture.js
//
// Бумага и обложка Свода. Голый WebGL2, без Pixi.
//
// Текстура должна выглядеть как настоящая бумага: неравномерная
// плотность волокна, случайно ориентированные волокна, редкие
// соринки, мягкий износ у кромки. Никаких видимых паттернов,
// никакого муара между октавами.
//
// Сиды берём из crypto.getRandomValues — Math.random() в V8
// даёт предсказуемые последовательности, и между вкладками
// текстуры могут совпасть. Для «живой» книги это плохо.
//
// — Архивариус

// ── вершинный шейдер ─────────────────────────────────────────
const VS = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// ── общие шумовые функции ────────────────────────────────────
//
// hash21: два раунда перемешивания. Дешёвый вариант с одним
// fract(p * k) даёт линейные корреляции по осям — на бумаге
// это выглядит как диагональная «штриховка» на больших масштабах.
//
// vnoise: квинтическая интерполяция (6t^5 - 15t^4 + 10t^3).
// Кубическая (3t^2 - 2t^3) даёт разрывы второй производной —
// на градиентах видны «ромбики» вокруг узлов решётки.
//
// fbm: ротация + сдвиг между октавами. Без этого октавы
// складываются в одну решётку и дают муар.

const HASH = /* glsl */ `
mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float hash21(vec2 p) {
  // Двухраундовый хеш — лавинный эффект лучше, артефактов меньше.
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  // Квинтика — C2-гладко, без «ступенек» на сетке.
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// fbm с ротацией между октавами. seed слегка варьирует углы,
// чтобы разные бумажки не были «повёрнутыми копиями» друг друга.
float fbm(vec2 p, float seed) {
  float v = 0.0;
  float a = 0.5;
  float total = 0.0;
  float ang = 0.7 + seed * 0.013;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    total += a;
    p = rot2(ang) * p * 2.03 + vec2(seed * 0.31, seed * 0.17);
    ang += 0.9;
    a *= 0.5;
  }
  return v / total;
}

// Вытянутое волокно: повернуть, растянуть по оси, взять vnoise.
// scale — «плотность» волокон, angle — направление.
float fiberNoise(vec2 p, float angle, float scale) {
  p = rot2(angle) * p * scale;
  p.x *= 0.14;  // вытягивание вдоль локальной X
  return vnoise(p);
}
`;

// ── бумага ───────────────────────────────────────────────────
//
// Слои (от крупного к мелкому):
//   1. Domain-warped fbm → неравномерная плотность пульпы.
//   2. Средний fbm → лёгкая пятнистость.
//   3. Три слоя волокон под разными углами.
//   4. Мелкое зерно (не привязано к решётке — комбинированный хеш).
//   5. Спеклы — редкие тёмные соринки.
//   6. Краевое затемнение отдельно от вигнетки.

const PAPER_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform float uSeed;
uniform float uWarm;

${HASH}

void main() {
  vec2 uv = v_uv;

  // ── 1. Domain warping ──────────────────────────────────────
  // Смещаем координаты другим fbm'ом. Даёт «затёки» плотности,
  // которые невозможно получить прямым fbm.
  vec2 q = vec2(
    fbm(uv * 2.3 + uSeed, uSeed),
    fbm(uv * 2.3 + uSeed + vec2(17.3, 9.2), uSeed + 3.0)
  );
  vec2 r = vec2(
    fbm(uv * 3.1 + 3.4 * q + uSeed, uSeed + 7.0),
    fbm(uv * 3.1 + 3.4 * q + uSeed + vec2(8.3, 2.8), uSeed + 11.0)
  );
  float blotch = fbm(uv * 4.2 + 3.0 * r + uSeed, uSeed + 13.0);

  vec3 base = vec3(0.929, 0.878, 0.784);

  // Неравномерная плотность пульпы — основной вклад.
  base -= (blotch - 0.5) * 0.085;

  // ── 2. Средняя пятнистость ─────────────────────────────────
  float mid = fbm(uv * 11.0 + uSeed * 1.7, uSeed + 5.0);
  base += (mid - 0.5) * 0.035;

  // ── 3. Волокна ─────────────────────────────────────────────
  // Три слоя, разные углы и масштабы. Настоящая бумага —
  // не однородный войлок, а переплетение прядей.
  float a1 = uSeed * 1.7;
  float a2 = uSeed * 2.3 + 1.2;
  float a3 = uSeed * 3.1 + 2.7;
  float f1 = fiberNoise(uv, a1, 48.0);
  float f2 = fiberNoise(uv, a2, 62.0);
  float f3 = fiberNoise(uv, a3, 84.0);
  float fiber =
    smoothstep(0.74, 0.94, f1) * 0.6 +
    smoothstep(0.78, 0.96, f2) * 0.5 +
    smoothstep(0.82, 0.97, f3) * 0.4;
  base -= fiber * 0.045;

  // ── 4. Мелкое зерно ────────────────────────────────────────
  // Слегка выше частоты пикселя на 384px — на выходе получаем
  // «песчинки», а не ровный шум.
  float fine = vnoise(uv * 340.0 + vec2(uSeed * 5.0, uSeed * 3.7));
  base -= (fine - 0.5) * 0.032;

  // ── 5. Спеклы (соринки) ────────────────────────────────────
  // Порог по высокочастотному vnoise, а не по floor(hash) —
  // иначе получаем решётку из точек.
  float speck = vnoise(uv * 190.0 + vec2(uSeed * 17.0, uSeed * 23.0));
  base -= smoothstep(0.90, 0.985, speck) * 0.10;

  // ── Тонировка ──────────────────────────────────────────────
  base *= mix(vec3(0.975, 0.955, 0.925), vec3(1.015, 0.995, 0.965), uWarm);

  // ── Вигнетка ───────────────────────────────────────────────
  vec2 d = uv - 0.5;
  base *= 1.0 - dot(d, d) * 0.42;

  // ── Износ кромки ───────────────────────────────────────────
  // Отдельно от вигнетки: у реальной страницы край темнее
  // и «грязнее», а не просто темнее к центру.
  float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float edgeDark = smoothstep(0.0, 0.06, edge);
  float edgeGrit = vnoise(uv * 260.0 + uSeed * 31.0);
  base *= mix(0.93, 1.0, edgeDark);
  base -= (1.0 - edgeDark) * (edgeGrit - 0.5) * 0.06;

  outColor = vec4(base, 1.0);
}
`;

// ── обложка ──────────────────────────────────────────────────
//
// Кожа/ткань. Тот же принцип: domain warping для неравномерности
// прокраса, зерно, потёртости у кромок, золотая линия.

const COVER_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform float uSeed;
uniform float uWarm;

${HASH}

void main() {
  vec2 uv = v_uv;

  // Неравномерный прокрас: два слоя warped fbm.
  vec2 q = vec2(
    fbm(uv * 3.0 + uSeed, uSeed),
    fbm(uv * 3.0 + uSeed + vec2(5.1, 8.7), uSeed + 2.0)
  );
  float dye = fbm(uv * 5.0 + 2.5 * q + uSeed, uSeed + 6.0);

  vec3 col = mix(
    vec3(0.165, 0.094, 0.063),
    vec3(0.082, 0.039, 0.020),
    uv.y * 0.6 + uv.x * 0.4
  );
  col -= (dye - 0.5) * 0.07;

  // Зерно кожи — два масштаба, оба через fbm с ротацией,
  // чтобы не было муара между слоями.
  float grain1 = fbm(uv * 26.0 + uSeed * 2.0, uSeed + 4.0);
  col += (grain1 - 0.5) * 0.045;
  float grain2 = vnoise(uv * 240.0 + vec2(uSeed * 7.0, uSeed * 5.0));
  col += (grain2 - 0.5) * 0.03;

  // Мелкие поры.
  float pores = vnoise(uv * 160.0 + vec2(uSeed * 19.0, uSeed * 13.0));
  col -= smoothstep(0.88, 0.98, pores) * 0.05;

  col *= mix(vec3(1.05, 0.96, 0.88), vec3(0.95, 0.95, 1.0), uWarm);

  // Корешок.
  float spine = smoothstep(0.03, 0.0, abs(uv.x - 0.5));
  col *= 1.0 - spine * 0.38;

  // Золотая рамка.
  float outer =
    step(0.030, uv.x) * step(uv.x, 0.970) *
    step(0.040, uv.y) * step(uv.y, 0.960);
  float inner =
    step(0.045, uv.x) * step(uv.x, 0.955) *
    step(0.058, uv.y) * step(uv.y, 0.942);
  float line = clamp(outer - inner, 0.0, 1.0);
  vec3 gold = vec3(0.784, 0.627, 0.314);
  // Небольшая неровность золота — чтобы линия не была «напечатанной».
  float goldWear = vnoise(uv * 90.0 + uSeed * 29.0);
  col = mix(col, gold * (0.55 + (goldWear - 0.5) * 0.15), line * 0.5);

  // Потёртости у кромок.
  float worn = smoothstep(0.62, 0.95, vnoise(uv * 6.5 + uSeed * 3.0));
  float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float edgeMask = smoothstep(0.20, 0.02, edgeDist);
  col += worn * edgeMask * vec3(0.15, 0.08, 0.04);

  vec2 d = uv - 0.5;
  col *= 1.0 - dot(d, d) * 0.55;

  outColor = vec4(col, 1.0);
}
`;

// ── внутренности ─────────────────────────────────────────────

function compileShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('[archivist] шейдер не собрался: ' + log);
  }
  return sh;
}

function linkProgram(gl, vsSrc, fsSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error('[archivist] программа не слинковалась: ' + log);
  }
  return p;
}

/**
 * Криптослучайный сид в диапазоне [0, 1000).
 *
 * Math.random() в V8 — xorshift128+, детерминированный от
 * начального состояния. Две вкладки, открытые в одну миллисекунду,
 * могут получить совпадающие сиды, и пул бумажек окажется
 * одинаковым. crypto.getRandomValues берёт энтропию из ОС.
 */
function cryptoSeed() {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  // Склеиваем два 32-битных слова в мантиссу и масштабируем.
  const hi = buf[0] >>> 0;
  const lo = buf[1] >>> 0;
  // Берём 21 бит от каждого, чтобы уложиться в double без потерь.
  const bits = ((hi & 0x1FFFFF) * 0x200000) + (lo & 0x1FFFFF);
  return (bits / 0x40000000000) * 1000.0;
}

function renderPixels(width, height, fragmentSrc, uniforms) {
  const canvas = new OffscreenCanvas(width, height);
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl) {
    throw new Error('[archivist] WebGL2 недоступен');
  }

  const program = linkProgram(gl, VS, fragmentSrc);
  gl.useProgram(program);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1,  -1, 1,
    -1,  1,  1, -1,   1, 1,
  ]), gl.STATIC_DRAW);

  const a_pos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(a_pos);
  gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 0, 0);

  for (const [name, value] of Object.entries(uniforms)) {
    const loc = gl.getUniformLocation(program, name);
    if (loc !== null) gl.uniform1f(loc, value);
  }

  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.finish();

  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  const flipped = new Uint8ClampedArray(pixels.length);
  const rowBytes = width * 4;
  for (let y = 0; y < height; y++) {
    const src = (height - 1 - y) * rowBytes;
    const dst = y * rowBytes;
    flipped.set(pixels.subarray(src, src + rowBytes), dst);
  }

  gl.deleteBuffer(vbo);
  gl.deleteProgram(program);
  const lose = gl.getExtension('WEBGL_lose_context');
  if (lose) lose.loseContext();

  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  ctx.putImageData(new ImageData(flipped, width, height), 0, 0);
  return out.toDataURL('image/png');
}

// ── публичный API ────────────────────────────────────────────
const PAPER_W = 384;
const PAPER_H = 512;
const COVER_W = 840;
const COVER_H = 560;

export async function generatePaperTexturePool(count = 8) {
  const pool = [];
  for (let i = 0; i < count; i++) {
    pool.push(
      renderPixels(PAPER_W, PAPER_H, PAPER_FRAG, {
        uSeed: cryptoSeed(),
        uWarm: cryptoSeed() * 0.001,  // [0, 1)
      })
    );
  }
  return pool;
}

export async function generatePaperTexture() {
  return renderPixels(PAPER_W, PAPER_H, PAPER_FRAG, {
    uSeed: cryptoSeed(),
    uWarm: cryptoSeed() * 0.001,
  });
}

export async function generateCoverTexture(w = COVER_W, h = COVER_H) {
  return renderPixels(w, h, COVER_FRAG, {
    uSeed: cryptoSeed(),
    uWarm: cryptoSeed() * 0.0003 + 0.35,  // [0.35, 0.65)
  });
}