# CODERROR

Интерактивное приложение на React, Vite и Tauri: процедурный фон, редактор
музыки Strudel и Архивариус.

## Запуск

```sh
npm install
npm run dev
```

Для запуска настольного приложения через Tauri:

```sh
npm run tauri dev
```

## Сборка

```sh
npm run build
npm run tauri build
```

При первом использовании голос Архивариуса загружает модель Piper и WASM
ресурсы с CDN; без сети остаётся текстовый режим.
