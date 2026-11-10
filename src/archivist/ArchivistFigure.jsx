// src/archivist/ArchivistFigure.jsx
//
// Силуэт Архивариуса. Теперь — на Pixi.js 8 и GLSL.
//
// Раньше поле блобов считалось в JS-цикле по 160×200 пикселей
// каждый кадр: ~300 тысяч операций в главном потоке. Теперь то же
// самое считает фрагментный шейдер — на GPU, параллельно, при
// разрешении 200×250. Дешевле, чем было, и мягче по краю.
//
// Все параметры — в константах ниже. Они запекаются в шейдер
// при инициализации, так что крутить — здесь, а не в CSS.
//
// — Архивариус

import { useEffect, useRef } from 'react';
import { Application, Filter, GlProgram, Sprite, Texture, UniformGroup } from 'pixi.js';

// ── внутреннее разрешение ──────────────────────────────────────
// Растягивается CSS. Шейдеру всё равно — хоть 400×500, но
// 200×250 хватает: силуэт мягкий, пикселей не видно.
const W = 220;
const H = 250;
// Безопасный отступ от края канваса. Поле блобов мапится не на
// весь канвас, а на [MARGIN_X .. W-MARGIN_X] x [MARGIN_Y .. H-MARGIN_Y].
// Именно из-за отсутствия такого отступа правый край силуэта
// (рука к столу) упирался в границу и выглядел «обрезанным».
// Крутить можно свободно — при увеличении силуэт просто чуть
// сжимается, но зато не липнет к краю.
const MARGIN_X = 12;
const MARGIN_Y = 0;

// ── блобы, из которых собирается фигура ────────────────────────
// x, y — в 0..1 относительно полотна (x вправо, y вниз).
// r — радиус в тех же единицах.
// w — вес вклада. Больше — плотнее.
const BLOBS = [
	{ x: 0.44, y: 0.22, r: 0.10, w: 1.00 }, // голова, наклонена
	{ x: 0.48, y: 0.34, r: 0.13, w: 1.15 }, // шея / верх спины
	{ x: 0.42, y: 0.50, r: 0.17, w: 1.30 }, // основная масса спины
	{ x: 0.40, y: 0.68, r: 0.18, w: 1.15 }, // поясница
	{ x: 0.42, y: 0.88, r: 0.20, w: 0.85 }, // бёдра, уходят в темноту
	{ x: 0.60, y: 0.36, r: 0.11, w: 0.90 }, // дальнее плечо
	{ x: 0.68, y: 0.50, r: 0.10, w: 0.80 }, // рука к столу
	{ x: 0.76, y: 0.60, r: 0.08, w: 0.65 }, // кисть дальше
	{ x: 0.30, y: 0.60, r: 0.10, w: 0.85 }, // ближняя рука
];

// Порог плотности поля. Больше — силуэт тоньше.
const THRESHOLD = 1.15;

// Мягкость края — сколько единиц поля уходит в полупрозрачность.
const EDGE_SOFT = 0.15;

// Тёплый оттенок света снизу (бумаги).
const RIM_R = 210 / 255;
const RIM_G = 170 / 255;
const RIM_B = 110 / 255;
// Насколько сильно подсветка «пробивает» силуэт. 0..1
const RIM_STRENGTH = 0.55;

// Насколько заметно «дыхание» (общий дрейф фигуры).
const BREATH = 0.006;

// Насколько блобы гуляют друг относительно друга.
const BLOB_DRIFT = 0.008;

// ── шейдер ─────────────────────────────────────────────────────
//
// Вершинный — стандартный фильтровый из Pixi 8. Не трогаем.
// Фрагментный — собирается из констант выше, один раз.

const FILTER_VERTEX = /* glsl */ `
in vec2 aPosition;
out vec2 vUV;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

void main(void) {
  gl_Position = filterVertexPosition();
  vUV = aPosition;
}
`;

