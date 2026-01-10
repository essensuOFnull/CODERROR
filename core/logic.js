let FIXED_TPS=60; // Целевой TPS
let MS_PER_UPDATE=1000/FIXED_TPS; // Шаг в миллисекундах
let previous_time=performance.now();
let lag=0;
let tps_count=0;
let last_measure=performance.now();
let real_TPS;
setInterval(()=>{
	let now=performance.now();
	real_TPS=Math.round(tps_count*1000/(now-last_measure));
	tps_count=0;
	last_measure=now;
},1000);
/*инициализация интерфейса*/
update_interface();
/**/
let lock_inventory=false;
/*функция главного цикла*/
function update_game_logic(){
	if(save.room.preparation){
		print_to_chat(window.language.notifications.current_room(save.room.id));
	}
	tps_count++;
	document.title=`CODERROR ${window.version} TPS: ${real_TPS} FPS: ${app.ticker.FPS.toFixed(2)} - ${window.splash}`;
	/*перекчение слотов хотбара*/
	if(document.getElementById('hotbar')){
		if(window.activated_actions.has('previous_hotbar_slot')){
			activate_previous_hotbar_slot();
		}
		if(window.activated_actions.has('next_hotbar_slot')){
			activate_next_hotbar_slot();
		}
	}
	/*открытие/закрытие инвентаря*/
	let open_inventory=false,close_inventory=false;
	if(activated_actions.has('open_inventory')){
		open_inventory=true;
	}
	if(activated_actions.has('close_inventory')){
		close_inventory=true;
	}
	if(open_inventory||close_inventory){
		if(!lock_inventory){
			let esc_menu=document.getElementById('esc_menu');
			if(open_inventory&&close_inventory){
				if(esc_menu.style.visibility=='inherit'){
					esc_menu.style.visibility='collapse';
				}else{
					esc_menu.style.visibility='inherit';
				}
			}else if(open_inventory){
				esc_menu.style.visibility='inherit';
			}else{
				esc_menu.style.visibility='collapse';
			}
		}
		lock_inventory=true;
	}else{
		lock_inventory=false;
	}
	/*комнаты*/
	if(save.room.id=='disclaimer'){
		if(save.room.preparation){
			init_audio();
			set_interface_visibility(false);
			save.room.data={
				scrollable:create_element_from_HTML(`<div class='scrollable'/>`),
				div:create_element_from_HTML(`<div class="center column fill-parent"/>`),
				button_continue:create_button_from_text(`принять риск и продолжить\n\ntake the risk and continue`),
			}
			save.room.data.scrollable.appendChild(save.room.data.div);
			save.room.data.div.appendChild(create_element_from_HTML(`<div>${get_transparent_space_text(`ДИСКЛЕЙМЕР | DISCLAIMER`,'#FF1D34')}</div>`));
			save.room.data.div.appendChild(get_br());
			save.room.data.div.appendChild(get_symbolic_hr());
			save.room.data.div.appendChild(get_br());
			save.room.data.div.appendChild(create_element_from_HTML(`<div style='text-align:center'>${get_transparent_space_text(`Игра содержит часто сменяющиеся мелькающие цвета, что может вызвать приступ эпилепсии.\n\nАвтор не чурается использовать информацию из любых источников, такую как аудио и текстуры, даже если они возможно обладают авторскими правами, и просит простить его за это)`,'#FF1D34')}</div>`));
			save.room.data.div.appendChild(get_br());
			save.room.data.div.appendChild(get_symbolic_hr());
			save.room.data.div.appendChild(get_br());
			save.room.data.div.appendChild(create_element_from_HTML(`<div style='text-align:center'>${get_transparent_space_text(`The game contains frequently changing flashing colors, which may cause an epileptic seizure.\n\nThe author does not shy away from using information from any source, such as audio and textures, even if they may have copyrights, and asks for forgiveness for this)`,'#FF1D34')}</div>`));
			save.room.data.div.appendChild(get_br());
			save.room.data.div.appendChild(get_symbolic_hr());
			save.room.data.div.appendChild(get_br());
			save.room.data.div.appendChild(save.room.data.button_continue);
			save.room.data.button_continue.addEventListener('click',()=>{
				change_room('main_menu');
			});
			change_button_text_color(save.room.data.button_continue,'#FF1D34');
			overlay.appendChild(save.room.data.scrollable);
			finish_preparation();
		}
	}
	if(save.room.id=='main_menu'){
		if(save.room.preparation){
			set_sky('images/skies/glitch','png');
			set_music('music/main_menu.mp3');
			set_interface_visibility(false);
			save.room.data={
				info:create_element_from_HTML(`<div>${get_transparent_space_text(`CODERROR ${window.version} by essensuOFnull`,'#c8c8c8')}</div>`),
				logo:create_element_from_HTML(`<div class="center-horizontal">${get_transparent_space_text(String.raw`
/T\ /T\ PT\ P] PT\ PT\ /T\ PT\
L U L q L q H  L q L q L q L q
L   L q L q H] L_/ L_/ L q L_/
L n L q L q H  U n U n L q U n
\_/ \_/ L_/ L] U U U U \_/ U U`.trim())}</div>`),
				scrollable:create_element_from_HTML(`<div class="scrollable"/>`),
				buttons_div:create_element_from_HTML(`<div class="center column fill-parent"/>`),
				buttons:dict_to_buttons(window.language.rooms[save.room.id].buttons),
				bug_counter:0
			};
			overlay.appendChild(save.room.data.info);
			overlay.appendChild(save.room.data.logo);
			change_button_color(save.room.data.buttons.exit,'#f00');
			Object.entries(save.room.data.buttons).forEach(([name,el])=>{
				save.room.data.buttons_div.appendChild(el);
				save.room.data.buttons_div.appendChild(get_br());
			});
			save.room.data.scrollable.appendChild(save.room.data.buttons_div);
			overlay.appendChild(save.room.data.scrollable);
			save.room.data.buttons.exit.addEventListener('click',()=>{
				alert("⚠️ ERROR 400: Bad Request");
				self.close();
			});
			save.room.data.buttons.authors.addEventListener('click',()=>{
				change_room('authors');
			});
			save.room.data.buttons.settings.addEventListener('click',()=>{
				change_room('settings');
			});
			save.room.data.buttons.new_game.addEventListener('click',()=>{
				change_room('intro0');
			});
			save.room.data.buttons.room_editor.addEventListener('click',()=>{
				change_room('room_editor');
			});
			save.room.data.buttons.continue.addEventListener('click',()=>{
				change_room('continue');
			});
			finish_preparation();
		}
		rotate_sky(0.005,0.01,0);
	}
	if(save.room.id=='authors'){
		if(save.room.preparation){
			set_sky('images/skies/glitch_anime_girls','png',false);
			set_music('music/main_menu.mp3');
			set_interface_visibility(false);
			save.room.data={
				scrollable:create_element_from_HTML(`<div class="scrollable"/>`),
				div1:create_element_from_HTML(`<div class="center column"/>`),
				contribution:structuredClone(Object.entries(window.language.contribution)),
				div2:create_element_from_HTML(`<div class="center column"/>`),
				buttons:{
					back:create_button_from_text(`назад`)
				},
				y_sky_rotation:0,
			};
			overlay.appendChild(save.room.data.scrollable);
			save.room.data.scrollable.appendChild(save.room.data.div1);
			save.room.data.contribution.forEach(([name,contribution],i)=>{
				save.room.data.contribution[i]=create_element_from_HTML(`<div>${get_transparent_space_text(`${name}⦑reset⦒ - ${contribution}`)}</div>`);
				save.room.data.div1.appendChild(get_br());
				save.room.data.div1.appendChild(save.room.data.contribution[i]);
			});
			overlay.appendChild(save.room.data.div2);
			save.room.data.div2.appendChild(save.room.data.buttons.back);
			save.room.data.buttons.back.addEventListener('click',()=>{
				change_room('main_menu');
			});
			finish_preparation();
		}
		set_sky_rotation((mouse.y-wrapper.clientHeight/2)/1000,save.room.data.y_sky_rotation+(mouse.x-wrapper.clientWidth/2)/1000,0);
		if(save.room.data.y_sky_rotation==Math.PI){
			save.room.data.y_sky_rotation=0;
		}
		save.room.data.y_sky_rotation+=0.005;
	}
	if(save.room.id=='settings'){
		if(save.room.preparation){
			set_sky('images/skies/glitch','png');
			set_music('music/main_menu.mp3');
			set_interface_visibility(false);
			save.room.data={
				scrollable:create_element_from_HTML(`<div class='scrollable'/>`),
				div1:create_element_from_HTML(`<div class="center column"/>`),
				drop_zone:wrap_in_frame(create_element_from_HTML(`<div class='drop_zone center'><div style='text-align:center;'>${get_transparent_space_text(window.language.rooms[save.room.id].drop_zone)}</div></div>`)),
				div2:create_element_from_HTML(`<div class="center wrap"/>`),
				buttons:dict_to_buttons(window.language.rooms[save.room.id].buttons),
				settings_divs:{},
			};
			/*предсоздание разметки*/
			overlay.appendChild(save.room.data.scrollable);
			save.room.data.scrollable.appendChild(save.room.data.div1);
			save.room.data.div1.appendChild(save.room.data.drop_zone);
			save.room.data.div1.appendChild(get_br());
			Object.entries(window.language.settings).forEach(([section_id,section])=>{
				save.room.data.div1.appendChild(get_symbolic_hr());
				save.room.data.div1.appendChild(create_element_from_HTML(`<div>${get_transparent_space_text(section.name)}</div>`));
				save.room.data.div1.appendChild(get_symbolic_hr());
				save.room.data.div1.appendChild(get_br());
				save.room.data.settings_divs[section_id]={};
				Object.entries(section.options).forEach(([option_id,option])=>{
					save.room.data.settings_divs[section_id][option_id]=create_element_from_HTML(`<div class='center'></div>`);
					save.room.data.settings_divs[section_id][option_id].appendChild(create_element_from_HTML(`<div>${get_transparent_space_text(`${option.name}: `)}</div>`));
					/*заполнение текущими значениями и необходимыми элементами интерфейса в зависимости от типа настройки*/
					let values=create_element_from_HTML(`<div id='values'></div>`);
					save.room.data.settings_divs[section_id][option_id].appendChild(values);
					if(section_id=='interface'){
						if(option_id=='language'){
							let add_button=create_button_from_text(window.language.rooms[save.room.id].button_add);
							change_button_text_color(add_button,'#0f0');
							values.appendChild(add_button);
							let create_select=()=>{
								let[select_button,select]=create_select_with_frame(Object.keys(window.languages).filter(name=>name!=='default'),true);
								values.insertBefore(select_button,add_button);
								select_button.addEventListener('mouseover',()=>{
									change_button_border_color(select_button,'#f0f');
								});
								select_button.addEventListener('mouseout',()=>{
									change_button_border_color(select_button,'#fff');
								});
								return select;
							}
							for(let language of window.settings.interface.language){
								create_select().value=language;
							}
							add_button.addEventListener('click',()=>{
								create_select();
							});
							add_button.addEventListener('mouseover',()=>{
								change_button_border_color(add_button,'#f0f');
							});
							add_button.addEventListener('mouseout',()=>{
								change_button_border_color(add_button,'#fff');
							});
						}
						if(['font_size','max_content_width','max_content_height'].includes(option_id)){
							let[frame,textarea]=create_textarea_with_frame(option.placeholder);
							textarea.value=window.settings[section_id][option_id];
							textarea.addEventListener('input',(e)=>{
								window.settings[section_id][option_id]=e.target.value;
							});
							values.appendChild(frame);
							frame.addEventListener('mouseover',()=>{
								change_button_border_color(frame,'#f0f');
							});
							frame.addEventListener('mouseout',()=>{
								change_button_border_color(frame,'#fff');
							});
						}
					}
					if(section_id=='audio'){
						if(option_id=='music_volume'){
							let range_input=create_element_from_HTML(`<input type="range" min="0" max="1" step="0.01" value="${window.settings[section_id][option_id]}"/>`);
							range_input.addEventListener('input',()=>{
								range_input.setAttribute('value',range_input.value);
								set_volume(range_input.value);
								window.settings[section_id][option_id]=range_input.value;
							});
							values.appendChild(range_input);
						}
					}
					if(section_id=='control'){
						if(option_id=='bind_to_layout'){
							let checkbox=create_element_from_HTML(`<input type="checkbox">`);
							checkbox.checked=window.settings[section_id][option_id];
							checkbox.addEventListener('change',function(){
								window.settings[section_id][option_id]=checkbox.checked;
							});
							values.appendChild(checkbox);
						}else{
							let add_button=create_button_from_text(window.language.rooms[save.room.id].button_add);
							change_button_text_color(add_button,'#0f0');
							values.appendChild(add_button);
							let create_button=(text)=>{
								let button=create_button_from_text(text,true);
								button.value=text;
								values.insertBefore(button,add_button);
								button.addEventListener('mouseover',()=>{
									change_button_border_color(button,'#f0f');
								});
								button.addEventListener('mouseout',()=>{
									change_button_border_color(button,'#fff');
								});
								button.addEventListener('click',()=>{
									change_button_text(button,window.language.rooms[save.room.id].messages.input);
									setTimeout(()=>{
										wait_user_input().then((result)=>{
											change_button_text(button,result);
											button.value=result;
										});
									},100);
								});
								return button;
							}
							for(let control of window.settings[section_id][option_id]){
								create_button(control);
							}
							add_button.addEventListener('click',()=>{
								create_button().click();
							});
							add_button.addEventListener('mouseover',()=>{
								change_button_border_color(add_button,'#f0f');
							});
							add_button.addEventListener('mouseout',()=>{
								change_button_border_color(add_button,'#fff');
							});
						}
					}
					/**/
					save.room.data.div1.appendChild(save.room.data.settings_divs[section_id][option_id]);
					save.room.data.div1.appendChild(get_br());
				});
			});
			/*завершение предсоздания интерфейса*/
			overlay.appendChild(save.room.data.div2);
			save.room.data.div2.appendChild(save.room.data.buttons.apply);
			save.room.data.div2.appendChild(get_space());
			save.room.data.div2.appendChild(save.room.data.buttons.back);
			save.room.data.div2.appendChild(get_space());
			save.room.data.div2.appendChild(save.room.data.buttons.save);
			add_event_listener('get_json',save.room.data.drop_zone,(data)=>{
				window.settings=smart_merge([window.settings,data],9);
				apply_settings();
			});
			save.room.data.buttons.back.addEventListener('click',()=>{
				change_room('main_menu');
			});
			save.room.data.buttons.save.addEventListener('click',()=>{
				save_as_json(window.settings,'settings.json');
			});
			save.room.data.buttons.apply.addEventListener('click',()=>{
				let language_list=[];
				for(let select of save.room.data.settings_divs.interface.language.querySelectorAll('select')){
					language_list.push(select.value);
				}
				language_list=remove_duplicates(language_list);
				window.settings.interface.language=language_list;
				for(let[option_id,option]of Object.entries(save.room.data.settings_divs.control)){
					if(option_id!='bind_to_layout'){
						let control_list=[];
						for(button of option.querySelectorAll('button')){
							if(button.value){
								control_list.push(button.value);
							}
						}
						window.settings.control[option_id]=remove_duplicates(control_list);
					}
				}
				apply_settings();
			});
			finish_preparation();
		}
		rotate_sky(0.005,0.01,0);
	}
	if(save.room.id=='continue'){
		if(save.room.preparation){
			set_sky('images/skies/glitch','png');
			set_music('music/main_menu.mp3');
			set_interface_visibility(false);
			save.room.data={
				scrollable:create_element_from_HTML(`<div class='scrollable'/>`),
				div1:create_element_from_HTML(`<div class="center column"/>`),
				drop_zone:wrap_in_frame(create_element_from_HTML(`<div class='drop_zone center'><div style='text-align:center;'>${get_transparent_space_text(window.language.rooms[save.room.id].drop_zone)}</div></div>`)),
				div2:create_element_from_HTML(`<div class="center wrap"/>`),
				buttons:dict_to_buttons(window.language.rooms[save.room.id].buttons),
				settings_divs:{},
			};
			overlay.appendChild(save.room.data.scrollable);
			save.room.data.scrollable.appendChild(save.room.data.div1);
			save.room.data.div1.appendChild(save.room.data.drop_zone);
			save.room.data.div1.appendChild(get_br());
			overlay.appendChild(save.room.data.div2);
			save.room.data.div2.appendChild(save.room.data.buttons.back);
			add_event_listener('get_json',save.room.data.drop_zone,(data)=>{
				load_save(data);
			});
			save.room.data.buttons.back.addEventListener('click',()=>{
				change_room('main_menu');
			});
			finish_preparation();
		}
		rotate_sky(0.005,0.01,0);
	}
	if(save.room.id=='room_editor'){
		if(save.room.preparation){
			set_interface_visibility(true);
			clear_symbols_grid();
			finish_preparation();
		}
	}
	if(save.room.id=='intro0'){
		if(save.room.preparation){
			set_music('music/Errorscape.mp3');
			set_interface_visibility(false);
			clear_pixijs();
			let video=document.createElement('video');
			//video.crossOrigin="anonymous";
			video.src='videos/intro/0.mp4';
			video.muted=true;// Часто требуется для автовоспроизведения
			video.autoplay=true;
			video.addEventListener('loadeddata',()=>{
				let texture=PIXI.Texture.from(video);
				let sprite=new PIXI.Sprite(texture);
				sprite.anchor.set(0.5);
				sprite.x=app.screen.width/2;
				sprite.y=app.screen.height/2;
				app.stage.addChild(sprite);
			});
			video.addEventListener('ended',()=>{
				clear_pixijs();
				init_sumbols_grid();
				init_three_scene();
				change_room('recycle_bin');
			});
			finish_preparation();
		}
	}
	if(save.room.id=='recycle_bin'){
		if(save.room.preparation){
			set_sky('images/skies/glitch','png');
			set_music('music/Errorscape.mp3');
			set_interface_visibility(true);
			save.room.data={
				ground:{
					text:'   ░▒▓*#-~\n ░▒▓~~-~#=\\\n    ░▒▓#=*-\\__\n              \\^\n                \\\n                 \\\n                 |\n                 |\n                 |\n                  \\\n                  <_\n                    \\\n                     \\\n                      \\\n                       7\n                       \\\n                        \\_\n                          L\n                           \\__\n                              \\\n                               7\n                              /\n                              \\\n                               |\n                               |\n                               |\n                               |\n                              /\n                             |\n                             |\n                             /\n                            /\n                           /\n                        __/\n                       /  \n                      <\n                       \\\n                        7\n                       /         ____\n                      F         /    \\_ \n                      ]         L      \\___\n                     /          /          l\n                     |         F           |\n                     |         L           `\n                     |         /            L____\n                     |         \\______           L\n                     )          \\     \\____       \\_\n                     )          <____      \\_       L_____\n                     \\          /    \\       \\            L_\n                     Г         F    , \\_     |              \\__\n                     \\         \\ /`< , _|    |                /\n                      Y         Y   Z,/     _/               <______\n                      |         `  `  |    |_\n                      /         /     |      \\\n                     /         Г      \\_\n                     |         L       _|\n                     /          \\       \n                     >          <\n                     >          <\n                     >          <\n                     \\          /\n                     Y          Y\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I__________I_____',
					collider:[]},
				camera:[0,0]
			};
			Object.assign(save.player,
				{
					coordinates:[35*logical_symbol_size,-25*logical_symbol_size],
					collider:[],
					walk_delay:0,
					max_walk_delay:2,
				}
			);
			save.room.data.ground.collider=text_to_collider(save.room.data.ground.text);
			finish_preparation();
		}
		rotate_sky(0.005,0.01,0);
		update_collision();
		/*обработка движения*/
		if(save.player.walk_delay<=0){
			if(nothing_right&&activated_actions.has('right')){
				save.player.coordinates[0]=Math.round(save.player.coordinates[0]+0.5*logical_symbol_size);
				save.player.walk_delay=save.player.max_walk_delay;
				update_collision();
			}
			if(nothing_left&&activated_actions.has('left')){
				save.player.coordinates[0]=Math.round(save.player.coordinates[0]-0.5*logical_symbol_size);
				save.player.walk_delay=save.player.max_walk_delay;
				update_collision();
			}
		}else{
			save.player.walk_delay--;
		}
		if(nothing_higher&&activated_actions.has('jump')){
			save.player.coordinates[1]=Math.round(save.player.coordinates[1]-0.5*logical_symbol_size);
			update_collision();
		}else if(nothing_below){
			save.player.coordinates[1]=Math.round(save.player.coordinates[1]+0.5*logical_symbol_size);
			update_collision();
		}
	}
	window.PERMITTED={ 
		//set_font_size,
		apply_language,
		set_max_content_size,
		apply_random_splash,
		apply_settings
	};
	/*деактивируем прокрутку колесика мыши*/
	window.pressed.delete(`WheelUp`);
	window.pressed.delete(`WheelDown`);
	update_activated_actions();
}

let fixed_update=()=>{
	let currentTime=performance.now();
	let elapsed=currentTime-previous_time;
	previous_time=currentTime;
	lag+=elapsed;
	// Выполняем логику столько раз, сколько "накопилось" шагов
	while(lag>=MS_PER_UPDATE){
		update_game_logic();
		lag-=MS_PER_UPDATE;
	}
	requestAnimationFrame(fixed_update);
};
// Запускаем цикл
requestAnimationFrame(fixed_update);