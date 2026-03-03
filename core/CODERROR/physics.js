{
let f=window.CODERROR.__originals__.functions,
d=window.CODERROR.__originals__.data,
f_s=window.CODERROR.CHEATING.functions;

let MS_PER_UPDATE=1000/d.fixed_TPS; // Шаг в миллисекундах
let previous_time=performance.now();
let lag=0;
let tps_count=0;
let last_measure=performance.now();
setInterval(()=>{
	let now=performance.now();
	d.TPS=Math.round(tps_count*1000/(now-last_measure))||0;
	tps_count=0;
	last_measure=now;
},1000);
/*инициализация интерфейса*/
f.update_interface();
/**заблокировать ли инвентарь*/
d.lock_inventory=false;
/*функция главного цикла*/
function update_game_logic(){
	/*переменные для укорочения кода*/
	let nickname=d.save.player.nickname,
	room_id=_.get(d,['save','world','players',nickname,'position','room_id']);

	f.change_title(`CODERROR (1)${d.manifest.version} TPS: ${d.TPS} FPS: ${d.FPS} - ${d.splash}`);
	if(!window.has_focus&&d.settings.interface.pause_on_blur)return
	tps_count++;
	/*переключение слотов хотбара*/
	if(document.getElementById('hotbar')){
		if(d.activated_actions.has('previous_hotbar_slot')){
			f.activate_previous_hotbar_slot();
		}
		if(d.activated_actions.has('next_hotbar_slot')){
			f.activate_next_hotbar_slot();
		}
	}
	/*открытие/закрытие инвентаря*/
	let open_inventory=false,close_inventory=false;
	if(d.activated_actions.has('open_inventory')){
		open_inventory=true;
	}
	if(d.activated_actions.has('close_inventory')){
		close_inventory=true;
	}
	if(open_inventory||close_inventory){
		if(!d.lock_inventory){
			/**меню, возникающее при escape (по умолчанию)*/
			d.esc_menu=document.getElementById('esc_menu');
			if(open_inventory&&close_inventory){
				if(d.esc_menu.style.visibility=='inherit'){
					d.esc_menu.style.visibility='collapse';
				}else{
					d.esc_menu.style.visibility='inherit';
				}
			}else if(open_inventory){
				d.esc_menu.style.visibility='inherit';
			}else{
				d.esc_menu.style.visibility='collapse';
			}
		}
		d.lock_inventory=true;
	}else{
		d.lock_inventory=false;
	}
	/*начальная комната, которую надо загрузить отдельно*/
	if(room_id=='disclaimer'){
		f.prepare(()=>{
			f.init_audio();
			f.set_interface_visibility(false);
			d.save.temp.room.data={
				scrollable:f.create_element_from_HTML(`<div class='scrollable'/>`),
				div:f.create_element_from_HTML(`<div class="center column fill-parent"/>`),
				button_continue:f.create_button_from_text(`принять риск и продолжить\n\ntake the risk and continue`),
			}
			d.save.temp.room.data.scrollable.appendChild(d.save.temp.room.data.div);
			d.save.temp.room.data.div.appendChild(f.create_element_from_HTML(`<div>${f.get_transparent_space_text(`ДИСКЛЕЙМЕР | DISCLAIMER`,'#FF1D34')}</div>`));
			d.save.temp.room.data.div.appendChild(f.get_br());
			d.save.temp.room.data.div.appendChild(f.get_symbolic_hr());
			d.save.temp.room.data.div.appendChild(f.get_br());
			d.save.temp.room.data.div.appendChild(f.create_element_from_HTML(`<div style='text-align:center'>${f.get_transparent_space_text(`Игра содержит часто сменяющиеся мелькающие цвета, что может вызвать приступ эпилепсии.\n\nАвтор не чурается использовать информацию из любых источников, такую как аудио и текстуры, даже если они возможно обладают авторскими правами, и просит простить его за это)`,'#FF1D34')}</div>`));
			d.save.temp.room.data.div.appendChild(f.get_br());
			d.save.temp.room.data.div.appendChild(f.get_symbolic_hr());
			d.save.temp.room.data.div.appendChild(f.get_br());
			d.save.temp.room.data.div.appendChild(f.create_element_from_HTML(`<div style='text-align:center'>${f.get_transparent_space_text(`The game contains frequently changing flashing colors, which may cause an epileptic seizure.\n\nThe author does not shy away from using information from any source, such as audio and textures, even if they may have copyrights, and asks for forgiveness for this)`,'#FF1D34')}</div>`));
			d.save.temp.room.data.div.appendChild(f.get_br());
			d.save.temp.room.data.div.appendChild(f.get_symbolic_hr());
			d.save.temp.room.data.div.appendChild(f.get_br());
			d.save.temp.room.data.div.appendChild(d.save.temp.room.data.button_continue);
			d.save.temp.room.data.button_continue.addEventListener('click',()=>{
				let loading=document.getElementById('loading');
				loading.style.display='block';
				/*получение доступа к своей же папке*/
				f.init_file_access().then(()=>{
					f.init_symbols_grid().then(()=>{
						try{
							/*используя полученные возможности, продолжаем загрузку игры*/
							/*загружаем языки*/
							f.load_languages().then(()=>{
								/*загружаем и применяем настройки*/
								f.read_file('YOUR_DATA/settings.json').then((text)=>{
									if(text){
										d.settings=JSON.parse(text);
										f.apply_settings();
										f.print_to_chat(d.language.notifications.settings_loaded);
									}
								});
							});
						}catch(e){
							f.print_to_chat(d.language.errors.common(e));
						}
						loading.style.display='none';
						f.change_room('main_menu');
					});
				}).catch(e=>{ console.warn('init_file_access failed:', e); });
			});
			f.change_button_text_color(d.save.temp.room.data.button_continue,'#FF1D34');
			d.overlay.appendChild(d.save.temp.room.data.scrollable);
		});
	}
	/*вызовем логику физики текущей комнаты*/
	eval(d.current_room_physics);
	/*разрешенные игроку функции*/
	window.CODERROR.PERMITTED.functions={
		apply_language:f_s.apply_language,
		set_max_content_size:f_s.set_max_content_size,
		apply_random_splash:f_s.apply_random_splash,
		apply_settings:f_s.apply_settings
	};
	/*деактивируем прокрутку колесика мыши*/
	d.pressed.delete(`WheelUp`);
	d.pressed.delete(`WheelDown`);
	f.update_activated_actions();
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
fixed_update();
}