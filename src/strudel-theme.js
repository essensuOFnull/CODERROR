// src/themes/strudel-theme.js
import { tags as t } from '@lezer/highlight';
import { createTheme } from '@uiw/codemirror-themes';

export default createTheme({
    theme: 'dark',
    settings: {
        background: 'transparent',
        foreground: '#e2e8f0',
        caret: '#f0f',
        selection: '#7dff8a33',
        selectionMatch: '#7dff8a55',
        lineHighlight: '#ffffff08',
        gutterBackground: 'transparent',
        gutterForeground: '#4a5568',
        gutterBorder: 'transparent',
        fontFamily: 'Terminus',
    },
    styles: [
        { tag: t.comment, color: '#4a5568', fontStyle: 'italic' },
        { tag: t.string, color: '#ffd166' },
        { tag: t.number, color: '#00e5ff' },
        { tag: t.keyword, color: '#ff66cc' },
        { tag: t.function(t.variableName), color: '#7dff8a' },
        { tag: t.variableName, color: '#cbd5e1' },
        { tag: t.operator, color: '#e2e8f0' },
        { tag: t.punctuation, color: '#94a3b8' },
        { tag: t.propertyName, color: '#ffab52' },
        { tag: t.bool, color: '#00e5ff' },
        { tag: t.null, color: '#00e5ff' },
    ],
});