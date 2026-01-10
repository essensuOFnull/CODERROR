app.ticker.add(()=>{
	/*обновление канваса three*/
	update_three_scene();
	/*кнопки интекрфейса игрока*/
	let button_to_main_menu=document.getElementById('button_to_main_menu');
	if(check_hover(button_to_main_menu)){
		change_button_color(button_to_main_menu,get_random_true_str_color());
	}
	else{
		change_button_color(button_to_main_menu,'#fff');
	}
	/*комнаты*/
	if(room=='main_menu'){
		if(!preparation){
			//console.log(app.renderer.gl.getContextAttributes());//удалить
			visual_effect(0);
			room_data.logo.firstChild.style.color=get_random_true_str_color();
			Object.entries(room_data.buttons).forEach(([name,el])=>{
				if(name=='exit'){
					el.style.marginLeft=`calc(var(--symbol_size) * ${-0.5+Math.floor(Math.random()*2)})`;
					if(check_hover(el)){
						visual_effect(1);
						room_data.bug_counter=100;
					}
					else{
						if(room_data.bug_counter<=0){
							visual_effect(2);
						}
						else{
							room_data.bug_counter--;
						}
					}
				}
				else{
					if(check_hover(el)){
						change_button_color(el,get_random_true_str_color());
					}
					else{
						change_button_color(el,'#fff');
					}
				}
			});
		}
	}
	if(room=='authors'){
		if(!preparation){
			visual_effect(0);
			if(check_hover(room_data.buttons.back)){
				change_button_color(room_data.buttons.back,get_random_true_str_color());
			}
			else{
				change_button_color(room_data.buttons.back,'#fff');
			}
		}
	}
	if(room=='settings'){
		if(!preparation){
			visual_effect(0);
			if(check_hover(room_data.drop_zone)){
				change_button_border_color(room_data.drop_zone,'#f0f');
			}
			else{
				change_button_border_color(room_data.drop_zone,'#fff');
			}
			Object.entries(room_data.buttons).forEach(([name,el])=>{
				if(check_hover(el)){
					change_button_color(el,get_random_true_str_color());
				}
				else{
					change_button_color(el,'#fff');
				}
			});
		}
	}
	if(room=='recycle_bin'){
		if(!preparation){
			/*очистка*/
			clear_symbols_grid();
			focus_camera_on_player();
			/*отрисовка карты*/
			print_text_to_symbols_grid(room_data.ground.text,0-room_data.camera[0]/symbol_size,0-room_data.camera[1]/symbol_size);
			/*расчет скина игрока*/
			let fractional=[false,false];
			for(let i=0;i<=1;i++){
				if(player.coordinates[i]/logical_symbol_size!=Math.floor(player.coordinates[i]/logical_symbol_size)){
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
			focus_camera_on_player();
			let rendering_coordinates=[logical_to_screen(player.coordinates[0])-room_data.camera[0],logical_to_screen(player.coordinates[1])-room_data.camera[1]];
			if(fractional[0]){
				rendering_coordinates[0]--;
			}
			if(fractional[1]){
				rendering_coordinates[1]--;
			}
			print_text_to_symbols_grid(player_skin,rendering_coordinates[0]/symbol_size,rendering_coordinates[1]/symbol_size);
		}
	}
});