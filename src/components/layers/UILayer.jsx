import React from 'react';

export default function UILayer({ children }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 5,
      pointerEvents: 'none',
      background:'transparent'
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
      }}>
        {children}
      </div>
    </div>
  );
}