if(!d.save.temp.room.preparation){
	f.visual_effect(0);
	d.save.temp.room.data.logo.firstChild.style.color=f.get_random_true_str_color();
	Object.entries(d.save.temp.room.data.buttons).forEach(([name,el])=>{
		if(name=='exit'){
			const _mul = -0.5+Math.floor(Math.random()*2);
			el.style.marginLeft = (d.symbol_size * _mul) + 'px';
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