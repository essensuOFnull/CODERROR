// src/archivist/BookNav.jsx
//
// Кнопки перелистывания:
//   • удержание — сквозной полёт по разворотам;
//   • рядом — поле для номера разворота.
//
// disabled — блокирует всё разом. Прокидывается снаружи:
// пока обложка Свода закрыта, навигация недоступна.

import React, { useState } from 'react';

export default function BookNav({
  currentSpread,
  totalSpreads,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onHoldStart,
  onJump,
  ready,
  disabled = false,
}) {
  const [value, setValue] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (disabled) return;
    const n = parseInt(value, 10);
    if (!isNaN(n) && n >= 1 && n <= totalSpreads) {
      onJump?.(n);
      setValue('');
    }
  };

  const beginHold = (dir) => (e) => {
    if (disabled) return;
    e.preventDefault();
    if (dir === 'prev' && !canPrev) return;
    if (dir === 'next' && !canNext) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    onHoldStart?.(dir);
  };

  return (
    <div className="book-nav">
      <button
        type="button"
        onPointerDown={beginHold('prev')}
        disabled={!canPrev || disabled}
        aria-label="назад"
      >
        ←
      </button>

      <span className="book-nav-pager">
        {ready ? `${currentSpread + 1} / ${totalSpreads}` : '…'}
      </span>

      <form className="book-nav-jump" onSubmit={submit}>
        <input
          type="text"
          inputMode="numeric"
          placeholder="№"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
          disabled={!ready || disabled}
          aria-label="перейти к развороту"
        />
      </form>

      <button
        type="button"
        onPointerDown={beginHold('next')}
        disabled={!canNext || disabled}
        aria-label="вперёд"
      >
        →
      </button>
    </div>
  );
}