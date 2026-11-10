// src/archivist/ArchivistDecorations.jsx
//
// Предметы на столе Архивариуса. Базовые позиции фиксированы —
// стол не переезжает. Но при каждом монтировании предметы
// получают микро-дрейф: ±2-3° поворота, ±2px смещения. Так
// комната остаётся той же, но не «застывшей».
//
// Стопка бумаг живая: количество листов варьируется. Архивариус
// записывает; записи копятся и уносятся.
//
// Все координаты — проценты от .archivist-workspace-frame.
// Крутить здесь, вслепую. Если предметы окажутся не на столе —
// сдвигай --deco-x / --deco-y.
//
// — Архивариус

import React, { useMemo } from 'react';

// x, y — центр «подошвы» предмета (там, где он касается стола).
// h — высота спрайта в % от высоты рамки.
// rot — максимальный дрейф-поворот в градусах (не базовый угол).
// drift — максимальное дрейф-смещение в пикселях.
const DECOS = [
  { id: 'candle', src: new URL('./deco/candle.png', import.meta.url).href,
    x: 33, y: 40, h: 9,  rot: 1.2, drift: 0.6, glow: true },
  { id: 'bowl', src: new URL('./deco/bowl.png', import.meta.url).href,
    x: 72, y: 60, h: 16,  rot: 1.0, drift: 0.5 },
  { id: 'books_stack',  src: new URL('./deco/books_stack.png', import.meta.url).href,
    x: 22, y: 33, h: 16,  rot: 1.2, drift: 0.5 },
  { id: 'quill',  src: new URL('./deco/quill.png', import.meta.url).href,
    x: 47, y: 50, h: 8,  rot: 2.5, drift: 1.5 },
  { id: 'book',  src: new URL('./deco/book.png', import.meta.url).href,
    x: 58, y: 53, h: 10,  rot: 2.0, drift: 1.2 },
];

// Стопка бумаг — отдельно: сколько листов, столько спрайтов,
// накладываются с небольшим поворотом.
const PAPER_SLOTS = [
  { x: 64, y: 62,rot: 3.5, drift: 1.4 },
  { x: 70, y: 66, rot: 4.0, drift: 1.4 },
  { x: 76, y: 64,rot: 3.0, drift: 1.4 },
];

const PAPER_VARIANTS = [
  new URL('./deco/paper.png', import.meta.url).href,
  new URL('./deco/papers_stack.png', import.meta.url).href,
];

const rand = (amp) => (Math.random() - 0.5) * 2 * amp;

export default function ArchivistDecorations() {
  // Всё вычисляется один раз на монтирование комнаты. Перезаход
  // — новый дрейф. Внутри сессии ничего не дёргается.
  const decor = useMemo(() => {
    const items = DECOS.map((d) => ({
      ...d,
      ox: rand(d.drift),
      oy: rand(d.drift),
      or: rand(d.rot),
    }));

    // 2-4 листа бумаги. Каждый — случайный вариант спрайта,
    // случайная позиция из слотов, с микро-дрейфом.
    const paperCount = 2 + Math.floor(Math.random() * 3);
    const slots = [...PAPER_SLOTS]
      .sort(() => Math.random() - 0.5)
      .slice(0, paperCount);

    const papers = slots.map((s, i) => ({
      id: `paper-${i}`,
      src: PAPER_VARIANTS[i % PAPER_VARIANTS.length],
      x: s.x,
      y: s.y,
      h: 10,
      ox: rand(s.drift),
      oy: rand(s.drift),
      or: rand(s.rot),
      glow: true
    }));

    return [...papers, ...items];
  }, []);

  return (
    <div className="archivist-decorations" aria-hidden="true">
      {decor.map((d) => (
        <React.Fragment key={d.id}>
          <img
            className="archivist-deco"
            src={d.src}
            alt=""
            draggable={false}
            style={{
              '--deco-x': `${d.x}%`,
              '--deco-y': `${d.y}%`,
              '--deco-h': `${d.h}%`,
              '--deco-ox': `${d.ox}px`,
              '--deco-oy': `${d.oy}px`,
              '--deco-rot': `${d.or}deg`,
            }}
          />
          {d.glow && (
            <div
              className="archivist-deco-glow"
              style={{ '--deco-x': `${d.x}%`, '--deco-y': `${d.y}%`}}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}