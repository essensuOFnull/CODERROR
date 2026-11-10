import React from 'react';
import { CircularProgress } from '@mui/material';

export default function LoadingOverlay() {
	return (
		<div
			style={{
				width: '100vw',
				height: '100vh',
				position: 'absolute',
				left: 0,
				top: 0,
				display: 'flex',
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent:'space-around'
			}}
		>
			<div
				style={{
					width: '100%',
					height: '100%',
					display: 'flex',
					alignItems: 'center',
					flexDirection: 'column',
					justifyContent:'space-around'
				}}
			>
				<CircularProgress size={`min(80vw, 80vh)`} sx={{ color: '#f0f'}} />
			</div>
		</div>
	);
}