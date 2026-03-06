f.prepare(()=>{
	f.set_sky('images/skies/glitch_anime_girls','webp',false);
	f.set_music('midi/TouHou_ the Embodiment of Scarlet Devil - U.N.  Owen was her_.mid');
	f.set_interface_visibility(false);
	d.save.temp.room.data={
		scrollable:f.create_element_from_HTML(`<div class="scrollable"/>`),
		div1:f.create_element_from_HTML(`<div class="center column"/>`),
		contribution:structuredClone(Object.entries(d.language.contribution)),
		div2:f.create_element_from_HTML(`<div class="center column"/>`),
		buttons:{
			back:f.create_button_from_text(`назад`)
		},
		y_sky_rotation:0,
	};
	d.overlay.appendChild(d.save.temp.room.data.scrollable);
	d.save.temp.room.data.scrollable.appendChild(d.save.temp.room.data.div1);
	d.save.temp.room.data.contribution.forEach(([name,contribution],i)=>{
		d.save.temp.room.data.contribution[i]=f.create_element_from_HTML(`<div>${f.get_transparent_space_text(`${name}⦑reset⦒ - ${contribution}`)}</div>`);
		d.save.temp.room.data.div1.appendChild(f.get_br());
		d.save.temp.room.data.div1.appendChild(d.save.temp.room.data.contribution[i]);
	});
	d.overlay.appendChild(d.save.temp.room.data.div2);
	d.save.temp.room.data.div2.appendChild(d.save.temp.room.data.buttons.back);
	d.save.temp.room.data.buttons.back.addEventListener('click',()=>{
		f.change_room('main_menu');
	});
});
f.set_sky_rotation((d.mouse.y-wrapper.clientHeight/2)/1000,d.save.temp.room.data.y_sky_rotation+(d.mouse.x-wrapper.clientWidth/2)/1000,0);
if(d.save.temp.room.data.y_sky_rotation==Math.PI){
	d.save.temp.room.data.y_sky_rotation=0;
}
d.save.temp.room.data.y_sky_rotation+=0.005;