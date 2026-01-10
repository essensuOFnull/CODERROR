{
let d=window.CODERROR.__originals__.data;

window.CODERROR.__originals__.functions={
/**инициализирует камеру three*/
init_three_camera:function(){
	d.three_camera=new THREE.PerspectiveCamera(
		50,
		d.wrapper.clientWidth/d.wrapper.clientHeight,
		0.1,
		1000
	);
	d.three_camera.position.z=1;/*Камера внутри куба*/
},
/**создаёт материалы*/
create_skybox_materials:function(path_part,extension,is_sphere) {
	let sides = ['right','left','top','bottom','front','back'];
	if(is_sphere){
		return sides.map(side => {
			let texture=d.texture_loader.load(
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
			let texture=d.texture_loader.load(
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
},
/**устанавливает небо*/
set_sky:function(path_part,extension,is_sphere=false) {
	let new_sky_path=`${path_part}/.${extension}`;
	if(new_sky_path==d.current_sky_path)return
	/*Удаляем старый skybox с освобождением ресурсов*/
	if(d.skybox){
		d.three_scene.remove(d.skybox);
		/*Освобождаем геометрию*/
		if(d.skybox.geometry){
			d.skybox.geometry.dispose();
		}
		/*Освобождаем материалы*/
		if(Array.isArray(d.skybox.material)){
			d.skybox.material.forEach(material=>{
				if(material.map)material.map.dispose();
				material.dispose();
			});
		}else if(d.skybox.material){
			if(d.skybox.material.map)d.skybox.material.map.dispose();
			d.skybox.material.dispose();
		}
	}
	/*Создаем новые материалы с обработкой ошибок*/
	try{
		let geometry=new THREE.BoxGeometry(5, 5, 5);
		let materials=f.create_skybox_materials(path_part,extension,is_sphere);
		d.skybox=new THREE.Mesh(geometry, materials);
		d.three_scene.add(d.skybox);
	}catch(error){
		console.error('Error creating d.skybox:',error);
	}
	d.current_sky_path=new_sky_path;
},
/**Инициализация текстуры и спрайта*/
init_three_scene:function(){
	d.background_texture=PIXI.Texture.from(d.three_renderer.domElement);
	d.background_texture.baseTexture.autoUpdate=false;
	d.background_sprite=new PIXI.Sprite(d.background_texture);
	// Устанавливаем размер спрайта
	d.background_sprite.width=d.wrapper.clientWidth;
	d.background_sprite.height=d.wrapper.clientHeight;
	d.app.stage.addChildAt(d.background_sprite,0);
},
/**Функция обновления сцены three*/
update_three_scene:function(){
	/*Обновляем Three.js сцену*/
	d.three_renderer.render(d.three_scene,d.three_camera);
	/*Принудительное обновление текстуры в PixiJS*/
	d.background_texture.baseTexture.update();
},
rotate_sky:function(x,y,z){
	if(!d.skybox)return;
	d.skybox.rotation.x+=x;
	d.skybox.rotation.y+=y;
	d.skybox.rotation.z+=z;
},
set_sky_rotation:function(x,y,z){
	if(!d.skybox)return;
	d.skybox.rotation.set(x,y,z);
},
print_to_chat:function(message){
	let message_element=f.create_element_from_HTML(`<div>${message}</div>`);
	message_element.classList.add('message');
	d.chat_preview.appendChild(message_element);
	message_element.addEventListener('animationend',()=>{
		message_element.remove();
	});
},
change_room:function(room,preparation=true,reset_overlay=true){
	_.set(d,`save.world.players.${d.save.player.nickname}.position.room_id`,room);
	_.set(d,'save.temp.room.preparation',preparation);
	if(!reset_overlay)return
	d.overlay.innerHTML=``;
},
/**инициализирует матрицу символов*/
init_symbols_grid:function(){
	d.symbols_grid=[];
	d.columns=0;
	d.rows=0;
	f.set_font_size(d.symbol_size||16);
},
/**обновляет размеры матрицы символов*/
update_symbols_grid:function(){
	let newColumns=Math.ceil(d.app.renderer.width/d.symbol_size);
	let newRows=Math.ceil(d.app.renderer.height/d.symbol_size);
	/*Ресайз существующей сетки*/
	if(newColumns===d.columns&&newRows===d.rows)return
	/*Удаляем лишние строки*/
	if(newRows<d.rows){
		for(let y=newRows;y<d.rows;y++){
			for(let x=0;x<d.columns;x++){
				d.symbols_grid[y][x].destroy({children:true});
			}
		}
		d.symbols_grid.length=newRows;
	}
	/*Добавляем новые строки*/
	if(newRows>d.rows){
		for(let y=d.rows;y<newRows;y++){
			d.symbols_grid[y]=[];
			for(let x=0;x<Math.max(d.columns,newColumns);x++){
				let symbol=new PIXI.Text('',d.pixi_text_style);
				symbol.resolution=20;
				symbol.position.set(x*d.symbol_size,y*d.symbol_size);
				d.app.stage.addChild(symbol);
				d.symbols_grid[y][x]=symbol;
			}
		}
	}
	/*Обновляем колонки в каждой строке*/
	for(let y=0;y<newRows;y++){
		/*Удаляем лишние колонки*/
		if(newColumns<d.columns) {
			for(let x=newColumns;x<d.columns;x++){
				if(d.symbols_grid[y][x]){
					d.symbols_grid[y][x].destroy({children:true});
				}
			}
			d.symbols_grid[y].length=newColumns;
		}
		/*Добавляем новые колонки*/
		if(newColumns>d.columns){
			for(let x=d.columns;x<newColumns;x++){
				let symbol=new PIXI.Text('',d.pixi_text_style);
				symbol.resolution=20;
				symbol.position.set(x*d.symbol_size,y*d.symbol_size);
				d.app.stage.addChild(symbol);
				d.symbols_grid[y][x]=symbol;
			}
		}
	}
	d.columns=newColumns;
	d.rows=newRows;
},
set_font_size:function(size_in_pixels){
	d.symbol_size=size_in_pixels;
	d.styleSheet.insertRule(":root{--symbol_size:"+d.symbol_size+"px !important;}",d.styleSheet.cssRules.length);
	d.pixi_text_style=new PIXI.TextStyle({
		fontFamily:'CODERROR',
		fontSize:d.symbol_size,
		trim:false,
		fill:0xFFFFFF,
	});
	f.update_symbols_grid();
},
update_size:function() {
	/*Получаем актуальные размеры контейнера*/
	let width=d.wrapper.clientWidth;
	let height=d.wrapper.clientHeight;
	/*Обновляем размеры рендерера PixiJS*/
	d.app.renderer.resize(width,height);
	f.update_symbols_grid();
	/*Обновляем способ масштабирования изображений*/
	d.styleSheet.insertRule(`:root{--image_rendering:${window.devicePixelRatio>=1?'pixelated':'auto'} !important;}`,d.styleSheet.cssRules.length);
	/*Обновляем Three.js камеру и рендерер*/
	d.three_camera.aspect=width/height;
	d.three_camera.updateProjectionMatrix();
	d.three_renderer.setSize(width,height);
	/*Обновляем размер спрайта PixiJS*/
	if(d.background_sprite){
		d.background_sprite.width=width;
		d.background_sprite.height=height;
	}
	/*Принудительно обновляем текстуру*/
	f.update_three_scene();
	d.app.stage.removeChild(d.background_sprite);
	f.init_three_scene();
},
visual_effect:function(number){
	/*заполняет случайными символами*/
	if(number==0){
		for(let y=0;y<d.symbols_grid.length;y++){
			for(let x=0;x<d.symbols_grid[y].length;x++){
				let symbol=d.symbols_grid[y][x];
				symbol.text=f.get_random_char();
				symbol.tint=f.get_random_color();
			}
		}
	}
	/*случайно поворачивает символы*/
	if(number==1){
		for(let y=0;y<d.symbols_grid.length;y++){
			for(let x=0;x<d.symbols_grid[y].length;x++){
				let symbol=d.symbols_grid[y][x];
				symbol.anchor.set(Math.random());
				symbol.rotation=Math.random();
			}
		}
	}
	/*откатывает предыдущий*/
	if(number==2){
		for(let y=0;y<d.symbols_grid.length;y++){
			for(let x=0;x<d.symbols_grid[y].length;x++){
				let symbol=d.symbols_grid[y][x];
				symbol.anchor.set(0);
				symbol.rotation=0;
			}
		}
	}
},
init_printable_symbols:function(){
	d.printable_symbols='';
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
			d.printable_symbols+=String.fromCodePoint(codePoint);
		}
	}
},
get_random_char:function(){
	return d.printable_symbols[Math.floor(Math.random()*99)];
},
get_random_color:function(){
	return Math.floor(Math.random()*0xFFFFFF);
},
generate_favicon:function(){
	/*Очищаем холст*/
	d.favicon.ctx.clearRect(0,0,d.favicon.size,d.favicon.size);
	/*Настройки текста*/
	d.favicon.ctx.fillStyle=`#${f.get_random_color().toString(16).padStart(6,'0')}`;
	/*Рисуем символ*/
	d.favicon.ctx.fillText(f.get_random_char(),d.favicon.size/2,d.favicon.size/2);
	/*Обновляем иконку*/
	d.favicon.canvas.toBlob(blob=>{
		d.favicon.link.href=URL.createObjectURL(blob);
	},'image/png');
},
/**функция генерации кода разметки pre с отсутствием фона у пробелов*/
get_transparent_space_text:function(text,color='#fff',background='#000'){
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
},
/**принимает разметку, возвращает полноценный элемент*/
create_element_from_HTML:function(html){
	let template=document.createElement('template');
	template.innerHTML=html.trim();
	let fragment=template.content;
	/*Проверяем, есть ли ровно один дочерний элемент*/
	if(fragment.childNodes.length===1&&fragment.firstChild.nodeType===Node.ELEMENT_NODE){
		return fragment.firstChild;
	}
	/*Создаём контейнер с display: contents*/
	let container=document.createElement('div');
	container.style.display='contents';
	/*Перемещаем все узлы из фрагмента в контейнер*/
	while(fragment.firstChild){
		container.appendChild(fragment.firstChild);
	}
	return container;
},
/**возвращает один из ИСТИНЫХ цветов*/
get_random_true_str_color:function(){
	return f.get_random_element(['#000','#00f','#0f0','#0ff','#f00','#f0f','#ff0','#fff']);
},
/**увеличивает z-index на 1*/
increment_z_index:function(element){
	element.style.zIndex=parseInt(element.style.zIndex||0)+1+'';
},
/**оборачивает элемент в кнопку с символьной рамкой*/
wrap_in_frame:function(content,container_type='<button/>',removable=false) {
	let button = f.create_element_from_HTML(container_type);
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
		b=f.create_element_from_HTML(`<pre><button style='color:inherit'>X</button></pre>`);/*костыль*/
		b.addEventListener('click',()=>{
			button.remove();
		});
	}
	else{
		b=f.create_element_from_HTML(`<pre>.</pre>`);
	}
	let elements={
		a:f.create_element_from_HTML(`<pre>+</pre>`),
		b:b,
		c:document.createElement('div'),
		d:f.create_element_from_HTML(`<pre>\`</pre>`),
		e:f.create_element_from_HTML(`<pre>'</pre>`)
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
	f.increment_z_index(grid);
	let horizontal=`<pre style="position:absolute;white-space:nowrap;color:inherit;">${'-'.repeat(666)}</pre>`
	let vertical=`<pre style="position:absolute;white-space:nowrap;color:inherit;">${'|<br>'.repeat(444)}</pre>`
	let top=f.create_element_from_HTML(horizontal);
	top.style.top=0;
	top.style.left=0;
	let bottom=f.create_element_from_HTML(horizontal);
	bottom.style.bottom=0;
	bottom.style.left=0;
	let left=f.create_element_from_HTML(vertical);
	left.style.top=0;
	left.style.left=0;
	let right=f.create_element_from_HTML(vertical);
	right.style.top=0;
	right.style.right=0;
	button.appendChild(top);
	button.appendChild(bottom);
	button.appendChild(left);
	button.appendChild(right);
	return button;
},
/**создает кнопку на основе текста*/
create_button_from_text:function(text,removable=false){
	return f.wrap_in_frame(f.create_element_from_HTML(f.get_transparent_space_text(text)),'<button/>',removable);
},
/**меняет цвет рамки кнопки*/
change_button_border_color:function(button,color){
	button.style.color=color;
},
/**меняет цвет текста кнопки*/
change_button_text_color:function(button,color){
	let targetElement=button.querySelector('#frame_content');
	let firstChild=targetElement.firstElementChild;
	if(firstChild){
		firstChild.style.color=color;
	}else{
		console.log('У элемента нет дочерних элементов.');
	}
},
/**меняет цвет рамки и текста кнопки*/
change_button_color:function(button,color){
	f.change_button_border_color(button,color);
	f.change_button_text_color(button,color);
},
/**проверяет перетаскивают ли файл над объектом*/
check_dragover:function(element){
	if (!element.__dragoverHandlersAdded){
		let handlers={
			dragenter:(event)=>{
				event.preventDefault();
				if(!d.dragover_states.get(element)){
					element.classList.add('dragover');
					d.dragover_states.set(element,true);
				}
			},
			dragover:(event)=>{
				event.preventDefault();
				if(!d.dragover_states.get(element)){
					element.classList.add('dragover');
					d.dragover_states.set(element,true);
				}
			},
			dragleave:(event)=>{
				if(!event.relatedTarget||!element.contains(event.relatedTarget)){
					element.classList.remove('dragover');
					d.dragover_states.set(element,false);
				}
			},
			drop:(event)=>{
				event.preventDefault();
				element.classList.remove('dragover');
				d.dragover_states.set(element,false);
			}
		};
		element.addEventListener('dragenter',handlers.dragenter);
		element.addEventListener('dragover',handlers.dragover);
		element.addEventListener('dragleave',handlers.dragleave);
		element.addEventListener('drop',handlers.drop);
		element.__dragoverHandlersAdded=true;
		Object.assign(element,{__dragoverHandlers:handlers});
	}
	return d.dragover_states.get(element)||false;
},
/**проверяет наведена ли мышь на элемент*/
check_hover:function(element){
	return(element.matches(':hover')||f.check_dragover(element));
},
/**возвращает новый br элемент*/
get_br:function(){
	return document.createElement('br');
},
/**превращает json файл в объект (требует async await)*/
json_to_dict:function(file){
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
},
/**превращает много json в объекты за раз*/
jsons_to_dict_list:async function(files){
	let data=[];
	for(let file of files){
		let parsed=await f.json_to_dict(file);
		data.push(parsed);
	}
	return data;
},
/**создаёт кастомные обработчики событий*/
add_event_listener:function(name,element,function_part){
	/*Удаляем старые обработчики перед добавлением новых*/
	f.remove_event_listener(name,element);
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
				let dicts=await f.jsons_to_dict_list(e.dataTransfer.files);
				let merged=_.merge({},...dicts);
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
				let dicts=await f.jsons_to_dict_list(files);
				let merged=_.merge({},...dicts);
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
		d.event_handlers.set(element,{
			name,
			handlers,
			elements:{jsonInput}
		});
	}
},
/**удаляет кастомные обработчики событий*/
remove_event_listener:function(name,element){
	let stored=d.event_handlers.get(element);
	if(!stored||stored.name!==name)return
	/*Удаляем все обработчики событий*/
	element.removeEventListener('drop',stored.handlers.drop);
	element.removeEventListener('click',stored.handlers.click);
	stored.elements.jsonInput.removeEventListener('change',stored.handlers.change);
	/*Удаляем созданный input из DOM если был добавлен*/
	if(document.body.contains(stored.elements.jsonInput)){
		document.body.removeChild(stored.elements.jsonInput);
	}
	d.event_handlers.delete(element);
},
/**создает hr из -*/
get_symbolic_hr:function(){
	return f.create_element_from_HTML(`<div class='symbolic_hr'><pre>${'-'.repeat(666)}</pre></div>`);
},
/**принимает список названий языков и применяет их (чем больше индекс, тем выше приоритет)*/
apply_language:function(name_list){
	name_list=['default'].concat(name_list);
	let languages_list=[];
	for(name of name_list){
		languages_list.push(d.languages[name]);
	}
	d.language=_.merge({},...languages_list);
},
/**принимает словарь текста и превращает его в кнопки*/
dict_to_buttons:function(dict){
	let buttons=structuredClone(dict);
	for(let key in buttons){
		buttons[key]=f.create_button_from_text(buttons[key]);
	}
	return buttons;
},
/**устанавливает ограничение максимального размера содержимого игры, "100%" отключает ограничение*/
set_max_content_size:function(max_width,max_height){
	d.wrapper.style.width=`min(100%,${max_width})`;
	d.wrapper.style.height=`min(100%,${max_height})`;
	f.update_size();
},
/**принимает select и список и устанавливает ему эти значения*/
set_select_options:function(selectElement,options) {
	selectElement.innerHTML='';
	options.forEach(optionText=>{
		let option=document.createElement('option');
		option.textContent=optionText;// Задаем текст отображения
		selectElement.appendChild(option);
	});
},
/**создает select с рамкой*/
create_select_with_frame:function(options,removable=false){
	let select=f.create_element_from_HTML('<select/>');
	f.set_select_options(select,options);
	select.style.margin='calc(-1 * var(--symbol_size))';
	select.style.padding='var(--symbol_size)';
	select.style.marginRight='0';
	select.style.cursor='pointer';
	select.style.background='#00000000';
	let frame=f.wrap_in_frame(select,`<button style='background:#000;'/>`,removable);
	frame.style.pointerEvents='none';
	return[frame,select];
},
/**создает прозрачный пробел для горизонтального отступа*/
get_space:function(){
	return f.create_element_from_HTML(`<pre style='background:#00000000'> </pre>`);
},
/**превращает объект в строку*/
object_to_string:function(object){
	return JSON.stringify(object);
},
/**Функция для сохранения объекта как JSON файл*/
save_as_json:function(data,filename){
	/*Преобразуем объект в JSON строку*/
	let jsonString=f.object_to_string(data);
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
	alert(d.language.alerts.file_saved(filename));
},
/**удаляет из списка повторяющиеся значения, оставляя в нём только их последние вхождения*/
remove_duplicates:function(arr){
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
},
/**применяет к игре настройки из d.settings*/
apply_settings:function(){
	f.apply_language(d.settings.interface.language);
	f.set_volume(d.settings.audio.music_volume);
	f.apply_random_splash();
	/*set_font_size(d.settings.interface.font_size);*/
	f.set_max_content_size(d.settings.interface.max_content_width,d.settings.interface.max_content_height);
	f.change_room(d.save.world.players[d.save.player.nickname].position.room_id);
},
/**создает textarea с рамкой*/
create_textarea_with_frame:function(placeholder='',removable=false){
	let textarea=f.create_element_from_HTML('<textarea/>');
	textarea.style.cursor='pointer';
	textarea.style.background='#00000000';
	textarea.placeholder=placeholder;
	let frame=f.wrap_in_frame(textarea,`<button style='background:#000;'/>`,removable);
	frame.addEventListener('click',(e)=>{
		textarea.focus();
	})
	return[frame,textarea];
},
/**для того чтобы музыка начинала проигрываться после нажатия на любое место страницы*/
init_audio:function(){
	if(d.audio_initialized)return;
	d.audio_initialized=true;
	document.removeEventListener('click',f.init_audio);
	if(!d.current_music)return
	d.current_music.play().catch(f.handle_play_error);
},
/**принимает путь до музыки и включает её*/
set_music:function(path){
	if(d.current_music_path===path)return;
	if(d.current_music){
		d.current_music.pause();
		d.current_music=null;
	}
	d.current_music=new Audio(path);
	d.current_music.volume=d.music_volume;
	d.current_music.loop=true;
	d.current_music_path=path;
	if(d.audio_initialized){
		d.current_music.play().catch(f.handle_play_error);
	}
	f.print_to_chat(d.language.notifications.current_music(path));
},
/**выводит сообщение об ошибке вывода музыки в случае её возникновения*/
handle_play_error:function(error){
	console.error('Playback error:',error);
},
/**устанавливает громкость*/
set_volume:function(volume){
	d.music_volume=Math.max(0,Math.min(1,volume));
	if(d.current_music)d.current_music.volume=d.music_volume;
},
/**меняет текст кастомной кнопки*/
change_button_text:function(button,text){
	button.querySelector('#frame_content').innerHTML=f.get_transparent_space_text(text);
},
/**ожидает пользовательский ввод и возвращает promise*/
wait_user_input:function(){
	return new Promise((resolve)=>{
		let handler=(e)=>{
			if(d.ignored_keys.includes(e.code))return
			e.preventDefault();
			document.removeEventListener('keydown',handler);
			document.removeEventListener('mousedown',handler);
			document.removeEventListener('wheel',handler);
			if(e.type==='keydown'){
				if(d.settings.control.bind_to_layout){
					resolve(e.key);
				}else{
					resolve(e.code);
				}
			}else if(e.type==='mousedown'){
				resolve(`mouse${e.button}`);
			}else if(e.type==='wheel') {
				resolve(e.deltaY<0?'WheelUp':'WheelDown');
			}
		};
	document.addEventListener('keydown',handler);
	document.addEventListener('mousedown',handler);
	document.addEventListener('wheel',handler);
	});
},
/**принимает список и возвращает случайный элемент*/
get_random_element:function(list){
	return list[Math.floor(Math.random()*list.length)];
},
/**устанавливает случайный сплеш*/
apply_random_splash:function(){
	d.splash=f.get_random_element(d.language.splashes);
},
/**очищает сцену pixijs*/
clear_pixijs:function(stage=d.app.stage){
	stage.removeChildren();
	d.current_sky_path=null;
},
/**отслеживает нажатия и отжатия клавиш*/
update_activated_actions:function(){
	d.activated_actions.clear();
	Object.entries(d.settings.control).forEach(([control_id,control])=>{
		if(control_id!='bind_to_layout'){
			for(let key of control){
				if(d.pressed.has(key)){
					d.activated_actions.add(control_id);
					break;
				}
			}
		}
	});
},
setup_input_tracker:function(){
	let getKey=(e)=>{
		if(e.type.startsWith('key')){
			return d.settings.control.bind_to_layout?e.key:e.code;
		}else if(e.type.startsWith('mouse')&&e.type!=='wheel'){
			return`mouse${e.button}`;
		}else if(e.type==='wheel'){
			return e.deltaY<0?'WheelUp':'WheelDown';
		}
	};
	let handleEvent=(e)=>{
		if(e.repeat||d.ignored_keys.includes(e.code))return/*Отключаем автоповтор*/
		let key=getKey(e);
		if(e.type==='keydown'||e.type==='mousedown'||e.type==='wheel'){
			d.pressed.add(key);
		}else{
			d.pressed.delete(key);
		}
		f.update_activated_actions();
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
},
/**отрисовывает текст в d.symbols_grid*/
print_text_to_symbols_grid:function(text,x,y,color=0xFFFFFF){
	x=Math.floor(x);
	y=Math.floor(y);
	let current_x=x,current_y=y;
	for(let symbol of text){
		if(current_x>=0&&current_x<d.symbols_grid[0].length&&current_y>=0&&current_y<d.symbols_grid.length){
			let pixi_symbol=d.symbols_grid[current_y][current_x];
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
},
/**превращает текст в коллайдер в зависимости от размера шрифта*/
text_to_collider:function(text,void_symbols=['',' ']){
	let lines=text.split("\n"),collider=[];
	for(let line of lines){
		let temp_row=[];
		for(let char of line){
			temp_row.push(...Array(d.logical_symbol_size).fill(!void_symbols.includes(char)));
		}
		for(let y=0;y<d.logical_symbol_size;y++){
			collider.push([...temp_row]);
		}
	}
	return collider;
},
/**очищает d.symbols_grid*/
clear_symbols_grid:function(){
	for(let y=0;y<d.symbols_grid.length;y++){
		for(let x=0;x<d.symbols_grid[y].length;x++){
			d.symbols_grid[y][x].text='';
		}
	}
},
/**выполняет скрипт*/
load_script:async function(path) {
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
},
/**переводит логические координаты в координаты на экране*/
logical_to_screen:function(num){
	return num/d.logical_symbol_size*d.symbol_size;
},
/**настройки камеры*/
focus_camera_on_player:function(){
	d.save.temp.camera=[f.logical_to_screen(d.save.world.players[d.save.player.nickname].position.coordinates[0])-(Math.floor(d.columns/2)*d.symbol_size),f.logical_to_screen(d.save.world.players[d.save.player.nickname].position.coordinates[1])-(Math.floor(d.rows/2)*d.symbol_size)];
},
/**расчет коллайдеров*/
update_player_collider:function(){
	d.save.world.players[d.save.player.nickname].position.collider=[[d.save.world.players[d.save.player.nickname].position.coordinates[0],d.save.world.players[d.save.player.nickname].position.coordinates[1]],[d.save.world.players[d.save.player.nickname].position.coordinates[0]+d.logical_symbol_size,d.save.world.players[d.save.player.nickname].position.coordinates[1]+d.logical_symbol_size]];
},
/**расчет коллизии*/
update_collision:function(ground_collider=d.save.temp.ground.collider){
	f.update_player_collider();
	let nickname=d.save.player.nickname,
	touch_wall=`save.world.players.${nickname}.position.touch_wall`,
	collider=`save.world.players.${nickname}.position.collider`;
	_.set(d,touch_wall,{
		/**упирается ли игрок в стену снизу*/
		below:false,
		/**упирается ли игрок в стену слева*/
		left:false,
		/**упирается ли игрок в стену справа*/
		right:false,
		/**упирается ли игрок в стену сверху*/
		higher:false
	});
	for(let y=_.get(d,`${collider}[0][1]`);y<_.get(d,`${collider}[1][1]`);y++){
		for(let x=_.get(d,`${collider}[0][0]`);x<_.get(d,`${collider}[1][0]`);x++){
			// Проверка снизу
			if(_.get(ground_collider,[y+1,x])){
				_.set(d,`${touch_wall}.below`,true);
			}
			// Проверка сверху
			if(_.get(ground_collider,[y-1,x])){
				_.set(d,`${touch_wall}.higher`,true);
			}
			// Проверка справа
			if(_.get(ground_collider,[y,x+1])){
				_.set(d,`${touch_wall}.right`,true);
			}
			// Проверка слева
			if(_.get(ground_collider,[y,x-1])){
				_.set(d,`${touch_wall}.left`,true);
			}
		}
	}
},
/**устанавливает рамку на активный слот хотбара*/
update_active_hotbar_slot_frame:function(){
	if(d.save.player.interface.hotbar.slot_count==0)return;
	let active_hotbar_slot_frame=document.getElementById('active_hotbar_slot_frame');
	if(!active_hotbar_slot_frame){
		active_hotbar_slot_frame=f.create_element_from_HTML(`<img id="active_hotbar_slot_frame" src="images/interface/inventory/active_slot_frame.png"/>`);
	}
	document.querySelector(`.hotbar_slot[data-index="${d.save.player.interface.hotbar.active_slot_index}"]`).appendChild(active_hotbar_slot_frame);
},
/**генерирует хотбар*/
generate_hotbar:function(player=d.save.player,functional=true){
	let hotbar=f.create_element_from_HTML(`<div class="row"></div>`);
	if(functional){
		hotbar.id='hotbar';
	}
	for(let i=0;i<player.interface.hotbar.slot_count;i++){
		let slot=document.createElement('div');
		slot.dataset.index=i;
		slot.classList.add('hotbar_slot');
		if(functional){
			slot.addEventListener('click',function(e){
				player.interface.hotbar.active_slot_index=this.dataset.index;
				f.update_active_hotbar_slot_frame();
			});
		}
		hotbar.appendChild(slot);
	}
	return hotbar;
},
generate_esc_menu:function(){
	let esc_menu=f.create_element_from_HTML(`<div id="esc_menu"></div>`);
	let button_to_main_menu=f.create_button_from_text(d.language.interface.buttons.to_main_menu);
	button_to_main_menu.addEventListener('click',()=>{
		f.save_character(d.save.player);
		f.save_world(d.save.world);
		f.set_empty_player();
		f.change_room('main_menu');
	});
	button_to_main_menu.id='button_to_main_menu';
	esc_menu.appendChild(button_to_main_menu);
	return esc_menu;
},
/**генерирует интерфейс*/
update_interface:function(){
	if(!d.interface){
		console.warn('update_interface: interface is not ready yet');
		return;
	}
	d.interface.innerHTML='';
	d.interface.appendChild(f.generate_hotbar());
	f.update_active_hotbar_slot_frame();
	d.interface.appendChild(f.generate_esc_menu());
},
/**включает/отключает интерфейс*/
set_interface_visibility:function(is_visible){
	d.interface.style.visibility=(is_visible?'visible':'collapse');
},
/**активирует прошлый слот хотбара*/
activate_previous_hotbar_slot:function(){
	d.save.player.interface.hotbar.active_slot_index--;
	if(d.save.player.interface.hotbar.active_slot_index<0){
		d.save.player.interface.hotbar.active_slot_index=d.save.player.interface.hotbar.slot_count-1;
	}
	f.update_active_hotbar_slot_frame();
},
/**активирует следующий слот хотбара*/
activate_next_hotbar_slot:function(){
	d.save.player.interface.hotbar.active_slot_index++;
	if(d.save.player.interface.hotbar.active_slot_index>=d.save.player.interface.hotbar.slot_count){
		d.save.player.interface.hotbar.active_slot_index=0;
	}
	f.update_active_hotbar_slot_frame();
},
open_handles_DB:function() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(d.FS_DB_NAME, 1);
		req.onupgradeneeded = (e) => {
			const db = e.target.result;
			if (!db.objectStoreNames.contains(d.FS_STORE_NAME)) db.createObjectStore(d.FS_STORE_NAME);
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
},
save_handle_to_DB:function(handle) {
	return f.open_handles_DB().then(db => new Promise((resolve, reject) => {
		try{
			const tx = db.transaction(d.FS_STORE_NAME, 'readwrite');
			const store = tx.objectStore(d.FS_STORE_NAME);
			const req = store.put(handle, d.FS_KEY);
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		}catch(e){
			reject(e);
		}
	}));
},
get_handle_from_DB:function() {
	return f.open_handles_DB().then(db => new Promise((resolve, reject) => {
		try{
			const tx = db.transaction(d.FS_STORE_NAME, 'readonly');
			const store = tx.objectStore(d.FS_STORE_NAME);
			const req = store.get(d.FS_KEY);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		}catch(e){
			reject(e);
		}
	}));
},
verify_permission:function(handle, withWrite) {
	const opts = {};
	if (withWrite) opts.mode = 'readwrite';
	// Возвращаем Promise<boolean>
	try {
		return Promise.resolve().then(()=>{
			if (!handle.queryPermission) return false;
			return handle.queryPermission(opts);
		}).then(result => {
			if (result === 'granted') return true;
			if (!handle.requestPermission) return false;
			return handle.requestPermission(opts).then(r => r === 'granted');
		}).catch(e => { console.warn('verify_permission error', e); return false; });
	} catch (e) {
		console.warn('verify_permission sync error', e);
		return Promise.resolve(false);
	}
},
init_file_access:function(){
	// Функция возвращает Promise, чтобы вызвать её из main.js и продолжать после получения дескриптора
	return new Promise((resolve,reject)=>{
		// Если API не поддерживается — выходим молча
		if(!window.showDirectoryPicker||!window.indexedDB)return resolve();
		const flag=localStorage.getItem('coderror_dir_selected');
		const tryGetFromDB=()=>{
			if(!flag)return Promise.resolve(null);
			return f.get_handle_from_DB().catch(e=>{
				console.warn('Не удалось взять дескриптор из DB',e);
				localStorage.removeItem('coderror_dir_selected');
				return null;
			});
		};
		tryGetFromDB().then(storedHandle=>{
			if(storedHandle){
				// Проверим права
				f.verify_permission(storedHandle,true).then(ok=>{
					if(!ok)console.warn('Нет прав на выбранную папку или пользователь отозвал доступ.');
					d.directory_handle=storedHandle;
					resolve();
				}).catch(e=>{
					console.warn(e);d.directory_handle=storedHandle;resolve();
				});
				return;
			}
			// Нет сохранённого дескриптора — уведомим пользователя и пометим, что требуется вмешательство пользователя
			alert('Для работы игре требуется доступ к своим же файлам. Выберите папку, которую вы использовали для загрузки расширения, или папку, в которой игра на самом деле хранится. Сейчас будет произведён запрос доступа.');
			// Помечаем, что для получения дескриптора требуется пользовательский жест (например, нажатие кнопки)
			d.need_directory_permission=true;
			f.request_directory_via_user_gesture().then(handle=>{
				return resolve();
			});
		}).catch(e=>{
			console.error('init_file_access error',e);
			resolve();
		});
	});
},
// Вызывать в обработчике пользовательского события (click) — picker требует user activation
request_directory_via_user_gesture:function(){
	return new Promise((resolve,reject)=>{
		if(!window.showDirectoryPicker)return resolve(null);
		window.showDirectoryPicker().then(handle=>{
			d.directory_handle=handle;
			f.save_handle_to_DB(handle).then(()=>{
				localStorage.setItem('coderror_dir_selected','1');
			}).catch(e=>{
				console.warn('Не удалось сохранить дескриптор в IndexedDB',e);
			}).finally(()=>{
				d.need_directory_permission=false;
				resolve(handle);
			});
		}).catch(e=>{
			console.warn('showDirectoryPicker cancelled or failed',e);
			resolve(null);
		});
	});
},
/**проверяет существует ли файл*/
file_exists:function(relPath){
	return new Promise((resolve,reject)=>{
		if(!d.directory_handle)return reject(new Error('Directory handle is not available'));
		const parts=relPath.split('/').filter(Boolean);
		let dir=d.directory_handle;
		const next=(i)=>{
			if(i>=parts.length-1){
				dir.getFileHandle(parts[parts.length-1])
				.then(()=>resolve(true))
				.catch(error=>{
					if(error.name==='NotFoundError'){
						resolve(false);
					} else {
						reject(error);
					}
				});
				return;
			}
			dir.getDirectoryHandle(parts[i])
			.then(newDir=>{
				dir=newDir;
				next(i+1);
			}).catch(error=>{
				if(error.name==='NotFoundError'){
					resolve(false);
				}else{
					reject(error);
				}
			});
		};
		next(0);
	});
},
/**читает содержимое текстового файла, возвращает null если файл не существует*/
read_file:function(relPath){
	return new Promise((resolve,reject)=>{
		if(!d.directory_handle)return reject(new Error('Directory handle is not available'));
		const parts=relPath.split('/').filter(Boolean);
		let dir=d.directory_handle;
		const next=(i)=>{
			if(i>=parts.length-1){
				dir.getFileHandle(parts[parts.length-1])
				.then(fileHandle=>fileHandle.getFile())
				.then(file=>file.text())
				.then(resolve)
				.catch(error=>{
					if(error.name==='NotFoundError'){
						resolve(null);
					}else{
						reject(error);
					}
				});
				return;
			}
			dir.getDirectoryHandle(parts[i])
			.then(newDir=>{
				dir=newDir;
				next(i+1);
			}).catch(error=>{
				if(error.name==='NotFoundError'){
					resolve(null);
				}else{
					reject(error);
				}
			});
		};
		next(0);
	});
},
/**записывает содержимое в текстовый файл (с автоматическим созданием директорий)*/
write_file:function(relPath,contents){
	return new Promise((resolve,reject)=>{
		if(!d.directory_handle)return reject(new Error('Directory handle is not available'));
		const parts=relPath.split('/').filter(Boolean);
		let dir=d.directory_handle;
		const next=(i)=>{
			if(i>=parts.length-1){
				// Достигли файла
				dir.getFileHandle(parts[parts.length-1],{create:true})
				.then(fileHandle=>fileHandle.createWritable())
				.then(writable=>{
					return writable.write(contents).then(()=>writable.close());
				})
				.then(resolve)
				.catch(reject);
				return;
			}
			// Создаем директории по пути
			dir.getDirectoryHandle(parts[i],{create:true})
			.then(newDir=>{
				dir=newDir;
				next(i+1);
			})
			.catch(reject);
		};
		next(0);
	});
},
/**создает папку*/
create_directory:function(relPath){
	return new Promise((resolve,reject)=>{
		if(!d.directory_handle)return reject(new Error('Directory handle is not available'));
		const parts=relPath.split('/').filter(Boolean);
		let dir=d.directory_handle;
		const next=(i)=>{
			if(i>=parts.length)return resolve(dir);
			dir.getDirectoryHandle(parts[i],{create:true})
			.then(newDir=>{
				dir=newDir;
				next(i+1);
			})
			.catch(reject);
		};
		next(0);
	});
},
/**удаляет файл*/
remove_file:function(relPath){
	return new Promise((resolve,reject)=>{
		if(!d.directory_handle)return reject(new Error('Directory handle is not available'));
		const parts=relPath.split('/').filter(Boolean);
		let dir=d.directory_handle;
		const next=(i)=>{
			if(i>=parts.length-1){
				dir.removeEntry(parts[parts.length-1])
				.then(resolve)
				.catch(reject);
				return;
			}
			dir.getDirectoryHandle(parts[i])
			.then(newDir=>{
				dir=newDir;
				next(i+1);
			})
			.catch(reject);
		};
		next(0);
	});
},
/**рекурсивно удаляет папку с содержимым*/
remove_directory:function(relPath){
	return new Promise((resolve,reject)=>{
		if(!d.directory_handle)return reject(new Error('Directory handle is not available'));
		const parts=relPath.split('/').filter(Boolean);
		let dir=d.directory_handle;
		const deleteRecursive=async(currentDir)=>{
			for await(const[name,handle]of currentDir.entries()){
				if(handle.kind==='directory'){
					await deleteRecursive(handle);
				}else{
					await currentDir.removeEntry(name);
				}
			}
			if(currentDir!==d.directory_handle){
				await dir.removeEntry(parts[parts.length-1],{recursive:true});
			}
		};
		const next=(i)=>{
			if(i>=parts.length){
				deleteRecursive(dir)
				.then(resolve)
				.catch(reject);
				return;
			}
			dir.getDirectoryHandle(parts[i])
			.then(newDir=>{
				dir=newDir;
				next(i+1);
			}).catch(reject);
		};
		next(0);
	});
},
/**возвращает список названий файлов в указанной директории (папки игнорируются)*/
list_files:function(relPath=""){
	return new Promise((resolve,reject)=>{
		if(!d.directory_handle)return reject(new Error('Directory handle is not available'));
		const parts=relPath.split('/').filter(Boolean);
		let dir=d.directory_handle;
		const next=(i)=>{
			if(i>=parts.length){
				// Достигли целевой директории - читаем её содержимое
				const files=[];
				const readFiles=async()=>{
					try{
						for await(const[name,handle]of dir.entries()){
							// Добавляем только файлы, игнорируем папки
							if(handle.kind==='file'){
								files.push(name);
							}
						}
						resolve(files.sort());
					}catch(error){
						reject(error);
					}
				};
				readFiles();
				return;
			}
			dir.getDirectoryHandle(parts[i])
			.then(newDir=>{
				dir=newDir;
				next(i+1);
			}).catch(error=>{
				if(error.name==='NotFoundError'){
					// Директория не существует - возвращаем пустой массив
					resolve([]);
				}else{
					reject(error);
				}
			});
		};
		next(0);
	});
},
fetch_json:function(path){
	return fetch(path)
	.then(response=>{
		if(!response.ok){
			throw new Error('Ошибка сети');
		}
		return response.json();
	}).then(data=>{
		return data;// данные будут доступны через then
	}).catch(error=>{
		console.error('Ошибка загрузки файла:',error);
		throw error;// пробрасываем ошибку дальше
	});
},
/**загружает языки из папки languages*/
load_languages:function(){
	return f.list_files('languages').then(files=>{
		let languages_div=document.getElementById('languages_div');
		languages_div.innerHTML='';
		// Создаем массив промисов для каждого скрипта
		const promises=[];
		for(const file of files){
			const promise=new Promise((resolve,reject)=>{
				const script=document.createElement('script');
				script.src=`languages/${file}`;
				script.onload=resolve;
				script.onerror=reject;
				languages_div.appendChild(script);
			});
			promises.push(promise);
		}
		// Ждем загрузки всех скриптов
		return Promise.all(promises);
	});
},
character_to_element:function(character){
	let div1=f.create_element_from_HTML(`<div></div>`);
	div1.appendChild(f.create_element_from_HTML(f.get_transparent_space_text(character.nickname)));
	div1.appendChild(f.get_br());
	let hotbar=f.generate_hotbar(character,false);
	div1.appendChild(hotbar);
	let button=f.wrap_in_frame(div1);
	button.addEventListener('click',()=>{
		d.save.player=character;
		f.change_room(d.is_singleplayer?'world_selection':'server_selection');
	});
	return button;
},
create_characters_list:function(){
	let characters_list=f.create_element_from_HTML('<div id="characters_list" class="column"></div>');
	for(let character of d.characters){
		let character_element=f.character_to_element(character);
		characters_list.appendChild(character_element);
		characters_list.appendChild(f.get_br());
		characters_list.appendChild(f.get_br());
	}
	return characters_list;
},
save_character:function(character){
	f.write_file(`YOUR_DATA/characters/${character.nickname}.json`,f.object_to_string(character)).then(()=>{
		f.print_to_chat(d.language.notifications.character_saved);
	});
},
update_characters_list:function(){
	d.save.temp.room.data.characters_list_div.replaceChildren(f.create_characters_list());
},
save_character_update_list:function(character){
	f.save_character(character);
	d.characters.unshift(character);
	f.update_characters_list();
},
load_character:async function(filename) {
	return await f.fetch_json(`YOUR_DATA/characters/${filename}`);
},
load_characters:async function(){
	try{
		d.characters=[];
		const files=await f.list_files('YOUR_DATA/characters');
		// Загружаем всех персонажей параллельно
		const characterPromises=files.map(file=>
			this.load_character(file)
		);
		const characters=await Promise.all(characterPromises);
		// Добавляем всех персонажей в массив
		d.characters.unshift(...characters);
		return characters;
	}catch(error){
		console.error('Ошибка загрузки персонажей:', error);
		throw error;
	}
},
world_to_element:function(world){
	let div1=f.create_element_from_HTML(`<div></div>`);
	div1.appendChild(f.create_element_from_HTML(f.get_transparent_space_text(world.name)));
	let button=f.wrap_in_frame(div1);
	button.addEventListener('click',()=>{
		d.save.world=world;
		if(d.save.world.players&&d.save.world.players[d.save.player.nickname]&&d.save.world.players[d.save.player.nickname].position){
			f.load_save(d.save);
		}else{
			f.change_room('intro0');
		}
	});
	return button;
},
create_worlds_list:function(){
	let worlds_list=f.create_element_from_HTML('<div id="worlds_list" class="column"></div>');
	for(let world of d.worlds){
		let world_element=f.world_to_element(world);
		worlds_list.appendChild(world_element);
		worlds_list.appendChild(f.get_br());
		worlds_list.appendChild(f.get_br());
	}
	return worlds_list;
},
save_world:function(world){
	f.write_file(`YOUR_DATA/worlds/${world.name}.json`,f.object_to_string(world)).then(()=>{
		f.print_to_chat(d.language.notifications.world_saved);
	});
},
update_worlds_list:function(){
	d.save.temp.room.data.worlds_list_div.replaceChildren(f.create_worlds_list());
},
save_world_update_list:function(world){
	f.save_world(world);
	d.worlds.unshift(world);
	f.update_worlds_list();
},
load_world:async function(filename) {
	return await f.fetch_json(`YOUR_DATA/worlds/${filename}`);
},
load_worlds:async function(){
	try{
		d.worlds=[];
		const files=await f.list_files('YOUR_DATA/worlds');
		const worldPromises=files.map(file=>
			this.load_world(file)
		);
		const worlds=await Promise.all(worldPromises);
		d.worlds.unshift(...worlds);
		return worlds;
	}catch(error){
		console.error('Ошибка загрузки миров:',error);
		throw error;
	}
},
/**загружает сохранение*/
load_save:function(data){
	d.loadable_save_data=_.cloneDeep(data);
	f.change_room(d.save.world.players[d.save.player.nickname].position.room_id);
},
/**начать подготову комнаты*/
prepare:function(preparation_func){
	if(!d.save.temp.room.preparation)return
	preparation_func();
	f.finish_preparation();
},
/**завершить подготовку комнаты*/
finish_preparation:function(){
	if(d.loadable_save_data){
		d.save=_.merge({},d.save,d.loadable_save_data);
		d.loadable_save_data=null;
		f.update_interface();
	}
	d.save.temp.room.preparation=false;
},
apply_standard_buttons_style(buttons=d.save.temp.room.data.buttons){
	Object.entries(buttons).forEach(([name,el])=>{
		f.change_button_color(el,(f.check_hover(el)?f.get_random_true_str_color():'#fff'));
	});
},
apply_standard_drop_zone_style(drop_zone=d.save.temp.room.data.drop_zone){
	f.change_button_border_color(drop_zone,(f.check_hover(drop_zone)?'#f0f':'#fff'));
},
set_empty_player(){
	d.save.player={
		/**ник персонажа*/
		nickname:'',
		interface:{
			hotbar:{
				slot_count:0,
				active_slot_index:0
			}
		}
	}
},
};

let f=window.CODERROR.__originals__.functions;
}