{
let d=window.CODERROR.__originals__.data;

window.CODERROR.__originals__.functions={
async eval_script(filePath) {
	try {
		// Загружаем файл по указанному пути
		const response = await fetch(filePath);
		
		if (!response.ok) {
		throw new Error(`Ошибка загрузки: ${response.status} ${response.statusText}`);
		}
		
		// Получаем код из файла
		const code = await response.text();
		
		// Выполняем код с помощью eval
		eval(code);
	} catch (error) {
		console.error('Произошла ошибка:', error);
	}
},
/**инициализирует камеру three*/
init_three_camera(){
	d.three_camera=new THREE.PerspectiveCamera(
		50,
		d.wrapper.clientWidth/d.wrapper.clientHeight,
		0.1,
		1000
	);
	d.three_camera.position.z=1;/*Камера внутри куба*/
},
/**создаёт материалы*/
create_skybox_materials(path_part,extension,is_sphere) {
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
set_sky(path_part,extension,is_sphere=false) {
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
init_three_scene(){
	d.background_texture=PIXI.Texture.from(d.three_renderer.domElement);
	d.background_texture.baseTexture.autoUpdate=false;
	d.background_sprite=new PIXI.Sprite(d.background_texture);
	// Устанавливаем размер спрайта
	d.background_sprite.width=d.wrapper.clientWidth;
	d.background_sprite.height=d.wrapper.clientHeight;
	d.app.stage.addChildAt(d.background_sprite,0);
},
/**Функция обновления сцены three*/
update_three_scene(){
	/*Обновляем Three.js сцену*/
	d.three_renderer.render(d.three_scene,d.three_camera);
	/*Принудительное обновление текстуры в PixiJS*/
	d.background_texture.baseTexture.update();
},
rotate_sky(x,y,z){
	if(!d.skybox)return;
	d.skybox.rotation.x+=x;
	d.skybox.rotation.y+=y;
	d.skybox.rotation.z+=z;
},
set_sky_rotation(x,y,z){
	if(!d.skybox)return;
	d.skybox.rotation.set(x,y,z);
},
print_to_chat(message){
	let message_element=f.create_element_from_HTML(`<div>${message}</div>`);
	message_element.classList.add('message');
	d.chat_preview.appendChild(message_element);
	message_element.addEventListener('animationend',()=>{
		message_element.remove();
	});
},
change_room(room,preparation=true,reset_overlay=true){
	_.set(d,['save','world','players',d.save.player.nickname,'position','room_id'],room);
	_.set(d,['save','temp','room','preparation'],preparation);
	if(!reset_overlay)return
	d.overlay.innerHTML=``;
},
/**инициализация матрицы символов */
async init_symbols_grid() {
    d.symbols_grid = [];
    d.symbols_grid_data = [];
    d.columns = 0;
    d.rows = 0;
    
    // Создаем атласы символов (загружаем с диска или создаем новые)
    await f.init_symbols_atlas()
	// Создаем текстуру для белого пикселя (для фона)
	d.white_texture = PIXI.Texture.WHITE;

	f.update_symbols_grid();
},
/** Обновляет размеры матрицы символов */
update_symbols_grid() {
    if(!d.symbols_grid){
        return;
    }
    
    let newColumns = Math.ceil(d.app.renderer.width / d.symbol_size);
    let newRows = Math.ceil(d.app.renderer.height / d.symbol_size);
    
    if (newColumns === d.columns && newRows === d.rows) return;
    
    // Убедимся, что массивы инициализированы правильно
    if (!Array.isArray(d.symbols_grid)) d.symbols_grid = [];
    if (!Array.isArray(d.symbols_grid_data)) d.symbols_grid_data = [];
    
    // Удаляем ненужные ячейки
    for (let y = 0; y < d.rows; y++) {
        for (let x = 0; x < d.columns; x++) {
            // Если ячейка выходит за новые границы - удаляем
            if (y >= newRows || x >= newColumns) {
                if (d.symbols_grid[y] && d.symbols_grid[y][x]) {
                    d.app.stage.removeChild(d.symbols_grid[y][x]);
                    d.symbols_grid[y][x].destroy({children: true});
                    d.symbols_grid[y][x] = null;
                    
                    if (d.symbols_grid_data[y]) {
                        d.symbols_grid_data[y][x] = null;
                    }
                }
            }
        }
        
        // Обрезаем массивы если нужно
        if (d.symbols_grid[y] && d.symbols_grid[y].length > newColumns) {
            d.symbols_grid[y].length = newColumns;
        }
        if (d.symbols_grid_data[y] && d.symbols_grid_data[y].length > newColumns) {
            d.symbols_grid_data[y].length = newColumns;
        }
    }
    
    // Обрезаем количество строк если нужно
    if (d.symbols_grid.length > newRows) {
        d.symbols_grid.length = newRows;
        d.symbols_grid_data.length = newRows;
    }
    
    // Создаем новые ячейки
    for (let y = 0; y < newRows; y++) {
        // Инициализируем строки если их нет
        if (!d.symbols_grid[y]) {
            d.symbols_grid[y] = [];
            d.symbols_grid_data[y] = [];
        }
        
        for (let x = 0; x < newColumns; x++) {
            // Создаем ячейку только если ее нет
            if (!d.symbols_grid[y][x]) {
                // Контейнер для ячейки
                let container = new PIXI.Container();
                container.x = x * d.symbol_size;
                container.y = y * d.symbol_size;
                
                // Спрайт для фона
                let background = new PIXI.Sprite(d.white_texture);
                background.width = d.symbol_size;
                background.height = d.symbol_size;
                background.alpha = 0;
                container.addChild(background);
                
                // Спрайт для символа
                let symbol = new PIXI.Sprite();
                symbol.width = d.symbol_size;
                symbol.height = d.symbol_size;
                container.addChild(symbol);
                
                d.app.stage.addChild(container);
                
                // Прямое присваивание для массивов
                d.symbols_grid[y][x] = container;
                d.symbols_grid_data[y][x] = {
                    char: '',
                    textColor: 0xFFFFFF,
                    bgColor: 0x000000,
                    bgAlpha: 0
                };
            }
        }
    }
    
    d.columns = newColumns;
    d.rows = newRows;
    
    console.log(`Grid updated: ${d.columns}x${d.rows}, cell size: ${d.symbol_size}px`);
},
/** Обновляет отображение символов */
render_symbols_grid(){
    // CPU режим - используем оптимизированный рендеринг с атласами
    if(d.symbols_dirty_cells && d.symbols_dirty_cells.size > 0){
        for(let cellKey of d.symbols_dirty_cells){
            const [y, x] = cellKey.split(',').map(Number);
            if(y < 0 || y >= d.rows || x < 0 || x >= d.columns) continue;
            
            let container = d.symbols_grid[y][x];
            let data = d.symbols_grid_data[y][x];
            
            if(!container || !data) continue;
            
            let textElement = container.children[1];
            let background = container.children[0];
            
            // Обновляем только изменённые свойства символа
            if(textElement._lastChar !== data.char) {
                textElement._lastChar = data.char;
                if(data.char && data.char !== '') {
                    const texture = f.get_symbol_texture(data.char);
                    if(texture) {
                        textElement.texture = texture;
                        textElement.alpha = 1;
                    } else {
                        textElement.alpha = 0;
                    }
                } else {
                    textElement.alpha = 0;
                }
            }
            
            if(textElement.tint !== data.textColor) {
                textElement.tint = data.textColor;
            }
            
            // Обновляем фон (просто меняем tint и alpha спрайта)
            if(background.tint !== data.bgColor || background.alpha !== data.bgAlpha) {
                background.tint = data.bgColor;
                background.alpha = data.bgAlpha;
            }
        }
        d.symbols_dirty_cells.clear();
    }
},
/**отмечает ячейку как изменённую для обновления в следующем кадре*/
mark_symbol_dirty(x, y){
	if(!d.symbols_dirty_cells) d.symbols_dirty_cells = new Set();
	d.symbols_dirty_cells.add(`${y},${x}`);
},
/** Получает текстуру символа из соответствующего атласа */
get_symbol_texture(char) {
    const info = d.symbols_atlas_map[char];
    if (!info) {
        return f.get_symbol_texture(' ');
    }
    
    const atlas = d.symbols_atlases[info.atlasIndex];
    if (!atlas) {
        console.warn(`Atlas ${info.atlasIndex} not found for char: ${char}`);
        return f.get_symbol_texture(' ');
    }
    
    const size = d.symbol_size;
    const cols = atlas.cols;
    
    const col = info.charIndex % cols;
    const row = Math.floor(info.charIndex / cols);
    
    const x = col * size;
    const y = row * size;
    
    // Создаем прямоугольник (frame) для вырезания
    const frame = new PIXI.Rectangle(x, y, size, size);
    
    // Создаем новую текстуру, используя исходную текстуру и frame
    const subTexture = new PIXI.Texture({
        source: atlas.texture.source,
        frame: frame
    });
    
    return subTexture;
},
/** Устанавливает символ в ячейку */
set_symbol_data(x, y, char, textColor = 0xFFFFFF, bgColor = 0x000000, bgAlpha = 0) {
    let container = _.get(d, ['symbols_grid', y, x]),
    data = _.get(d, ['symbols_grid_data', y, x]);
    if(!container||!data) return;
    
    // Сохраняем данные
    data.char = char;
    data.textColor = textColor;
    data.bgColor = bgColor;
    data.bgAlpha = bgAlpha;
    
	// CPU режим - обновляем спрайты напрямую
	let background = container.children[0];
	let symbol = container.children[1];
	
	// Обновляем фон
	background.tint = bgColor;
	background.alpha = bgAlpha;
	
	// Обновляем символ
	if(char && char !== '') {
		const texture = f.get_symbol_texture(char);
		if(texture) {
			symbol.texture = texture;
			symbol.tint = textColor;
			symbol.alpha = 1;
		} else {
			symbol.alpha = 0;
		}
	} else {
		symbol.alpha = 0;
	}
    
    f.mark_symbol_dirty(x, y);
},
/** Устанавливает текст в ячейку (только данные) */
set_text_data(x, y, text, textColor = 0xFFFFFF, bgColor = 0x000000, bgAlpha = 0){
	if(y >= 0 && y < d.rows && x >= 0 && x < d.columns){
		let data = d.symbols_grid_data[y][x];
		if(data && text.length > 0){
			data.char = text[0];
			data.textColor = textColor;
			data.bgColor = bgColor;
			data.bgAlpha = bgAlpha;
			f.mark_symbol_dirty(x, y);
		}
	}
},
/** Устанавливает размер шрифта */
set_font_size(size_in_pixels,first_init=false) {
	if(d.symbol_size!=size_in_pixels){
		d.symbol_size = size_in_pixels;
		d.styleSheet.insertRule(":root{--symbol_size:" + d.symbol_size + "px !important;}", d.styleSheet.cssRules.length);
		
		if(!first_init){
			// Пересоздаем атлас с новым размером
			f.init_symbols_atlas().then(()=>{
				f.update_symbols_grid();
			});
		}
	}
},
update_size() {
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
visual_effect(number){
	/*заполняет случайными символами*/
	if(number==0){
		let step=5,
		offset_y=Math.round(Math.random()*step),
		offset_x=Math.round(Math.random()*step);
		for(let y=offset_y;y<d.rows;y+=step){
			for(let x=offset_x;x<d.columns;x+=step){
				f.set_symbol_data(x, y, f.get_random_char(), f.get_random_color(),f.get_random_color(),0.5);
			}
		}
		f.visual_effect(3);
	}
	/*случайно поворачивает символы*/
	if(number==1){
		for(let y=0;y<d.rows;y++){
			for(let x=0;x<d.columns;x++){
				let container = d.symbols_grid[y][x];
				if(container){
					// поворачиваем сам контейнер вокруг центра ячейки
					const center = d.symbol_size/2;
					container.pivot.set(center, center);
					container.x = x * d.symbol_size + center;
					container.y = y * d.symbol_size + center;
					// случайный угол (в радианах)
					container.rotation = (Math.random() - 0.5) * Math.PI * 2;
				}
			}
		}
	}
	/*откатывает предыдущий*/
	if(number==2){
		for(let y=0;y<d.rows;y++){
			for(let x=0;x<d.columns;x++){
				let container = d.symbols_grid[y][x];
				if(container){
					// сбрасываем поворот и возвращаем контейнер в позицию "top-left"
					container.rotation = 0;
					container.pivot.set(0,0);
					container.x = x * d.symbol_size;
					container.y = y * d.symbol_size;
				}
			}
		}
	}
	/*убирает символы вокруг курсора*/
	if(number==3){
		// Радиус в пикселях — три размера символа
		let radius = 5 * d.symbol_size;
		if(!d.mouse) return;
		let mx = d.mouse.x;
		let my = d.mouse.y;
		// Проходим по ячейкам, попадающим в квадрат ограничивающий круг
		let x0 = Math.floor((mx - radius) / d.symbol_size);
		let x1 = Math.ceil((mx + radius) / d.symbol_size);
		let y0 = Math.floor((my - radius) / d.symbol_size);
		let y1 = Math.ceil((my + radius) / d.symbol_size);
		for(let y = y0; y <= y1; y++){
			for(let x = x0; x <= x1; x++){
				if(x<0||y<0||x>=d.columns||y>=d.rows) continue;
				// Центр ячейки в пикселях
				let cx = x * d.symbol_size + d.symbol_size/2;
				let cy = y * d.symbol_size + d.symbol_size/2;
				let dx = cx - mx;
				let dy = cy - my;
				let dist = Math.sqrt(dx*dx + dy*dy);
				if(dist <= radius){
					// Чем ближе к курсору — тем прозрачнее фон (alpha 0 в центре, 1 на границе)
					let alpha = Math.min(1, Math.max(0, dist / radius));
					// Сохраняем существующий цвет фона, если доступен
					let bgColor = 0x000000;
					let data = d.symbols_grid_data[y] && d.symbols_grid_data[y][x];
					if(data) bgColor = data.bgColor || bgColor;
					// Устанавливаем пустой символ и вычислённую прозрачность фона
					f.set_symbol_data(x, y, '', 0xFFFFFF, bgColor, alpha);
				}
			}
		}
	}
},
/**проверяет загружен ли шрифт и если что дожидается загрузки*/
check_font_loaded(fontName, timeout = 3000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Таймаут загрузки шрифта'));
        }, timeout);

        // Периодическая проверка
        const check = () => {
            if (document.fonts.check(`16px "${fontName}"`)) {
                clearTimeout(timer);
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };
        
        check();
    });
},
/**инициализирует матрицу символов */
async init_symbols_atlas() {
    // Проверяем наличие кэша атласов СИНХРОННО
    await f.check_atlas_cache().then(async cacheValid => {
        if (cacheValid) {
            console.log('Using cached symbol atlases');
            // Загружаем атласы из кэша
            await f.load_cached_atlases();
        } else {
            console.log('Generating new symbol atlases');
            // Создаем атласы в памяти
            await f.create_symbols_atlas();
        }
    }).catch(async error => {
        console.warn('Cache check failed, generating new atlases:', error);
        await f.create_symbols_atlas();
    });
},
/** Проверяет валидность кэша атласов */
check_atlas_cache() {
    return new Promise((resolve, reject) => {
        const infoPath = `CACHE/symbols_atlases/${d.symbol_size}/info.json`;
        
        f.file_exists(infoPath).then(exists => {
            if (!exists) {
                resolve(false);
                return;
            }
            
            // Читаем информацию о кэше
            f.read_file(infoPath).then(infoData => {
                try {
                    const info = JSON.parse(infoData);
                    
                    // Проверяем версию и размер символов
                    if (info.version !== 1 || info.symbol_size !== d.symbol_size) {
                        resolve(false);
                        return;
                    }
                    
                    // Проверяем существование всех файлов атласов
                    const checkPromises = info.atlases.map(atlasInfo => 
                        f.file_exists(atlasInfo.filename)
                    );
                    
                    Promise.all(checkPromises).then(results => {
                        const allExist = results.every(exists => exists);
                        resolve(allExist);
                    }).catch(reject);
                    
                } catch (error) {
                    reject(error);
                }
            }).catch(reject);
        }).catch(reject);
    });
},
/** Загружает атласы из кэша */
load_cached_atlases() {
    return new Promise((resolve, reject) => {
        const infoPath = `CACHE/symbols_atlases/${d.symbol_size}/info.json`;
        
        f.read_file(infoPath).then(infoData => {
            const info = JSON.parse(infoData);
            
            d.symbols_atlases = [];
            d.symbols_atlas_map = info.symbols_map;
            
            // Загружаем каждый атлас
            const loadPromises = info.atlases.map((atlasInfo, index) => {
                return new Promise((resolve, reject) => {
                    // Создаем изображение для загрузки текстуры
                    const img = new Image();
                    img.onload = () => {
                        const texture = PIXI.Texture.from(img);
                        d.symbols_atlases[index] = {
                            texture: texture,
                            cols: atlasInfo.cols,
                            rows: atlasInfo.rows
                        };
                        resolve();
                    };
                    img.onerror = reject;
                    img.src = atlasInfo.filename;
                });
            });
            
            Promise.all(loadPromises).then(() => {
                console.log(`Loaded ${d.symbols_atlases.length} cached atlases`);
                resolve();
            }).catch(error => {
                reject(error);
            });
            
        }).catch(error => {
            reject(error);
        });
    });
},
/** Сохраняет атласы на диск вместе с информацией */
save_atlases_to_disk() {
    if (!d.symbols_atlases || d.symbols_atlases.length === 0) {
        console.warn('No atlases to save');
        return;
    }
    
    // Создаем информацию об атласах для сохранения
    const atlasInfo = {
        version: 1,
        symbol_size: d.symbol_size,
        atlases: [],
        symbols_map: d.symbols_atlas_map
    };
    
    // Сохраняем каждый атлас и собираем информацию
    const savePromises = d.symbols_atlases.map((atlas, index) => {
        const fileName = `CACHE/symbols_atlases/${d.symbol_size}/${index}.png`;
        
        atlasInfo.atlases.push({
            filename: fileName,
            cols: atlas.cols,
            rows: atlas.rows
        });
        
        return f.save_atlas_as_PNG(atlas.canvas, index, fileName);
    });
    
    // Сохраняем информацию об атласах
    const infoPath = `CACHE/symbols_atlases/${d.symbol_size}/info.json`;
    const infoJson = JSON.stringify(atlasInfo, null, 2);
    
    savePromises.push(f.write_file(infoPath, infoJson));
    
    Promise.all(savePromises).then(() => {
        console.log('All atlases and info saved successfully');
    }).catch(error => {
        console.error('Error saving atlases:', error);
    });
},
/** Создает битмап-атласы символов (разделенные на чанки) в высоком качестве */
create_symbols_atlas() {
    if (!d.printable_symbols || d.printable_symbols.length === 0) {
        f.init_printable_symbols();
    }
    
    // Если printable_symbols - строка, преобразуем в массив символов
    const symbolsArray = typeof d.printable_symbols === 'string' 
        ? Array.from(d.printable_symbols) 
        : d.printable_symbols;
    
    const size = d.symbol_size;
    const resolution = 4;
    const maxAtlasSize = 2048;
    const symbolsPerRow = Math.floor(maxAtlasSize / size);
    const symbolsPerAtlas = symbolsPerRow * symbolsPerRow;
    
    d.symbols_atlases = [];
    d.symbols_atlas_map = {};
    
    // Создаем все атласы
    for (let i = 0; i < symbolsArray.length; i += symbolsPerAtlas) {
        const chunk = symbolsArray.slice(i, Math.min(i + symbolsPerAtlas, symbolsArray.length));
        
        if (chunk.length === 0) {
            console.warn('Empty chunk encountered, skipping atlas creation');
            continue;
        }
        
        const atlasIndex = d.symbols_atlases.length;
        
        const cols = Math.min(symbolsPerRow, chunk.length);
        const rows = Math.ceil(chunk.length / cols);
        
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = cols * size;
        finalCanvas.height = rows * size;
        
        if (finalCanvas.width === 0 || finalCanvas.height === 0) {
            console.error('Final canvas has zero dimensions:', finalCanvas.width, finalCanvas.height);
            continue;
        }
        
        const finalCtx = finalCanvas.getContext('2d');
        finalCtx.imageSmoothingEnabled = false;
        
        finalCtx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size * resolution;
        tempCanvas.height = size * resolution;
        
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = `${size * resolution}px CODERROR, monospace`;
        tempCtx.textAlign = 'start';
        tempCtx.textBaseline = 'top';
        tempCtx.fillStyle = '#ffffff';
        
        for (let j = 0; j < chunk.length; j++) {
            const char = chunk[j];
            
            const col = j % cols;
            const row = Math.floor(j / cols);
            
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            const x = 0;
            const y = 0;
            tempCtx.fillText(char, x, y);
            
            const destX = col * size;
            const destY = row * size;
            
            finalCtx.drawImage(
                tempCanvas,
                0, 0, tempCanvas.width, tempCanvas.height,
                destX, destY, size, size
            );
            
            d.symbols_atlas_map[char] = {
                atlasIndex: atlasIndex,
                charIndex: j,
                cols: cols,
                rows: rows
            };
        }
        
        const atlasData = {
            texture: PIXI.Texture.from(finalCanvas),
            cols: cols,
            rows: rows,
            canvas: finalCanvas
        };
        
        d.symbols_atlases.push(atlasData);
        console.log(`Created atlas ${atlasIndex}: ${cols}x${rows} symbols, ${finalCanvas.width}x${finalCanvas.height} pixels, ${chunk.length} chars`);
    }
    
    if (d.symbols_atlases.length === 0) {
        console.error('No atlases were created - check printable_symbols and symbol_size');
        return;
    }

    f.save_atlases_to_disk();
},
// Обновленная функция для сохранения PNG
save_atlas_as_PNG(canvas, index, fileName = null) {
    if (!fileName) {
        fileName = `CACHE/symbols_atlases/${d.symbol_size}/${index}.png`;
    }
    
    return new Promise((resolve, reject) => {
        // Метод 1: Используем toDataURL как запасной вариант
        try {
            const dataURL = canvas.toDataURL('image/png');
            const base64Data = dataURL.split(',')[1];
            const binaryString = atob(base64Data);
            const uint8Array = new Uint8Array(binaryString.length);
            
            for (let i = 0; i < binaryString.length; i++) {
                uint8Array[i] = binaryString.charCodeAt(i);
            }
            
            f.write_file(fileName, uint8Array)
                .then(() => {
                    console.log(`Atlas ${index} saved: ${fileName}`);
                    resolve();
                })
                .catch(reject);
                
        } catch (error) {
            console.error(`DataURL method failed for atlas ${index}:`, error);
            reject(error);
        }
    });
},
/**функция генерации кода разметки pre с отсутствием фона у пробелов*/
get_transparent_space_text(text,color='#fff',background='#000'){
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
create_element_from_HTML(html){
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
get_random_true_str_color(){
	return f.get_random_element(['#000','#00f','#0f0','#0ff','#f00','#f0f','#ff0','#fff']);
},
/**увеличивает z-index на 1*/
increment_z_index(element){
	element.style.zIndex=parseInt(element.style.zIndex||0)+1+'';
},
/**оборачивает элемент в кнопку с символьной рамкой*/
wrap_in_frame(content,container_type='<button/>',removable=false) {
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
create_button_from_text(text,removable=false){
	return f.wrap_in_frame(f.create_element_from_HTML(f.get_transparent_space_text(text)),'<button/>',removable);
},
/**меняет цвет рамки кнопки*/
change_button_border_color(button,color){
	button.style.color=color;
},
/**меняет цвет текста кнопки*/
change_button_text_color(button,color){
	let targetElement=button.querySelector('#frame_content');
	let firstChild=targetElement.firstElementChild;
	if(firstChild){
		firstChild.style.color=color;
	}else{
		console.log('У элемента нет дочерних элементов.');
	}
},
/**меняет цвет рамки и текста кнопки*/
change_button_color(button,color){
	f.change_button_border_color(button,color);
	f.change_button_text_color(button,color);
},
/**проверяет перетаскивают ли файл над объектом*/
check_dragover(element){
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
check_hover(element){
	return(element.matches(':hover')||f.check_dragover(element));
},
/**возвращает новый br элемент*/
get_br(){
	return document.createElement('br');
},
/**превращает json файл в объект (требует async await)*/
json_to_dict(file){
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
add_event_listener(name,element,function_part){
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
remove_event_listener(name,element){
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
get_symbolic_hr(){
	return f.create_element_from_HTML(`<div class='symbolic_hr'><pre>${'-'.repeat(666)}</pre></div>`);
},
/**принимает список названий языков и применяет их (чем больше индекс, тем выше приоритет)*/
apply_language(name_list){
	name_list=['default'].concat(name_list);
	let languages_list=[];
	for(name of name_list){
		languages_list.push(d.languages[name]);
	}
	d.language=_.merge({},...languages_list);
},
/**принимает словарь текста и превращает его в кнопки*/
dict_to_buttons(dict){
	let buttons=structuredClone(dict);
	for(let key in buttons){
		buttons[key]=f.create_button_from_text(buttons[key]);
	}
	return buttons;
},
/**устанавливает ограничение максимального размера содержимого игры, "100%" отключает ограничение*/
set_max_content_size(max_width,max_height){
	d.wrapper.style.width=`min(100%,${max_width})`;
	d.wrapper.style.height=`min(100%,${max_height})`;
	f.update_size();
},
/**принимает select и список и устанавливает ему эти значения*/
set_select_options(selectElement,options) {
	selectElement.innerHTML='';
	options.forEach(optionText=>{
		let option=document.createElement('option');
		option.textContent=optionText;// Задаем текст отображения
		selectElement.appendChild(option);
	});
},
/**создает select с рамкой*/
create_select_with_frame(options,removable=false){
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
get_space(){
	return f.create_element_from_HTML(`<pre style='background:#00000000'> </pre>`);
},
/**превращает объект в строку*/
object_to_string(object){
	return JSON.stringify(object);
},
/**Функция для сохранения объекта как JSON файл*/
save_as_json(data,filename){
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
remove_duplicates(arr){
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
apply_settings(){
	f.apply_language(d.settings.interface.language);
	f.set_volume(d.settings.audio.music_volume);
	f.apply_random_splash();
	/*set_font_size(d.settings.interface.font_size);*/
	f.set_max_content_size(d.settings.interface.max_content_width,d.settings.interface.max_content_height);
	f.change_room(d.save.world.players[d.save.player.nickname].position.room_id);
},
/**создает textarea с рамкой*/
create_textarea_with_frame(placeholder='',removable=false){
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
init_audio(){
	if(d.audio_initialized)return;
	d.audio_initialized=true;
	document.removeEventListener('click',f.init_audio);
	if(!d.current_music)return
	d.current_music.play().catch(f.handle_play_error);
},
/**принимает путь до музыки и включает её*/
set_music(path){
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
handle_play_error(error){
	console.error('Playback error:',error);
},
/**устанавливает громкость*/
set_volume(volume){
	d.music_volume=Math.max(0,Math.min(1,volume));
	if(d.current_music)d.current_music.volume=d.music_volume;
},
/**меняет текст кастомной кнопки*/
change_button_text(button,text){
	button.querySelector('#frame_content').innerHTML=f.get_transparent_space_text(text);
},
/**ожидает пользовательский ввод и возвращает promise*/
wait_user_input(){
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
get_random_element(list){
	return list[Math.floor(Math.random()*list.length)];
},
/**устанавливает случайный сплеш*/
apply_random_splash(){
	d.splash=f.get_random_element(d.language.splashes);
},
/**очищает сцену pixijs*/
clear_pixijs(stage=d.app.stage){
	stage.removeChildren();
	d.current_sky_path=null;
},
/**отслеживает нажатия и отжатия клавиш*/
update_activated_actions(){
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
setup_input_tracker(){
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
print_text_to_symbols_grid(text,x,y,color=0xFFFFFF,bgColor=0x000000,bgAlpha=0){
	x=Math.floor(x);
	y=Math.floor(y);
	let current_x=x,current_y=y;
	for(let symbol of text){
		if(current_x>=0&&current_x<d.columns&&current_y>=0&&current_y<d.rows){
			f.set_symbol_data(current_x, current_y, symbol, color, bgColor, bgAlpha);
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
text_to_collider(text,void_symbols=['',' ']){
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
clear_symbols_grid(){
	for(let y=0;y<d.rows;y++){
		for(let x=0;x<d.columns;x++){
			f.set_symbol_data(x, y, '', 0xFFFFFF, 0x000000, 0);
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
logical_to_screen(num){
	return num/d.logical_symbol_size*d.symbol_size;
},
/**настройки камеры*/
focus_camera_on_player(){
	d.save.temp.camera=[f.logical_to_screen(d.save.world.players[d.save.player.nickname].position.coordinates[0])-(Math.floor(d.columns/2)*d.symbol_size),f.logical_to_screen(d.save.world.players[d.save.player.nickname].position.coordinates[1])-(Math.floor(d.rows/2)*d.symbol_size)];
},
/**расчет коллайдеров*/
update_player_collider(){
	d.save.world.players[d.save.player.nickname].position.collider=[[d.save.world.players[d.save.player.nickname].position.coordinates[0],d.save.world.players[d.save.player.nickname].position.coordinates[1]],[d.save.world.players[d.save.player.nickname].position.coordinates[0]+d.logical_symbol_size,d.save.world.players[d.save.player.nickname].position.coordinates[1]+d.logical_symbol_size]];
},
/**расчет коллизии*/
update_collision(ground_collider=d.save.temp.ground.collider){
	f.update_player_collider();
	let nickname=d.save.player.nickname,
	position=['save','world','players',nickname,'position'],
	touch_wall=[...position,'touch_wall'],
	collider=[...position,'collider'];
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
	for(let y=_.get(d,[...collider,0,1]);y<_.get(d,[...collider,1,1]);y++){
		for(let x=_.get(d,[...collider,0,0]);x<_.get(d,[...collider,1,0]);x++){
			// Проверка снизу
			if(_.get(ground_collider,[y+1,x])){
				_.set(d,[...touch_wall,'below'],true);
			}
			// Проверка сверху
			if(_.get(ground_collider,[y-1,x])){
				_.set(d,[...touch_wall,'higher'],true);
			}
			// Проверка справа
			if(_.get(ground_collider,[y,x+1])){
				_.set(d,[...touch_wall,'right'],true);
			}
			// Проверка слева
			if(_.get(ground_collider,[y,x-1])){
				_.set(d,[...touch_wall,'left'],true);
			}
		}
	}
},
/**устанавливает рамку на активный слот хотбара*/
update_active_hotbar_slot_frame(){
	if(d.save.player.interface.hotbar.slot_count==0)return;
	let active_hotbar_slot_frame=document.getElementById('active_hotbar_slot_frame');
	if(!active_hotbar_slot_frame){
		active_hotbar_slot_frame=f.create_element_from_HTML(`<img id="active_hotbar_slot_frame" src="images/interface/inventory/active_slot_frame.png"/>`);
	}
	document.querySelector(`.hotbar_slot[data-index="${d.save.player.interface.hotbar.active_slot_index}"]`).appendChild(active_hotbar_slot_frame);
},
/**генерирует хотбар*/
generate_hotbar(player=d.save.player,functional=true){
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
generate_esc_menu(){
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
update_interface(){
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
set_interface_visibility(is_visible){
	d.interface.style.visibility=(is_visible?'visible':'collapse');
},
/**активирует прошлый слот хотбара*/
activate_previous_hotbar_slot(){
	d.save.player.interface.hotbar.active_slot_index--;
	if(d.save.player.interface.hotbar.active_slot_index<0){
		d.save.player.interface.hotbar.active_slot_index=d.save.player.interface.hotbar.slot_count-1;
	}
	f.update_active_hotbar_slot_frame();
},
/**активирует следующий слот хотбара*/
activate_next_hotbar_slot(){
	d.save.player.interface.hotbar.active_slot_index++;
	if(d.save.player.interface.hotbar.active_slot_index>=d.save.player.interface.hotbar.slot_count){
		d.save.player.interface.hotbar.active_slot_index=0;
	}
	f.update_active_hotbar_slot_frame();
},
verify_permission(handle, withWrite) {
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
// Добавляем прокси для localStorage
getStorage(key) {
  return window.SANDBOX_PROXY.getStorage(key);
},
setStorage(key, value) {
  return window.SANDBOX_PROXY.setStorage(key, value);
},
fetch_json(path){
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
load_languages(){
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
character_to_element(character){
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
create_characters_list(){
	let characters_list=f.create_element_from_HTML('<div id="characters_list" class="column"></div>');
	for(let character of d.characters){
		let character_element=f.character_to_element(character);
		characters_list.appendChild(character_element);
		characters_list.appendChild(f.get_br());
		characters_list.appendChild(f.get_br());
	}
	return characters_list;
},
save_character(character){
	f.write_file(`YOUR_DATA/characters/${character.nickname}.json`,f.object_to_string(character)).then(()=>{
		f.print_to_chat(d.language.notifications.character_saved);
	});
},
update_characters_list(){
	d.save.temp.room.data.characters_list_div.replaceChildren(f.create_characters_list());
},
save_character_update_list(character){
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
world_to_element(world){
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
create_worlds_list(){
	let worlds_list=f.create_element_from_HTML('<div id="worlds_list" class="column"></div>');
	for(let world of d.worlds){
		let world_element=f.world_to_element(world);
		worlds_list.appendChild(world_element);
		worlds_list.appendChild(f.get_br());
		worlds_list.appendChild(f.get_br());
	}
	return worlds_list;
},
save_world(world){
	f.write_file(`YOUR_DATA/worlds/${world.name}.json`,f.object_to_string(world)).then(()=>{
		f.print_to_chat(d.language.notifications.world_saved);
	});
},
update_worlds_list(){
	d.save.temp.room.data.worlds_list_div.replaceChildren(f.create_worlds_list());
},
save_world_update_list(world){
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
load_save(data){
	d.loadable_save_data=_.cloneDeep(data);
	f.change_room(d.save.world.players[d.save.player.nickname].position.room_id);
},
/**начать подготову комнаты*/
prepare(preparation_func){
	if(!d.save.temp.room.preparation)return
	preparation_func();
	f.finish_preparation();
},
/**завершить подготовку комнаты*/
finish_preparation(){
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
render_player(player=_.get(d,['save','player'])){
	let basePath=['save','world','players',player.nickname],
	player_nickname=_.get(player,['nickname']);
	//Символическое представление игрока
	if(_.get(player,['is_symbolic'])){
		/*расчет скина игрока*/
		const fractional=[false,false];
		for(let i=0;i<=1;i++){
			const coord=_.get(d,[...basePath,'position','coordinates',i]);
			if(coord/d.logical_symbol_size!==Math.floor(coord/d.logical_symbol_size)){
				fractional[i]=true;
			}
		}
		const player_skin=(fractional[0]?(fractional[1]?'▗▖\n▝▘':'▐▌'):(fractional[1]?'▄\n▀':'█'));
		/*отрисовка игрока*/
		f.focus_camera_on_player();
		const coord0=_.get(d,[...basePath,'position','coordinates',0]);
		const coord1=_.get(d,[...basePath,'position','coordinates',1]);
		let rendering_coordinates=[f.logical_to_screen(coord0)-(_.get(d,['save','temp','camera',0])||d.save.temp.camera&&d.save.temp.camera[0]||0),f.logical_to_screen(coord1)-(_.get(d,['save','temp','camera',1])||d.save.temp.camera&&d.save.temp.camera[1]||0)];
		if(fractional[0]) rendering_coordinates[0]--;
		if(fractional[1]) rendering_coordinates[1]--;
		f.print_text_to_symbols_grid(player_skin,rendering_coordinates[0]/d.symbol_size,rendering_coordinates[1]/d.symbol_size);
	}
	//Ник над персонажем — создаётся один раз и потом только перемещается
	if(!d.nickname_labels)d.nickname_labels=new Map();
	//Вычисляем центр верхней границы коллайдера в логических координатах
	let collider=[...basePath,'position','collider'],
	x=(_.get(d,[...collider,0,0])+_.get(d,[...collider,1,0]))/2,
	y=_.get(d,[...collider,0,1]);
	//Переводим в экранные пиксели
	let camera=['save','temp','camera'],
	screen_x=Math.round(f.logical_to_screen(x)-_.get(d,[...camera,0],0)),
	screen_y=Math.round(f.logical_to_screen(y)-_.get(d,[...camera,1],0));
	//Смещаем надпись над головой на расстояние d.symbol_size
	screen_y-=d.symbol_size;

	let label = d.nickname_labels.get(player_nickname);
	if(!label){
		// Создаём контейнер с фоном и текстом (полупрозрачный чёрный фон, alpha = 0.5)
		let container = new PIXI.Container();
		let font_size = d.symbol_size;
		let nick_text = player_nickname ? String(player_nickname) : '';
		let text = new PIXI.Text(nick_text, {
			fontFamily: 'CODERROR',
			fontSize: font_size,
			fill: 0xFFFFFF,
			align: 'center'
		});

		// Use a conservative resolution (based on devicePixelRatio) instead of a large fixed value
		text.resolution = Math.max(1, Math.round(window.devicePixelRatio || 1));
		text.roundPixels = true;
		if(text.anchor) text.anchor.set(0.5, 1);
		else text.pivot.set(text.width/2, text.height);

		let paddingX = Math.ceil(d.symbol_size * 0.4);
		let paddingY = Math.ceil(d.symbol_size * 0.25);
		let bounds = text.getLocalBounds();
		let bg = new PIXI.Graphics();

		bg.beginFill(0x000000, 0.5);
		bg.drawRoundedRect(-bounds.width/2 - paddingX, -bounds.height - paddingY, bounds.width + paddingX*2, bounds.height + paddingY*1.5, Math.max(2, paddingY));
		bg.endFill();

		container.addChild(bg);
		container.addChild(text);

		// store references and paddings for later updates
		container._bg = bg;
		container._text = text;
		container._paddingX = paddingX;
		container._paddingY = paddingY;

		d.app.stage.addChild(container);
		d.nickname_labels.set(player_nickname, container);
		label = container;
	} else {
		// If nickname text changed (rare), update text and re-cache the bitmap
		let t = label._text;
		let desired = player_nickname ? String(player_nickname) : '';
		if(t.text !== desired){
			try{
				t.cacheAsBitmap = false;
			}catch(e){}
			t.text = desired;
			// redraw background size to fit new bounds
			let paddingX = label._paddingX || Math.ceil(d.symbol_size * 0.4);
			let paddingY = label._paddingY || Math.ceil(d.symbol_size * 0.25);
			let bounds = t.getLocalBounds();
			label._bg.clear();
			label._bg.beginFill(0x000000, 0.5);
			label._bg.drawRoundedRect(-bounds.width/2 - paddingX, -bounds.height - paddingY, bounds.width + paddingX*2, bounds.height + paddingY*1.5, Math.max(2, paddingY));
			label._bg.endFill();
			try{
				t.cacheAsBitmap = true;
				label._bg.cacheAsBitmap = true;
				label.cacheAsBitmap = true;
			}catch(e){}
		}
	}

	// Only update position if it actually changed — avoids marking transforms every frame
	if(label.position.x !== screen_x || label.position.y !== screen_y){
		label.position.set(screen_x, screen_y);
	}
},
/**инициализирует систему кастомных курсоров*/
init_cursor_system(){
	/**контейнер для кастомного курсора*/
	d.cursor = document.getElementById('cursor');
	/**текущая конфигурация курсора*/
	d.cursor_config = null;
	/**текущий способ отображения курсора*/
	d.cursor_type = null;
	
	/**обработчик для копирования cursor в data-атрибуты*/
	f.init_cursor_data_attributes();
},
/**Инициализирует data-атрибуты для курсоров*/
init_cursor_data_attributes(){
	// Обрабатываем существующие элементы
	f.process_elements_for_cursor(document.documentElement);
	
	// Наблюдаем за новыми элементами
	const observer = new MutationObserver((mutations) => {
		for(let mutation of mutations){
			for(let node of mutation.addedNodes){
				if(node.nodeType === Node.ELEMENT_NODE){
					f.process_elements_for_cursor(node);
				}
			}
		}
	});
	
	observer.observe(document.body, {
		childList: true,
		subtree: true
	});
},
/**Обрабатывает элементы, копируя cursor в data-атрибут*/
process_elements_for_cursor(root){
	// Получаем все элементы, включая сам root
	const elements = [root, ...root.querySelectorAll('*')];
	
	// Обходим в обратном порядке (снизу вверх) для правильного наследования
	for(let i = elements.length - 1; i >= 0; i--){
		let element = elements[i];
		// Пропускаем уже обработанные элементы
		if(element.hasAttribute('data-cursor-processed')) continue;
		
		// Получаем вычисленный курсор
		const computed_style = window.getComputedStyle(element);
		let cursor_type = computed_style.getPropertyValue('cursor');
		
		// Обрабатываем специальные случаи
		if(cursor_type === 'inherit') {
			// Для inherit находим родительский data-cursor
			cursor_type = f.get_inherited_cursor(element);
		} else if(cursor_type === 'auto') {
			// Для auto используем логику браузера
			cursor_type = f.get_auto_cursor(element);
		}
		
		// Сохраняем в data-атрибут
		element.setAttribute('data-cursor', cursor_type);
		element.style.cursor = 'none';
		
		// Помечаем как обработанный
		element.setAttribute('data-cursor-processed', 'true');
	}
},
/**Получает унаследованный курсор из родительских элементов*/
get_inherited_cursor(element) {
	let parent = element.parentElement;
	while(parent && parent.nodeType === Node.ELEMENT_NODE) {
		if(parent.hasAttribute('data-cursor')) {
			return parent.getAttribute('data-cursor');
		}
		parent = parent.parentElement;
	}
	return 'default';
},
/**Определяет курсор для значения 'auto' на основе типа элемента*/
get_auto_cursor(element) {
	// Логика определения курсора для auto (аналогично браузерной)
	const tagName = element.tagName.toLowerCase();
	const computedStyle = window.getComputedStyle(element);
	
	// Проверяем, является ли элемент кликабельным
	if(element.onclick || 
	   element.hasAttribute('onclick') ||
	   element.closest('[onclick]') ||
	   element.matches('a, button, input[type="button"], input[type="submit"]') ||
	   computedStyle.pointerEvents === 'none') {
		return 'pointer';
	}
	
	// Проверяем, является ли элемент текстовым
	if(element.matches('input, textarea, [contenteditable="true"]') ||
	   computedStyle.userSelect === 'text') {
		return 'text';
	}
	
	// Для изображений и ссылок
	if(element.matches('img, a')) {
		return 'pointer';
	}
	
	// По умолчанию
	return 'default';
},
/**Получает тип курсора из элемента и его родителей*/
get_cursor_from_element(element){
	// Ищем ближайший элемент с data-cursor
	let current = element;
	while(current && current.nodeType === Node.ELEMENT_NODE){
		if(current.hasAttribute('data-cursor')){
			const cursor = current.getAttribute('data-cursor');
			// Если нашли inherit, продолжаем поиск
			if(cursor !== 'inherit') {
				return cursor;
			}
		}
		current = current.parentElement;
	}
	
	// Если не нашли, используем default
	return 'default';
},
/**устанавливает курсор из указанной папки*/
set_cursor(cursor_folder_path){
	f.fetch_json(`${cursor_folder_path}/cursor_config.json`).then(config => {
		if(!config || typeof config !== 'object'){
			console.error('Неверный формат конфигурации курсора');
			return;
		}
		
		d.cursor_config = config;
		d.cursor_folder_path = cursor_folder_path;
	}).catch(error => {
		console.error('Ошибка при загрузке конфигурации курсора:', error);
	});
},
change_title(title){
	window.message_bus.send('change_title',{title}).then(()=>{});
},
init_file_access(){
	return window.message_bus.send('init_file_access',{});
},
file_exists(relPath){
	return window.message_bus.send('file_exists',{relPath});
},
read_file(relPath){
	return window.message_bus.send('read_file',{relPath});
},
write_file(relPath, content) {
    return window.message_bus.send('write_file', {relPath, content});
},
create_directory(relPath){
	return window.message_bus.send('create_directory',{relPath});
},
remove_file(relPath){
	return window.message_bus.send('remove_file',{relPath});
},
remove_directory(relPath){
	return window.message_bus.send('remove_directory',{relPath});
},
list_files(relPath=""){
	return window.message_bus.send('list_files',{relPath});
},
get_system_info(){
	window.message_bus.send('get_system_info',{}).then(system_info=>{
		d.system_info=system_info;
	});
},
/** Определяет тип GPU с улучшенной логикой */
determine_GPU_type(systemInfo) {
    try {
        const gpu = systemInfo?.hardware?.gpu;
        
        if (!gpu || !gpu.renderer) {
            console.warn('GPU information not available');
            return 'unknown';
        }

        const renderer = gpu.renderer.toLowerCase();
        const vendor = gpu.vendor?.toLowerCase() || '';

        console.log('GPU Renderer:', gpu.renderer);
        console.log('GPU Vendor:', gpu.vendor);

        // Ключевые слова для дискретных видеокарт
        const discreteKeywords = [
            'nvidia', 'geforce', 'gtx', 'rtx', 'quadro', 'tesla', 
            'amd', 'radeon', 'rx', 'vega', 'radeon pro', 'radeon rx',
            'intel arc', 'arc a', 'arc',
            // Дополнительные паттерны
            'gpu', 'graphics', 'video card', 'dGPU'
        ];

        // Ключевые слова для интегрированной графики
        const integratedKeywords = [
            'intel', 'hd graphics', 'uhd graphics', 'iris', 'iris pro', 'iris plus',
            'amd radeon', 'vega', 'graphics', 'apu', 
            'microsoft basic render', 'basic display',
            'llvmpipe', 'softpipe', 'software renderer', 'cpu',
            'core i3', 'core i5', 'core i7', 'core i9', 'pentium', 'celeron'
        ];

        // Проверяем WebGL рендерер для дополнительной информации
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        let webglRenderer = '';
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                webglRenderer = (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
            }
        }

        // Объединяем всю информацию для анализа
        const allInfo = (renderer + ' ' + vendor + ' ' + webglRenderer).toLowerCase();

        // Проверяем интегрированную графику в первую очередь (более безопасно)
        const isIntegrated = integratedKeywords.some(keyword => 
            allInfo.includes(keyword.toLowerCase())
        );

        // Проверяем дискретные карты
        const isDiscrete = discreteKeywords.some(keyword => 
            allInfo.includes(keyword.toLowerCase())
        );

        // Эвристика на основе типичных паттернов
        if (allInfo.includes('nvidia') && !allInfo.includes('integrated')) {
            return 'discrete';
        }
        if (allInfo.includes('amd') && !allInfo.includes('integrated') && !allInfo.includes('radeon graphics')) {
            return 'discrete';
        }
        if (allInfo.includes('intel arc')) {
            return 'discrete';
        }

        // Если явно интегрированная
        if (isIntegrated) {
            return 'integrated';
        }

        // Если явно дискретная
        if (isDiscrete) {
            return 'discrete';
        }

        // Дополнительные проверки по WebGL
        if (webglRenderer) {
            if (webglRenderer.includes('nvidia') || webglRenderer.includes('amd') || webglRenderer.includes('radeon')) {
                if (!webglRenderer.includes('integrated') && !webglRenderer.includes('intel')) {
                    return 'discrete';
                }
            }
        }

        // Если ничего не определили, но есть информация о рендерере
        if (renderer && renderer !== 'unknown') {
            // Если рендерер содержит упоминания о GPU, но не интегрированный
            if ((renderer.includes('nvidia') || renderer.includes('amd') || renderer.includes('radeon')) &&
                !renderer.includes('integrated') && !renderer.includes('intel')) {
                return 'discrete';
            }
        }

        return 'unknown';
    } catch (error) {
        console.error('Error determining GPU type:', error);
        return 'unknown';
    }
},

/** Функция для принятия решения о методе рендеринга (улучшенная) */
get_rendering_method(systemInfo) {
    try {
        const gpuType = this.determine_GPU_type(systemInfo);
        
        console.log('Detected GPU type:', gpuType);
        
        // Тестируем производительность WebGL
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            return {
                method: 'cpu',
                reason: 'WebGL не поддерживается - используем программный рендеринг',
                confidence: 'high'
            };
        }

        // Проверяем возможности WebGL
        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        console.log('Max texture size:', maxTextureSize);

        switch (gpuType) {
            case 'discrete':
                return {
                    method: 'gpu',
                    reason: 'Обнаружена дискретная видеокарта - используем аппаратное ускорение',
                    confidence: 'high'
                };
                
            case 'integrated':
                // Для интегрированной графики проверяем производительность
                if (maxTextureSize >= 4096) {
                    return {
                        method: 'gpu', 
                        reason: 'Интегрированная графика с хорошей поддержкой WebGL - используем аппаратное ускорение',
                        confidence: 'medium'
                    };
                } else {
                    return {
                        method: 'cpu',
                        reason: 'Интегрированная графика с ограниченными возможностями - используем программный рендеринг',
                        confidence: 'medium'
                    };
                }
                
            case 'unknown':
            default:
                // Для неизвестных GPU тестируем производительность
                if (maxTextureSize >= 2048) {
                    return {
                        method: 'gpu',
                        reason: 'Неизвестный GPU с хорошими характеристиками - пробуем аппаратное ускорение',
                        confidence: 'low'
                    };
                } else {
                    return {
                        method: 'cpu',
                        reason: 'Неизвестный GPU с ограниченными возможностями - используем безопасный режим (CPU)',
                        confidence: 'medium'
                    };
                }
        }
    } catch (error) {
        console.error('Error determining rendering method:', error);
        return {
            method: 'cpu',
            reason: 'Ошибка определения метода рендеринга - используем безопасный режим',
            confidence: 'high'
        };
    }
}
};

let f=window.CODERROR.__originals__.functions;
}
