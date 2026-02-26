{
let f=window.CODERROR.__originals__.functions,
d=window.CODERROR.__originals__.data;

let frame_count=0;
setInterval(()=>{
	d.FPS=frame_count;
	frame_count=0;
},1000);

d.app.ticker.add(()=>{
	/*переменные для укорочения кода*/
	let nickname=d.save.player.nickname,
	room_id=_.get(d,['save','world','players',nickname,'position','room_id']);
	
	if(!window.has_focus&&d.settings.interface.pause_on_blur)return
	frame_count++;
	/*обновление канваса three*/
	f.update_three_scene();
	/*кнопки интекрфейса игрока*/
	let button_to_main_menu=d._cached_button_to_main_menu||(d._cached_button_to_main_menu=document.getElementById('button_to_main_menu'));
	if(button_to_main_menu){
		f.change_button_color(button_to_main_menu,(f.check_hover(button_to_main_menu)?f.get_random_true_str_color():'#fff'));
	}
	/*вызовем логику отрисовки текущей комнаты*/
	eval(d.current_room_render);
	/*действия, которые надо совершить вне зависимости от комнаты*/
	if(!d.save.temp.room.preparation){
		/*применяем мерцание к кнопки выхода в главное меню если она есть*/
		let button_to_main_menu=_.get(d,['button_to_main_menu']);
		if(button_to_main_menu){
			f.apply_standard_buttons_style({button_to_main_menu});
		}
	}
	f.render_symbols_grid();
	/*Применяем позицию кастомного курсора*/
	if(d._cursorNeedsUpdate){
		d.cursor.style.transform=`translate3d(${d._cursorTargetX}px, ${d._cursorTargetY}px, 0)`;
		d._cursorNeedsUpdate=false;
	}
});
}