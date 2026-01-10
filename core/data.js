window.CODERROR.__originals__.data={
/**версия CODERROR'а*/
version:'(1)0.38.1',
/**целевой TPS (количество итераций физики мира в секунду)*/
fixed_TPS:60,
/**фактический TPS*/
TPS:0,
/**средний FPS за секунду*/
FPS:0,
/**клавиши которые нельзя забиндить*/
ignored_keys:['F11','F12'],
/**данные иконки сайта*/
favicon:{},
/**данные языков*/
languages:{},
/**данные сохранения*/
save:{
    /**текущий мир*/
    world:{
        /**информация об игроках в текущем мире*/
        players:{
            /**отвечает за работу когда персонаж не выбран*/
            '':{
                position:{
                    room_id:'disclaimer'
                }
            }
        }
    },
    /**текущий персонаж*/
    player:{
        /**ник персонажа*/
        nickname:'',
        interface:{
            hotbar:{
                slot_count:0,
                active_slot_index:0
            }
        }
    },
    /**временные данные*/
    temp:{
        /**данные текущей комнаты*/
        room:{
            /**стоит ли инициализировать комнату*/
            preparation:true
        }
    }
},
/**доступные персонажи*/
characters:[],
/**доступные миры*/
worlds:[],
/**находится ли игрок во вкладке одиночной игры или мультиплеера*/
is_singleplayer:true,
FS_DB_NAME:'coderror-file-system',
FS_STORE_NAME:'handles',
FS_KEY:'directory'
}