{
let f=window.CODERROR.__originals__.functions,
d=window.CODERROR.__originals__.data,
f_s=window.CODERROR.CHEATING.functions;

let MS_PER_UPDATE=1000/d.fixed_TPS; // Шаг в миллисекундах
let previous_time=performance.now();
let lag=0;
let tps_count=0;
let last_measure=performance.now();
setInterval(()=>{
    let now=performance.now();
    d.TPS=Math.round(tps_count*1000/(now-last_measure))||0;
    tps_count=0;
    last_measure=now;
},1000);
/*инициализация интерфейса*/
f.update_interface();
/**заблокировать ли инвентарь*/
d.lock_inventory=false;
/*функция главного цикла*/
function update_game_logic(){
    document.title=`CODERROR ${d.version} TPS: ${d.TPS} FPS: ${d.FPS} - ${d.splash}`;
    if(!(!window.has_focus&&d.settings.interface.pause_on_blur)){
        if(d.save.room.preparation){
            f.print_to_chat(d.language.notifications.current_room(d.save.room.id));
        }
        tps_count++;
        /*переключение слотов хотбара*/
        if(document.getElementById('hotbar')){
            if(d.activated_actions.has('previous_hotbar_slot')){
                f.activate_previous_hotbar_slot();
            }
            if(d.activated_actions.has('next_hotbar_slot')){
                f.activate_next_hotbar_slot();
            }
        }
        /*открытие/закрытие инвентаря*/
        let open_inventory=false,close_inventory=false;
        if(d.activated_actions.has('open_inventory')){
            open_inventory=true;
        }
        if(d.activated_actions.has('close_inventory')){
            close_inventory=true;
        }
        if(open_inventory||close_inventory){
            if(!d.lock_inventory){
                /**меню, возникающее при escape (по умолчанию)*/
                d.esc_menu=document.getElementById('esc_menu');
                if(open_inventory&&close_inventory){
                    if(d.esc_menu.style.visibility=='inherit'){
                        d.esc_menu.style.visibility='collapse';
                    }else{
                        d.esc_menu.style.visibility='inherit';
                    }
                }else if(open_inventory){
                    d.esc_menu.style.visibility='inherit';
                }else{
                    d.esc_menu.style.visibility='collapse';
                }
            }
            d.lock_inventory=true;
        }else{
            d.lock_inventory=false;
        }
        /*комнаты*/
        if(d.save.room.id=='disclaimer'){
            if(d.save.room.preparation){
                f.init_audio();
                f.set_interface_visibility(false);
                d.save.room.data={
                    scrollable:f.create_element_from_HTML(`<div class='scrollable'/>`),
                    div:f.create_element_from_HTML(`<div class="center column fill-parent"/>`),
                    button_continue:f.create_button_from_text(`принять риск и продолжить\n\ntake the risk and continue`),
                }
                d.save.room.data.scrollable.appendChild(d.save.room.data.div);
                d.save.room.data.div.appendChild(f.create_element_from_HTML(`<div>${f.get_transparent_space_text(`ДИСКЛЕЙМЕР | DISCLAIMER`,'#FF1D34')}</div>`));
                d.save.room.data.div.appendChild(f.get_br());
                d.save.room.data.div.appendChild(f.get_symbolic_hr());
                d.save.room.data.div.appendChild(f.get_br());
                d.save.room.data.div.appendChild(f.create_element_from_HTML(`<div style='text-align:center'>${f.get_transparent_space_text(`Игра содержит часто сменяющиеся мелькающие цвета, что может вызвать приступ эпилепсии.\n\nАвтор не чурается использовать информацию из любых источников, такую как аудио и текстуры, даже если они возможно обладают авторскими правами, и просит простить его за это)`,'#FF1D34')}</div>`));
                d.save.room.data.div.appendChild(f.get_br());
                d.save.room.data.div.appendChild(f.get_symbolic_hr());
                d.save.room.data.div.appendChild(f.get_br());
                d.save.room.data.div.appendChild(f.create_element_from_HTML(`<div style='text-align:center'>${f.get_transparent_space_text(`The game contains frequently changing flashing colors, which may cause an epileptic seizure.\n\nThe author does not shy away from using information from any source, such as audio and textures, even if they may have copyrights, and asks for forgiveness for this)`,'#FF1D34')}</div>`));
                d.save.room.data.div.appendChild(f.get_br());
                d.save.room.data.div.appendChild(f.get_symbolic_hr());
                d.save.room.data.div.appendChild(f.get_br());
                d.save.room.data.div.appendChild(d.save.room.data.button_continue);
                d.save.room.data.button_continue.addEventListener('click',()=>{
                    f.change_room('main_menu');
                });
                f.change_button_text_color(d.save.room.data.button_continue,'#FF1D34');
                d.overlay.appendChild(d.save.room.data.scrollable);
            }
        }
        if(d.save.room.id=='main_menu'){
            if(d.save.room.preparation){
                f.set_sky('images/skies/glitch','png');
                f.set_music('music/main_menu.mp3');
                f.set_interface_visibility(false);
                d.save.room.data={
                    info:f.create_element_from_HTML(`<div>${f.get_transparent_space_text(`CODERROR ${d.version} by essensuOFnull`,'#c8c8c8')}</div>`),
                    logo:f.create_element_from_HTML(`<div class="center-horizontal">${f.get_transparent_space_text(String.raw`
/T\ /T\ PT\ P] PT\ PT\ /T\ PT\
L U L q L q H  L q L q L q L q
L   L q L q H] L_/ L_/ L q L_/
L n L q L q H  U n U n L q U n
\_/ \_/ L_/ L] U U U U \_/ U U`.trim())}</div>`),
                    scrollable:f.create_element_from_HTML(`<div class="scrollable"/>`),
                    buttons_div:f.create_element_from_HTML(`<div class="center column fill-parent"/>`),
                    buttons:f.dict_to_buttons(d.language.rooms[d.save.room.id].buttons),
                    bug_counter:0
                };
                d.overlay.appendChild(d.save.room.data.info);
                d.overlay.appendChild(d.save.room.data.logo);
                Object.entries(d.save.room.data.buttons).forEach(([name,el])=>{
                    d.save.room.data.buttons_div.appendChild(el);
                    d.save.room.data.buttons_div.appendChild(f.get_br());
                });
                d.save.room.data.scrollable.appendChild(d.save.room.data.buttons_div);
                d.overlay.appendChild(d.save.room.data.scrollable);
                d.save.room.data.buttons.new_game.addEventListener('click',()=>{
                    f.change_room('intro0');
                });
                d.save.room.data.buttons.continue.addEventListener('click',()=>{
                    f.change_room('continue');
                });
                d.save.room.data.buttons.settings.addEventListener('click',()=>{
                    f.change_room('settings');
                });
                d.save.room.data.buttons.authors.addEventListener('click',()=>{
                    f.change_room('authors');
                });
                d.save.room.data.buttons.room_editor.addEventListener('click',()=>{
                    f.change_room('room_editor');
                });
                f.change_button_border_color(d.save.room.data.buttons.donation,'#ffd700');
                // Сделать кнопку пожертвования "эпичной": добавить класс для пульсации
                if(d.save.room.data.buttons.donation && !d.save.room.data.buttons.donation.classList.contains('epic-donation-button')){
                    d.save.room.data.buttons.donation.classList.add('epic-donation-button');
                }
                d.save.room.data.buttons.donation.addEventListener('click',()=>{
                    window.open('https://tbank.ru/cf/4yH9fggd9e9','_blank');
                });
                f.change_button_color(d.save.room.data.buttons.exit,'#f00');
                d.save.room.data.buttons.exit.addEventListener('click',()=>{
                    alert("⚠️ ERROR 400: Bad Request");
                    self.close();
                });
            }
            f.rotate_sky(0.005,0.01,0);
        }
        if(d.save.room.id=='authors'){
            if(d.save.room.preparation){
                f.set_sky('images/skies/glitch_anime_girls','png',false);
                f.set_music('music/main_menu.mp3');
                f.set_interface_visibility(false);
                d.save.room.data={
                    scrollable:f.create_element_from_HTML(`<div class="scrollable"/>`),
                    div1:f.create_element_from_HTML(`<div class="center column"/>`),
                    contribution:structuredClone(Object.entries(d.language.contribution)),
                    div2:f.create_element_from_HTML(`<div class="center column"/>`),
                    buttons:{
                        back:f.create_button_from_text(`назад`)
                    },
                    y_sky_rotation:0,
                };
                d.overlay.appendChild(d.save.room.data.scrollable);
                d.save.room.data.scrollable.appendChild(d.save.room.data.div1);
                d.save.room.data.contribution.forEach(([name,contribution],i)=>{
                    d.save.room.data.contribution[i]=f.create_element_from_HTML(`<div>${f.get_transparent_space_text(`${name}⦑reset⦒ - ${contribution}`)}</div>`);
                    d.save.room.data.div1.appendChild(f.get_br());
                    d.save.room.data.div1.appendChild(d.save.room.data.contribution[i]);
                });
                d.overlay.appendChild(d.save.room.data.div2);
                d.save.room.data.div2.appendChild(d.save.room.data.buttons.back);
                d.save.room.data.buttons.back.addEventListener('click',()=>{
                    f.change_room('main_menu');
                });
            }
            f.set_sky_rotation((d.mouse.y-wrapper.clientHeight/2)/1000,d.save.room.data.y_sky_rotation+(d.mouse.x-wrapper.clientWidth/2)/1000,0);
            if(d.save.room.data.y_sky_rotation==Math.PI){
                d.save.room.data.y_sky_rotation=0;
            }
            d.save.room.data.y_sky_rotation+=0.005;
        }
        if(d.save.room.id=='settings'){
            if(d.save.room.preparation){
                f.set_sky('images/skies/glitch','png');
                f.set_music('music/main_menu.mp3');
                f.set_interface_visibility(false);
                d.save.room.data={
                    scrollable:f.create_element_from_HTML(`<div class='scrollable'/>`),
                    div1:f.create_element_from_HTML(`<div class="center column"/>`),
                    drop_zone:f.wrap_in_frame(f.create_element_from_HTML(`<div class='drop_zone center'><div style='text-align:center;'>${f.get_transparent_space_text(d.language.rooms[d.save.room.id].drop_zone)}</div></div>`)),
                    div2:f.create_element_from_HTML(`<div class="center wrap"/>`),
                    buttons:f.dict_to_buttons(d.language.rooms[d.save.room.id].buttons),
                    settings_divs:{},
                };
                /*предсоздание разметки*/
                d.overlay.appendChild(d.save.room.data.scrollable);
                d.save.room.data.scrollable.appendChild(d.save.room.data.div1);
                d.save.room.data.div1.appendChild(d.save.room.data.drop_zone);
                d.save.room.data.div1.appendChild(f.get_br());
                Object.entries(d.language.settings).forEach(([section_id,section])=>{
                    d.save.room.data.div1.appendChild(f.get_symbolic_hr());
                    d.save.room.data.div1.appendChild(f.create_element_from_HTML(`<div>${f.get_transparent_space_text(section.name)}</div>`));
                    d.save.room.data.div1.appendChild(f.get_symbolic_hr());
                    d.save.room.data.div1.appendChild(f.get_br());
                    d.save.room.data.settings_divs[section_id]={};
                    Object.entries(section.options).forEach(([option_id,option])=>{
                        d.save.room.data.settings_divs[section_id][option_id]=f.create_element_from_HTML(`<div class='center'></div>`);
                        d.save.room.data.settings_divs[section_id][option_id].appendChild(f.create_element_from_HTML(`<div>${f.get_transparent_space_text(`${option.name}: `)}</div>`));
                        /*заполнение текущими значениями и необходимыми элементами интерфейса в зависимости от типа настройки*/
                        let values=f.create_element_from_HTML(`<div id='values'></div>`);
                        d.save.room.data.settings_divs[section_id][option_id].appendChild(values);
                        if(section_id=='interface'){
                            if(option_id=='language'){
                                let add_button=f.create_button_from_text(d.language.rooms[d.save.room.id].button_add);
                                f.change_button_text_color(add_button,'#0f0');
                                values.appendChild(add_button);
                                let create_select=()=>{
                                    let[select_button,select]=f.create_select_with_frame(Object.keys(d.languages).filter(name=>name!=='default'),true);
                                    values.insertBefore(select_button,add_button);
                                    select_button.addEventListener('mouseover',()=>{
                                        f.change_button_border_color(select_button,'#f0f');
                                    });
                                    select_button.addEventListener('mouseout',()=>{
                                        f.change_button_border_color(select_button,'#fff');
                                    });
                                    return select;
                                }
                                for(let language of d.settings.interface.language){
                                    create_select().value=language;
                                }
                                add_button.addEventListener('click',()=>{
                                    create_select();
                                });
                                add_button.addEventListener('mouseover',()=>{
                                    f.change_button_border_color(add_button,'#f0f');
                                });
                                add_button.addEventListener('mouseout',()=>{
                                    f.change_button_border_color(add_button,'#fff');
                                });
                            }
                            if(['font_size','max_content_width','max_content_height'].includes(option_id)){
                                let[frame,textarea]=f.create_textarea_with_frame(option.placeholder);
                                textarea.value=d.settings[section_id][option_id];
                                textarea.addEventListener('input',(e)=>{
                                    d.settings[section_id][option_id]=e.target.value;
                                });
                                values.appendChild(frame);
                                frame.addEventListener('mouseover',()=>{
                                    f.change_button_border_color(frame,'#f0f');
                                });
                                frame.addEventListener('mouseout',()=>{
                                    f.change_button_border_color(frame,'#fff');
                                });
                            }
                            if(option_id=='pause_on_blur'){
                                let checkbox=f.create_element_from_HTML(`<input type="checkbox">`);
                                checkbox.checked=d.settings[section_id][option_id];
                                checkbox.addEventListener('change',function(){
                                    d.settings[section_id][option_id]=checkbox.checked;
                                });
                                values.appendChild(checkbox);
                            }
                        }
                        if(section_id=='audio'){
                            if(option_id=='music_volume'){
                                let range_input=f.create_element_from_HTML(`<input type="range" min="0" max="1" step="0.01" value="${d.settings[section_id][option_id]}"/>`);
                                range_input.addEventListener('input',()=>{
                                    range_input.setAttribute('value',range_input.value);
                                    f.set_volume(range_input.value);
                                    d.settings[section_id][option_id]=range_input.value;
                                });
                                values.appendChild(range_input);
                            }
                        }
                        if(section_id=='control'){
                            if(option_id=='bind_to_layout'){
                                let checkbox=f.create_element_from_HTML(`<input type="checkbox">`);
                                checkbox.checked=d.settings[section_id][option_id];
                                checkbox.addEventListener('change',function(){
                                    d.settings[section_id][option_id]=checkbox.checked;
                                });
                                values.appendChild(checkbox);
                            }else{
                                let add_button=f.create_button_from_text(d.language.rooms[d.save.room.id].button_add);
                                f.change_button_text_color(add_button,'#0f0');
                                values.appendChild(add_button);
                                let create_button=(text)=>{
                                    let button=f.create_button_from_text(text,true);
                                    button.value=text;
                                    values.insertBefore(button,add_button);
                                    button.addEventListener('mouseover',()=>{
                                        f.change_button_border_color(button,'#f0f');
                                    });
                                    button.addEventListener('mouseout',()=>{
                                        f.change_button_border_color(button,'#fff');
                                    });
                                    button.addEventListener('click',()=>{
                                        f.change_button_text(button,d.language.rooms[d.save.room.id].messages.input);
                                        setTimeout(()=>{
                                            f.wait_user_input().then((result)=>{
                                                f.change_button_text(button,result);
                                                button.value=result;
                                            });
                                        },100);
                                    });
                                    return button;
                                }
                                for(let control of d.settings[section_id][option_id]){
                                    create_button(control);
                                }
                                add_button.addEventListener('click',()=>{
                                    create_button().click();
                                });
                                add_button.addEventListener('mouseover',()=>{
                                    f.change_button_border_color(add_button,'#f0f');
                                });
                                add_button.addEventListener('mouseout',()=>{
                                    f.change_button_border_color(add_button,'#fff');
                                });
                            }
                        }
                        /**/
                        d.save.room.data.div1.appendChild(d.save.room.data.settings_divs[section_id][option_id]);
                        d.save.room.data.div1.appendChild(f.get_br());
                    });
                });
                /*завершение предсоздания интерфейса*/
                d.overlay.appendChild(d.save.room.data.div2);
                d.save.room.data.div2.appendChild(d.save.room.data.buttons.apply);
                d.save.room.data.div2.appendChild(f.get_space());
                d.save.room.data.div2.appendChild(d.save.room.data.buttons.back);
                d.save.room.data.div2.appendChild(f.get_space());
                d.save.room.data.div2.appendChild(d.save.room.data.buttons.save);
                f.add_event_listener('get_json',d.save.room.data.drop_zone,(data)=>{
                    d.settings=f.smart_merge([d.settings,data],9);
                    f.apply_settings();
                });
                d.save.room.data.buttons.back.addEventListener('click',()=>{
                    f.change_room('main_menu');
                });
                d.save.room.data.buttons.save.addEventListener('click',()=>{
                    f.save_as_json(d.settings,'settings.json');
                });
                d.save.room.data.buttons.apply.addEventListener('click',()=>{
                    let language_list=[];
                    for(let select of d.save.room.data.settings_divs.interface.language.querySelectorAll('select')){
                        language_list.push(select.value);
                    }
                    language_list=f.remove_duplicates(language_list);
                    d.settings.interface.language=language_list;
                    for(let[option_id,option]of Object.entries(d.save.room.data.settings_divs.control)){
                        if(option_id!='bind_to_layout'){
                            let control_list=[];
                            for(button of option.querySelectorAll('button')){
                                if(button.value){
                                    control_list.push(button.value);
                                }
                            }
                            d.settings.control[option_id]=f.remove_duplicates(control_list);
                        }
                    }
                    f.apply_settings();
                });
            }
            f.rotate_sky(0.005,0.01,0);
        }
        if(d.save.room.id=='continue'){
            if(d.save.room.preparation){
                f.set_sky('images/skies/glitch','png');
                f.set_music('music/main_menu.mp3');
                f.set_interface_visibility(false);
                d.save.room.data={
                    scrollable:f.create_element_from_HTML(`<div class='scrollable'/>`),
                    div1:f.create_element_from_HTML(`<div class="center column"/>`),
                    drop_zone:f.wrap_in_frame(f.create_element_from_HTML(`<div class='drop_zone center'><div style='text-align:center;'>${f.get_transparent_space_text(d.language.rooms[d.save.room.id].drop_zone)}</div></div>`)),
                    div2:f.create_element_from_HTML(`<div class="center wrap"/>`),
                    buttons:f.dict_to_buttons(d.language.rooms[d.save.room.id].buttons),
                    settings_divs:{},
                };
                d.overlay.appendChild(d.save.room.data.scrollable);
                d.save.room.data.scrollable.appendChild(d.save.room.data.div1);
                d.save.room.data.div1.appendChild(d.save.room.data.drop_zone);
                d.save.room.data.div1.appendChild(f.get_br());
                d.overlay.appendChild(d.save.room.data.div2);
                d.save.room.data.div2.appendChild(d.save.room.data.buttons.back);
                f.add_event_listener('get_json',d.save.room.data.drop_zone,(data)=>{
                    f.load_save(data);
                });
                d.save.room.data.buttons.back.addEventListener('click',()=>{
                    f.change_room('main_menu');
                });
            }
            f.rotate_sky(0.005,0.01,0);
        }
        if(d.save.room.id=='room_editor'){
            if(d.save.room.preparation){
                f.set_interface_visibility(true);
                f.clear_symbols_grid();
            }
        }
        if(d.save.room.id=='intro0'){
            if(d.save.room.preparation){
                f.set_music('music/Errorscape.mp3');
                f.set_interface_visibility(false);
                f.clear_pixijs();
                let video=document.createElement('video');
                //video.crossOrigin="anonymous";
                video.src='videos/intro/0.mp4';
                video.muted=true;// Часто требуется для автовоспроизведения
                video.autoplay=true;
                video.addEventListener('loadeddata',()=>{
                    let texture=PIXI.Texture.from(video);
                    let sprite=new PIXI.Sprite(texture);
                    sprite.anchor.set(0.5);
                    sprite.x=d.app.screen.width/2;
                    sprite.y=d.app.screen.height/2;
                    d.app.stage.addChild(sprite);
                });
                video.addEventListener('ended',()=>{
                    f.clear_pixijs();
                    f.init_symbols_grid();
                    f.init_three_scene();
                    f.change_room('recycle_bin');
                });
            }
        }
        if(d.save.room.id=='recycle_bin'){
            if(d.save.room.preparation){
                f.set_sky('images/skies/glitch','png');
                f.set_music('music/Errorscape.mp3');
                f.set_interface_visibility(true);
                d.save.room.data={
                    ground:{
                        text:'   ░▒▓*#-~\n ░▒▓~~-~#=\\\n    ░▒▓#=*-\\__\n              \\^\n                \\\n                 \\\n                 |\n                 |\n                 |\n                  \\\n                  <_\n                    \\\n                     \\\n                      \\\n                       7\n                       \\\n                        \\_\n                          L\n                           \\__\n                              \\\n                               7\n                              /\n                              \\\n                               |\n                               |\n                               |\n                               |\n                              /\n                             |\n                             |\n                             /\n                            /\n                           /\n                        __/\n                       /  \n                      <\n                       \\\n                        7\n                       /         ____\n                      F         /    \\_ \n                      ]         L      \\___\n                     /          /          l\n                     |         F           |\n                     |         L           `\n                     |         /            L____\n                     |         \\______           L\n                     )          \\     \\____       \\_\n                     )          <____      \\_       L_____\n                     \\          /    \\       \\            L_\n                     Г         F    , \\_     |              \\__\n                     \\         \\ /`< , _|    |                /\n                      Y         Y   Z,/     _/               <______\n                      |         `  `  |    |_\n                      /         /     |      \\\n                     /         Г      \\_\n                     |         L       _|\n                     /          \\       \n                     >          <\n                     >          <\n                     >          <\n                     \\          /\n                     Y          Y\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I          I\n                     I__________I_____',
                        collider:[]},
                    camera:[0,0]
                };
                Object.assign(d.save.player,
                    {
                        coordinates:[35*d.logical_symbol_size,-25*d.logical_symbol_size],
                        collider:[],
                        walk_delay:0,
                        max_walk_delay:2,
                    }
                );
                d.save.room.data.ground.collider=f.text_to_collider(d.save.room.data.ground.text);
            }
            f.rotate_sky(0.005,0.01,0);
            f.update_collision();
            /*обработка движения*/
            if(d.save.player.walk_delay<=0){
                if(!d.save.player.touch_wall.right&&d.activated_actions.has('right')){
                    d.save.player.coordinates[0]=Math.round(d.save.player.coordinates[0]+0.5*d.logical_symbol_size);
                    d.save.player.walk_delay=d.save.player.max_walk_delay;
                    f.update_collision();
                }
                if(!d.save.player.touch_wall.left&&d.activated_actions.has('left')){
                    d.save.player.coordinates[0]=Math.round(d.save.player.coordinates[0]-0.5*d.logical_symbol_size);
                    d.save.player.walk_delay=d.save.player.max_walk_delay;
                    f.update_collision();
                }
            }else{
                d.save.player.walk_delay--;
            }
            if(!d.save.player.touch_wall.higher&&d.activated_actions.has('jump')){
                d.save.player.coordinates[1]=Math.round(d.save.player.coordinates[1]-0.5*d.logical_symbol_size);
                f.update_collision();
            }else if(!d.save.player.touch_wall.below){
                d.save.player.coordinates[1]=Math.round(d.save.player.coordinates[1]+0.5*d.logical_symbol_size);
                f.update_collision();
            }
        }
        window.CODERROR.PERMITTED.functions={
            apply_language:f_s.apply_language,
            set_max_content_size:f_s.set_max_content_size,
            apply_random_splash:f_s.apply_random_splash,
            apply_settings:f_s.apply_settings
        };
        /*деактивируем прокрутку колесика мыши*/
        d.pressed.delete(`WheelUp`);
        d.pressed.delete(`WheelDown`);
        f.update_activated_actions();
        if(d.save.room.preparation){
            f.finish_preparation();
        }
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
}