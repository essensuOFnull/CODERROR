{
let d=window.CODERROR.CHEATING.data;

window.CODERROR.CHEATING.functions={
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
    if(new_sky_path!=d.current_sky_path){
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
    }
},
/**Инициализация текстуры и спрайта*/
init_three_scene:function() {
    d.background_texture = PIXI.Texture.from(d.three_renderer.domElement);
    d.background_texture.baseTexture.autoUpdate = false;
    d.background_sprite = new PIXI.Sprite(d.background_texture);
    
    // Устанавливаем размер спрайта
    d.background_sprite.width = d.wrapper.clientWidth;
    d.background_sprite.height = d.wrapper.clientHeight;
    
    d.app.stage.addChildAt(d.background_sprite, 0);
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
change_room:function(room_,preparation_=true,reset_overlay_=true){
    d.save.room.id=room_;
    d.save.room.preparation=preparation_;
    if(reset_overlay_){
        d.overlay.innerHTML=``;
    }
},
/**инициализирует матрицу символов*/
init_sumbols_grid:function(){
    d.symbols_grid=[];
    d.columns=0;
    d.rows=0;
    f.update_symbols_grid();
},
/**обновляет размеры матрицы символов*/
update_symbols_grid:function(){
    let newColumns=Math.ceil(d.app.renderer.width/d.symbol_size);
    let newRows=Math.ceil(d.app.renderer.height/d.symbol_size);
    /*Ресайз существующей сетки*/
    if(newColumns!==d.columns||newRows!==d.rows){
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
                    let symbol=new PIXI.Text('',text_style);
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
                    let symbol=new PIXI.Text('',text_style);
                    symbol.resolution=20;
                    symbol.position.set(x*d.symbol_size,y*d.symbol_size);
                    d.app.stage.addChild(symbol);
                    d.symbols_grid[y][x]=symbol;
                }
            }
        }
        d.columns=newColumns;
        d.rows=newRows;
    }
},
set_font_size:function(size_in_pixels){
    d.symbol_size=size_in_pixels;
    d.styleSheet.insertRule(":root{--symbol_size:"+d.symbol_size+"px !important;}",d.styleSheet.cssRules.length);
    text_style=new PIXI.TextStyle({
        fontFamily:'CODERROR',
        fontSize:d.symbol_size,
        trim:false,
        fill:0xFFFFFF,
    });
    f.init_sumbols_grid();
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
/**соединяет объекты в 1 более общий, перезаписывая старые значения новыми*/
smart_merge:function(config_list,max_depth=2){
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
                let merged=f.smart_merge(dicts);
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
                let merged=f.smart_merge(dicts);
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
    if(stored&&stored.name===name){
        /*Удаляем все обработчики событий*/
        element.removeEventListener('drop',stored.handlers.drop);
        element.removeEventListener('click',stored.handlers.click);
        stored.elements.jsonInput.removeEventListener('change',stored.handlers.change);
        /*Удаляем созданный input из DOM если был добавлен*/
        if(document.body.contains(stored.elements.jsonInput)){
            document.body.removeChild(stored.elements.jsonInput);
        }
        d.event_handlers.delete(element);
    }
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
    d.language=f.smart_merge(languages_list,99);
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
/**Функция для сохранения объекта как JSON файл*/
save_as_json:function(data,filename){
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
    f.apply_random_splash();
    /*set_font_size(d.settings.interface.font_size);*/
    f.set_max_content_size(d.settings.interface.max_content_width,d.settings.interface.max_content_height);
    f.change_room(d.save.room.id);
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
    if(!d.audio_initialized){
        d.audio_initialized=true;
        document.removeEventListener('click',f.init_audio);
        if(d.current_music){
            d.current_music.play().catch(f.handle_play_error);
        }
    }
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
            if(!d.ignored_keys.includes(e.code)){
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
        if(!e.repeat){/*Отключаем автоповтор*/
            if(!d.ignored_keys.includes(e.code)){
                let key=getKey(e);
                if(e.type==='keydown'||e.type==='mousedown'||e.type==='wheel'){
                    d.pressed.add(key);
                }else{
                    d.pressed.delete(key);
                }
                f.update_activated_actions();
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
            d.symbols_grid[y][x].backgroundColor=0x00000000;
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
    d.save.room.data.camera=[f.logical_to_screen(d.save.player.coordinates[0])-(Math.floor(d.columns/2)*d.symbol_size),f.logical_to_screen(d.save.player.coordinates[1])-(Math.floor(d.rows/2)*d.symbol_size)];
},
/**расчет коллайдеров*/
update_player_collider:function(){
    d.save.player.collider=[[d.save.player.coordinates[0],d.save.player.coordinates[1]],[d.save.player.coordinates[0]+d.logical_symbol_size,d.save.player.coordinates[1]+d.logical_symbol_size]];
},
/**расчет коллизии*/
update_collision:function(ground_collider=d.save.room.data.ground.collider){
    f.update_player_collider();
    /**упирается ли игрок в стену снизу*/
    d.save.player.touch_wall.below=false;
    /**упирается ли игрок в стену слева*/
    d.save.player.touch_wall.left=false;
    /**упирается ли игрок в стену справа*/
    d.save.player.touch_wall.right=false;
    /**упирается ли игрок в стену сверху*/
    d.save.player.touch_wall.higher=false;
    for(let y=d.save.player.collider[0][1];y<d.save.player.collider[1][1];y++){
        for(let x=d.save.player.collider[0][0];x<d.save.player.collider[1][0];x++){
            let coordinates=[x,y+1];
            if(coordinates.every(num=>num>=0)){
                try{
                    if(ground_collider[coordinates[1]][coordinates[0]]){
                        d.save.player.touch_wall.below=true;
                    }
                }catch{}
            }
            coordinates=[x,y-1];
            if(coordinates.every(num=>num>=0)){
                try{
                    if(ground_collider[coordinates[1]][coordinates[0]]){
                        d.save.player.touch_wall.higher=true;
                    }
                }catch{}
            }
            coordinates=[x+1,y];
            if(coordinates.every(num=>num>=0)){
                try{
                    if(ground_collider[coordinates[1]][coordinates[0]]){
                        d.save.player.touch_wall.right=true;
                    }
                }catch{}
            }
            coordinates=[x-1,y];
            if(coordinates.every(num=>num>=0)){
                try{
                    if(ground_collider[coordinates[1]][coordinates[0]]){
                        d.save.player.touch_wall.left=true;
                    }
                }catch{}
            }
        }
    }
},
/**устанавливает рамку на активный слот хотбара*/
update_active_hotbar_slot_frame:function(){
    let active_hotbar_slot_frame=document.getElementById('active_hotbar_slot_frame');
    if(!active_hotbar_slot_frame){
        active_hotbar_slot_frame=f.create_element_from_HTML(`<img id="active_hotbar_slot_frame" src="images/interface/inventory/active_slot_frame.png"/>`);
    }
    document.querySelector(`.hotbar_slot[data-index="${d.save.player.interface.hotbar.active_slot_index}"]`).appendChild(active_hotbar_slot_frame);
},
/**генерирует хотбар*/
generate_hotbar:function(){
    let hotbar=f.create_element_from_HTML(`<div id="hotbar" class="row"></div>`);
    for(let i=0;i<d.save.player.interface.hotbar.slot_count;i++){
        let slot=document.createElement('div');
        slot.dataset.index=i;
        slot.classList.add('hotbar_slot');
        slot.addEventListener('click',function(e){
            d.save.player.interface.hotbar.active_slot_index=this.dataset.index;
            f.update_active_hotbar_slot_frame();
        });
        hotbar.appendChild(slot);
    }
    return hotbar;
},
generate_esc_menu:function(){
    let esc_menu=f.create_element_from_HTML(`<div id="esc_menu"></div>`);
    let button_to_main_menu=f.create_button_from_text(d.language.interface.buttons.to_main_menu);
    button_to_main_menu.addEventListener('click',()=>{
        if(confirm(d.language.confirms.is_need_save)){
            f.save_as_json(d.save,`${1e16-Date.now()} - CODERROR ${window.version} d.save.json`);
        }
        f.change_room('main_menu');
    });
    button_to_main_menu.id='button_to_main_menu';
    esc_menu.appendChild(button_to_main_menu);
    return esc_menu;
},
/**генерирует интерфейс*/
update_interface:function(){
    d.interface.innerHTML='';
    d.interface.appendChild(f.generate_hotbar());
    f.update_active_hotbar_slot_frame();
    d.interface.appendChild(f.generate_esc_menu());
},
/**включает/отключает интерфейс*/
set_interface_visibility:function(is_visible){
    if(is_visible){
        d.interface.style.visibility='visible';
    }else{
        d.interface.style.visibility='collapse';
    }
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
/**завершить подготовку комнаты*/
finish_preparation:function(){
    d.save.room.preparation=false;
    if(d.loadable_save_data){
        d.save=d.loadable_save_data;
        d.loadable_save_data=null;
        f.update_interface();
    }
},
/**загружает сохранение*/
load_save:function(data){
    d.loadable_save_data=data;
    f.change_room(data.room.id);
}
};

let f=window.CODERROR.CHEATING.functions;
}