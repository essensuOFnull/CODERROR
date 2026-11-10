import React from 'react';
import CodeMirror6 from './CodeMirror6.jsx';

export default function MusicEditor({
	value,
	onCreateEditor,
	cellWidth,
	cellHeight,
}) {
	return (
		<div
			style={{
				position: 'absolute',
				left: '50%',
				top: `${cellHeight * 8}px`,
				transform: 'translateX(-50%)',
				height: 'max-content',
				width: 'max-content',
				maxWidth: `calc(100vw - ${cellWidth * 2}px)`,
				maxHeight: `calc(100vh - ${cellHeight * 9}px)`,
				overflow: 'auto',
				zIndex: 5,
				background:'#00000099',
				boxShadow:`0px 0px ${cellHeight}px ${cellHeight}px #00000099`
			}}
		>
			<CodeMirror6
				value={value}
				height="100%"
				width="100%"
				onCreateEditor={onCreateEditor}
			/>
		</div>
	);
}