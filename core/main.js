{
let f=window.CODERROR.__originals__.functions,
d=window.CODERROR.__originals__.data;

// ========== ОБРАБОТЧИКИ ФОКУСА ОКНА ==========
window.has_focus = true;
window.addEventListener('focus', function() {
	window.has_focus = true;
});
window.addEventListener('blur', function() {
	window.has_focus = false;
});

/**приложение PIXI.js*/
d.app=new PIXI.Application({});
d.app.init().then(()=>{
	d.styleSheet=document.styleSheets[0];
	/**обёртка в которой лежит весь интерфейс*/
	d.wrapper=document.getElementById('wrapper');
	/*инициализация сцены*/
	/**сцена THREE.js*/
	d.three_scene=new THREE.Scene();
	d.three_scene.background=null;
	d.three_camera;
	f.init_three_camera();
	d.three_renderer=new THREE.WebGLRenderer({alpha:true});
	d.three_renderer.shadowMap.enabled=false;/*отключаем тени*/
	/**загрузчик для текстур THREE.js*/
	d.texture_loader=new THREE.TextureLoader();
	/**небо (коробка)*/
	d.skybox;
	/**текущий путь до текстур неба*/
	d.current_sky_path;
	/*добавление в основной canvas canvas-а three*/
	d.background_texture;
	d.background_sprite;
	f.init_three_scene();
	f.update_three_scene();
	/*отслеживание координат мыши*/
	/**данные о курсоре мыши*/
	d.mouse={x:0,y:0};
	d.wrapper.addEventListener('mousemove',(event)=>{
		if(!window.has_focus&&d.settings.interface.pause_on_blur)return;
		
		d.mouse.x=event.clientX-d.wrapper.getBoundingClientRect().left;
		d.mouse.y=event.clientY-d.wrapper.getBoundingClientRect().top;
		/*для кастомного курсора*/
		if(!d.cursor || !d.cursor_config) return;

		let element = event.target;
		// Используем data-атрибут вместо computedStyle
		let cursor_type = f.get_cursor_from_element(element);
		
		// Если курсор не найден в конфиге, используем default
		if(!d.cursor_config[cursor_type]){
			cursor_type = 'default';
		}
		
		let x=d.mouse.x-_.get(d, `cursor_config.${cursor_type}.hotspot_x`),
		y=d.mouse.y-_.get(d, `cursor_config.${cursor_type}.hotspot_y`);
		
		d.cursor.style.transform = `translate(${x}px, ${y}px)`;

		if(d.cursor_type === cursor_type) return;

		let cursor_file_path = _.get(d, `cursor_config.${cursor_type}.file`);
		d.cursor.src = cursor_file_path ? `${d.cursor_folder_path}/${cursor_file_path}` : '';
		d.cursor_type = cursor_type;
	});
	/*добавление в разметку canvas-а pixijs*/
	d.wrapper.appendChild(d.app.view);
	/**контейнер для HTML поверх canvas-ов*/
	d.overlay=document.createElement('div');
	d.overlay.id='html-overlay';
	d.wrapper.appendChild(d.overlay);
	/**контейнер дя предпросмотра чата*/
	d.chat_preview=document.createElement('div');
	d.chat_preview.id='chat_preview';
	d.wrapper.appendChild(d.chat_preview);
	/**контейнер для интерфейса*/
	d.interface=document.createElement('div');
	d.interface.id='interface';
	d.wrapper.appendChild(d.interface);
	/**сетка символов PIXI js*/
	d.symbols_grid;
	/**количество колонок сетки символов*/
	d.columns;
	/**количество строк сетки символов*/
	d.rows;
	/**отображаемый размер шрифта*/
	d.symbol_size;
	f.init_symbols_grid();
	/**/
	f.init_printable_symbols();
	/*для иконки*/
	d.dpr=window.devicePixelRatio||1;
	/**размер иконки сайта*/
	d.favicon.size=Math.round(16*d.dpr);
	/**холст иконки сайта*/
	d.favicon.canvas=document.createElement('canvas');
	d.favicon.canvas.width=d.favicon.size;
	d.favicon.canvas.height=d.favicon.size;
	d.favicon.ctx=d.favicon.canvas.getContext('2d');
	d.favicon.ctx.font=`${d.symbol_size}px CODERROR`;
	d.favicon.ctx.textAlign='center';
	d.favicon.ctx.textBaseline='middle';
	/**ссылка на элемент иконки*/
	d.favicon.link=document.querySelector('link[rel="icon"]');
	window.addEventListener('resize',f.update_size);
	/**автообновлятель иконки сайта*/
	d.favicon.interval=setInterval(()=>{
		f.generate_favicon();
	},1000/5);
	d.dragover_states=new WeakMap();
	d.event_handlers=new WeakMap();
	/**текущая музыка*/
	d.current_music=null;
	/**путь до файла текущей музыки*/
	d.current_music_path='';
	/**громкость музыки*/
	d.music_volume=0.5;
	/**инициализирована ли музыка*/
	d.audio_initialized=false;
	document.addEventListener('click',f.init_audio);
	/**нажатые клавиши*/
	d.pressed=new Set();
	/**активированные действия персонажа*/
	d.activated_actions=new Set();
	/**данные сохранения которые должны быть загружены*/
	d.loadable_save_data=null;
	/*отключаем контекстные меню глобально. я сам ими пользовался для вызова консоли, но они могут помешать игре, если что-то забинжено на правую кнопку мыши. используйте F12*/
	document.addEventListener('contextmenu',(e)=>{
		e.preventDefault();
	});
	f.set_empty_player();
	f.change_room('disclaimer');
	f.apply_settings();
	/**инициализация системы кастомных курсоров*/
	f.init_cursor_system();
	/**загрузка курсора по умолчанию*/
	f.set_cursor('images/interface/cursors/default');
	/**прослушиватель нажатий клавиш*/
	d.input_tracker=f.setup_input_tracker();
	/**логический размер символов, используемый в физике*/
	d.logical_symbol_size=16;
	f.update_size();
}).catch(console.error);

window.CODERROR.CHEATING.data=window.CODERROR.__originals__.data;
}