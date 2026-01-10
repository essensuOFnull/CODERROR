window.settings={
/*эти настройки используются как начальные при каждом запуске игры, желательно сделать копию на всякий случай, если хотите заменить*/
interface:{
	language:[/*'default' добавляется автоматически*/],
	font_size:16,
	max_content_width:`100%`,
	max_content_height:`100%`
},
audio:{
	music_volume:0.5,
	sounds_volume:0.5
},
control:{
	bind_to_layout:false,
	left:["a","A","ф","Ф","ArrowLeft","KeyA"],
	right:["d","D","в","В","ArrowRight","KeyD"],
	jump:[" ","w","W","ц","Ц","ArrowUp","KeyW","Space"],
	previous_hotbar_slot:['WheelUp'],
	next_hotbar_slot:['WheelDown']
}
}