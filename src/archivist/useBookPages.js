// src/archivist/useBookPages.js
//
// Замер записей в офскрине и разбиение на «страницы» —
// единицы по pageSize.width. Каждая запись длиной в N колонок
// даёт N страниц с columnIndex = 0..N-1.

import { useLayoutEffect, useRef, useState } from 'react';

export function useBookPages(entries, pageSize) {
  const measureRef = useRef(null);
  const [pages, setPages] = useState(null);

  useLayoutEffect(() => {
    if (!pageSize.width || !pageSize.height) return;
    const host = measureRef.current;
    if (!host) return;

    const nodes = host.querySelectorAll('[data-measure-entry]');
    const result = [];
    entries.forEach((entry, i) => {
      const el = nodes[i];
      const cols = el
        ? Math.max(1, Math.round(el.scrollWidth / pageSize.width))
        : 1;
      for (let c = 0; c < cols; c++) {
        result.push({ entry, columnIndex: c, totalColumns: cols });
      }
    });
    setPages(result);
  }, [entries, pageSize.width, pageSize.height]);

  return { pages, measureRef };
}