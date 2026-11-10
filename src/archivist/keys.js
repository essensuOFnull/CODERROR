// src/archivist/keys.js
const _h = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
};

export const _OPEN = _h(String.fromCharCode(70, 49));
export const _CLOSE = _h(String.fromCharCode(69, 115, 99, 97, 112, 101)); // Esc
export const _hash = _h;