f.prepare(()=>{
	f.set_sky('images/skies/glitch','webp');
	f.set_music('music/main_menu.webm');
	f.set_interface_visibility(false);
	d.save.temp.room.data={
		scrollable:f.create_element_from_HTML(`<div class='scrollable'/>`),
		div1:f.create_element_from_HTML(`<div class="center-horizontal-items"/>`),
		title:f.create_element_from_HTML(f.get_transparent_space_text(d.language.rooms[room_id].title)),
		drop_zone:f.wrap_in_frame(f.create_element_from_HTML(`<div class='drop_zone center'><div style='text-align:center;'>${f.get_transparent_space_text(d.language.rooms[room_id].drop_zone)}</div></div>`)),
		div2:f.create_element_from_HTML(`<div class="center wrap"/>`),
		buttons:f.dict_to_buttons(d.language.rooms[room_id].buttons),
		characters_list_div:f.create_element_from_HTML(`<div style='display:contents'></div>`),
	};
	d.overlay.appendChild(d.save.temp.room.data.scrollable);
	d.save.temp.room.data.scrollable.appendChild(d.save.temp.room.data.div1);
	d.save.temp.room.data.div1.appendChild(f.get_br());
	d.save.temp.room.data.div1.appendChild(f.get_symbolic_hr());
	d.save.temp.room.data.div1.appendChild(d.save.temp.room.data.title);
	d.save.temp.room.data.div1.appendChild(f.get_symbolic_hr());
	d.save.temp.room.data.div1.appendChild(f.get_br());
	d.save.temp.room.data.div1.appendChild(d.save.temp.room.data.drop_zone);
	d.save.temp.room.data.div1.appendChild(f.get_br());
	d.save.temp.room.data.div1.appendChild(f.get_br());
	d.save.temp.room.data.div1.appendChild(d.save.temp.room.data.buttons.create);
	d.save.temp.room.data.div1.appendChild(f.get_br());
	d.save.temp.room.data.div1.appendChild(f.get_br());
	d.save.temp.room.data.div1.appendChild(f.get_br());
	d.save.temp.room.data.div1.appendChild(d.save.temp.room.data.characters_list_div);
	d.overlay.appendChild(d.save.temp.room.data.div2);
	d.save.temp.room.data.div2.appendChild(d.save.temp.room.data.buttons.back);

	f.load_characters().then(()=>{
		f.update_characters_list();
	});

	f.add_event_listener('get_json',d.save.temp.room.data.drop_zone,(editable_room)=>{
		d.editable_room=editable_room;
		f.change_room('room_editor');
	});
	d.save.temp.room.data.buttons.create.addEventListener('click',()=>{
		d.editable_room={

		};
		f.change_room('room_editor');
	});
	d.save.temp.room.data.buttons.back.addEventListener('click',()=>{
		f.change_room('main_menu');
	});
});
f.rotate_sky(0.005,0.01,0);