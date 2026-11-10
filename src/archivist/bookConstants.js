// src/archivist/bookConstants.js
//
// Общие числа для книги. Живут отдельно, чтобы useBookFlip и
// ArchivistBook не разъезжались.

export const CLICK_THRESHOLD = 6;       // px — до этого считаем клик
export const COMPLETE_THRESHOLD = 0.35; // доля, после которой лист долетает
export const SETTLE_MS = 320;           // длительность анимации листа
export const COVER_OPEN_MS = 900;       // длительность открытия обложки

export const SPOIL_TOTAL_MS = 2400;     // за сколько раскрывается скрытая запись
export const SPOIL_MIN_PER_CHAR_MS = 8; // быстрее — не читается, ставим сразу
export const SPOIL_NOTE = 'открыто раньше срока';

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);