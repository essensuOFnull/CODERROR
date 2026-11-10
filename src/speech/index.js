// speech/index.js
//
// Точка входа для всех приложений экосистемы.
// prepareSpeech больше не нужен: нет перехвата fetch,
// нет настройки ONNX — всё решает TtsSession.

export { useSpeechTypewriter, warmupSpeech } from './useSpeechTypewriter.js';
export { VOICES, DEFAULT_VOICE } from './config.js';