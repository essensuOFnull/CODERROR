// src/archivist/ArchivistBook.jsx
//
// Свод. Оркестратор: пул текстур, обложка, разметка разворота,
// оглавление слева.
//
// Тяжёлая логика разложена по соседним модулям:
//   useBookPages  — замер и разбиение записей на страницы
//   useBookFlip   — состояние листа, drag, зажатие, прыжок
//   BookPage      — рендер одной страницы (включая spoiler)
//   EntryFlow     — разбор блоков записи в JSX
//   BookCover     — обложка с логотипом
//   BookNav       — ←/→, счётчик, номер разворота
//   BookToc       — свиток с оглавлением и поиском
//
// — Архивариус

import React, {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	generatePaperTexturePool,
	generateCoverTexture,
} from './paperTexture.js';
import { useBookPages } from './useBookPages.js';
import { useBookFlip } from './useBookFlip.js';
import EntryFlow from './EntryFlow.jsx';
import BookPage from './BookPage.jsx';
import BookCover from './BookCover.jsx';
import BookNav from './BookNav.jsx';
import BookToc from './BookToc.jsx';
import { COVER_OPEN_MS } from './bookConstants.js';
import BookExportButton from './BookExportButton.jsx';

// ── нормализация дерева записей в плоский список ─────────────
//
// entries/index.js может отдать:
//   • массив — пропускаем насквозь;
//   • объект-дерево по частям/актам — обходим рекурсивно;
//   • что-то неожиданное — вернём [] и расскажем в консоль.
//
// Запись узнаём по паре (id + (blocks | title)). Обход идёт
// по всем ключам, кроме blocks/links: это контент записи, а не
// дети, туда лезть нельзя.
//
// — Архивариус
function flattenEntries(input) {
	if (!input) {
		console.warn('[archivist] entries пуст:', input);
		return [];
	}
	if (Array.isArray(input)) return input;
	if (typeof input !== 'object') {
		console.warn('[archivist] entries — не массив и не объект:', typeof input);
		return [];
	}

	const out = [];
	const seen = new Set();
	const SKIP_KEYS = new Set(['blocks', 'links', 'tags', 'parent', 'children']);

	const walk = (node, depth) => {
		if (!node) return;
		if (Array.isArray(node)) {
			for (const item of node) walk(item, depth + 1);
			return;
		}
		if (typeof node !== 'object') return;
		// Защита от цикла — глубина 12, дальше уже не дерево.
		if (depth > 12) return;

		if (node.id && (node.blocks || node.title) && !seen.has(node.id)) {
			seen.add(node.id);
			out.push(node);
		}

		for (const key of Object.keys(node)) {
			if (SKIP_KEYS.has(key)) continue;
			walk(node[key], depth + 1);
		}
	};

	walk(input, 0);

	if (out.length === 0) {
		console.warn(
			'[archivist] flattenEntries не нашёл ни одной записи. ' +
			'Верхний уровень:',
			Array.isArray(input) ? 'array' : Object.keys(input).slice(0, 12)
		);
	} else {
		console.info(`[archivist] flattenEntries: ${out.length} записей`);
	}

	return out;
}