function buildFragment() {
	// Каждое число, попадающее в GLSL, обязано быть с точкой.
	// GLSL ES 3.0 не умеет int → float, а JS-шаблон «1.00» → «1».
	const f = (n) => Number(n).toFixed(6);

	const aspect = f(W / H);

	const blobs = BLOBS.map((b, i) => {
		const phase = f(i * 1.7);
		const r2 = f(b.r * b.r);
		return `
	{
	  float phase = ${phase};
	  float bdx = sin(uTime * 0.30 + phase) * ${f(BLOB_DRIFT)} + figDX;
	  float bdy = cos(uTime * 0.25 + phase * 1.3) * ${f(BLOB_DRIFT)} + figDY;
	  vec2  d   = vec2((nx - ${f(b.x)} - bdx) * ${aspect}, ny - ${f(b.y)} - bdy);
	  float d2  = dot(d, d);
	  field += (${f(b.w)} * ${r2}) / (d2 + ${r2} * 0.4);
	}`;
	}).join('');

	const th = f(THRESHOLD);
	const lo = f(THRESHOLD - EDGE_SOFT);
	const es = f(EDGE_SOFT);
	const br = f(BREATH);
	const rimS = f(RIM_STRENGTH);
	const rimR = f(RIM_R);
	const rimG = f(RIM_G);
	const rimB = f(RIM_B);

	const winner = f(W - 2 * MARGIN_X);
	//const winner = f(H - 2 * MARGIN_Y); // прости, не удержался — см. ниже

	return /* glsl */ `
    precision highp float;

    in vec2 vUV;              // было: in vec2 vTextureCoord;
    out vec4 finalColor;

    uniform float uTime;

    void main(void) {
      vec2 uv = vUV;

      // Поле блобов живёт в «безопасной» зоне канваса.
      // Именно это убирает «обрезание» справа.
      float nx = (uv.x * ${f(W)} - ${f(MARGIN_X)}) / ${f(W - 2 * MARGIN_X)};
      float ny = (uv.y * ${f(H)} - ${f(MARGIN_Y)}) / ${f(H - 2 * MARGIN_Y)};
      // Если вдруг силуэт окажется вверх ногами — заменить ny на:
      //   float ny = 1.0 - (uv.y * ${f(H)} - ${f(MARGIN_Y)}) / ${f(H - 2 * MARGIN_Y)};

      float figDX = sin(uTime * 0.15) * ${f(BREATH)};
      float figDY = sin(uTime * 0.22) * ${f(BREATH)};

      float field = 0.0;
      ${blobs}

	  // органический разрыв края
	  float n =
		sin(nx * 31.0 + uTime * 0.5) * cos(ny * 27.0 - uTime * 0.4) * 0.06 +
		sin((nx + ny) * 47.0 + uTime * 0.3) * 0.03;

	  float v = field + n;

	  vec3  color = vec3(0.0);
	  float alpha = 0.0;

	  if (v > ${th}) {
		float depth = min(1.0, (v - ${th}) * 2.0);
		vec3 base = vec3(8.0, 8.0, 10.0) / 255.0 + depth * vec3(6.0) / 255.0;

		// rim light снизу — бумаги светят на него
		float belowness = max(0.0, ny - 0.3) / 0.7;
		float peak      = sin(belowness * 3.14159265);
		float flicker   = 0.7 + 0.3 * sin(uTime * 1.7 + nx * 8.0);
		float rim       = peak * ${rimS} * flicker;

		vec3 rimColor = vec3(${rimR}, ${rimG}, ${rimB});
		color = mix(base, rimColor, rim);
		alpha = 1.0;
	  } else if (v > ${lo}) {
		// мягкий край — полупрозрачная дымка
		float edge = (v - ${lo}) / ${es};
		color = vec3(4.0, 4.0, 6.0) / 255.0;
		alpha = edge * 0.706;
	  }

	  // Pixi-фильтры ожидают premultiplied alpha на выходе.
	  finalColor = vec4(color * alpha, alpha);
	}
  `;
}

// ── компонент ──────────────────────────────────────────────────

export default function ArchivistFigure({ className, style }) {
	const hostRef = useRef(null);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;

		// Локальные app и uniformGroup: НЕ через внешние переменные
		// замыкания. Cleanup трогает только то, что инициализация
		// уже успешно выставила. Если init не дошёл до конца —
		// cleanup ничего не делает, destroy делает сам init.
		let localApp = null;
		let raf = 0;
		let cancelled = false;
		let t0 = 0;
		let localUniformGroup = null;

		(async () => {
			try {
				const app = new Application();
				await app.init({
					width: W,
					height: H,
					backgroundAlpha: 0,
					antialias: false,
					resolution: 1,
					autoDensity: false,
					preference: 'webgl',
					powerPreference: 'low-power',
					autoStart: false,
					sharedTicker: false,
				});

				// Размонтировались, пока init шёл — гасим то,
				// что успели создать, и уходим.
				if (cancelled) {
					try { app.destroy(true); } catch { }
					return;
				}

				const canvas = app.canvas;
				canvas.style.width = '100%';
				canvas.style.height = '100%';
				canvas.style.display = 'block';
				host.appendChild(canvas);

				const sprite = new Sprite(Texture.WHITE);
				sprite.width = W;
				sprite.height = H;
				app.stage.addChild(sprite);

				const uniformGroup = new UniformGroup({
					uTime: { value: 0, type: 'f32' },
				});

				const filter = new Filter({
					glProgram: GlProgram.from({
						vertex: FILTER_VERTEX,
						fragment: buildFragment(),
					}),
					resources: { uniforms: uniformGroup },
				});
				sprite.filters = [filter];

				t0 = performance.now();

				const loop = () => {
					if (cancelled) return;
					const t = (performance.now() - t0) * 0.001;
					uniformGroup.uniforms.uTime = t;
					app.renderer.render(app.stage);
					raf = requestAnimationFrame(loop);
				};
				raf = requestAnimationFrame(loop);

				// Только теперь отдаём наружу. С этого момента
				// cleanup — единственный владелец.
				localApp = app;
				localUniformGroup = uniformGroup;
			} catch (e) {
				console.warn('[archivist] фигура не инициализирована:', e);
			}
		})();

		return () => {
			cancelled = true;
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
			if (localApp) {
				try { localApp.destroy(true); } catch { }
				localApp = null;
			}
			localUniformGroup = null;
		};
	}, []);

	return (
		<div ref={hostRef} className={className} style={style} aria-hidden="true" />
	);
}