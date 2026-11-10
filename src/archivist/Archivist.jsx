// src/archivist/Archivist.jsx
import React, { useEffect, useState } from 'react';
import ArchivistRoom from './ArchivistRoom.jsx';
import ArchivistBook from './ArchivistBook.jsx';
import { useArchivist } from './useArchivist.js';
import { useArchivistBookState } from './useArchivistFlag.js';
import { _OPEN, _CLOSE, _hash } from './keys.js';
import './archivist.css';

export default function Archivist() {
  const [open, setOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const a = useArchivist(open);
  const book = useArchivistBookState();

  useEffect(() => {
    const onKey = (e) => {
      if (_hash(e.key) === _OPEN) {
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => {
          if (v) setBookOpen(false);
          return !v;
        });
        return;
      }
      if (_hash(e.key) === _CLOSE) {
        if (bookOpen) setBookOpen(false);
        else if (open) setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, bookOpen]);

  if (!open) return null;

  return (
    <div className="archivist-overlay" role="dialog" aria-modal="true">
      <ArchivistRoom
        lines={a.lines}
        variant={a.stage}
        onDone={a.advance}
        bookOpen={bookOpen}
        onToggleBook={() => setBookOpen((v) => !v)}
      />
      {bookOpen && (
        <ArchivistBook
          entries={a.entries}
          spoiledAt={book.spoiledAt}
          fullySpoiled={book.fullySpoiled}
          onSpoil={book.onSpoil}
          onClose={() => setBookOpen(false)}
        />
      )}
    </div>
  );
}