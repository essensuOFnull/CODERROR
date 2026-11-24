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
  const [htmlState, setHtmlState] = useState('idle');

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

  const onHtmlClick = async () => {
    setHtmlState('loading');
    try {
      const readerPath = import.meta.env.DEV
        ? '/__archivist-reader.html'
        : `${import.meta.env.BASE_URL}archivist-reader.html`;
      const readerUrl = new URL(
        readerPath,
        window.location.href
      );
      const response = await fetch(readerUrl);
      if (!response.ok) {
        throw new Error(`Не удалось загрузить HTML книги: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'coderror-lore.html';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setHtmlState('ok');
    } catch (error) {
      console.error('[archivist] HTML-экспорт не удался:', error);
      setHtmlState('fail');
    }
    window.setTimeout(() => setHtmlState('idle'), 2000);
  };

  const label =
    state === 'ok'    ? 'скопировано'    :
    state === 'fail'  ? 'не вышло'       :
    state === 'empty' ? 'свод пуст'      :
                        'копировать свод';
  const htmlLabel =
    htmlState === 'ok'    ? 'html сохранён' :
    htmlState === 'loading' ? 'готовим файл…' :
    htmlState === 'fail'  ? 'сначала соберите проект' :
                            'скачать книгу · html';

  return (
    <div className="archivist-book-export-actions">
      <button
        className="archivist-book-export"
        onClick={onClick}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="копировать свод в буфер обмена"
      >
        {label}
      </button>
      <button
        className="archivist-book-export-html"
        onClick={onHtmlClick}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="скачать свод как автономный HTML-файл"
      >
        {htmlLabel}
      </button>
    </div>
  );
}