// src/archivist/PageOrnament.jsx
//
// Узор вокруг страницы Свода. Один SVG на все страницы —
// одинаковый для левых, правых, граней флипа, пустых
// и скрытых. Внутри: двойная рамка, угловые завитки,
// ромбы на серединах верхней и нижней кромки, тонкие
// точки на серединах боковых.
//
// Все координаты — в viewBox 420×560, пропорции страницы.
// preserveAspectRatio="none" растягивает SVG по контейнеру;
// поскольку .book-spread фиксирован, а половина всегда
// 420×560 — растяжение точное, углы не искажаются.
//
// Цвет берётся из currentColor, плотность — из opacity в
// CSS. Так узор можно притушить на странице со спойлером
// или усилить на открытой, не трогая сам компонент.
//
// — Архивариус

import React from 'react';

function PageOrnamentImpl() {
  return (
    <svg
      className="book-page-ornament"
      viewBox="0 0 420 560"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* ── двойная рамка ─────────────────────────────────── */}
      <rect
        x="10" y="10" width="400" height="540"
        fill="none" stroke="currentColor" strokeWidth="1"
      />
      <rect
        x="15" y="15" width="390" height="530"
        fill="none" stroke="currentColor" strokeWidth="0.5"
        opacity="0.7"
      />

      {/* ── угловые завитки ────────────────────────────────
           Внешняя дуга идёт по внешней рамке, внутренняя —
           по внутренней. Между ними — малый ромб. Рисуем
           левый верхний угол, остальные три — зеркалим. */}
      <g>
        <path
          d="M 10 30 C 10 18 18 10 30 10"
          fill="none" stroke="currentColor" strokeWidth="1.1"
        />
        <path
          d="M 15 25 C 15 20 20 15 25 15"
          fill="none" stroke="currentColor" strokeWidth="0.55"
          opacity="0.8"
        />
        <path
          d="M 20 18 L 22 20 L 20 22 L 18 20 Z"
          fill="currentColor" opacity="0.6"
        />
      </g>

      {/* правый верхний */}
      <g transform="translate(420,0) scale(-1,1)">
        <path
          d="M 10 30 C 10 18 18 10 30 10"
          fill="none" stroke="currentColor" strokeWidth="1.1"
        />
        <path
          d="M 15 25 C 15 20 20 15 25 15"
          fill="none" stroke="currentColor" strokeWidth="0.55"
          opacity="0.8"
        />
        <path
          d="M 20 18 L 22 20 L 20 22 L 18 20 Z"
          fill="currentColor" opacity="0.6"
        />
      </g>

      {/* левый нижний */}
      <g transform="translate(0,560) scale(1,-1)">
        <path
          d="M 10 30 C 10 18 18 10 30 10"
          fill="none" stroke="currentColor" strokeWidth="1.1"
        />
        <path
          d="M 15 25 C 15 20 20 15 25 15"
          fill="none" stroke="currentColor" strokeWidth="0.55"
          opacity="0.8"
        />
        <path
          d="M 20 18 L 22 20 L 20 22 L 18 20 Z"
          fill="currentColor" opacity="0.6"
        />
      </g>

      {/* правый нижний */}
      <g transform="translate(420,560) scale(-1,-1)">
        <path
          d="M 10 30 C 10 18 18 10 30 10"
          fill="none" stroke="currentColor" strokeWidth="1.1"
        />
        <path
          d="M 15 25 C 15 20 20 15 25 15"
          fill="none" stroke="currentColor" strokeWidth="0.55"
          opacity="0.8"
        />
        <path
          d="M 20 18 L 22 20 L 20 22 L 18 20 Z"
          fill="currentColor" opacity="0.6"
        />
      </g>

      {/* ── ромбы на серединах верхней и нижней кромок ───── */}
      <path
        d="M 210 7 L 213 10 L 210 13 L 207 10 Z"
        fill="currentColor" opacity="0.55"
      />
      <path
        d="M 210 547 L 213 550 L 210 553 L 207 550 Z"
        fill="currentColor" opacity="0.55"
      />

      {/* ── точки на серединах боковых кромок ────────────── */}
      <circle cx="10" cy="280" r="1.3" fill="currentColor" opacity="0.5" />
      <circle cx="410" cy="280" r="1.3" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

// Узор статичен: один и тот же на всех страницах. Мемоизация
// бесплатна и снимает его с повестки при каждом рендере
// страницы во время флипа.
export default React.memo(PageOrnamentImpl);