// src/archivist/EntryFlow.jsx
//
// Разбор одной записи в JSX. Всё, что связано с «как выглядит
// текст записи на странице», — здесь.

import React from 'react';
import { parseText, segmentsLength } from './links.js';
import BookLink from './BookLink.jsx';

// Рендер сегментов с бюджетом видимых символов.
// budget — сколько символов доступно этому куску текста.
// Возвращает [reactNode, consumed].
function renderSegments(segments, budget, onNavigate) {
  const parts = [];
  let left = budget;
  let consumed = 0;

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const len = s.text.length;

    if (left <= 0) {
      parts.push(
        <span key={`h${i}`} style={{ visibility: 'hidden' }}>
          {s.text}
        </span>
      );
      continue;
    }

    if (left >= len) {
      if (s.t === 'link') {
        parts.push(
          <BookLink key={`l${i}`} entryId={s.id} onNavigate={onNavigate}>
            {s.text}
          </BookLink>
        );
      } else {
        parts.push(s.text);
      }
      left -= len;
      consumed += len;
    } else {
      const head = s.text.slice(0, left);
      const tail = s.text.slice(left);
      if (head) parts.push(head);
      if (tail) {
        parts.push(
          <span key={`t${i}`} style={{ visibility: 'hidden' }}>
            {tail}
          </span>
        );
      }
      consumed += left;
      left = 0;
    }
  }

  return [parts, consumed];
}

// Рендер одного блока.
function renderBlock(block, budget, onNavigate) {
  switch (block.t) {
    case 'p':
    case 'em':
    case 'strong':
    case 'quote':
    case 'pre': {
      const segments = parseText(block.text || '');
      const [node, consumed] = renderSegments(segments, budget, onNavigate);
      switch (block.t) {
        case 'p':
          return [<p key="p">{node}</p>, consumed];
        case 'em':
          return [<p key="p" className="book-em">{node}</p>, consumed];
        case 'strong':
          return [<p key="p" className="book-strong">{node}</p>, consumed];
        case 'quote':
          return [
            <blockquote key="q">
              {node}
              {block.caption && consumed >= segmentsLength(segments) && (
                <footer>{block.caption}</footer>
              )}
            </blockquote>,
            consumed,
          ];
        case 'pre':
          return [<pre key="pre" className="book-pre">{node}</pre>, consumed];
      }
      return [null, 0];
    }

    case 'list': {
      const items = [];
      let left = budget;
      let consumed = 0;
      (block.items || []).forEach((it, i) => {
        const segments = parseText(it);
        const [node, c] = renderSegments(segments, left, onNavigate);
        items.push(<li key={i}>{node}</li>);
        left -= c;
        consumed += c;
      });
      const list = block.ordered
        ? <ol key="list">{items}</ol>
        : <ul key="list">{items}</ul>;
      return [list, consumed];
    }

    case 'hr':
      return budget > 0 ? [<hr key="hr" />, 0] : [null, 0];

    default:
      return [null, 0];
  }
}

export default function EntryFlow({ entry, revealed = Infinity, onNavigate }) {
  const blocks = entry.blocks || [];
  let left = revealed;
  const out = [];

  if (entry.title) {
    out.push(
      <h3 key="__title" className="book-page-title">
        {entry.title}
      </h3>
    );
  }
  if (entry.subtitle) {
    out.push(
      <div key="__sub" className="book-page-subtitle">
        {entry.subtitle}
      </div>
    );
  }

  blocks.forEach((b, i) => {
    const [node, consumed] = renderBlock(b, left, onNavigate);
    if (node) out.push(<React.Fragment key={i}>{node}</React.Fragment>);
    left -= consumed;
  });

  return <>{out}</>;
}