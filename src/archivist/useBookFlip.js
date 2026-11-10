// src/archivist/useBookFlip.js
//
// Состояние перелистывания. Лист вращается через CSS-transform,
// drag — через pointer events. Когда лист долетает — onSettle,
// чтобы компонент мог ротировать текстуры.
//
// С новым:
//   • startHold/stopHold — зажатие кнопок навигации. Держишь —
//     листы летят один за другим без пауз.
//   • goToPage(n) — прыжок на разворот по номеру.
//
// — Архивариус

import { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import {
	CLICK_THRESHOLD,
	COMPLETE_THRESHOLD,
	SETTLE_MS,
	clamp01,
} from './bookConstants.js';

export function useBookFlip(pages, ready, onSettle) {
	const [leftIdx, setLeftIdx] = useState(0);
	const [rightIdx, setRightIdx] = useState(1);
	const [flip, setFlip] = useState(null);
	const [holdDir, setHoldDir] = useState(null);

	const dragRef = useRef(null);
	const settleTimerRef = useRef(null);
	const flipRef = useRef(null);
	const onSettleRef = useRef(onSettle);

	// Синхронизируем ref до эффектов, не после рендера.
	// useLayoutEffect срабатывает после DOM-коммита, но до
	// paint — раньше, чем любой rAF или pointerup.
	useLayoutEffect(() => {
		flipRef.current = flip;
	}, [flip]);

	onSettleRef.current = onSettle;

	useEffect(() => () => clearTimeout(settleTimerRef.current), []);

	useEffect(() => {
		setLeftIdx(0);
		setRightIdx(1);
		setFlip(null);
		setHoldDir(null);
	}, [pages]);

	const totalSpreads = ready ? Math.ceil(pages.length / 2) : 0;
	const currentSpread = rightIdx >> 1;
	const canPrev = ready && leftIdx > 0;
	const canNext = ready && currentSpread + 1 < totalSpreads;

	const settleComplete = useCallback(() => {
		const f = flipRef.current;
		if (!f) return;
		if (f.direction === 'next') setLeftIdx(f.backIdx);
		else setRightIdx(f.backIdx);
		setFlip(null);
		onSettleRef.current?.(f.direction);
	}, []);

	const settleCancel = useCallback(() => {
		const f = flipRef.current;
		if (!f) return;
		if (f.direction === 'next') setRightIdx(f.frontIdx);
		else setLeftIdx(f.frontIdx);
		setFlip(null);
	}, []);

  const beginFlip = useCallback(
    (direction, { animate = false, dragging = false } = {}) => {
      if (direction === 'next') {
        if (!canNext) return;
        setRightIdx((r) => r + 2);
        setFlip({
          direction,
          frontIdx: rightIdx,
          backIdx: rightIdx + 1,
          angle: 0,
          dragging,
          animate,
        });
      } else {
        if (!canPrev) return;
        setLeftIdx((l) => l - 2);
        setFlip({
          direction,
          frontIdx: leftIdx,
          backIdx: leftIdx - 1,
          angle: 0,
          dragging,
          animate,
        });
      }
    },
    [canNext, canPrev, rightIdx, leftIdx]
  );

  // Автофлип: один setFlip, анимация — на CSS. Таймер ставим
  // сразу же: длительность известна заранее.
  const flyFlip = useCallback(
    (direction) => {
      beginFlip(direction, { animate: true });
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(settleComplete, SETTLE_MS);
    },
    [beginFlip, settleComplete]
  );

	const goNext = useCallback(() => {
		if (!canNext || flipRef.current) return;
		flyFlip('next');
	}, [canNext, flyFlip]);

	const goPrev = useCallback(() => {
		if (!canPrev || flipRef.current) return;
		flyFlip('prev');
	}, [canPrev, flyFlip]);

	// ── зажатие ───────────────────────────────────────────────
	//
	// Держим направление в состоянии. Эффект ниже пытается
	// флипнуть снова каждый раз, когда:
	//   • направление задано,
	//   • лист сейчас не летит,
	//   • есть куда лететь.
	// Получается цепочка: как только лист долетел — стартует
	// следующий. Никаких setInterval, никакой дрожи.

	const startHold = useCallback((dir) => {
		setHoldDir(dir);
	}, []);

	const stopHold = useCallback(() => {
		setHoldDir(null);
	}, []);

	useEffect(() => {
		if (!holdDir || !ready || flip) return;
		if (holdDir === 'next' && !canNext) return;
		if (holdDir === 'prev' && !canPrev) return;
		if (holdDir === 'next') goNext();
		else goPrev();
	}, [holdDir, ready, flip, canNext, canPrev, goNext, goPrev]);

	// Глобальное отпускание: если кнопку «утащили» мышью или
	// палец ушёл за пределы — всё равно останавливаемся.
	useEffect(() => {
		if (!holdDir) return;
		const stop = () => setHoldDir(null);
		window.addEventListener('pointerup', stop);
		window.addEventListener('pointercancel', stop);
		return () => {
			window.removeEventListener('pointerup', stop);
			window.removeEventListener('pointercancel', stop);
		};
	}, [holdDir]);

	// ── прыжок по номеру ──────────────────────────────────────
	//
	// Синхронно гасим всё, что могло остаться от прошлого
	// флипа: таймер, drag, ссылку на лист. Если этого не
	// сделать — следующий клик подхватит stale-значения и
	// может родить флип с углом, который браузер прочтёт как
	// «продолжение», без transition.
	const goToPage = useCallback(
		(pageNum) => {
			if (!ready || totalSpreads === 0) return;

			clearTimeout(settleTimerRef.current);
			settleTimerRef.current = null;
			flipRef.current = null;
			dragRef.current = null;

			const target = Math.max(0, Math.min(totalSpreads - 1, pageNum - 1));
			setLeftIdx(target * 2);
			setRightIdx(Math.min(target * 2 + 1, pages.length - 1));
			setFlip(null);
			setHoldDir(null);
		},
		[ready, totalSpreads, pages]
	);

	// ── навигация по ссылкам ──────────────────────────────────
	const goToEntry = useCallback(
		(id) => {
			if (!ready) return;
			const idx = pages.findIndex(
				(p) => p.entry.id === id && p.columnIndex === 0
			);
			if (idx < 0) {
				console.warn('[archivist] ссылка ведёт в никуда:', id);
				return;
			}

			clearTimeout(settleTimerRef.current);
			settleTimerRef.current = null;
			flipRef.current = null;
			dragRef.current = null;

			const spreadStart = idx % 2 === 0 ? idx : idx - 1;
			const right = Math.min(spreadStart + 1, pages.length - 1);
			setLeftIdx(spreadStart);
			setRightIdx(right);
			setFlip(null);
			setHoldDir(null);
		},
		[pages, ready]
	);

	// ── указатель (drag) ──────────────────────────────────────
	const onPointerDown = useCallback(
		(e) => {
			if (flipRef.current || !ready) return;
			const rect = e.currentTarget.getBoundingClientRect();
			const isRight = e.clientX - rect.left >= rect.width / 2;
			if (isRight && !canNext) return;
			if (!isRight && !canPrev) return;

			dragRef.current = {
				side: isRight ? 'next' : 'prev',
				startX: e.clientX,
				halfWidth: rect.width / 2,
				moved: false,
			};
			e.currentTarget.setPointerCapture(e.pointerId);
		},
		[ready, canNext, canPrev]
	);

	const onPointerMove = useCallback(
		(e) => {
			const d = dragRef.current;
			if (!d) return;
			const dx = e.clientX - d.startX;

			if (!d.moved) {
				if (Math.abs(dx) < CLICK_THRESHOLD) return;
				d.moved = true;
				beginFlip(d.side);
			}

			const progress =
				d.side === 'next'
					? clamp01(-dx / d.halfWidth)
					: clamp01(dx / d.halfWidth);
			const angle = d.side === 'next' ? -180 * progress : 180 * progress;

			setFlip((f) => (f ? { ...f, angle, dragging: true } : f));
		},
		[beginFlip]
	);

	const onPointerUp = useCallback(
		(e) => {
			const d = dragRef.current;
			if (!d) return;
			dragRef.current = null;
			try {
				e.currentTarget.releasePointerCapture(e.pointerId);
			} catch { }

			if (!d.moved) {
				flyFlip(d.side);
				return;
			}

			const f = flipRef.current;
			if (!f) return;

			const progress = Math.abs(f.angle) / 180;
			const complete = progress > COMPLETE_THRESHOLD;
			const target = complete
				? f.direction === 'next'
					? -180
					: 180
				: 0;

			clearTimeout(settleTimerRef.current);
			settleTimerRef.current = setTimeout(
				complete ? settleComplete : settleCancel,
				SETTLE_MS
			);

			setFlip({ ...f, angle: target, dragging: false });
		},
		[flyFlip, settleComplete, settleCancel]
	);

	return {
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
		pointerHandlers: {
			onPointerDown,
			onPointerMove,
			onPointerUp,
			onPointerCancel: onPointerUp,
		},
	};
}