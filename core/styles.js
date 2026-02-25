// style tokens and factory for JSS
window.styleTokens = window.styleTokens || { symbol_size: 16, image_rendering: (window.devicePixelRatio >= 1 ? 'pixelated' : 'auto') };
window.stylesFactory = function (t) {
	const s = t.symbol_size;
	const img = t.image_rendering;
	return {
		'@global': {
			'@font-face': {
				fontFamily: 'CODERROR',
				src: 'url("fonts/CODERROR16x16GNUUnifont.ttf") format("truetype")'
			},
			'@keyframes message_fade_out': {
				'0%': { opacity: 1 },
				'50%': { opacity: 1 },
				'100%': { opacity: 0 }
			},
			'@keyframes epic-pulse': {
				'0%': {
					transform: 'scale(0.98)',
					boxShadow: `0 0 ${s / 2}px ${s / 4}px gold`
				},
				'90%': {
					transform: 'scale(1.01)',
					boxShadow: `0 0 ${s * 2}px ${s / 2}px #ff0`
				},
				'100%': {
					transform: 'scale(0.98)',
					boxShadow: `0 0 ${s / 2}px ${s / 4}px gold`
				}
			},
			'*': {
				margin: 0,
				padding: 0,
				fontFamily: "'CODERROR'",
				letterSpacing: 0,
				userSelect: 'none',
				fontSize: s,
				lineHeight: '1em',
				pointerEvents: 'auto',
				imageRendering: img
			},
			'html, body': {
				width: '100%',
				height: '100%',
				margin: 0,
				padding: 0,
				overflow: 'hidden',
				background: '#000'
			},
			body: {
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center'
			},
			canvas: {
				position: 'absolute',
				top: 0,
				left: 0,
				width: 'inherit',
				height: 'inherit',
				pointerEvents: 'none',
				background: 'transparent !important',
				mixBlendMode: 'normal'
			},
			'#html-overlay': {
				position: 'absolute',
				top: 0,
				left: 0,
				width: 'inherit',
				height: 'inherit',
				display: 'flex',
				flexDirection: 'column'
			},
			pre: {
				color: '#fff',
				background: '#000',
				width: 'min-content',
				height: 'min-content',
				display: 'inline-block'
			},
			'.center-horizontal-items': {
				display: 'block',
				textAlign: 'center'
			},
			'.center-horizontal': {
				width: 'max-content',
				marginLeft: 'auto',
				marginRight: 'auto'
			},
			'.center-vertical': {
				flex: '1 1 auto',
				display: 'flex',
				alignItems: 'center'
			},
			'.center': {
				flex: '1 1 auto',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center'
			},
			'.fill-parent': {
				width: '100%',
				height: '100%'
			},
			'.column': {
				flexDirection: 'column'
			},
			button: {
				backgroundColor: 'transparent',
				color: '#fff',
				border: 'none',
				cursor: 'pointer !important',
				outline: 'none'
			},
			'.drop_zone': {
				width: (s * 12),
				height: (s * 12),
				background: '#00000066'
			},
			'.scrollable': {
				overflowY: 'auto',
				overflowX: 'auto',
				width: '100%',
				height: '100%',
				scrollbarColor: '#fff #000'
			},
			'.scrollable *': {
				minWidth: 'min-content',
				minHeight: 'min-content'
			},
			'.symbolic_hr': {
				width: '100%',
				minWidth: 0,
				minHeight: 0,
				height: 'max-content',
				'& pre': {
					contain: 'strict',
					width: '100%',
					height: s,
					overflow: 'hidden',
					whiteSpace: 'nowrap'
				}
			},
			'#wrapper': {
				position: 'relative'
			},
			select: {
				background: '#000',
				color: '#fff',
				outline: 'none',
				border: 'none',
				'& option': {
					background: '#000',
					color: '#fff'
				}
			},
			'.wrap': {
				flexWrap: 'wrap'
			},
			textarea: {
				backgroundColor: '#000',
				color: '#fff',
				border: '0px solid #fff',
				borderRadius: 0,
				whiteSpace: 'normal',
				overflowWrap: 'break-word',
				outline: 'none',
				'&::placeholder': {
					color: '#c8c8c8',
					opacity: 1
				},
				'&:focus': {
					borderColor: '#f0f',
					boxShadow: 'none'
				}
			},
			'input[type="range"],input[type="checkbox"]': {
				accentColor: '#f0f'
			},
			'#interface': {
				visibility: 'collapse',
				position: 'absolute',
				top: 0,
				left: 0,
				width: 'inherit',
				height: 'inherit',
				padding: s,
				pointerEvents: 'none'
			},
			'#chat_preview': {
				position: 'absolute',
				bottom: 0,
				left: 0,
				display: 'flex',
				alignItems: 'start',
				justifyContent: 'left',
				flexDirection: 'column',
				width: '50%',
				height: 'max-content',
				margin: s,
				pointerEvents: 'none',
				'& .message': {
					color: '#fff',
					backgroundColor: '#0000007F',
					pointerEvents: 'none',
					animation: 'message_fade_out 10s linear forwards',
					maxWidth: '100%',
					wordWrap: 'break-word'
				},
			},
			'#hotbar': {
				position: 'absolute',
				left: '50%',
				transform: 'translateX(-50%)'
			},
			'.hotbar_slot': {
				backgroundImage: 'url("images/interface/inventory/slot.webp")',
				backgroundSize: 'contain',
				backgroundRepeat: 'no-repeat',
				width: 32,
				height: 32,
				position: 'relative'
			},
			'.row': {
				display: 'flex'
			},
			'.centered, #active_hotbar_slot_frame': {
				position: 'absolute',
				top: '50%',
				left: '50%',
				transform: 'translate(-50%, -50%)'
			},
			'#active_hotbar_slot_frame': {
				width: 32,
				height: 32,
				zIndex: 5
			},
			'#esc_menu': {
				visibility: 'collapse',
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
				pointerEvents: 'none'
			},
			'#button_to_main_menu': {
				position: 'absolute !important',
				bottom: s*3,
				right: s*3,
			},
			'.inherit_colors': {
				display: 'contents',
				'& *': {
					color: 'inherit',
					background: 'inherit'
				},
			},
			'.epic-donation-button': {
				animation: 'epic-pulse 500ms ease-in-out infinite',
				borderRadius: (s / 2)
			},
			'#cursor': {
				position: 'fixed',
				left: 0,
				top: 0,
				willChange: 'transform',
				zIndex: 9999,
				width: 'auto',
				height: 'auto',
				pointerEvents: 'none'
			},
			'#loading': {
				display: 'none',
				width: '100%',
				height: '100%',
				background: '#000',
				zIndex: 9998,
				position: 'absolute',
				top: '50%',
				left: '50%',
				transform:'translate(-50%, -50%)',
				'& img': {
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)'
				},
			},
			'#loading, #loading *': {
				pointerEvents: 'none'
			}
		}
	};
};

// helper to update tokens and recreate sheet (used by app to avoid CSS vars)
window.updateStyleTokens = function (newTokens) {
	window.styleTokens = Object.assign({}, window.styleTokens, newTokens);
	if (window.jssInstance && window.jssSheet && window.stylesFactory) {
		try { window.jssInstance.removeStyleSheet(window.jssSheet); } catch (e) { }
		window.jssSheet = window.jssInstance.createStyleSheet(window.stylesFactory(window.styleTokens)).attach();
	}
};