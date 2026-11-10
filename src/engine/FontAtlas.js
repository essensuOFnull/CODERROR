import { Texture, Rectangle } from 'pixi.js';
import bundledManifest from '../CACHE/Terminus_16x16_1024_v2.json';

const CACHE_DIR = 'CACHE';
const CACHE_VERSION = 2;  // ← поднял: изменились диапазоны, старый кеш перегенерируется
const BUNDLED_ATLAS_PAGES = Array.from({ length: 10 }, (_, index) =>
	new URL(`../CACHE/Terminus_16x16_1024_v2_p${index}.png`, import.meta.url).href,
);

// Кандидатные диапазоны Unicode. Итоговый набор — пересечение с тем,
// что реально отображается в шрифте (см. collectVisibleChars).
const CANDIDATE_RANGES = [
	// Латиница
	[0x0020, 0x007E], // Basic Latin (печатные ASCII)
	[0x00A0, 0x00FF], // Latin-1 Supplement
	[0x0100, 0x017F], // Latin Extended-A
	[0x0180, 0x024F], // Latin Extended-B
	[0x0250, 0x02AF], // IPA Extensions
	[0x02B0, 0x02FF], // Spacing Modifier Letters
	[0x1E00, 0x1EFF], // Latin Extended Additional

	// Греческий и кириллица
	[0x0370, 0x03FF], // Greek and Coptic
	[0x0400, 0x04FF], // Cyrillic

	// Другие письменности (скорее всего отфильтруются, если нет fallback-шрифта)
	[0x0600, 0x06FF], // Arabic
	[0x0900, 0x097F], // Devanagari
	[0x0E00, 0x0E7F], // Thai
	[0x3040, 0x309F], // Hiragana
	[0x30A0, 0x30FF], // Katakana
	[0x4E00, 0x9FFF], // CJK Unified Ideographs
	[0xAC00, 0xD7AF], // Hangul Syllables

	// Пунктуация и типографика
	[0x2000, 0x206F], // General Punctuation
	[0x2070, 0x209F], // Superscripts and Subscripts
	[0x20A0, 0x20CF], // Currency Symbols
	[0x2100, 0x214F], // Letterlike Symbols

	// Символы для TUI и технические
	[0x2190, 0x21FF], // Arrows
	[0x2200, 0x22FF], // Mathematical Operators
	[0x2300, 0x23FF], // Miscellaneous Technical
	[0x2400, 0x243F], // Control Pictures
	[0x2440, 0x245F], // Optical Character Recognition
	[0x2460, 0x24FF], // Enclosed Alphanumerics
	[0x2500, 0x257F], // Box Drawing
	[0x2580, 0x259F], // Block Elements
	[0x25A0, 0x25FF], // Geometric Shapes
	[0x2600, 0x26FF], // Miscellaneous Symbols
	[0x2700, 0x27BF], // Dingbats
	[0x27C0, 0x27EF], // Misc. Mathematical Symbols-A
	[0x2800, 0x28FF], // Braille Patterns
	[0x2900, 0x297F], // Supplemental Arrows-B
	[0x2B00, 0x2BFF], // Miscellaneous Symbols and Arrows
	[0x2E00, 0x2E7F], // Supplemental Punctuation

	// Эмодзи (astral plane; попадут только если система реально умеет их рендерить)
	[0x1F300, 0x1F5FF], // Miscellaneous Symbols and Pictographs
	[0x1F600, 0x1F64F], // Emoticons
	[0x1F680, 0x1F6FF], // Transport and Map Symbols
	[0x1F700, 0x1F77F], // Alchemical Symbols
];

const NON_PRINTABLE_RE = /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}]/u;

// ─── фильтрация символов ───────────────────────────────────────────────
//
// Один переиспользуемый probe-canvas вместо нового на каждый символ.
// На каждый символ — ровно одна отрисовка и одна getImageData; результат
// одновременно проверяем на «пустоту» и на совпадение с .notdef (U+FFFF).

const _probe = {
	canvas: null,
	ctx: null,
	size: 0,
	font: '',
	tofuData: null, // ImageData.data для .notdef
};

