import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { entries } from './entries/index.js';
import ArchivistBook from './ArchivistBook.jsx';
import '../style.css';
import './archivist.css';
import './standalone.css';

function StandaloneReader() {
  const [bookOpen, setBookOpen] = useState(true);
  const [spoiledAt, setSpoiledAt] = useState({});

  if (!bookOpen) {
    return (
      <main className="standalone-reader-closed">
        <button type="button" onClick={() => setBookOpen(true)}>
          открыть свод
        </button>
      </main>
    );
  }

  return (
    <main className="standalone-reader">
      <ArchivistBook
        entries={entries}
        spoiledAt={spoiledAt}
        onSpoil={(id) => setSpoiledAt((current) => ({ ...current, [id]: true }))}
        onClose={() => setBookOpen(false)}
      />
    </main>
  );
}

createRoot(document.getElementById('root')).render(<StandaloneReader />);
