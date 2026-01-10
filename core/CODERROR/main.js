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
/**получение манифеста*/
f.fetch_json('manifest.json').then(manifest=>{
	/**манифест расширения*/
	d.manifest=manifest;
});
/**дожидаемся загрузки шрифта*/
f.check_font_loaded('CODERROR').then(() => {
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

		// Кешируем rect обёртки — не вызывать getBoundingClientRect на каждый mousemove
		d._wrapperRect = d.wrapper.getBoundingClientRect();
		const updateWrapperRect = ()=>{ d._wrapperRect = d.wrapper.getBoundingClientRect(); };
		window.addEventListener('resize', updateWrapperRect);
		// Если DOM внутри wrapper меняется, обновляем rect (на случай изменения размеров/сдвига)
		if(typeof MutationObserver !== 'undefined'){
			new MutationObserver(updateWrapperRect).observe(d.wrapper, {attributes:true, childList:true, subtree:true});
		}

		// Переменные для плавного и дешёвого обновления позиции курсора
		d._cursorTargetX = 0;
		d._cursorTargetY = 0;
		// Флаг, что нужно применить позицию курсора в основном цикле рендера
		d._cursorNeedsUpdate = false;

		// Установим подсказку браузеру про ожидаемое изменение — помогает оптимизировать
		const ensureCursorWillChange = ()=>{
			try{ if(d.cursor) d.cursor.style.willChange = 'transform'; }catch(e){}
		};

		d.wrapper.addEventListener('mousemove',(event)=>{
			if(!window.has_focus&&d.settings.interface.pause_on_blur) return;

			// Сохраняем клиентские координаты и вычисляем локальные относительно кешированного rect
			d.mouse.x = event.clientX;
			d.mouse.y = event.clientY;
			const localX = event.clientX - d._wrapperRect.left;
			const localY = event.clientY - d._wrapperRect.top;

			/*для кастомного курсора*/
			if(!d.cursor || !d.cursor_config) return;

			let element = event.target;
			let cursor_type = f.get_cursor_from_element(element);
			if(!d.cursor_config[cursor_type]) cursor_type = 'default';

			// Вычисляем целевые координаты (без записи в layout)
			const x = localX - _.get(d, `cursor_config.${cursor_type}.hotspot_x`);
			const y = localY - _.get(d, `cursor_config.${cursor_type}.hotspot_y`);
			d._cursorTargetX = Math.round(x);
			d._cursorTargetY = Math.round(y);

			// Помечаем, что позицию курсора надо применить на следующем кадре рендера
			d._cursorNeedsUpdate = true;

			// Обновление изображения курсора только при смене типа
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
		/*инициализируем символы*/
		f.init_printable_symbols();
		/**отображаемый размер шрифта*/
		d.symbol_size;
		f.set_font_size(16,true);
		/**/
		window.addEventListener('resize',f.update_size);
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
		/*перехдим вначальную комнату*/
		f.change_room('disclaimer');
		/*загружаем циклы физики и отрисовки*/
		f.eval_script(`core/CODERROR/physics.js`);
		f.eval_script(`core/CODERROR/render.js`);
	}).catch(console.error);
}).catch(console.error);

window.CODERROR.CHEATING.data=window.CODERROR.__originals__.data;
}