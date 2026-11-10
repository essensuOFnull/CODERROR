// speech/useSpeechTypewriter.js
//
// Печатная машинка с голосом. Речь ведёт — буквы следуют.
//
// Синхронизация — через единый тикер. Он читает
// audio.currentTime каждого чанка и вычисляет, сколько
// символов исходного текста уже прозвучало. Никаких
// параллельных интервалов, никакого накопления погрешности.
//
// — Архивариус

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TtsSession } from '@realtimex/piper-tts-web';
import { VOICES, DEFAULT_VOICE, VOICE_RATE } from './config.js';
import { splitIntoChunks } from './splitText.js';

const sessions = new Map();

function getSession(voiceId) {
  if (sessions.has(voiceId)) return sessions.get(voiceId);
  const s = new TtsSession({
    voiceId,
    allowLocalModels: true,
    fallbackStrategy: 'cdn',
    logger: (msg) => console.info('[speech]', msg),
  });
  sessions.set(voiceId, s);
  return s;
}

// Разметку ссылок [[id|label]] → label. В комнате Архивариуса
// ссылок нет, но если появятся — покажем текст, не синтаксис.
function plainText(text) {
  return text.replace(
    /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g,
    (_, id, label) => label || id
  );
}

const TICK_MS = 30;

export function useSpeechTypewriter(text, { voice } = {}) {
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);

  const spoken = useMemo(() => plainText(text || ''), [text]);

  const genRef = useRef(0);
  const audioRef = useRef(null);
  const tickerRef = useRef(null);

  useEffect(() => {
    const gen = ++genRef.current;
    clearInterval(tickerRef.current);
    tickerRef.current = null;
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      audioRef.current = null;
    }

    setTyped('');
    setDone(false);

    if (!spoken) { setDone(true); return; }

    const voiceKey = voice || DEFAULT_VOICE;
    const modelId = VOICES[voiceKey]?.id || VOICES[DEFAULT_VOICE].id;

    const chunks = splitIntoChunks(spoken);
    if (chunks.length === 0) { setDone(true); return; }

    let cancelled = false;
    const isAlive = () => !cancelled && genRef.current === gen;

    // Позиция в spoken, до которой текст уже показан.
    // Только растёт: тикер никогда не откатывается назад.
    let revealed = 0;
    let currentChunk = null;

    const tick = () => {
      if (!isAlive()) return;
      const audio = audioRef.current;
      const chunk = currentChunk;
      if (!audio || !chunk) return;

      const dur = audio.duration;
      if (!dur || !isFinite(dur) || dur <= 0) return;

      const progress = Math.min(1, audio.currentTime / dur);
      const len = chunk.end - chunk.start;
      const target = chunk.start + Math.round(progress * len);

      if (target > revealed) {
        revealed = target;
        setTyped(spoken.slice(0, revealed));
      }
    };

    tickerRef.current = setInterval(tick, TICK_MS);

    (async () => {
      try {
        const session = getSession(modelId);

        // Синтез запускаем заранее: пока играет один чанк,
        // следующий уже готов. Ждать синтеза между фразами
        // не приходится.
        const wavs = chunks.map((c) => session.predict(c.text));

        for (let i = 0; i < chunks.length; i++) {
          if (!isAlive()) return;
          const chunk = chunks[i];
          const wav = await wavs[i];
          if (!isAlive()) return;

          currentChunk = chunk;

          const audio = new Audio(URL.createObjectURL(wav));
          audio.playbackRate = VOICE_RATE;
          audioRef.current = audio;

          await new Promise((resolve) => {
            audio.onended = resolve;
            audio.onerror = (e) => {
              console.warn('[speech] audio error:', e);
              resolve();
            };
            audio.play().catch((e) => {
              console.warn('[speech] play failed:', e);
              resolve();
            });
          });

          // Дожим хвоста: тикер мог не успеть на последнем кадре.
          if (isAlive() && chunk.end > revealed) {
            revealed = chunk.end;
            setTyped(spoken.slice(0, revealed));
          }
        }

        if (!isAlive()) return;
        setTyped(spoken);
        setDone(true);
      } catch (err) {
        console.warn('[speech] Piper не справился:', err);
        if (!isAlive()) return;
        // Фолбэк — печатаем без голоса.
        let i = 0;
        const fb = () => {
          if (!isAlive()) return;
          if (i >= spoken.length) { setDone(true); return; }
          setTyped(spoken.slice(0, i + 1));
          i++;
          setTimeout(fb, 26 + Math.random() * 46);
        };
        setTimeout(fb, 180);
      } finally {
        clearInterval(tickerRef.current);
        tickerRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
      genRef.current++;
      clearInterval(tickerRef.current);
      tickerRef.current = null;
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.src = '';
        } catch {}
        audioRef.current = null;
      }
    };
  }, [spoken, voice]);

  const skip = useCallback(() => {
    genRef.current++;
    clearInterval(tickerRef.current);
    tickerRef.current = null;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = '';
      } catch {}
      audioRef.current = null;
    }
    setTyped(spoken);
    setDone(true);
  }, [spoken]);

  return { typed, done, skip };
}

export async function warmupSpeech(voiceKey = DEFAULT_VOICE) {
  const modelId = VOICES[voiceKey]?.id || VOICES[DEFAULT_VOICE].id;
  try {
    const s = getSession(modelId);
    await s.predict(' ');
    console.info('[speech] прогрет:', modelId);
  } catch (e) {
    console.info('[speech] прогрев пропущен:', e?.message || e);
  }
}