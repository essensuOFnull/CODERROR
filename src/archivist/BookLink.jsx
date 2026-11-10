// src/archivist/BookLink.jsx
import React from 'react';

export default function BookLink({ entryId, children, onNavigate }) {
  return (
    <span
      className="book-link"
      role="link"
      tabIndex={0}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onNavigate?.(entryId);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate?.(entryId);
        }
      }}
    >
      {children}
    </span>
  );
}