function ensureProbe(fontSize, fontFamily) {
	const size = Math.max(8, Math.ceil(fontSize * 1.5));
	const font = `${fontSize}px "${fontFamily}"`;

	if (_probe.size !== size || _probe.font !== font) {
		_probe.canvas = document.createElement('canvas');
		_probe.canvas.width = size;
		_probe.canvas.height = size;
		_probe.ctx = _probe.canvas.getContext('2d', { willReadFrequently: true });
		_probe.ctx.font = font;
		_probe.ctx.textAlign = 'center';
		_probe.ctx.textBaseline = 'middle';
		_probe.ctx.fillStyle = '#fff';
		_probe.size = size;
		_probe.font = font;

		// Эталон: один раз рендерим U+FFFF (гарантированно отсутствующий глиф).
		_probe.ctx.clearRect(0, 0, size, size);
		_probe.ctx.fillText('\uFFFF', size / 2, size / 2);
		_probe.tofuData = _probe.ctx.getImageData(0, 0, size, size).data;
	} else {
		// На случай, если кто-то сбросил состояние ctx снаружи.
		_probe.ctx.font = font;
	}
	return _probe.ctx;
}

/**
 * Возвращает true, если символ реально видим и НЕ является .notdef.
 */
function isRenderable(char, fontSize, fontFamily) {
	const ctx = ensureProbe(fontSize, fontFamily);
	const size = _probe.size;

	ctx.clearRect(0, 0, size, size);
	ctx.fillText(char, size / 2, size / 2);
	const data = ctx.getImageData(0, 0, size, size).data;

	// 1. Есть хоть один непрозрачный пиксель?
	let hasPixel = false;
	for (let i = 3; i < data.length; i += 4) {
		if (data[i]) { hasPixel = true; break; }
	}
	if (!hasPixel) return false;

	// 2. Совпадает с .notdef?
	const tofu = _probe.tofuData;
	if (tofu) {
		let same = true;
		for (let i = 0; i < data.length; i++) {
			if (data[i] !== tofu[i]) { same = false; break; }
		}
		if (same) return false;
	}
	return true;
}

// Отдаёт управление event loop. scheduler.yield() — если есть (Chromium),
// иначе setTimeout(0) — везде работает.
const yieldToUI =
	typeof scheduler !== 'undefined' && typeof scheduler.yield === 'function'
		? () => scheduler.yield()
		: () => new Promise((r) => setTimeout(r, 0));

async function collectVisibleChars(fontSize, fontFamily, onProgress) {
	await document.fonts.load(`${fontSize}px "${fontFamily}"`);
	await document.fonts.ready;
	ensureProbe(fontSize, fontFamily);

	// Считаем общее число кандидатов для прогресса
	let total = 0;
	for (const [s, e] of CANDIDATE_RANGES) total += e - s + 1;

	const out = [];
	const seen = new Set();
	let processed = 0;

	for (const [start, end] of CANDIDATE_RANGES) {
		for (let code = start; code <= end; code++) {
			processed++;

			// Раз в 256 итераций рапортуем о прогрессе.
			if (onProgress && (processed & 255)) onProgress(processed, total, out.length);
			//каждую итерацию отдаем кадр
			await yieldToUI();

			if (code < 0x20) continue;
			if (code >= 0xD800 && code <= 0xDFFF) continue;

			let ch;
			try { ch = String.fromCodePoint(code); } catch { continue; }
			if (seen.has(ch)) continue;
			if (NON_PRINTABLE_RE.test(ch)) continue;
			if (!isRenderable(ch, fontSize, fontFamily)) continue;

			seen.add(ch);
			out.push(ch);
		}
	}

	if (onProgress) onProgress(total, total, out.length);
	console.log(
		`[atlas] отображаемых символов: ${out.length} ` +
		`(проверено диапазонов: ${CANDIDATE_RANGES.length})`
	);
	return out;
}

// ─── кеш ───────────────────────────────────────────────────────────────

function atlasKey(cw, ch, ff, atlasSize) {
	const safe = String(ff).replace(/[^a-z0-9_-]+/gi, '_');
	return `${safe}_${cw}x${ch}_${atlasSize}_v${CACHE_VERSION}`;
}

