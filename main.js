let app=new PIXI.Application({});
app.init().then(()=>{
	let save={
		room:{
			id:'',
			preparation:true,
			data:{}
		},
		player:{
			interface:{
				hotbar:{
					active_slot_index:0,
					slot_count:10,
				},
			},
			coordinates:[],
			collider:[],
			walk_delay:0,
			max_walk_delay:0,
		}
	};
	let wrapper=document.getElementById('wrapper');
	/*версия CODERROR'а*/
	window.version='(1)0.34.0';
	/*инициализация сцены three*/
	let three_scene=new THREE.Scene();
	three_scene.background=null;
	/*инициализирует камеру three*/
	let three_camera;
	function init_three_camera(){
		three_camera=new THREE.PerspectiveCamera(
			50,
			wrapper.clientWidth/wrapper.clientHeight,
			0.1,
			1000
		);
		three_camera.position.z=1;/*Камера внутри куба*/
	}
	init_three_camera();
	let three_renderer=new THREE.WebGLRenderer({alpha:true});
	three_renderer.shadowMap.enabled=false;/*отключаем тени*/
	/*Загрузчик для текстур*/
	let texture_loader=new THREE.TextureLoader();
	/*коробка, на которую можно натянуть текстуру неба*/
	let skybox;
	/*функция создания материалов*/
	function create_skybox_materials(path_part,extension,is_sphere) {
		let sides = ['right','left','top','bottom','front','back'];
		if(is_sphere){
			return sides.map(side => {
				let texture=texture_loader.load(
					`${path_part}/${side}.${extension}`,
					undefined,/*onLoad*/
					undefined,/*onProgress*/
					(error)=>{
						console.error('Error loading texture:',error);
					}
				);
				
				// Кастомный шейдерный материал
				return new THREE.ShaderMaterial({
					uniforms: {
						map: { value: texture }
					},
					vertexShader: `
						varying vec2 vUv;
						void main() {
							vUv = uv;
							gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
						}
					`,
					fragmentShader: `
						uniform sampler2D map;
						varying vec2 vUv;
						
						void main() {
							// Сдвигаем координаты в центр [-1, 1]
							vec2 centeredUV = (vUv - 0.5) * 2.0;
							
							// Рассчитываем расстояние от центра
							float dist = length(centeredUV);
							
							// Коэффициент искажения на основе угла (используем PI)
							float stretchFactor = cos(dist * 0.5 * 3.1415926535);
							
							// Применяем нелинейное растяжение
							vec2 distortedUV = centeredUV * (1.0 + stretchFactor * 0.333333);
							
							// Возвращаем координаты в исходный диапазон [0, 1]
							vec2 finalUV = (distortedUV * 0.5) + 0.5;
							
							gl_FragColor = texture2D(map, finalUV);
						}
					`,
					side: THREE.BackSide,
					depthWrite: false
				});
			});
		}else{
			return sides.map(side=>{
				let texture=texture_loader.load(
					`${path_part}/${side}.${extension}`,
					undefined,/*onLoad*/
					undefined,/*onProgress*/
					(error)=>{
						console.error('Error loading texture:',error);
					}
				);
				return new THREE.MeshBasicMaterial({
					map:texture,
					side:THREE.BackSide,
				});
			});
		}
	}
	/*функция установки неба*/
	let current_sky_path;
	function set_sky(path_part,extension,is_sphere=false) {
		let new_sky_path=`${path_part}/.${extension}`;
		if(new_sky_path!=current_sky_path){
			/*Удаляем старый skybox с освобождением ресурсов*/
			if(skybox){
				three_scene.remove(skybox);
				/*Освобождаем геометрию*/
				if(skybox.geometry){
					skybox.geometry.dispose();
				}
				/*Освобождаем материалы*/
				if(Array.isArray(skybox.material)){
					skybox.material.forEach(material=>{
						if(material.map)material.map.dispose();
						material.dispose();
					});
				}else if(skybox.material){
					if(skybox.material.map)skybox.material.map.dispose();
					skybox.material.dispose();
				}
			}
			/*Создаем новые материалы с обработкой ошибок*/
			try{
				let geometry=new THREE.BoxGeometry(5, 5, 5);
				let materials=create_skybox_materials(path_part,extension,is_sphere);
				skybox=new THREE.Mesh(geometry, materials);
				three_scene.add(skybox);
			}catch(error){
				console.error('Error creating skybox:',error);
			}
			current_sky_path=new_sky_path;
		}
	}
	/*добавление в основной canvas canvas-а three*/
	let background_texture,background_sprite;
	/*Инициализация текстуры и спрайта*/
	function init_three_scene() {
		background_texture = PIXI.Texture.from(three_renderer.domElement);
		background_texture.baseTexture.autoUpdate = false;
		background_sprite = new PIXI.Sprite(background_texture);
		
		// Устанавливаем размер спрайта
		background_sprite.width = wrapper.clientWidth;
		background_sprite.height = wrapper.clientHeight;
		
		app.stage.addChildAt(background_sprite, 0);
	}
	init_three_scene();
	/*Функция обновления сцены three*/
	function update_three_scene(){
		/*Обновляем Three.js сцену*/
		three_renderer.render(three_scene,three_camera);
		/*Принудительное обновление текстуры в PixiJS*/
		background_texture.baseTexture.update();
	}
	update_three_scene();
	function rotate_sky(x,y,z){
		if(!skybox)return;
		skybox.rotation.x+=x;
		skybox.rotation.y+=y;
		skybox.rotation.z+=z;
	}
	function set_sky_rotation(x,y,z){
		if(!skybox)return;
		skybox.rotation.set(x,y,z);
	}
	/*отслеживание координат мыши*/
	let mouse={x:0,y:0};
	wrapper.addEventListener('mousemove',(event)=>{
		mouse.x=event.clientX-wrapper.getBoundingClientRect().left;
		mouse.y=event.clientY-wrapper.getBoundingClientRect().top;
	});
	/*добавление в разметку canvas-а pixijs*/
	wrapper.appendChild(app.view);
	/*добавление в разметку html-overlay*/
	let overlay=document.createElement('div');
	overlay.id='html-overlay';
	wrapper.appendChild(overlay);
	/*добавление в разметку предпросмотра чата*/
	let chat_preview=document.createElement('div');
	chat_preview.id='chat_preview';
	wrapper.appendChild(chat_preview);
	/*добавление в разметку interface*/
	let interface=document.createElement('div');
	interface.id='interface';
	wrapper.appendChild(interface);
	/**/
	function print_to_chat(message){
		let message_element=create_element_from_HTML(`<div>${message}</div>`);
		message_element.classList.add('message');
		chat_preview.appendChild(message_element);
		message_element.addEventListener('animationend',()=>{
			message_element.remove();
		});
	}
	function change_room(room_,preparation_=true,reset_overlay_=true){
		save.room.id=room_;
		save.room.preparation=preparation_;
		if(reset_overlay_){
			overlay.innerHTML=``;
		}
	}
	/*инициализирует матрицу символов*/
	let symbols_grid,columns,rows;
	function init_sumbols_grid(){
		symbols_grid=[];
		columns=0;
		rows=0;
		update_symbols_grid();
	}
	/*обновляет размеры матрицы символов*/
	function update_symbols_grid(){
		let newColumns=Math.ceil(app.renderer.width/symbol_size);
		let newRows=Math.ceil(app.renderer.height/symbol_size);
		/*Ресайз существующей сетки*/
		if(newColumns!==columns||newRows!==rows){
			/*Удаляем лишние строки*/
			if(newRows<rows){
				for(let y=newRows;y<rows;y++){
					for(let x=0;x<columns;x++){
						symbols_grid[y][x].destroy({children:true});
					}
				}
				symbols_grid.length=newRows;
			}
			/*Добавляем новые строки*/
			if(newRows>rows){
				for(let y=rows;y<newRows;y++){
					symbols_grid[y]=[];
					for(let x=0;x<Math.max(columns,newColumns);x++){
						let symbol=new PIXI.Text('',text_style);
						symbol.resolution=20;
						symbol.position.set(x*symbol_size,y*symbol_size);
						app.stage.addChild(symbol);
						symbols_grid[y][x]=symbol;
					}
				}
			}
			/*Обновляем колонки в каждой строке*/
			for(let y=0;y<newRows;y++){
				/*Удаляем лишние колонки*/
				if(newColumns<columns) {
					for(let x=newColumns;x<columns;x++){
						if(symbols_grid[y][x]){
							symbols_grid[y][x].destroy({children:true});
						}
					}
					symbols_grid[y].length=newColumns;
				}
				/*Добавляем новые колонки*/
				if(newColumns>columns){
					for(let x=columns;x<newColumns;x++){
						let symbol=new PIXI.Text('',text_style);
						symbol.resolution=20;
						symbol.position.set(x*symbol_size,y*symbol_size);
						app.stage.addChild(symbol);
						symbols_grid[y][x]=symbol;
					}
				}
			}
			columns=newColumns;
			rows=newRows;
		}
	}
	/*настройки шрифтов*/
	let styleSheet=document.styleSheets[0];
	let symbol_size,font_size,text_style/*,pixel_in_pt=0.675 рудимент*/;
	function set_font_size(size_in_pixels){
		symbol_size=size_in_pixels;
		font_size=symbol_size/**pixel_in_pt рудимент*/;
		styleSheet.insertRule(":root{--symbol_size:"+font_size+"px !important;}",styleSheet.cssRules.length);
		text_style=new PIXI.TextStyle({
			fontFamily:'CODERROR',
			fontSize:symbol_size,
			trim:false,
			fill:0xFFFFFF,
		});
		init_sumbols_grid();
	}
	set_font_size(16);
	/**/
	function update_size() {
		/*Получаем актуальные размеры контейнера*/
		let width=wrapper.clientWidth;
		let height=wrapper.clientHeight;
		/*Обновляем размеры рендерера PixiJS*/
		app.renderer.resize(width,height);
		update_symbols_grid();
		/*Обновляем способ масштабирования изображений*/
		styleSheet.insertRule(`:root{--image_rendering:${window.devicePixelRatio>=1?'pixelated':'auto'} !important;}`,styleSheet.cssRules.length);
		/*Обновляем Three.js камеру и рендерер*/
		three_camera.aspect=width/height;
		three_camera.updateProjectionMatrix();
		three_renderer.setSize(width,height);
		/*Обновляем размер спрайта PixiJS*/
		if(background_sprite){
			background_sprite.width=width;
			background_sprite.height=height;
		}
		/*Принудительно обновляем текстуру*/
		update_three_scene();
		app.stage.removeChild(background_sprite);
		init_three_scene();
	}
	function visual_effect(number){
		/*заполняет случайными символами*/
		if(number==0){
			for(let y=0;y<symbols_grid.length;y++){
				for(let x=0;x<symbols_grid[y].length;x++){
					let symbol=symbols_grid[y][x];
					symbol.text=get_random_char();
					symbol.tint=get_random_color();
				}
			}
		}
		/*случайно поворачивает символы*/
		if(number==1){
			for(let y=0;y<symbols_grid.length;y++){
				for(let x=0;x<symbols_grid[y].length;x++){
					let symbol=symbols_grid[y][x];
					symbol.anchor.set(Math.random());
					symbol.rotation=Math.random();
				}
			}
		}
		/*откатывает предыдущий*/
		if(number==2){
			for(let y=0;y<symbols_grid.length;y++){
				for(let x=0;x<symbols_grid[y].length;x++){
					let symbol=symbols_grid[y][x];
					symbol.anchor.set(0);
					symbol.rotation=0;
				}
			}
		}
	}
	function init_printable_symbols(){
		window.printable_symbols='';
		let ranges=[
			[0x0020,0x007F], /*Basic Latin (ASCII)*/
			[0x00A0,0x00FF], /*Latin-1 Supplement*/
			[0x0400,0x04FF], /*Cyrillic*/
			[0x0370,0x03FF], /*Greek*/
			[0x3040,0x309F], /*Hiragana*/
			[0x30A0,0x30FF], /*Katakana*/
			[0x4E00,0x9FFF], /*CJK Unified Ideographs (кандзи)*/
			[0x0600,0x06FF], /*Arabic*/
			[0x0900,0x097F], /*Devanagari*/
			[0x0E00,0x0E7F], /*Thai*/
			[0xAC00,0xD7AF], /*Hangul Syllables (корейский)*/
			[0x1F600,0x1F64F]/*Emoji*/
		];
		for(let range of ranges){
			for(let codePoint=range[0];codePoint<=range[1];codePoint++){
				window.printable_symbols+=String.fromCodePoint(codePoint);
			}
		}
	}
	init_printable_symbols();
	function get_random_char(){
		return window.printable_symbols[Math.floor(Math.random()*99)];
	}
	function get_random_color(){
		return Math.floor(Math.random()*0xFFFFFF);
	}
	/*для иконки*/
	let dpr=window.devicePixelRatio||1;
	let favicon_size=Math.round(16*dpr);
	let canvas=document.createElement('canvas');
	canvas.width=favicon_size;
	canvas.height=favicon_size;
	let ctx=canvas.getContext('2d');
	ctx.font=`${symbol_size}px CODERROR`;
	ctx.textAlign='center';
	ctx.textBaseline='middle';
	let link=document.querySelector('link[rel="icon"]');
	function generate_favicon(){
		/*Очищаем холст*/
		ctx.clearRect(0,0,favicon_size,favicon_size);
		/*Настройки текста*/
		ctx.fillStyle=`#${get_random_color().toString(16).padStart(6,'0')}`;
		/*Рисуем символ*/
		ctx.fillText(get_random_char(),favicon_size/2,favicon_size/2);
		/*Обновляем иконку*/
		canvas.toBlob(blob=>{
			link.href=URL.createObjectURL(blob);
		},'image/png');
	}
	window.addEventListener('resize',update_size);
	/*обновление favicon*/
	let faviconInterval=setInterval(()=>{
		generate_favicon();
	},1000/5);
	/*функция генерации кода разметки pre с отсутствием фона у пробелов*/
	function get_transparent_space_text(text,color='#fff',background='#000'){
		let escapeHtml=(char)=>{
			let escapes={
				'<':'&lt;',
				'>':'&gt;',
				'&':'&amp;',
				'"':'&quot;',
				"'":'&#39;'
			};
			return escapes[char]||char;
		};
		let areStylesEqual=(a,b)=>{
			let aKeys=Object.keys(a);
			let bKeys=Object.keys(b);
			if(aKeys.length!==bKeys.length)return false;
			for(let key of aKeys){
				if(a[key]!==b[key])return false;
			}
			return true;
		};
		let tokenRegex=/(⦑[^⦒]*⦒)|(\n)|( )|(.)/g;
		let tokens=[];
		let match;
		while((match=tokenRegex.exec(text))!==null){
			if(match[1])tokens.push({type:'tag',value:match[1]});
			else if(match[2])tokens.push({type:'newline'});
			else if(match[3])tokens.push({type:'space'});
			else if(match[4])tokens.push({type:'char',value:match[4]});
		}
		let initialStyles={color,background};
		let currentStyles={...initialStyles};
		let output=[];
		let currentNonSpace={styles:null,content:[]};
		let currentSpace=[];
		let flushNonSpace=()=>{
			if(currentNonSpace.content.length===0)return;
			/*Всегда добавляем наследование, если стили не изменены*/
			let baseStyles={color:'inherit',background:'inherit'};
			let mergedStyles=!areStylesEqual(currentNonSpace.styles,initialStyles) 
				?{...currentNonSpace.styles}
				:baseStyles;
			let styleStr=`style="${Object.entries(mergedStyles).map(([k,v])=>`${k}:${v}`).join(';')}"`;
			let content=currentNonSpace.content.map(escapeHtml).join('');
			output.push(`<pre ${styleStr}>${content}</pre>`);
			currentNonSpace.content=[];
			currentNonSpace.styles=null;
		};
		let flushSpace=()=>{
			if(currentSpace.length===0)return;
			/*Только прозрачный фон и цвет если изменен*/
			let spaceStyles={
				background:'transparent',
				...(currentStyles.color!==initialStyles.color&&{color:currentStyles.color})
			};
			let styleStr=Object.keys(spaceStyles).length>0 
				?`style="${Object.entries(spaceStyles).map(([k,v])=>`${k}:${v}`).join(';')}"`
				:'';
			let content=currentSpace.map(escapeHtml).join('');
			output.push(`<pre ${styleStr}>${content}</pre>`);
			currentSpace=[];
		};
		for(let token of tokens){
			switch(token.type){
				case'tag':{
					let tagContent=token.value.slice(1,-1).trim();
					if(tagContent==='reset'){
						currentStyles={...initialStyles};
					}else{
						const[property,value]=tagContent.split(':').map(p=>p.trim());
						if(property&&value)currentStyles[property]=value;
					}
					flushNonSpace();
					flushSpace();
					break;
				}
				case'newline':
					flushNonSpace();
					flushSpace();
					output.push('<br>');
					break;
				case'space':
					flushNonSpace();
					currentSpace.push(' ');
					break;
				case'char':
					flushSpace();
					if(currentNonSpace.styles&&areStylesEqual(currentStyles,currentNonSpace.styles)){
						currentNonSpace.content.push(token.value);
					}else{
						flushNonSpace();
						currentNonSpace.styles={...currentStyles};
						currentNonSpace.content.push(token.value);
					}
					break;
			}
		}
		flushNonSpace();
		flushSpace();
		return`<div style="display:contents;color:${color};background:${background}">${output.join('')}</div>`;
	}
	/*принимает разметку, возвращает полноценный элемент*/
	function create_element_from_HTML(html){
		let template=document.createElement('template');
		template.innerHTML=html.trim();
		let fragment=template.content;
		/*Проверяем, есть ли ровно один дочерний элемент*/
		if(fragment.childNodes.length===1&&fragment.firstChild.nodeType===Node.ELEMENT_NODE){
			return fragment.firstChild;
		}else{
			/*Создаём контейнер с display: contents*/
			let container=document.createElement('div');
			container.style.display='contents';
			/*Перемещаем все узлы из фрагмента в контейнер*/
			while(fragment.firstChild){
				container.appendChild(fragment.firstChild);
			}
			return container;
		}
	}
	/*возвращает один из ИСТИНЫХ цветов*/
	function get_random_true_str_color(){
		return get_random_element(['#000','#00f','#0f0','#0ff','#f00','#f0f','#ff0','#fff']);
	}
	/*увеличивает z-index на 1*/
	function increment_z_index(element){
		element.style.zIndex=parseInt(element.style.zIndex||0)+1+'';
	}
	/*оборачивает элемент в кнопку с символьной рамкой*/
	function wrap_in_frame(content,container_type='<button/>',removable=false) {
		let button = create_element_from_HTML(container_type);
		button.style.position='relative';
		button.style.overflow='hidden';
		let grid=document.createElement('div');
		grid.style.display='grid';
		grid.style.gridTemplateAreas=`"a . b" ". c ." "d . e"`;
		grid.style.gridTemplateColumns='repeat(3,min-content)';
		grid.style.gridTemplateRows='repeat(3,min-content)';
		grid.style.gap='0';
		grid.style.position='relative';
		grid.style.alignItems='center'; // Выравнивание по центру
		grid.style.justifyItems='center';
		grid.style.color='inherit';
		/*Создание элементов с правильными областями*/
		let b;
		if(removable){
			b=create_element_from_HTML(`<pre><button style='color:inherit'>X</button></pre>`);/*костыль*/
			b.addEventListener('click',()=>{
				button.remove();
			});
		}
		else{
			b=create_element_from_HTML(`<pre>.</pre>`);
		}
		let elements={
			a:create_element_from_HTML(`<pre>+</pre>`),
			b:b,
			c:document.createElement('div'),
			d:create_element_from_HTML(`<pre>\`</pre>`),
			e:create_element_from_HTML(`<pre>'</pre>`)
		};
		/*Настройка центрального элемента*/
		elements.c.appendChild(content);
		elements.c.style.gridArea='c';
		elements.c.style.whiteSpace='nowrap';
		elements.c.id='frame_content';
		/*Привязка всех элементов к grid-areas*/
		Object.entries(elements).forEach(([area,el])=>{
			el.style.gridArea=area;
			el.style.color='inherit';
			grid.appendChild(el);
		});
		if(removable){
			b.style.color='#f00'
		}
		button.appendChild(grid);
		increment_z_index(grid);
		let horizontal=`<pre style="position:absolute;white-space:nowrap;color:inherit;">${'-'.repeat(666)}</pre>`
		let vertical=`<pre style="position:absolute;white-space:nowrap;color:inherit;">${'|<br>'.repeat(444)}</pre>`
		let top=create_element_from_HTML(horizontal);
		top.style.top=0;
		top.style.left=0;
		let bottom=create_element_from_HTML(horizontal);
		bottom.style.bottom=0;
		bottom.style.left=0;
		let left=create_element_from_HTML(vertical);
		left.style.top=0;
		left.style.left=0;
		let right=create_element_from_HTML(vertical);
		right.style.top=0;
		right.style.right=0;
		button.appendChild(top);
		button.appendChild(bottom);
		button.appendChild(left);
		button.appendChild(right);
		return button;
	}
	/*создает кнопку на основе текста*/
	function create_button_from_text(text,removable=false){
		return wrap_in_frame(create_element_from_HTML(get_transparent_space_text(text)),'<button/>',removable);
	}
	/*меняет цвет рамки кнопки*/
	function change_button_border_color(button,color){
		button.style.color=color;
	}
	/*меняет цвет текста кнопки*/
	function change_button_text_color(button,color){
		let targetElement=button.querySelector('#frame_content');
		let firstChild=targetElement.firstElementChild;
		if(firstChild){
			firstChild.style.color=color;
		}else{
			console.log('У элемента нет дочерних элементов.');
		}
	}
	/*меняет цвет рамки и текста кнопки*/
	function change_button_color(button,color){
		change_button_border_color(button,color);
		change_button_text_color(button,color);
	}
	/*проверяет перетаскивают ли файл над объектом*/
	let dragoverStates=new WeakMap();
	function check_dragover(element){
		if (!element.__dragoverHandlersAdded){
			let handlers={
				dragenter:(event)=>{
					event.preventDefault();
					if(!dragoverStates.get(element)){
						element.classList.add('dragover');
						dragoverStates.set(element,true);
					}
				},
				dragover:(event)=>{
					event.preventDefault();
					if(!dragoverStates.get(element)){
						element.classList.add('dragover');
						dragoverStates.set(element,true);
					}
				},
				dragleave:(event)=>{
					if(!event.relatedTarget||!element.contains(event.relatedTarget)){
						element.classList.remove('dragover');
						dragoverStates.set(element,false);
					}
				},
				drop:(event)=>{
					event.preventDefault();
					element.classList.remove('dragover');
					dragoverStates.set(element,false);
				}
			};
			element.addEventListener('dragenter',handlers.dragenter);
			element.addEventListener('dragover',handlers.dragover);
			element.addEventListener('dragleave',handlers.dragleave);
			element.addEventListener('drop',handlers.drop);
			element.__dragoverHandlersAdded=true;
			Object.assign(element,{__dragoverHandlers:handlers});
		}
		return dragoverStates.get(element)||false;
	}
	/*проверяет наведена ли мышь на элемент*/
	function check_hover(element){
		return(element.matches(':hover')||check_dragover(element));
	}
	/*возвращает новый br элемент*/
	function get_br(){
		return document.createElement('br');
	}
	/*превращает json файл в объект (требует async await)*/
	function json_to_dict(file){
		return new Promise((resolve,reject)=>{
			let reader=new FileReader();
			reader.onload=e=>{
				try{
					resolve(JSON.parse(e.target.result));
				}catch(error){
					reject(error);
				}
			};
			reader.onerror=error=>reject(error);
			reader.readAsText(file);
		});
	}
	/*превращает много json в объекты за раз*/
	async function jsons_to_dict_list(files){
		let data=[];
		for(let file of files){
			let parsed=await json_to_dict(file);
			data.push(parsed);
		}
		return data;
	}
	/*соединяет объекты в 1 более общий, перезаписывая старые значения новыми*/
	function smart_merge(config_list,max_depth=2){
		let merge=(target,source,depth=1)=>{
			/*Если достигли предела глубины - возвращаем source*/
			if(depth>=max_depth)return{...source};
			/*Создаем новый объект для результатов*/
			let result={...target};
			/*Перебираем ключи исходного объекта*/
			for(let key of Object.keys(source)) {
				let sourceValue=source[key];
				let targetValue=target[key];
				/*Если оба значения - объекты (не массивы)*/
				if(typeof sourceValue==='object'&& 
					!Array.isArray(sourceValue)&&
					typeof targetValue==='object'&& 
					!Array.isArray(targetValue)){
					/*Рекурсивное слияние с увеличением глубины*/
					result[key]=merge(targetValue,sourceValue,depth+1);
				}else{
					/*Заменяем значение*/
					result[key]=sourceValue;
				}
			}
			return result;
		};
		let result=config_list[0];
		for(let i=1;i<config_list.length;i++){
			result=merge(result,config_list[i]);
		}
		return result;
	}
	/*создаёт кастомные обработчики событий*/
	let eventHandlers=new WeakMap();
	function add_event_listener(name,element,function_part){
		/*Удаляем старые обработчики перед добавлением новых*/
		remove_event_listener(name,element);
		let handlers={
			drop:null,
			click:null,
			change:null
		};
		if(name==='get_json'){
			let jsonInput=document.createElement('input');
			jsonInput.type='file';
			jsonInput.multiple=true;
			jsonInput.accept='.json';
			jsonInput.style.display='none';
			/*Обработчик для drag-and-drop*/
			let dropHandler=async(e)=>{
				e.preventDefault();
				try{
					let dicts=await jsons_to_dict_list(e.dataTransfer.files);
					let merged=smart_merge(dicts);
					function_part(merged);
				}catch(error){
					console.error('Ошибка:',error);
				}
			};
			/*Обработчик для клика (открытие проводника)*/
			let clickHandler=()=>{
				jsonInput.click();
			};
			/*Обработчик выбора файлов (общий для всех вызовов)*/
			let changeHandler=async(e)=>{
				try{
					let files=Array.from(e.target.files);
					let dicts=await jsons_to_dict_list(files);
					let merged=smart_merge(dicts);
					function_part(merged);
					jsonInput.value='';
				}catch(error){
					console.error('Ошибка:',error);
				}
			};
			/*Сохраняем ссылки на обработчики*/
			handlers.drop=dropHandler;
			handlers.click=clickHandler;
			handlers.change=changeHandler;
			/*Навешиваем обработчики*/
			element.addEventListener('drop',dropHandler);
			element.addEventListener('click',clickHandler);
			jsonInput.addEventListener('change',changeHandler);
			/*Сохраняем созданный input и обработчики*/
			eventHandlers.set(element,{
				name,
				handlers,
				elements:{jsonInput}
			});
		}
	}
	/*удаляет кастомные обработчики событий*/
	function remove_event_listener(name,element){
		let stored=eventHandlers.get(element);
		if(stored&&stored.name===name){
			/*Удаляем все обработчики событий*/
			element.removeEventListener('drop',stored.handlers.drop);
			element.removeEventListener('click',stored.handlers.click);
			stored.elements.jsonInput.removeEventListener('change',stored.handlers.change);
			/*Удаляем созданный input из DOM если был добавлен*/
			if(document.body.contains(stored.elements.jsonInput)){
				document.body.removeChild(stored.elements.jsonInput);
			}
			eventHandlers.delete(element);
		}
	}
	/*создает hr из -*/
	function get_symbolic_hr(){
		return create_element_from_HTML(`<div class='symbolic_hr'><pre>${'-'.repeat(666)}</pre></div>`);
	}
	/*принимает список названий языков и применяет их (чем больше индекс, тем выше приоритет)*/
	function apply_language(name_list){
		name_list=['default'].concat(name_list);
		let languages_list=[];
		for(name of name_list){
			languages_list.push(window.languages[name]);
		}
		window.language=smart_merge(languages_list,99);
	}
	/*принимает словарь текста и превращает его в кнопки*/
	function dict_to_buttons(dict){
		let buttons=structuredClone(dict);
		for(let key in buttons){
			buttons[key]=create_button_from_text(buttons[key]);
		}
		return buttons;
	}
	/*устанавливает ограничение максимального размера содержимого игры, "100%" отключает ограничение*/
	function set_max_content_size(max_width,max_height){
		wrapper.style.width=`min(100%,${max_width})`;
		wrapper.style.height=`min(100%,${max_height})`;
		update_size();
	}
	/*принимает select и список и устанавливает ему эти значения*/
	function set_select_options(selectElement,options) {
		selectElement.innerHTML='';
		options.forEach(optionText=>{
			let option=document.createElement('option');
			option.textContent=optionText;// Задаем текст отображения
			selectElement.appendChild(option);
		});
	}
	/*создает select с рамкой*/
	function create_select_with_frame(options,removable=false){
		let select=create_element_from_HTML('<select/>');
		set_select_options(select,options);
		select.style.margin='calc(-1 * var(--symbol_size))';
		select.style.padding='var(--symbol_size)';
		select.style.marginRight='0';
		select.style.cursor='pointer';
		select.style.background='#00000000';
		let frame=wrap_in_frame(select,`<button style='background:#000;'/>`,removable);
		frame.style.pointerEvents='none';
		return[frame,select];
	}
	/*создает прозрачный пробел для горизонтального отступа*/
	function get_space(){
		return create_element_from_HTML(`<pre style='background:#00000000'> </pre>`);
	}
	/*Функция для сохранения объекта как JSON файл*/
	function save_as_json(data,filename){
		/*Преобразуем объект в JSON строку*/
		let jsonString=JSON.stringify(data);
		/*Создаем Blob из JSON строки*/
		let blob=new Blob([jsonString],{type:"application/json"});
		/*Создаем ссылку на объект Blob*/
		let url=URL.createObjectURL(blob);
		/*Создаем временную ссылку для скачивания*/
		let a=document.createElement("a");
		a.href=url;
		a.download=filename;
		a.style.display='none';
		/*Инициализируем клик по ссылке*/
		document.body.appendChild(a);
		a.click();
		/*Удаляем ссылку и освобождаем URL*/
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		/*уведомление*/
		alert(window.language.alerts.file_saved(filename));
	}
	/*удаляет из списка повторяющиеся значения, оставляя в нём только их последние вхождения*/
	function remove_duplicates(arr){
		let seen=new Set();
		let result=[];
		/*Идем по массиву в обратном порядке*/
		for(let i=arr.length-1;i>=0;i--){
			let value=arr[i];
			if(!seen.has(value)){
				seen.add(value);
				result.push(value);
			}
		}
		/*Перевернем результат, чтобы вернуть его в правильном порядке*/
		return result.reverse();
	}
	/*применяет к игре настройки из window.settings*/
	function apply_settings(){
		apply_language(window.settings.interface.language);
		apply_random_splash();
		/*set_font_size(window.settings.interface.font_size);*/
		set_max_content_size(window.settings.interface.max_content_width,window.settings.interface.max_content_height);
		change_room(save.room.id);
	}
	/*создает textarea с рамкой*/
	function create_textarea_with_frame(placeholder='',removable=false){
		let textarea=create_element_from_HTML('<textarea/>');
		textarea.style.cursor='pointer';
		textarea.style.background='#00000000';
		textarea.placeholder=placeholder;
		let frame=wrap_in_frame(textarea,`<button style='background:#000;'/>`,removable);
		frame.addEventListener('click',(e)=>{
			textarea.focus();
		})
		return[frame,textarea];
	}
	/*музыка*/
	let current_music=null;
	let current_music_path='';
	let music_volume=0.5;
	let audio_initialized=false;
	/*для того чтобы музыка начинала проигрываться после нажатия на любое место страницы*/
	function init_audio(){
		if(!audio_initialized){
			audio_initialized=true;
			document.removeEventListener('click',init_audio);
			if(current_music){
				current_music.play().catch(handle_play_error);
			}
		}
	}
	document.addEventListener('click',init_audio);
	/*принимает путь до музыки и включает её*/
	function set_music(path){
		if(current_music_path===path)return;
		if(current_music){
			current_music.pause();
			current_music=null;
		}
		current_music=new Audio(path);
		current_music.volume=music_volume;
		current_music.loop=true;
		current_music_path=path;
		if(audio_initialized){
			current_music.play().catch(handle_play_error);
		}
		print_to_chat(window.language.notifications.current_music(path));
	}
	/*выводит сообщение об ошибке в случае её возникновения*/
	function handle_play_error(error){
		console.error('Playback error:',error);
	}
	/*устанавливает громкость*/
	function set_volume(volume){
		music_volume=Math.max(0,Math.min(1,volume));
		if(current_music)current_music.volume=music_volume;
	}
	/*меняет текст кастомной кнопки*/
	function change_button_text(button,text){
		button.querySelector('#frame_content').innerHTML=get_transparent_space_text(text);
	}
	/*ожидает пользовательский ввод и возвращает promise*/
	window.ignored_keys=['F11','F12'];
	function wait_user_input(){
		return new Promise((resolve)=>{
			let handler=(e)=>{
				if(!window.ignored_keys.includes(e.code)){
					e.preventDefault();
					document.removeEventListener('keydown',handler);
					document.removeEventListener('mousedown',handler);
					document.removeEventListener('wheel',handler);
					if(e.type==='keydown'){
						if(window.settings.control.bind_to_layout){
							resolve(e.key);
						}else{
							resolve(e.code);
						}
					}else if(e.type==='mousedown'){
						resolve(`mouse${e.button}`);
					}else if(e.type==='wheel') {
						resolve(e.deltaY<0?'WheelUp':'WheelDown');
					}
				}
			};
		document.addEventListener('keydown',handler);
		document.addEventListener('mousedown',handler);
		document.addEventListener('wheel',handler);
		});
	}
	/*принимает список и возвращает случайный элемент*/
	function get_random_element(list){
		return list[Math.floor(Math.random()*list.length)];
	}
	/*устанавливает случайный сплеш*/
	function apply_random_splash(){
		window.splash=get_random_element(window.language.splashes);
	}
	/*очищает сцену pixijs*/
	function clear_pixijs(stage=app.stage){
		stage.removeChildren();
		current_sky_path=null;
	}
	/*отслеживает нажатия и отжатия клавиш*/
	window.pressed=new Set();
	window.activated_actions=new Set();
	function update_activated_actions(){
		window.activated_actions.clear();
		Object.entries(window.settings.control).forEach(([control_id,control])=>{
			if(control_id!='bind_to_layout'){
				for(let key of control){
					if(window.pressed.has(key)){
						window.activated_actions.add(control_id);
						break;
					}
				}
			}
		});
	}
	function setup_input_tracker(){
		let getKey=(e)=>{
			if(e.type.startsWith('key')){
				return window.settings.control.bind_to_layout?e.key:e.code;
			}else if(e.type.startsWith('mouse')&&e.type!=='wheel'){
				return`mouse${e.button}`;
			}else if(e.type==='wheel'){
				return e.deltaY<0?'WheelUp':'WheelDown';
			}
		};
		let handleEvent=(e)=>{
			if(!e.repeat){/*Отключаем автоповтор*/
				if(!window.ignored_keys.includes(e.code)){
					let key=getKey(e);
					if(e.type==='keydown'||e.type==='mousedown'||e.type==='wheel'){
						window.pressed.add(key);
					}else{
						window.pressed.delete(key);
					}
					update_activated_actions();
				}
			}
		};
		document.addEventListener('keydown',handleEvent);
		document.addEventListener('keyup',handleEvent);
		document.addEventListener('mousedown',handleEvent);
		document.addEventListener('mouseup',handleEvent);
		document.addEventListener('wheel', handleEvent);
		return{
			stop_tracking:()=>{
				document.removeEventListener('keydown',handleEvent);
				document.removeEventListener('keyup',handleEvent);
				document.removeEventListener('mousedown',handleEvent);
				document.removeEventListener('mouseup',handleEvent);
				document.removeEventListener('wheel', handleEvent);
			}
		};
	}
	/*отрисовывает текст в symbols_grid*/
	function print_text_to_symbols_grid(text,x,y,color=0xFFFFFF){
		x=Math.floor(x);
		y=Math.floor(y);
		let current_x=x,current_y=y;
		for(let symbol of text){
			if(current_x>=0&&current_x<symbols_grid[0].length&&current_y>=0&&current_y<symbols_grid.length){
				let pixi_symbol=symbols_grid[current_y][current_x];
				pixi_symbol.text=symbol;
				pixi_symbol.tint=color;
			}
			if(symbol=='\n'){
				current_x=x;
				current_y++;
			}
			else{
				current_x++;
			}
		}
	}
	/*превращает текст в коллайдер в зависимости от размера шрифта*/
	function text_to_collider(text,void_symbols=['',' ']){
		let lines=text.split("\n"),collider=[];
		for(let line of lines){
			let temp_row=[];
			for(let char of line){
				temp_row.push(...Array(logical_symbol_size).fill(!void_symbols.includes(char)));
			}
			for(let y=0;y<logical_symbol_size;y++){
				collider.push([...temp_row]);
			}
		}
		return collider;
	}
	/*очищает symbols_grid*/
	function clear_symbols_grid(){
		for(let y=0;y<symbols_grid.length;y++){
			for(let x=0;x<symbols_grid[y].length;x++){
				symbols_grid[y][x].text='';
				symbols_grid[y][x].backgroundColor=0x00000000;
			}
		}
	}
	/*выполняет скрипт*/
	async function load_script(path) {
        try {
            // Создаем модульный скрипт
            const script = document.createElement('script');
            script.src = path;
            script.type = 'text/javascript';
            
            // Ждем загрузки скрипта
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
            
            console.log(`Script loaded: ${path}`);
        } catch (error) {
            console.error(`Failed to load script: ${path}`, error);
        }
    }
	/*переводит логические координаты в координаты на экране*/
	function logical_to_screen(num){
		return num/logical_symbol_size*symbol_size;
	}
	/*настройки камеры*/
	function focus_camera_on_player(){
		save.room.data.camera=[logical_to_screen(save.player.coordinates[0])-(Math.floor(columns/2)*symbol_size),logical_to_screen(save.player.coordinates[1])-(Math.floor(rows/2)*symbol_size)];
	}
	/*расчет коллайдеров*/
	function update_player_collider(){
		save.player.collider=[[save.player.coordinates[0],save.player.coordinates[1]],[save.player.coordinates[0]+logical_symbol_size,save.player.coordinates[1]+logical_symbol_size]];
	}
	/*расчет коллизии*/
	let nothing_below,nothing_left,nothing_right,nothing_higher;
	function update_collision(ground_collider=save.room.data.ground.collider){
		update_player_collider();
		nothing_below=true;
		nothing_left=true;
		nothing_right=true;
		nothing_higher=true;
		for(let y=save.player.collider[0][1];y<save.player.collider[1][1];y++){
			for(let x=save.player.collider[0][0];x<save.player.collider[1][0];x++){
				let coordinates=[x,y+1];
				if(coordinates.every(num=>num>=0)){
					try{
						if(ground_collider[coordinates[1]][coordinates[0]]){
							nothing_below=false;
						}
					}catch{}
				}
				coordinates=[x,y-1];
				if(coordinates.every(num=>num>=0)){
					try{
						if(ground_collider[coordinates[1]][coordinates[0]]){
							nothing_higher=false;
						}
					}catch{}
				}
				coordinates=[x+1,y];
				if(coordinates.every(num=>num>=0)){
					try{
						if(ground_collider[coordinates[1]][coordinates[0]]){
							nothing_right=false;
						}
					}catch{}
				}
				coordinates=[x-1,y];
				if(coordinates.every(num=>num>=0)){
					try{
						if(ground_collider[coordinates[1]][coordinates[0]]){
							nothing_left=false;
						}
					}catch{}
				}
			}
		}
	}
	/*устанавливает рамку на активный слот хотбара*/
	function update_active_hotbar_slot_frame(){
		let active_hotbar_slot_frame=document.getElementById('active_hotbar_slot_frame');
		if(!active_hotbar_slot_frame){
			active_hotbar_slot_frame=create_element_from_HTML(`<img id="active_hotbar_slot_frame" src="images/interface/inventory/active_slot_frame.png"/>`);
		}
		document.querySelector(`.hotbar_slot[data-index="${save.player.interface.hotbar.active_slot_index}"]`).appendChild(active_hotbar_slot_frame);
	}
	/*генерирует хотбар*/
	function generate_hotbar(){
		let hotbar=create_element_from_HTML(`<div id="hotbar" class="row"></div>`);
		for(let i=0;i<save.player.interface.hotbar.slot_count;i++){
			let slot=document.createElement('div');
			slot.dataset.index=i;
			slot.classList.add('hotbar_slot');
			slot.addEventListener('click',function(e){
				save.player.interface.hotbar.active_slot_index=this.dataset.index;
				update_active_hotbar_slot_frame();
			});
			hotbar.appendChild(slot);
		}
		return hotbar;
	}
	function generate_esc_menu(){
		let esc_menu=create_element_from_HTML(`<div id="esc_menu"></div>`);
		let button_to_main_menu=create_button_from_text(window.language.interface.buttons.to_main_menu);
		button_to_main_menu.addEventListener('click',()=>{
			if(confirm(language.confirms.is_need_save)){
				save_as_json(save,`${1e16-Date.now()} - CODERROR ${window.version} save.json`);
			}
			change_room('main_menu');
		});
		button_to_main_menu.id='button_to_main_menu';
		esc_menu.appendChild(button_to_main_menu);
		return esc_menu;
	}
	/*генерирует интерфейс*/
	function update_interface(){
		interface.innerHTML='';
		interface.appendChild(generate_hotbar());
		update_active_hotbar_slot_frame();
		interface.appendChild(generate_esc_menu());
	}
	/*включает/отключает интерфейс*/
	function set_interface_visibility(is_visible){
		if(is_visible){
			interface.style.visibility='visible';
		}else{
			interface.style.visibility='collapse';
		}
	}
	/*активирует прошлый слот хотбара*/
	function activate_previous_hotbar_slot(){
		save.player.interface.hotbar.active_slot_index--;
		if(save.player.interface.hotbar.active_slot_index<0){
			save.player.interface.hotbar.active_slot_index=save.player.interface.hotbar.slot_count-1;
		}
		update_active_hotbar_slot_frame();
	}
	/*активирует следующий слот хотбара*/
	function activate_next_hotbar_slot(){
		save.player.interface.hotbar.active_slot_index++;
		if(save.player.interface.hotbar.active_slot_index>=save.player.interface.hotbar.slot_count){
			save.player.interface.hotbar.active_slot_index=0;
		}
		update_active_hotbar_slot_frame();
	}
	/*завершить подготовку комнаты*/
	let loadable_save_data=null;
	function finish_preparation(){
		save.room.preparation=false;
		if(loadable_save_data){
			save=loadable_save_data;
			loadable_save_data=null;
			update_interface();
		}
	}
	/*загружает сохранение*/
	function load_save(data){
		loadable_save_data=data;
		change_room(data.room.id);
	}
	/*финальная настройка*/
	document.addEventListener('contextmenu',(e)=>{
		e.preventDefault();/*отключаем контекстные меню глобально. я сам ими пользовался для вызова консоли, но они могут помешать игре, если что-то забинжено на правую кнопку мыши*/
	});
	change_room('disclaimer');
	apply_settings();
	let input_tracker=setup_input_tracker();
	let logical_symbol_size=16;
	update_size();
    
	/*загрузка цикла физики*/
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
            }
            rotate_sky(0.005,0.01,0);
        }
        if(save.room.id=='room_editor'){
            if(save.room.preparation){
                set_interface_visibility(true);
                clear_symbols_grid();
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
        if(save.room.preparation){
            finish_preparation();
        }
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

    /*загрузка цикла отрисовки*/
    app.ticker.add(()=>{
	/*обновление канваса three*/
	update_three_scene();
	/*кнопки интекрфейса игрока*/
	let button_to_main_menu=document.getElementById('button_to_main_menu');
	if(check_hover(button_to_main_menu)){
		change_button_color(button_to_main_menu,get_random_true_str_color());
	}
	else{
		change_button_color(button_to_main_menu,'#fff');
	}
	/*комнаты*/
	if(save.room.id=='main_menu'){
		if(!save.room.preparation){
			//console.log(app.renderer.gl.getContextAttributes());//удалить
			visual_effect(0);
			save.room.data.logo.firstChild.style.color=get_random_true_str_color();
			Object.entries(save.room.data.buttons).forEach(([name,el])=>{
				if(name=='exit'){
					el.style.marginLeft=`calc(var(--symbol_size) * ${-0.5+Math.floor(Math.random()*2)})`;
					if(check_hover(el)){
						visual_effect(1);
						save.room.data.bug_counter=100;
					}
					else{
						if(save.room.data.bug_counter<=0){
							visual_effect(2);
						}
						else{
							save.room.data.bug_counter--;
						}
					}
				}
				else{
					if(check_hover(el)){
						change_button_color(el,get_random_true_str_color());
					}
					else{
						change_button_color(el,'#fff');
					}
				}
			});
		}
	}
	if(save.room.id=='authors'){
		if(!save.room.preparation){
			visual_effect(0);
			if(check_hover(save.room.data.buttons.back)){
				change_button_color(save.room.data.buttons.back,get_random_true_str_color());
			}
			else{
				change_button_color(save.room.data.buttons.back,'#fff');
			}
		}
	}
	if(save.room.id=='settings'){
		if(!save.room.preparation){
			visual_effect(0);
			if(check_hover(save.room.data.drop_zone)){
				change_button_border_color(save.room.data.drop_zone,'#f0f');
			}
			else{
				change_button_border_color(save.room.data.drop_zone,'#fff');
			}
			Object.entries(save.room.data.buttons).forEach(([name,el])=>{
				if(check_hover(el)){
					change_button_color(el,get_random_true_str_color());
				}
				else{
					change_button_color(el,'#fff');
				}
			});
		}
	}
	if(save.room.id=='continue'){
		if(!save.room.preparation){
			visual_effect(0);
			if(check_hover(save.room.data.drop_zone)){
				change_button_border_color(save.room.data.drop_zone,'#f0f');
			}
			else{
				change_button_border_color(save.room.data.drop_zone,'#fff');
			}
			Object.entries(save.room.data.buttons).forEach(([name,el])=>{
				if(check_hover(el)){
					change_button_color(el,get_random_true_str_color());
				}
				else{
					change_button_color(el,'#fff');
				}
			});
		}
	}
	if(save.room.id=='recycle_bin'){
		if(!save.room.preparation){
			/*очистка*/
			clear_symbols_grid();
			focus_camera_on_player();
			/*отрисовка карты*/
			print_text_to_symbols_grid(save.room.data.ground.text,0-save.room.data.camera[0]/symbol_size,0-save.room.data.camera[1]/symbol_size);
			/*расчет скина игрока*/
			let fractional=[false,false];
			for(let i=0;i<=1;i++){
				if(save.player.coordinates[i]/logical_symbol_size!=Math.floor(save.player.coordinates[i]/logical_symbol_size)){
					fractional[i]=true;
				}
			}
			let player_skin='';
			if(fractional[0]){
				if(fractional[1]){
					player_skin='▗▖\n▝▘';
				}else{
					player_skin='▐▌';
				}
			}else{
				if(fractional[1]){
					player_skin='▄\n▀';
				}else{
					player_skin='█';
				}
			}
			/*отрисовка игрока*/
			focus_camera_on_player();
			let rendering_coordinates=[logical_to_screen(save.player.coordinates[0])-save.room.data.camera[0],logical_to_screen(save.player.coordinates[1])-save.room.data.camera[1]];
			if(fractional[0]){
				rendering_coordinates[0]--;
			}
			if(fractional[1]){
				rendering_coordinates[1]--;
			}
			print_text_to_symbols_grid(player_skin,rendering_coordinates[0]/symbol_size,rendering_coordinates[1]/symbol_size);
		}
	}
});
}).catch(console.error);