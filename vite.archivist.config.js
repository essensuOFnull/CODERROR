import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

function resolveOutputReference(htmlFile, reference) {
  const fileParts = htmlFile.split('/').slice(0, -1);
  for (const part of reference.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') fileParts.pop();
    else fileParts.push(part);
  }
  return fileParts.join('/');
}

function inlineStandaloneAssets() {
  let htmlFileName;
  return {
    name: 'inline-standalone-archivist-book',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const sourceHtml = Object.entries(bundle).find(
        ([fileName, output]) => fileName.endsWith('.html') && output.type === 'asset'
      );
      if (!sourceHtml) {
        throw new Error('Vite did not emit the standalone HTML entry');
      }
      [htmlFileName] = sourceHtml;
    },
    async closeBundle() {
      if (!htmlFileName) {
        throw new Error('Vite did not emit the standalone HTML entry');
      }

      const buildDirectory = resolve('dist/archivist-build');
      const htmlPath = join(buildDirectory, htmlFileName);
      let html = await readFile(htmlPath, 'utf8');
      let inlinedScript = false;
      let inlinedStyle = false;

      const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/script>/g)];
      for (const [tag, src] of scripts) {
        const fileName = resolveOutputReference(htmlFileName, src);
        const chunkPath = join(buildDirectory, ...fileName.split('/'));
        const code = await readFile(chunkPath, 'utf8');
        const inlineScript =
          `<script type="module">${code.replace(/<\/script/gi, '<\\/script')}</script>`;
        html = html.replace(tag, () => inlineScript);
        inlinedScript = true;
      }

      const styleTags = [...html.matchAll(/<link\b(?=[^>]*\brel="stylesheet")[^>]*>/g)];
      for (const [tag] of styleTags) {
        const href = tag.match(/\bhref="([^"]+)"/);
        if (!href) throw new Error(`Standalone stylesheet has no href: ${tag}`);
        const fileName = resolveOutputReference(htmlFileName, href[1]);
        const stylePath = join(buildDirectory, ...fileName.split('/'));
        const style = await readFile(stylePath, 'utf8');
        const inlineStyle = `<style>${style.replace(/<\/style/gi, '<\\/style')}</style>`;
        html = html.replace(tag, () => inlineStyle);
        inlinedStyle = true;
      }

      html = html.replace(
        /<link\b(?=[^>]*\brel="modulepreload")[^>]*>/g,
        ''
      );

      if (!inlinedScript || !inlinedStyle) {
        throw new Error('Standalone book is missing its bundled script or styles');
      }
      const documentShell = html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<script></script>')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>');
      if (/<(?:script|link)\b[^>]*(?:src|href)=/i.test(documentShell)) {
        throw new Error('Standalone HTML still references an external asset');
      }

      await writeFile(resolve('dist/archivist-reader.html'), html, 'utf8');
      await rm(buildDirectory, { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), inlineStandaloneAssets()],
  build: {
    outDir: 'dist/archivist-build',
    emptyOutDir: true,
    assetsInlineLimit: 1000000000,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        'archivist-reader': resolve('src/archivist/standalone.html'),
      },
      output: {
        codeSplitting: false,
      },
    },
  },
});