async function loadAtlasFromCache(cw, ch, ff, atlasSize) {
	if (!window.fs || typeof window.fs.exists !== 'function') return null;

	const key = atlasKey(cw, ch, ff, atlasSize);
	const manifestPath = `${CACHE_DIR}/${key}.json`;

	if (!(await window.fs.exists(manifestPath))) return null;

	let manifest;
	try {
		manifest = JSON.parse(await window.fs.readFile(manifestPath, 'utf8'));
	} catch (e) {
		console.warn('[atlas] повреждён манифест, перегенерируем:', e);
		return null;
	}
	if (manifest.version !== CACHE_VERSION) return null;

	const pages = [];
	try {
		for (const pageFile of manifest.pageFiles) {
			const buf = await window.fs.readFile(`${CACHE_DIR}/${pageFile}`);
			const blob = new Blob([buf], { type: 'image/png' });
			const bitmap = await createImageBitmap(blob);
			const tex = Texture.from(bitmap);
			if (tex.source) {
				tex.source.scaleMode = 'nearest';
				tex.source.mipmap = false;
			}
			pages.push(tex);
		}
	} catch (e) {
		console.warn('[atlas] не удалось прочитать страницы, перегенерируем:', e);
		return null;
	}

	const cols = manifest.cols;
	const pageCounts = manifest.pageCounts;
	const chars = Array.from(manifest.chars); // корректно разбивает суррогатные пары

	const result = new Map();
	let idx = 0;
	for (let p = 0; p < pageCounts.length; p++) {
		const count = pageCounts[p];
		for (let i = 0; i < count; i++, idx++) {
			const col = i % cols;
			const row = (i / cols) | 0;
			const frame = new Rectangle(col * cw, row * ch, cw, ch);
			const sub = new Texture({ source: pages[p].source, frame });
			result.set(chars[idx], sub);
		}
	}

	result.pages = pages;
	result.cw = cw;
	result.ch = ch;
	return result;
}

async function loadBundledAtlas(cw, ch, ff, atlasSize) {
	if (cw !== 16 || ch !== 16 || ff !== 'Terminus' || atlasSize !== 1024) return null;
	if (bundledManifest.version !== CACHE_VERSION) return null;

	const pages = await Promise.all(BUNDLED_ATLAS_PAGES.map(async (url) => {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`Failed to load font atlas page: ${response.status}`);
		const bitmap = await createImageBitmap(await response.blob());
		const texture = Texture.from(bitmap);
		if (texture.source) {
			texture.source.scaleMode = 'nearest';
			texture.source.mipmap = false;
		}
		return texture;
	}));

	const chars = Array.from(bundledManifest.chars);
	if (bundledManifest.pageFiles.length !== pages.length) {
		throw new Error('Bundled font atlas page count does not match its manifest');
	}

	const result = new Map();
	let idx = 0;
	for (let p = 0; p < bundledManifest.pageCounts.length; p++) {
		for (let i = 0; i < bundledManifest.pageCounts[p]; i++, idx++) {
			const col = i % bundledManifest.cols;
			const row = (i / bundledManifest.cols) | 0;
			const frame = new Rectangle(col * cw, row * ch, cw, ch);
			result.set(chars[idx], new Texture({ source: pages[p].source, frame }));
		}
	}

	result.pages = pages;
	result.cw = cw;
	result.ch = ch;
	return result;
}

async function saveAtlasToCache(cw, ch, ff, atlasSize, atlas) {
	if (!window.fs || typeof window.fs.mkdir !== 'function') return;

	const key = atlasKey(cw, ch, ff, atlasSize);
	await window.fs.mkdir(CACHE_DIR);

	const pageFiles = [];
	for (let i = 0; i < atlas.canvases.length; i++) {
		const canvas = atlas.canvases[i];
		const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
		if (!blob) throw new Error(`canvas.toBlob вернул null для страницы ${i}`);
		const buf = new Uint8Array(await blob.arrayBuffer());
		const name = `${key}_p${i}.png`;
		await window.fs.writeFile(`${CACHE_DIR}/${name}`, buf);
		pageFiles.push(name);
	}

	const manifest = {
		version: CACHE_VERSION,
		fontFamily: ff,
		cw, ch, atlasSize,
		cols: atlas.cols,
		pageCounts: atlas.pageCounts,
		pageFiles,
		chars: atlas.orderedChars.join(''),
		createdAt: Date.now(),
	};

	await window.fs.writeFile(
		`${CACHE_DIR}/${key}.json`,
		JSON.stringify(manifest),
		'utf8',
	);
}

