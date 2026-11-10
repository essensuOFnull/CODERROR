import React from 'react';

export default function Logo({ cellHeight, scale = 1 }) {
	return (
		<pre
			style={{
				position: 'absolute',
				left: '50%',
				top: `${cellHeight}px`,
				transform: `translate(-50%, 0) scale(${scale})`,
				maxWidth: 'fit-content',
				maxHeight: 'min-content',
				color: 'transparent',
				padding: 0,
				margin: 0,
				backgroundImage:
					'linear-gradient(135deg, rgba(255,0,0,1) 0%, rgba(255,0,255,1) 16.66%, rgba(0,0,255,1) 33.33%,rgba(0,255,255,1) 50%,rgba(0,255,0,1) 66.66%,rgba(255,255,0,1) 83.33%, rgba(255,0,0,1) 100%)',
				backgroundSize: '200% 100%',
				backgroundClip: 'text',
				WebkitBackgroundClip: 'text',
				display: 'block',
				animation: 'logoGradientMove 0.5s linear infinite',
				zIndex: 10,
			}}
		>
			░█████╗░░█████╗░██████╗░███████╗██████╗░██████╗░░█████╗░██████╗░<br />
			██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔══██╗<br />
			██║░░╚═╝██║░░██║██║░░██║█████╗░░██████╔╝██████╔╝██║░░██║██████╔╝<br />
			██║░░██╗██║░░██║██║░░██║██╔══╝░░██╔══██╗██╔══██╗██║░░██║██╔══██╗<br />
			╚█████╔╝╚█████╔╝██████╔╝███████╗██║░░██║██║░░██║╚█████╔╝██║░░██║<br />
			░╚════╝░░╚════╝░╚═════╝░╚══════╝╚═╝░░╚═╝╚═╝░░╚═╝░╚════╝░╚═╝░░╚═╝
		</pre>
	);
}