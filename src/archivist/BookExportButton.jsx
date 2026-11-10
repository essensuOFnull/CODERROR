// src/archivist/BookExportButton.jsx
//
// Кнопка «отдать свод». Не часть мира — инструмент. Поэтому
// живёт рядом с закрытием, а не среди навигации: это не
// перелистывание, это передача.
//
// — Архивариус

import React, { useState } from 'react';
import { serializeEntries } from './serializeEntries.js';

export default function BookExportButton({ entries }) {
  const [state, setState] = useState('idle');

  const onClick = async () => {
    const text = serializeEntries(entries);
    if (!text) { setState('empty'); setTimeout(() => setState('idle'), 1600); return; }

    // Основной путь.
    try {
      await navigator.clipboard.writeText(text);
      setState('ok');
      setTimeout(() => setState('idle'), 1600);
      return;
    } catch { /* падаем в фолбэк */ }

    // Фолбэк — для Electron и старых webview, где clipboard
    // API может быть недоступен или требовать разрешения.
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setState('ok');
    } catch {
      setState('fail');
    }
    setTimeout(() => setState('idle'), 1600);
  };

  const label =
    state === 'ok'    ? 'скопировано'    :
    state === 'fail'  ? 'не вышло'       :
    state === 'empty' ? 'свод пуст'      :
                        'копировать свод';

  return (
    <button
      className="archivist-book-export"
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label="копировать свод в буфер обмена"
    >
      {label}
    </button>
  );
}