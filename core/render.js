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
	room_id=_.get(d,`save.world.players.${nickname}.position.room_id`);
	
	if(!window.has_focus&&d.settings.interface.pause_on_blur)return
	frame_count++;
	/*обновление канваса three*/
	f.update_three_scene();
	/*кнопки интекрфейса игрока*/
	let button_to_main_menu=d._cached_button_to_main_menu||(d._cached_button_to_main_menu=document.getElementById('button_to_main_menu'));
	if(button_to_main_menu){
		f.change_button_color(button_to_main_menu,(f.check_hover(button_to_main_menu)?f.get_random_true_str_color():'#fff'));
	}
	/*комнаты*/
	if(room_id=='main_menu'){
		if(!d.save.temp.room.preparation){
			f.visual_effect(0);
			d.save.temp.room.data.logo.firstChild.style.color=f.get_random_true_str_color();
			Object.entries(d.save.temp.room.data.buttons).forEach(([name,el])=>{
				if(name=='exit'){
					el.style.marginLeft=`calc(var(--symbol_size) * ${-0.5+Math.floor(Math.random()*2)})`;
					if(f.check_hover(el)){
						f.visual_effect(1);
						d.save.temp.room.data.bug_counter=100;
					}
					else{
						if(d.save.temp.room.data.bug_counter<=0){
							f.visual_effect(2);
						}else{
							d.save.temp.room.data.bug_counter--;
						}
					}
				}else if(name=='donation'){
					f.change_button_text_color(el,(f.check_hover(el)?f.get_random_true_str_color():'#fff'));
				}else{
					f.change_button_color(el,(f.check_hover(el)?f.get_random_true_str_color():'#fff'));
				}
			});
		}
	}
	if(room_id=='character_selection'){
		if(!d.save.temp.room.preparation){
			f.visual_effect(0);
			f.apply_standard_drop_zone_style();
			f.apply_standard_buttons_style();
		}
	}
	if(room_id=='world_selection'){
		if(!d.save.temp.room.preparation){
			f.visual_effect(0);
			f.apply_standard_drop_zone_style();
			f.apply_standard_buttons_style();
		}
	}
	if(room_id=='authors'){
		if(!d.save.temp.room.preparation){
			f.visual_effect(0);
			f.change_button_color(d.save.temp.room.data.buttons.back,(f.check_hover(d.save.temp.room.data.buttons.back)?f.get_random_true_str_color():'#fff'));
		}
	}
	if(room_id=='settings'){
		if(!d.save.temp.room.preparation){
			f.visual_effect(0);
			f.apply_standard_drop_zone_style();
			f.apply_standard_buttons_style();
		}
	}
	if(room_id=='continue'){
		if(!d.save.temp.room.preparation){
			f.visual_effect(0);
			f.apply_standard_drop_zone_style();
			f.apply_standard_buttons_style();
		}
	}
	if(room_id=='recycle_bin'){
		if(!d.save.temp.room.preparation){
			/*очистка*/
			f.clear_symbols_grid();
			f.focus_camera_on_player();
			/*отрисовка карты*/
			f.print_text_to_symbols_grid(d.save.temp.room.data.ground.text,0-d.save.temp.camera[0]/d.symbol_size,0-d.save.temp.camera[1]/d.symbol_size);
			/*отрисовка игрока*/
			f.render_player();
		}
	}
	f.update_symbols_display();

	// Применяем позицию кастомного курсора, если она помечена в main
	if(d.cursor && (d._cursorNeedsUpdate || (typeof d._cursorTargetX !== 'undefined' && typeof d._cursorTargetY !== 'undefined'))){
		try{ d.cursor.style.willChange = 'transform'; }catch(e){}
		d.cursor.style.transform = `translate3d(${d._cursorTargetX}px, ${d._cursorTargetY}px, 0)`;
		d._cursorNeedsUpdate = false;
	}
});
}