f.prepare(()=>{
	f.set_sky('images/skies/glitch','webp');
	f.set_music('music/main_menu.webm');
	f.set_interface_visibility(false);
	d.save.temp.room.data={
		info:f.create_element_from_HTML(`<div>${f.get_transparent_space_text(`CODERROR (1)${d.manifest.version} by essensuOFnull`,'#c8c8c8')}</div>`),
		logo:f.create_element_from_HTML(`<div class="center-horizontal">${f.get_transparent_space_text(String.raw`
/T\ /T\ PT\ P] PT\ PT\ /T\ PT\
L U L q L q H  L q L q L q L q
L   L q L q H] L_/ L_/ L q L_/
L n L q L q H  U n U n L q U n
\_/ \_/ L_/ L] U U U U \_/ U U`.trim())}</div>`),
		scrollable:f.create_element_from_HTML(`<div class="scrollable"/>`),
		buttons_div:f.create_element_from_HTML(`<div class="center column fill-parent"/>`),
		buttons:f.dict_to_buttons(d.language.rooms[room_id].buttons),
		bug_counter:0
	};
	d.overlay.appendChild(d.save.temp.room.data.info);
	d.overlay.appendChild(d.save.temp.room.data.logo);
	Object.entries(d.save.temp.room.data.buttons).forEach(([name,el])=>{
		d.save.temp.room.data.buttons_div.appendChild(el);
		d.save.temp.room.data.buttons_div.appendChild(f.get_br());
	});
	d.save.temp.room.data.scrollable.appendChild(d.save.temp.room.data.buttons_div);
	d.overlay.appendChild(d.save.temp.room.data.scrollable);
	d.save.temp.room.data.buttons.singleplayer.addEventListener('click',()=>{
		d.is_singleplayer=true;
		f.change_room('character_selection');
	});
	d.save.temp.room.data.buttons.multiplayer.addEventListener('click',()=>{
		d.is_singleplayer=false;
		f.change_room('character_selection');
	});
	d.save.temp.room.data.buttons.settings.addEventListener('click',()=>{
		f.change_room('settings');
	});
	d.save.temp.room.data.buttons.authors.addEventListener('click',()=>{
		f.change_room('authors');
	});
	d.save.temp.room.data.buttons.room_editor.addEventListener('click',()=>{
		f.change_room('room_editor_selection');
	});
	if(d.need_directory_permission){
		let select_folder_button = f.create_button('ВЫБРАТЬ ПАПКУ');
		d.save.temp.room.data.buttons_div.appendChild(select_folder_button);
		d.save.temp.room.data.buttons_div.appendChild(f.get_br());
		select_folder_button.addEventListener('click',()=>{
			window.message_sender.send_message('REQUEST_DIRECTORY',{});
		});
	}
	f.change_button_border_color(d.save.temp.room.data.buttons.donation,'#ffd700');
	// Сделать кнопку пожертвования "эпичной": добавить класс для пульсации
	if(d.save.temp.room.data.buttons.donation && !d.save.temp.room.data.buttons.donation.classList.contains('epic-donation-button')){
		d.save.temp.room.data.buttons.donation.classList.add('epic-donation-button');
	}
	d.save.temp.room.data.buttons.donation.addEventListener('click',()=>{
		window.open('https://tbank.ru/cf/4yH9fggd9e9','_blank');
	});
	f.change_button_color(d.save.temp.room.data.buttons.exit,'#f00');
	d.save.temp.room.data.buttons.exit.addEventListener('click',()=>{
		alert("⚠️ ERROR 400: Bad Request");
		self.close();
	});
});
f.rotate_sky(0.005,0.01,0);