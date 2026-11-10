// src/archivist/BookToc.jsx
//
// Свиток слева от книги: оглавление и поиск.
//
// entries принимаем как есть, но не доверяем: если пришло
// что-то, что не массив, работаем с пустым. Родитель должен
// был уже всё развернуть и отфильтровать, но defensive-код
// здесь ничего не стоит, а падений на null.length — стоит.
//
// — Архивариус

import React, { useMemo, useState } from 'react';

function entryMatches(entry, q) {
  if (!entry) return false;
  if (entry.title && entry.title.toLowerCase().includes(q)) return true;
  if (entry.subtitle && entry.subtitle.toLowerCase().includes(q)) return true;
  if (entry.id && entry.id.toLowerCase().includes(q)) return true;
  for (const b of entry.blocks || []) {
    if (b.text && b.text.toLowerCase().includes(q)) return true;
    if (b.caption && b.caption.toLowerCase().includes(q)) return true;
    if (b.items) {
      for (const it of b.items) {
        if (typeof it === 'string' && it.toLowerCase().includes(q)) return true;
      }
    }
  }
  return false;
}

export default function BookToc({ entries, onNavigate }) {
  const safeEntries = useMemo(
    () => (Array.isArray(entries) ? entries.filter(Boolean) : []),
    [entries]
  );

  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return safeEntries;
    return safeEntries.filter((e) => entryMatches(e, q));
  }, [safeEntries, query]);

  return (
    <aside className="book-toc" aria-label="оглавление">
      <div className="book-toc-head">
        <span className="book-toc-title">оглавление</span>
        <span className="book-toc-count">
          {filtered.length}/{safeEntries.length}
        </span>
      </div>

      <div className="book-toc-search">
        <input
          type="text"
          placeholder="поиск по записям…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
        />
      </div>

      <div className="book-toc-list">
        {filtered.length === 0 && (
          <div className="book-toc-empty">ничего не найдено</div>
        )}
        {filtered.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="book-toc-item"
            onClick={() => onNavigate(entry.id)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span className="book-toc-item-title">
              {entry.title || entry.id}
            </span>
            {(entry.part || entry.kind) && (
              <span className="book-toc-item-meta">
                {[entry.part, entry.kind].filter(Boolean).join(' · ')}
              </span>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}