// ─── генерация ─────────────────────────────────────────────────────────

async function generateFontAtlas(cw, ch, ff, atlasSize = 1024, onProgress) {
	const chars = await collectVisibleChars(ch, ff, (done, total, found) => {
		if (onProgress) onProgress('filter', done, total, found);
	});

	const cols = Math.max(1, Math.floor(atlasSize / cw));
	const rows = Math.max(1, Math.floor(atlasSize / ch));
	const perPage = cols * rows;
	const pageCount = Math.max(1, Math.ceil(chars.length / perPage));

	const pages = [];
	const canvases = [];
	const pageCounts = [];
	const result = new Map();

	for (let p = 0; p < pageCount; p++) {
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = atlasSize;
		const ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, atlasSize, atlasSize);
		ctx.font = `${ch}px "${ff}"`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = '#ffffff';

		const start = p * perPage;
		const end = Math.min(start + perPage, chars.length);
		const count = end - start;

		for (let i = 0; i < count; i++) {
			const col = i % cols;
			const row = (i / cols) | 0;
			ctx.fillText(chars[start + i], col * cw + cw / 2, row * ch + ch / 2);

			// Раз в 256 глифов отдаём кадр
			if ((i & 255) === 255) await yieldToUI();
		}

		const pageTex = Texture.from(canvas);
		if (pageTex.source) {
			pageTex.source.scaleMode = 'nearest';
			pageTex.source.mipmap = false;
		}

		for (let i = 0; i < count; i++) {
			const col = i % cols;
			const row = (i / cols) | 0;
			const frame = new Rectangle(col * cw, row * ch, cw, ch);
			const sub = new Texture({ source: pageTex.source, frame });
			result.set(chars[start + i], sub);
		}

		pages.push(pageTex);
		canvases.push(canvas);
		pageCounts.push(count);

		if (onProgress) onProgress('draw', p + 1, pageCount, chars.length);
		await yieldToUI(); // после каждой страницы — точно кадр
	}

	result.pages = pages;
	result.cw = cw;
	result.ch = ch;
	result.canvases = canvases;
	result.cols = cols;
	result.pageCounts = pageCounts;
	result.orderedChars = chars;

	console.log(`[atlas] страниц: ${pageCount}, символов: ${chars.length}`);
	return result;
}

// ─── публичная точка входа ─────────────────────────────────────────────

export async function getFontAtlas(cw, ch, ff, atlasSize = 1024) {
	try {
		const cached = await loadAtlasFromCache(cw, ch, ff, atlasSize);
		if (cached) {
			console.log(`[atlas] загружен из кеша: ${ff} ${cw}x${ch}`);
			return cached;
		}
	} catch (e) {
		console.warn('[atlas] ошибка чтения кеша, генерируем заново:', e);
	}

	try {
		const bundled = await loadBundledAtlas(cw, ch, ff, atlasSize);
		if (bundled) {
			console.log(`[atlas] загружен из комплекта: ${ff} ${cw}x${ch}`);
			return bundled;
		}
	} catch (e) {
		console.warn('[atlas] не удалось загрузить комплект, генерируем заново:', e);
	}

	console.log(`[atlas] генерируем: ${ff} ${cw}x${ch} @ ${atlasSize}`);
	const t0 = performance.now();
	const atlas = await generateFontAtlas(cw, ch, ff, atlasSize);
	console.log(`[atlas] сгенерирован за ${(performance.now() - t0).toFixed(0)} мс`);

	saveAtlasToCache(cw, ch, ff, atlasSize, atlas).catch((e) =>
		console.warn('[atlas] не удалось закешировать:', e),
	);

	return atlas;
}