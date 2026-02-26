f.prepare(()=>{
	f.set_sky('images/skies/glitch','webp');
	f.set_music('music/main_menu.webm');
	f.set_interface_visibility(false);
	d.save.temp.room.data={
		scrollable:f.create_element_from_HTML(`<div class='scrollable'/>`),
		div1:f.create_element_from_HTML(`<div class="center column"/>`),
		drop_zone:f.wrap_in_frame(f.create_element_from_HTML(`<div class='drop_zone center'><div style='text-align:center;'>${f.get_transparent_space_text(d.language.rooms[room_id].drop_zone)}</div></div>`)),
		div2:f.create_element_from_HTML(`<div class="center wrap"/>`),
		buttons:f.dict_to_buttons(d.language.rooms[room_id].buttons),
		settings_divs:{},
	};
	/*предсоздание разметки*/
	d.overlay.appendChild(d.save.temp.room.data.scrollable);
	d.save.temp.room.data.scrollable.appendChild(d.save.temp.room.data.div1);
	d.save.temp.room.data.div1.appendChild(d.save.temp.room.data.drop_zone);
	d.save.temp.room.data.div1.appendChild(f.get_br());
	Object.entries(d.language.settings).forEach(([section_id,section])=>{
		d.save.temp.room.data.div1.appendChild(f.get_symbolic_hr());
		d.save.temp.room.data.div1.appendChild(f.create_element_from_HTML(`<div>${f.get_transparent_space_text(section.name)}</div>`));
		d.save.temp.room.data.div1.appendChild(f.get_symbolic_hr());
		d.save.temp.room.data.div1.appendChild(f.get_br());
		d.save.temp.room.data.settings_divs[section_id]={};
		Object.entries(section.options).forEach(([option_id,option])=>{
			d.save.temp.room.data.settings_divs[section_id][option_id]=f.create_element_from_HTML(`<div class='center'></div>`);
			d.save.temp.room.data.settings_divs[section_id][option_id].appendChild(f.create_element_from_HTML(`<div>${f.get_transparent_space_text(`${option.name}: `)}</div>`));
			/*заполнение текущими значениями и необходимыми элементами интерфейса в зависимости от типа настройки*/
			let values=f.create_element_from_HTML(`<div id='values'></div>`);
			d.save.temp.room.data.settings_divs[section_id][option_id].appendChild(values);
			if(section_id=='interface'){
				if(option_id=='language'){
					let add_button=f.create_button_from_text(d.language.rooms[room_id].button_add);
					f.change_button_text_color(add_button,'#0f0');
					values.appendChild(add_button);
					let create_select=()=>{
						let[select_button,select]=f.create_select_with_frame(Object.keys(d.languages).filter(name=>name!=='default'),true);
						values.insertBefore(select_button,add_button);
						select_button.addEventListener('mouseover',()=>{
							f.change_button_border_color(select_button,'#f0f');
						});
						select_button.addEventListener('mouseout',()=>{
							f.change_button_border_color(select_button,'#fff');
						});
						return select;
					}
					for(let language of d.settings.interface.language){
						create_select().value=language;
					}
					add_button.addEventListener('click',()=>{
						create_select();
					});
					add_button.addEventListener('mouseover',()=>{
						f.change_button_border_color(add_button,'#f0f');
					});
					add_button.addEventListener('mouseout',()=>{
						f.change_button_border_color(add_button,'#fff');
					});
				}
				if(['font_size','max_content_width','max_content_height'].includes(option_id)){
					let[frame,textarea]=f.create_textarea_with_frame(option.placeholder);
					textarea.value=d.settings[section_id][option_id];
					textarea.addEventListener('input',(e)=>{
						d.settings[section_id][option_id]=e.target.value;
					});
					values.appendChild(frame);
					frame.addEventListener('mouseover',()=>{
						f.change_button_border_color(frame,'#f0f');
					});
					frame.addEventListener('mouseout',()=>{
						f.change_button_border_color(frame,'#fff');
					});
				}
				if(option_id=='pause_on_blur'){
					let checkbox=f.create_element_from_HTML(`<input type="checkbox">`);
					checkbox.checked=d.settings[section_id][option_id];
					checkbox.addEventListener('change',function(){
						d.settings[section_id][option_id]=checkbox.checked;
					});
					values.appendChild(checkbox);
				}
			}
			if(section_id=='audio'){
				if(option_id=='music_volume'){
					let range_input=f.create_element_from_HTML(`<input type="range" min="0" max="1" step="0.01" value="${d.settings[section_id][option_id]}"/>`);
					range_input.addEventListener('input',()=>{
						range_input.setAttribute('value',range_input.value);
						f.set_volume(range_input.value);
						d.settings[section_id][option_id]=range_input.value;
					});
					values.appendChild(range_input);
				}
			}
			if(section_id=='control'){
				if(option_id=='bind_to_layout'){
					let checkbox=f.create_element_from_HTML(`<input type="checkbox">`);
					checkbox.checked=d.settings[section_id][option_id];
					checkbox.addEventListener('change',function(){
						d.settings[section_id][option_id]=checkbox.checked;
					});
					values.appendChild(checkbox);
				}else{
					let add_button=f.create_button_from_text(d.language.rooms[room_id].button_add);
					f.change_button_text_color(add_button,'#0f0');
					values.appendChild(add_button);
					let create_button=(text)=>{
						let button=f.create_button_from_text(text,true);
						button.value=text;
						values.insertBefore(button,add_button);
						button.addEventListener('mouseover',()=>{
							f.change_button_border_color(button,'#f0f');
						});
						button.addEventListener('mouseout',()=>{
							f.change_button_border_color(button,'#fff');
						});
						button.addEventListener('click',()=>{
							f.change_button_text(button,d.language.rooms[room_id].messages.input);
							setTimeout(()=>{
								f.wait_user_input().then((result)=>{
									f.change_button_text(button,result);
									button.value=result;
								});
							},100);
						});
						return button;
					}
					for(let control of d.settings[section_id][option_id]){
						create_button(control);
					}
					add_button.addEventListener('click',()=>{
						create_button().click();
					});
					add_button.addEventListener('mouseover',()=>{
						f.change_button_border_color(add_button,'#f0f');
					});
					add_button.addEventListener('mouseout',()=>{
						f.change_button_border_color(add_button,'#fff');
					});
				}
			}
			/**/
			d.save.temp.room.data.div1.appendChild(d.save.temp.room.data.settings_divs[section_id][option_id]);
			d.save.temp.room.data.div1.appendChild(f.get_br());
		});
	});
	/*завершение предсоздания интерфейса*/
	d.overlay.appendChild(d.save.temp.room.data.div2);
	d.save.temp.room.data.div2.appendChild(d.save.temp.room.data.buttons.apply);
	d.save.temp.room.data.div2.appendChild(f.get_space());
	d.save.temp.room.data.div2.appendChild(d.save.temp.room.data.buttons.back);
	d.save.temp.room.data.div2.appendChild(f.get_space());
	d.save.temp.room.data.div2.appendChild(d.save.temp.room.data.buttons.save);
	f.add_event_listener('get_json',d.save.temp.room.data.drop_zone,(data)=>{
		try{
			d.settings=_.merge({},d.settings,data);
			f.apply_settings();
			f.print_to_chat(d.language.notifications.settings_loaded);
		}catch(e){
			f.print_to_chat(d.language.errors.common(e));
		}
	});
	d.save.temp.room.data.buttons.back.addEventListener('click',()=>{
		f.change_room('main_menu');
	});
	d.save.temp.room.data.buttons.save.addEventListener('click',()=>{
		try{
			f.write_file('YOUR_DATA/settings.json',f.object_to_string(d.settings)).then(()=>{
				f.print_to_chat(d.language.notifications.settings_saved);
			});
		}catch(e){
			f.print_to_chat(d.language.errors.common(e));
		}
	});
	d.save.temp.room.data.buttons.apply.addEventListener('click',()=>{
		let language_list=[];
		for(let select of d.save.temp.room.data.settings_divs.interface.language.querySelectorAll('select')){
			language_list.push(select.value);
		}
		language_list=f.remove_duplicates(language_list);
		d.settings.interface.language=language_list;
		for(let[option_id,option]of Object.entries(d.save.temp.room.data.settings_divs.control)){
			if(option_id!='bind_to_layout'){
				let control_list=[];
				for(button of option.querySelectorAll('button')){
					if(button.value){
						control_list.push(button.value);
					}
				}
				d.settings.control[option_id]=f.remove_duplicates(control_list);
			}
		}
		f.apply_settings();
	});
});
f.rotate_sky(0.005,0.01,0);