export default function ArchivistBook({
	entries,
	spoiledAt = {},
	fullySpoiled = false,
	onSpoil,
	onClose,
}) {
	// ── плоский список ─────────────────────────────────────────
	const safeEntries = useMemo(() => flattenEntries(entries), [entries]);
	// ── размер страницы ────────────────────────────────────────
	const pageProbeRef = useRef(null);
	const [pageSize, setPageSize] = useState({ width: 0, height: 0 });

	useLayoutEffect(() => {
		const el = pageProbeRef.current;
		if (!el) return;
		const measure = () => {
			const inner = el.querySelector('.book-page-content');
			if (!inner) return;
			const cs = getComputedStyle(inner);
			const px = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
			const py = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
			const rect = inner.getBoundingClientRect();
			const w = rect.width - px;
			const h = rect.height - py;
			if (!(w > 0 && h > 0)) return;
			setPageSize((prev) =>
				prev.width === w && prev.height === h ? prev : { width: w, height: h }
			);
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	// ── пагинация ──────────────────────────────────────────────
	const { pages, measureRef } = useBookPages(safeEntries, pageSize);
	const ready = !!pages && pages.length > 0;

	// ── пул текстур (Pixi) ────────────────────────────────────
	//
	// Генерируется один раз при открытии книги. Дальше — только
	// переиспользование: ротация слотов идёт по кругу, новых
	// текстур в полёте не появляется. Это и есть главная
	// разница с прошлой версией — она пекла две свежие бумажки
	// на каждый флип и захлёбывалась.
	const POOL_SIZE = 8;
	const [texPool, setTexPool] = useState(null);
	const [coverTex, setCoverTex] = useState(null);
	const [pageTex, setPageTex] = useState([null, null, null, null]);
	const poolCursorRef = useRef(0);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const [pool, cover] = await Promise.all([
					generatePaperTexturePool(POOL_SIZE),
					generateCoverTexture(840, 560),
				]);
				if (cancelled) return;
				setTexPool(pool);
				setCoverTex(cover);
				setPageTex([pool[0], pool[1], pool[2], pool[3]]);
				poolCursorRef.current = 4;
			} catch (e) {
				console.warn('[archivist] текстуры не сгенерировались:', e);
			}
		})();
		return () => { cancelled = true; };
	}, []);

	const rotateTextures = useCallback(() => {
		if (!texPool) return;
		setPageTex(([, , c, d]) => {
			const n = texPool.length;
			const a = texPool[poolCursorRef.current % n];
			poolCursorRef.current = (poolCursorRef.current + 1) % n;
			const b = texPool[poolCursorRef.current % n];
			poolCursorRef.current = (poolCursorRef.current + 1) % n;
			return [d, c, a, b];
		});
	}, [texPool]);

	// ── флип ───────────────────────────────────────────────────
	const {
		leftIdx,
		rightIdx,
		flip,
		currentSpread,
		totalSpreads,
		canPrev,
		canNext,
		goPrev,
		goNext,
		goToPage,
		goToEntry,
		startHold,
		stopHold,
		pointerHandlers,
	} = useBookFlip(pages, ready, rotateTextures);

	// ── обложка ────────────────────────────────────────────────
	const [coverOpened, setCoverOpened] = useState(false);
	const [coverOpening, setCoverOpening] = useState(false);

	const openCover = useCallback(() => {
		if (coverOpening || coverOpened) return;
		setCoverOpening(true);
		setTimeout(() => {
			setCoverOpened(true);
			setCoverOpening(false);
		}, COVER_OPEN_MS);
	}, [coverOpening, coverOpened]);

	// ── какая текстура куда идёт ───────────────────────────────
	const texFor = (role) => {
		if (!flip) {
			if (role === 'left') return pageTex[0];
			if (role === 'right') return pageTex[1];
			return null;
		}
		if (flip.direction === 'next') {
			if (role === 'left') return pageTex[0];
			if (role === 'right') return pageTex[2];
			if (role === 'flipFront') return pageTex[1];
			if (role === 'flipBack') return pageTex[3];
		} else {
			if (role === 'left') return pageTex[3];
			if (role === 'right') return pageTex[1];
			if (role === 'flipFront') return pageTex[0];
			if (role === 'flipBack') return pageTex[2];
		}
		return null;
	};

	const paperStyle = (role) => {
		const url = texFor(role);
		return url ? { '--paper-texture': `url(${url})` } : {};
	};

	// ── горячие клавиши ←/→ ───────────────────────────────────
	//
	// Держим в capture, чтобы работало из любого места внутри
	// оверлея. Esc и F1 обрабатывает Archivist.jsx — их не
	// трогаем.
	useEffect(() => {
		if (!coverOpened) return;
		const onKey = (e) => {
			if (e.key === 'ArrowLeft') {
				e.preventDefault();
				goPrev();
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				goNext();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [goPrev, goNext, coverOpened]);

	// ── прыжок из оглавления ──────────────────────────────────
	//
	// Если обложка ещё закрыта — открываем её на лету. Не
	// блокируем прыжок: пусть открытие и перелёт идут
	// параллельно, к моменту когда обложка откинется — уже
	// будет нужный разворот.
	const onTocNavigate = useCallback(
		(id) => {
			if (!coverOpened && !coverOpening) openCover();
			goToEntry(id);
		},
		[coverOpened, coverOpening, openCover, goToEntry]
	);

	// ── разметка ───────────────────────────────────────────────
	const spreadHandlers = coverOpened ? pointerHandlers : {};

	return (
		<div className="archivist-book-wrap">
			<BookExportButton entries={safeEntries} />
			<button
				className="archivist-book-close"
				onClick={onClose}
				aria-label="закрыть"
			>
				×
			</button>

			<BookToc entries={safeEntries} onNavigate={onTocNavigate} />

			<div className="book-stage">
				<div className="book-spread" {...spreadHandlers}>
					{/* Скрытый зонд той же геометрии. */}
					<div
						ref={pageProbeRef}
						className="book-page book-page-left"
						style={{
							visibility: 'hidden',
							position: 'absolute',
							top: 0,
							left: 0,
							pointerEvents: 'none',
						}}
						aria-hidden="true"
					>
						<div className="book-page-content" />
					</div>

					<div
						className={
							'book-page book-page-left' +
							((coverOpening || coverOpened) ? '' : ' book-page-behind-cover')
						}
						style={paperStyle('left')}
					>
						<BookPage
							page={ready ? pages[leftIdx] : null}
							pageSize={pageSize}
							spoiledAt={spoiledAt}
							fullySpoiled={fullySpoiled}
							onSpoil={onSpoil}
							onNavigate={goToEntry}
							pageNumber={ready && pages[leftIdx] ? leftIdx + 1 : null}
						/>
					</div>

					<div className="book-page book-page-right" style={paperStyle('right')}>
						<BookPage
							page={ready ? pages[rightIdx] : null}
							pageSize={pageSize}
							spoiledAt={spoiledAt}
							fullySpoiled={fullySpoiled}
							onSpoil={onSpoil}
							onNavigate={goToEntry}
							pageNumber={ready && pages[rightIdx] ? rightIdx + 1 : null}
						/>
					</div>

					{flip && ready && (
						<div
							className={
								`book-flip book-flip-${flip.direction}` +
								(flip.animate ? ' is-auto' : '')
							}
							style={
								flip.animate
									? undefined
									: {
										transform: `rotateY(${flip.angle}deg)`,
										transition: flip.dragging
											? 'none'
											: `transform 320ms cubic-bezier(0.4, 0, 0.2, 1)`,
									}
							}
						>
							<div
								className="book-flip-face book-flip-front"
								style={paperStyle('flipFront')}
							>
								<BookPage
									page={pages[flip.frontIdx]}
									pageSize={pageSize}
									spoiledAt={spoiledAt}
									fullySpoiled={fullySpoiled}
									onSpoil={onSpoil}
									onNavigate={goToEntry}
									pageNumber={flip.frontIdx + 1}
								/>
							</div>
							<div
								className="book-flip-face book-flip-back"
								style={paperStyle('flipBack')}
							>
								<BookPage
									page={pages[flip.backIdx]}
									pageSize={pageSize}
									spoiledAt={spoiledAt}
									fullySpoiled={fullySpoiled}
									onSpoil={onSpoil}
									onNavigate={goToEntry}
									pageNumber={flip.backIdx + 1}
								/>
							</div>
						</div>
					)}

					{!coverOpened && (
						<BookCover
							coverTex={coverTex}
							opening={coverOpening}
							onOpen={openCover}
						/>
					)}
				</div>

				<BookNav
					currentSpread={currentSpread}
					totalSpreads={totalSpreads}
					canPrev={canPrev}
					canNext={canNext}
					onPrev={goPrev}
					onNext={goNext}
					onHoldStart={startHold}
					onJump={goToPage}
					ready={ready}
					disabled={!coverOpened}
				/>
			</div>

			{/* Замерный офскрин — без изменений. */}
			<div ref={measureRef} className="book-measure-host" aria-hidden="true">
				{pageSize.width > 0 &&
					safeEntries.map((entry) => (
						<div
							key={entry.id}
							data-measure-entry
							className="book-measure-entry book-page-columns-inner"
							style={{
								width: pageSize.width,
								height: pageSize.height,
								columnWidth: `${pageSize.width}px`,
								columnGap: 0,
								columnFill: 'auto',
							}}
						>
							{entry.hidden === 'spoiler' ? (
								<div style={{ height: '100%' }} />
							) : (
								<EntryFlow entry={entry} />
							)}
						</div>
					))}
			</div>
		</div>
	);
}