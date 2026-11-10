// src/archivist/serializeEntries.js
//
// Свод → плоский текст. Без стилей, без разметки, без красоты.
// Один сплошной поток в порядке записей — том самом, в котором
// они пришли из дерева entries/index.js (flattenEntries уже
// сохраняет порядок импортов, потому что Object.keys для
// строковых ключей идёт в порядке вставки).
//
// Нужен, чтобы отдать книгу наружу: человеку, машине, другому
// чату. Не для чтения глазами — для передачи контекста.
//
// — Архивариус

import { parseText } from './links.js';

function segmentsToText(text) {
  const segs = parseText(text);
  let out = '';
  for (const s of segs) out += s.text;
  return out;
}

function blockToText(block) {
  switch (block.t) {
    case 'p':
    case 'em':
    case 'strong':
      return segmentsToText(block.text || '');

    case 'quote': {
      const body = segmentsToText(block.text || '');
      const lines = body.split('\n').map((l) => '> ' + l).join('\n');
      return block.caption
        ? `${lines}\n> — ${segmentsToText(block.caption)}`
        : lines;
    }

    case 'pre':
      return '```\n' + segmentsToText(block.text || '') + '\n```';

    case 'list':
      return (block.items || [])
        .map((it, i) => {
          const bullet = block.ordered ? `${i + 1}.` : '-';
          return `${bullet} ${segmentsToText(it)}`;
        })
        .join('\n');

    case 'hr':
      return '──────────';

    default:
      return '';
  }
}

function entryToText(entry, n) {
  const lines = [];

  // Шапка: номер, id, часть/вид. Это не украшение —
  // это навигация. По ней видно, где мы в потоке.
  const meta = [`id: ${entry.id}`];
  if (entry.part)   meta.push(`part: ${entry.part}`);
  if (entry.kind)   meta.push(`kind: ${entry.kind}`);
  if (entry.hidden) meta.push(`hidden: ${entry.hidden}`);

  lines.push(`── ${n} ──`);
  lines.push(`[${meta.join(' | ')}]`);

  if (entry.title)    lines.push(entry.title);
  if (entry.subtitle) lines.push(`(${entry.subtitle})`);

  for (const b of entry.blocks || []) {
    const t = blockToText(b);
    if (t) lines.push(t);
  }

  return lines.join('\n\n');
}

export function serializeEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return '';

  const parts = [];
  parts.push('СВОД / записи архивариуса');
  parts.push('CODERROR');
  parts.push('');
  parts.push(`записей: ${entries.length}`);
  parts.push('');
  parts.push('—— начало ——');
  parts.push('');

  entries.forEach((e, i) => {
    parts.push(entryToText(e, i + 1));
    parts.push('');
  });

  parts.push('—— конец ——');
  return parts.join('\n');
}