{
let f=window.CODERROR.CHEATING.functions,
d=window.CODERROR.CHEATING.data;

let frame_count=0;
setInterval(()=>{
	d.FPS=frame_count;
	frame_count=0;
},1000);

d.app.ticker.add(()=>{
	if(window.has_focus){
		frame_count++;
		/*обновление канваса three*/
		f.update_three_scene();
		/*кнопки интекрфейса игрока*/
		let button_to_main_menu=document.getElementById('button_to_main_menu');
		if(f.check_hover(button_to_main_menu)){
			f.change_button_color(button_to_main_menu,f.get_random_true_str_color());
		}
		else{
			f.change_button_color(button_to_main_menu,'#fff');
		}
		/*комнаты*/
		if(d.save.room.id=='main_menu'){
			if(!d.save.room.preparation){
				f.visual_effect(0);
				d.save.room.data.logo.firstChild.style.color=f.get_random_true_str_color();
				Object.entries(d.save.room.data.buttons).forEach(([name,el])=>{
					if(name=='exit'){
						el.style.marginLeft=`calc(var(--symbol_size) * ${-0.5+Math.floor(Math.random()*2)})`;
						if(f.check_hover(el)){
							f.visual_effect(1);
							d.save.room.data.bug_counter=100;
						}
						else{
							if(d.save.room.data.bug_counter<=0){
								f.visual_effect(2);
							}
							else{
								d.save.room.data.bug_counter--;
							}
						}
					}
					else{
						if(f.check_hover(el)){
							f.change_button_color(el,f.get_random_true_str_color());
						}
						else{
							f.change_button_color(el,'#fff');
						}
					}
				});
			}
		}
		if(d.save.room.id=='authors'){
			if(!d.save.room.preparation){
				f.visual_effect(0);
				if(f.check_hover(d.save.room.data.buttons.back)){
					f.change_button_color(d.save.room.data.buttons.back,f.get_random_true_str_color());
				}
				else{
					f.change_button_color(d.save.room.data.buttons.back,'#fff');
				}
			}
		}
		if(d.save.room.id=='settings'){
			if(!d.save.room.preparation){
				f.visual_effect(0);
				if(f.check_hover(d.save.room.data.drop_zone)){
					f.change_button_border_color(d.save.room.data.drop_zone,'#f0f');
				}
				else{
					f.change_button_border_color(d.save.room.data.drop_zone,'#fff');
				}
				Object.entries(d.save.room.data.buttons).forEach(([name,el])=>{
					if(f.check_hover(el)){
						f.change_button_color(el,f.get_random_true_str_color());
					}
					else{
						f.change_button_color(el,'#fff');
					}
				});
			}
		}
		if(d.save.room.id=='continue'){
			if(!d.save.room.preparation){
				f.visual_effect(0);
				if(f.check_hover(d.save.room.data.drop_zone)){
					f.change_button_border_color(d.save.room.data.drop_zone,'#f0f');
				}
				else{
					f.change_button_border_color(d.save.room.data.drop_zone,'#fff');
				}
				Object.entries(d.save.room.data.buttons).forEach(([name,el])=>{
					if(f.check_hover(el)){
						f.change_button_color(el,f.get_random_true_str_color());
					}
					else{
						f.change_button_color(el,'#fff');
					}
				});
			}
		}
		if(d.save.room.id=='recycle_bin'){
			if(!d.save.room.preparation){
				/*очистка*/
				f.clear_symbols_grid();
				f.focus_camera_on_player();
				/*отрисовка карты*/
				f.print_text_to_symbols_grid(d.save.room.data.ground.text,0-d.save.room.data.camera[0]/d.symbol_size,0-d.save.room.data.camera[1]/d.symbol_size);
				/*расчет скина игрока*/
				let fractional=[false,false];
				for(let i=0;i<=1;i++){
					if(d.save.player.coordinates[i]/d.logical_symbol_size!=Math.floor(d.save.player.coordinates[i]/d.logical_symbol_size)){
						fractional[i]=true;
					}
				}
				let player_skin='';
				if(fractional[0]){
					if(fractional[1]){
						player_skin='▗▖\n▝▘';
					}else{
						player_skin='▐▌';
					}
				}else{
					if(fractional[1]){
						player_skin='▄\n▀';
					}else{
						player_skin='█';
					}
				}
				/*отрисовка игрока*/
				f.focus_camera_on_player();
				let rendering_coordinates=[f.logical_to_screen(d.save.player.coordinates[0])-d.save.room.data.camera[0],f.logical_to_screen(d.save.player.coordinates[1])-d.save.room.data.camera[1]];
				if(fractional[0]){
					rendering_coordinates[0]--;
				}
				if(fractional[1]){
					rendering_coordinates[1]--;
				}
				f.print_text_to_symbols_grid(player_skin,rendering_coordinates[0]/d.symbol_size,rendering_coordinates[1]/d.symbol_size);
			}
		}
	}
});
}