import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Image } from '@tauri-apps/api/image';

const ICON_SIZE = 32;
const UPDATE_INTERVAL_MS = 1000 / 60;
const FONT_FAMILY = 'Terminus, sans-serif';
const GLYPH_FILL_RATIO = 0.9; // доля от ICON_SIZE, отведённая под глиф

// CJK Unified Ideographs
const HANZI_MIN = 0x4e00;
const HANZI_MAX = 0x9fff;

function randomChar() {
  const code = HANZI_MIN + Math.floor(Math.random() * (HANZI_MAX - HANZI_MIN + 1));
  return String.fromCodePoint(code);
}

function randomColor() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return `rgb(${r}, ${g}, ${b})`;
}

// Рисует глиф по центру size×size без искажений.
// Позиционирование идёт по реальным границам чернил (actualBoundingBox*),
// а не по em-квадрату — иначе иероглифы «съезжают» и выглядят неровно.
function drawGlyphCentered(ctx, char, size) {
  const maxFontSize = Math.floor(size * GLYPH_FILL_RATIO);

  const measure = (fontSize) => {
    ctx.font = `${fontSize}px ${FONT_FAMILY}`;
    const m = ctx.measureText(char);
    return {
      m,
      w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
      h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
    };
  };

  let fontSize = maxFontSize;
  let { m, w, h } = measure(fontSize);

  // Если глиф вылезает за края — пропорционально уменьшаем шрифт
  const maxDim = Math.max(w, h);
  if (maxDim > size) {
    fontSize = Math.max(1, Math.floor((fontSize * size) / maxDim));
    ({ m, w, h } = measure(fontSize));
  }

  // textAlign='left', textBaseline='alphabetic'
  const x = (size - w) / 2 + m.actualBoundingBoxLeft;
  const y = (size - h) / 2 + m.actualBoundingBoxAscent;
  ctx.fillText(char, x, y);
}

export function useDynamicWindowIcon() {
  useEffect(() => {
    if (!window.__TAURI_INTERNALS__) return;

    const appWindow = getCurrentWindow();
    const canvas = document.createElement('canvas');
    canvas.width = ICON_SIZE;
    canvas.height = ICON_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let previousIcon = null;
    let cancelled = false;
    let timeoutId = null;

    async function updateIcon() {
      ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
      ctx.fillStyle = randomColor();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      drawGlyphCentered(ctx, randomChar(), ICON_SIZE);

      const imageData = ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
      const rgba = new Uint8Array(
        imageData.data.buffer,
        imageData.data.byteOffset,
        imageData.data.byteLength,
      );

      try {
        const newIcon = await Image.new(rgba, ICON_SIZE, ICON_SIZE);
        if (cancelled) {
          await newIcon.close();
          return;
        }
        await appWindow.setIcon(newIcon);
        if (previousIcon) await previousIcon.close();
        previousIcon = newIcon;
      } catch (err) {
        console.error('Не удалось обновить иконку окна:', err);
      }
    }

    // Самопланирующийся цикл: следующий тик стартует только после завершения
    // предыдущего IPC-вызова. Иначе при 60 FPS очередь setIcon будет расти
    // и приложение начнёт тормозить.
    async function loop() {
      if (cancelled) return;
      await updateIcon();
      if (!cancelled) {
        timeoutId = setTimeout(loop, UPDATE_INTERVAL_MS);
      }
    }

    // Дождёмся загрузки шрифтов — важно, если Terminus подключён через @font-face
    document.fonts.ready.then(() => {
      if (!cancelled) loop();
    });

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (previousIcon) previousIcon.close();
    };
  }, []);
}