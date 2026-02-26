if(!d.save.temp.room.preparation){
	/*очистка*/
	f.clear_symbols_grid();
	f.focus_camera_on_player();
	/*отрисовка карты*/
	f.print_text_to_symbols_grid(d.save.temp.room.data.ground.text,0-d.save.temp.camera[0]/d.symbol_size,0-d.save.temp.camera[1]/d.symbol_size);
	/*отрисовка игрока*/
	f.render_player();
}