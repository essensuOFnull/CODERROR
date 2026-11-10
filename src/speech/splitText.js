// speech/splitText.js
//
// Режем текст на чанки, сохраняя позиции в исходнике.
// Piper синтезирует всё, что дали, одним куском — значит,
// чтобы начать говорить раньше, надо давать меньше.
//
// Возвращаем { text, start, end } — позиции нужны, чтобы
// печатная машинка знала, где именно в исходном тексте
// находится текущий чанк.
//
// — Архивариус

export function splitIntoChunks(text) {
  if (!text) return [];

  // Режем по границам предложений и переводам строк.
  const parts = [];
  let last = 0;
  const re = /[.!?…]+[\s]*|\n+/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const end = m.index + m[0].length;
    if (end > last) {
      parts.push({ text: text.slice(last, end), start: last, end });
      last = end;
    }
  }
  if (last < text.length) {
    parts.push({ text: text.slice(last), start: last, end: text.length });
  }
  if (parts.length === 0) {
    parts.push({ text, start: 0, end: text.length });
  }

  // Склеиваем слишком короткие куски. Меньше ~20 символов —
  // модель тратит больше на оверхед, чем на звук.
  const MIN = 20;
  const chunks = [];
  let acc = null;
  for (const p of parts) {
    if (!acc) {
      acc = { ...p };
    } else {
      acc.text += p.text;
      acc.end = p.end;
    }
    if (acc.text.trim().length >= MIN || acc.text.endsWith('…')) {
      chunks.push(acc);
      acc = null;
    }
  }
  if (acc) chunks.push(acc);

  return chunks;
}