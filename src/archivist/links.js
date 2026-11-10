// src/archivist/links.js
//
// Внутренние ссылки в книге. Пишутся как [[id]] или [[id|текст]].
// Парсер отдаёт сегменты: { t:'text', text } и { t:'link', id, text }.
//
// Печатная машинка считает длину по сегментам, поэтому невидимый
// хвост занимает ровно то место, которое займёт видимый текст.
// Слова не перескакивают в момент раскрытия.

const LINK_RE = /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g;

export function parseText(text) {
  if (typeof text !== 'string' || !text) return [];
  const out = [];
  let last = 0;
  LINK_RE.lastIndex = 0;
  let m;
  while ((m = LINK_RE.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ t: 'text', text: text.slice(last, m.index) });
    }
    out.push({ t: 'link', id: m[1], text: m[2] || m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push({ t: 'text', text: text.slice(last) });
  }
  return out;
}

export function segmentsLength(segments) {
  let n = 0;
  for (const s of segments) n += s.text.length;
  return n;
}

export function plainTextLength(text) {
  return segmentsLength(parseText(text));
}

export function blockTextLength(block) {
  if (block.t === 'list') {
    let n = 0;
    for (const it of block.items || []) n += plainTextLength(it);
    return n;
  }
  return plainTextLength(block.text || '');
}

export function entryTextLength(entry) {
  let n = 0;
  for (const b of entry.blocks || []) n += blockTextLength(b);
  return n;
}