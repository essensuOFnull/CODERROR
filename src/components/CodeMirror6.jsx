import React, { useMemo } from 'react';
import _CodeMirror from '@uiw/react-codemirror';
import { EditorView, Decoration } from '@codemirror/view';
import { StateField, StateEffect, RangeSetBuilder } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { autocompletion } from '@codemirror/autocomplete';

// ---------- Тема ----------
const strudelTheme = EditorView.theme(
    {
        '&': {
            backgroundColor: 'transparent',
            color: '#cbd5e1',
            fontSize: '16px',
            fontFamily: 'Terminus',
        },
        '.cm-content': { caretColor: 'transparent', padding: '0' },
        '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'transparent' },
        '.cm-gutters': {
            backgroundColor: 'transparent',
            color: '#4a5568',
            border: 'none',
        },
        '.cm-activeLine': { backgroundColor: 'transparent' },
        '.cm-activeLineGutter': { backgroundColor: 'transparent' },
        '.cm-line': { padding: '0' },
        '.cm-scroller': { overflow: 'auto', lineHeight: '1.2' },

        // === Анимации для подсветки ===
        '@keyframes strudelPulse': {
            '0%, 100%': {
                boxShadow:
                    '0 0 4px #7dff8a, 0 0 10px #7dff8a, 0 0 18px rgba(125,255,138,1), inset 0 0 4px rgba(125,255,138,1)',
            },
            '50%': {
                boxShadow:
                    '0 0 8px #7dff8a, 0 0 20px #7dff8a, 0 0 36px rgba(125,255,138,1), inset 0 0 10px rgba(125,255,138,1)',
            },
        },
        '@keyframes strudelShimmer': {
            '0%': { backgroundPosition: '0% 50%' },
            '100%': { backgroundPosition: '200% 50%' },
        },
        '@keyframes strudelGlowText': {
            '0%, 100%': { textShadow: '0 0 4px #ffffffaa, 0 0 8px #7dff8a88' },
            '50%': { textShadow: '0 0 6px #ffffff, 0 0 12px #7dff8a' },
        },
    },
    { dark: true }
);

const syntaxColors = EditorView.baseTheme({
    '.ͼc': { color: '#4a5568', fontStyle: 'italic' },
    '.ͼd': { color: '#ffd166' },
    '.ͼe': { color: '#00e5ff' },
    '.ͼf': { color: '#ff66cc' },
    '.ͼg': { color: '#7dff8a' },
    '.ͼh': { color: '#cbd5e1' },
    '.ͼi': { color: '#ffab52' },
    '.ͼj': { color: '#e2e8f0' },
    '.ͼk': { color: '#94a3b8' },
});

// ---------- Mini-locations ----------
export const setMiniLocations = StateEffect.define();
export const showMiniLocations = StateEffect.define();

export const updateMiniLocations = (view, locations) => {
    if (!view) return;
    view.dispatch({ effects: setMiniLocations.of(locations || []) });
};

export const highlightMiniLocations = (view, atTime, haps) => {
    if (!view) return;
    view.dispatch({ effects: showMiniLocations.of({ atTime, haps: haps || [] }) });
};

const miniLocationsField = StateField.define({
    create() {
        return Decoration.none;
    },
    update(locations, tr) {
        if (tr.docChanged) locations = locations.map(tr.changes);
        for (const e of tr.effects) {
            if (e.is(setMiniLocations)) {
                const marks = e.value
                    .filter(([from]) => from < tr.newDoc.length)
                    .map(([from, to]) => [from, Math.min(to, tr.newDoc.length)])
                    .map(([from, to]) =>
                        Decoration.mark({
                            id: `${from}:${to}`,
                        }).range(from, to)
                    );
                locations = Decoration.set(marks, true);
            }
        }
        return locations;
    },
});

const visibleMiniLocationsField = StateField.define({
    create() {
        return { atTime: 0, haps: new Map() };
    },
    update(visible, tr) {
        for (const e of tr.effects) {
            if (e.is(showMiniLocations)) {
                const { atTime, haps: incoming } = e.value;
                const map = new Map();
                for (const hap of incoming) {
                    if (!hap.context?.locations || !hap.whole) continue;
                    for (const loc of hap.context.locations) {
                        const start = loc.start;
                        const end = loc.end;
                        if (start == null || end == null) continue;
                        const id = `${start}:${end}`;
                        if (!map.has(id) || map.get(id).whole.begin.lt(hap.whole.begin)) {
                            map.set(id, hap);
                        }
                    }
                }
                visible = { atTime, haps: map };
            }
        }
        return visible;
    },
});

// ---------- Стиль подсветки ----------
// Много яркого: градиент, мощный box-shadow, анимации мерцания
// и пульсации. Всё с !important, чтобы тема окружения не перебила.
const HIGHLIGHT_STYLE = [
    // Градиент — от жёлто-зелёного к циановому. Красиво «переливается».
    'background: linear-gradient(90deg, rgba(125,255,138,1), rgba(0,229,255,1), rgba(255,102,204,1), rgba(125,255,138,1)) !important',
    'background-size: 200% 100% !important',
    'animation: strudelShimmer 2.5s linear infinite, strudelPulse 1.4s ease-in-out infinite !important',
    'color: #ffffff !important',
    'text-shadow: 0 0 4px #ffffffaa, 0 0 8px #7dff8a88 !important',
    'border-radius: 3px !important',
    'padding: 0 2px !important',
    'margin: 0 -2px !important',
    'font-weight: bold !important',
].join('; ');

const miniLocationHighlights = EditorView.decorations.compute(
    [miniLocationsField, visibleMiniLocationsField],
    (state) => {
        const { haps } = state.field(visibleMiniLocationsField);
        const builder = new RangeSetBuilder();
        const iterator = state.field(miniLocationsField).iter();

        while (iterator.value) {
            const { from, to, value } = iterator;
            const id = value.spec.id;
            if (haps.has(id)) {
                builder.add(
                    from,
                    to,
                    Decoration.mark({ attributes: { style: HIGHLIGHT_STYLE } })
                );
            }
            iterator.next();
        }
        return builder.finish();
    }
);

export default function CodeMirror6({
    value = '',
    height = 'auto',
    width = '100%',
    onUpdate,
    onCreateEditor,
    ...rest
}) {
    const extensions = useMemo(
        () => [
            javascript(),
            strudelTheme,
            syntaxColors,
            EditorView.lineWrapping,
            autocompletion(),
            miniLocationsField,
            visibleMiniLocationsField,
            miniLocationHighlights,
        ],
        []
    );

    return (
        <_CodeMirror
            value={value}
            height={height}
            width={width}
            extensions={extensions}
            editable={false}
            readOnly={true}
            basicSetup={{
                lineNumbers: true,
                highlightActiveLine: false,
                highlightActiveLineGutter: false,
                foldGutter: false,
                dropCursor: false,
                allowMultipleSelections: false,
                indentOnInput: false,
                bracketMatching: true,
                closeBrackets: false,
                autocompletion: true,
                rectangularSelection: false,
                crosshairCursor: false,
                highlightSelectionMatches: false,
                closeBracketsKeymap: false,
                defaultKeymap: false,
                searchKeymap: false,
                historyKeymap: false,
                foldKeymap: false,
                completionKeymap: false,
                lintKeymap: false,
            }}
            onUpdate={onUpdate}
            onCreateEditor={onCreateEditor}
            {...rest}
        />
    );
}