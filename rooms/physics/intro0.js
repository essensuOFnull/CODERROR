f.prepare(()=>{
	f.set_music('music/Errorscape.webm');
	f.set_interface_visibility(false);
	f.clear_pixijs();
	let video=document.createElement('video');
	//video.crossOrigin="anonymous";
	video.src='videos/intro/0.mp4';
	video.muted=true;// Часто требуется для автовоспроизведения
	video.autoplay=true;
	video.addEventListener('loadeddata',()=>{
		let texture=PIXI.Texture.from(video);
		let sprite=new PIXI.Sprite(texture);
		sprite.anchor.set(0.5);
		sprite.x=d.app.screen.width/2;
		sprite.y=d.app.screen.height/2;
		d.app.stage.addChild(sprite);
	});
	video.addEventListener('ended',()=>{
		f.clear_pixijs();
		f.init_symbols_grid().then(()=>{
			f.init_three_scene();
			f.change_room('recycle_bin');
		});
	});
});