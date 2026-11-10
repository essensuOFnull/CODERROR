// src/archivist/useSpeechTypewriter.js
//
// Печатная машинка с локальным голосом (Piper TTS).
// Речь ведёт — буквы следуют.
//
// Вместо Web Speech API используем локальные ONNX-модели.
// Это даёт полную автономность, поддержку разных голосов
// и независимость от системных TTS.
//
// — Архивариус

import { useCallback, useEffect, useRef, useState } from 'react';
import * as tts from '@mintplex-labs/piper-tts-web';

// ── Настройки голоса ──────────────────────────────────────────

// Карта голосов. Ключ — имя сцены из useArchivist, значение — ID модели.
// Меняя эту карту, можно легко назначать разные голоса разным сценам.
const VOICE_MAP = {
  default: 'ru_RU-ruslan-medium',   // Основной голос Архивариуса
  moment: 'ru_RU-ruslan-medium',     // Для редких, «человечных» моментов
  // future_female: 'ru_RU-irina-medium', // На будущее
};

const DEFAULT_VOICE_ID = VOICE_MAP.default;

// Скорость речи. 1.0 — нормальная, меньше — медленнее.
const VOICE_RATE = 0.95;

// ── Утилиты ───────────────────────────────────────────────────

// Извлекаем простой текст из строки для генерации речи.
// Убираем разметку ссылок, оставляем только текст.
function plainText(text) {
  return text.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => {
    return label || id;
  });
}

// ── Хук ───────────────────────────────────────────────────────

export function useSpeechTypewriter(text, { voiceId } = {}) {
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);

  const genRef = useRef(0);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  // Эффект для сброса состояния при смене текста
  useEffect(() => {
    const gen = ++genRef.current;
    clearTimeout(timerRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setTyped('');
    setDone(false);

    if (!text) {
      setDone(true);
      return;
    }

    // Выбираем голос: либо переданный, либо по умолчанию
    const modelId = voiceId || DEFAULT_VOICE_ID;

    // Запускаем генерацию и воспроизведение
    (async () => {
      try {
        // 1. Генерируем WAV через Piper
        const wav = await tts.predict({
          text: plainText(text),
          voiceId: modelId,
        });

        // Проверяем, не устарел ли запрос, пока мы генерировали
        if (genRef.current !== gen) return;

        // 2. Создаём Audio и воспроизводим
        const audio = new Audio(URL.createObjectURL(wav));
        audio.playbackRate = VOICE_RATE;
        audioRef.current = audio;

        // 3. Синхронизация печати с аудио
        //    Piper не даёт событий onboundary, поэтому
        //    рассчитываем скорость печати по длительности аудио.
        let duration = 0;
        audio.onloadedmetadata = () => {
          duration = audio.duration;
          const charsPerSecond = text.length / duration;
          const interval = 1000 / charsPerSecond;

          let i = 0;
          const tick = () => {
            if (genRef.current !== gen) return;
            if (i >= text.length) {
              setDone(true);
              return;
            }
            setTyped(text.slice(0, i + 1));
            i++;
            timerRef.current = setTimeout(tick, interval);
          };
          tick();
        };

        // Если метаданные не загрузились, начинаем печатать сразу
        audio.onerror = () => {
          if (genRef.current !== gen) return;
          setTyped(text);
          setDone(true);
        };

        await audio.play();

        audio.onended = () => {
          if (genRef.current !== gen) return;
          setTyped(text);
          setDone(true);
        };
      } catch (err) {
        console.warn('[archivist] Piper не справился:', err);
        // Фолбэк: просто печатаем, как раньше
        if (genRef.current !== gen) return;
        let i = 0;
        const tick = () => {
          if (genRef.current !== gen) return;
          if (i >= text.length) { setDone(true); return; }
          setTyped(text.slice(0, i + 1));
          i++;
          timerRef.current = setTimeout(tick, 26 + Math.random() * 46);
        };
        timerRef.current = setTimeout(tick, 180);
      }
    })();

    // Очистка при размонтировании или смене текста
    return () => {
      genRef.current++;
      clearTimeout(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [text, voiceId]);

  // Досрочно раскрыть строку: останавливаем аудио и печать,
  // показываем всё разом.
  const skip = useCallback(() => {
    genRef.current++;
    clearTimeout(timerRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setTyped(text);
    setDone(true);
  }, [text]);

  return { typed, done, skip };
}