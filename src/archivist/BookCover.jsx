// src/archivist/BookCover.jsx
//
// Обложка Свода. Лежит в правой половине разворота — как
// закрытая книга на столе. Корешок — левая кромка обложки,
// она же центр разворота. Открытие — поворот на -180° вокруг
// корешка: обложка перелетает на левую половину и ложится
// изнанкой вверх.
//
// У обложки две грани:
//   front — кожа с тиснением, видна до 90°
//   back  — эндпапир, видна после 90°
//
// Логотип CODERROR — отдельный компонент, скейлится пропом
// scale. Если не влезает по ширине правой половины — уменьшай
// scale, не трогая cellHeight.

import React from 'react';
import Logo from '../components/Logo.jsx'; // ← путь подгони

export default function BookCover({ coverTex, opening, onOpen }) {
  return (
    <div
      className={`book-cover-flip ${opening ? 'is-opening' : ''}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="book-cover-face book-cover-front"
           style={{ '--cover-texture': `url(${coverTex})` }}>
        <div className="book-cover-logo-band">
          <Logo cellHeight={60} scale={0.55} />
        </div>
        <div className="book-cover-title">Свод</div>
        <div className="book-cover-subtitle">записи архивариуса</div>
        <div className="book-cover-hint">нажми, чтобы открыть</div>
      </div>
    </div>
  );
}