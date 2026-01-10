{
let f=window.CODERROR.CHEATING.functions,
d=window.CODERROR.CHEATING.data;

window.CODERROR.CHEATING.data={
/**версия CODERROR'а*/
version:'(1)0.35.1',
/**данные иконки сайта*/
favicon:{},
/**клавиши которые нельзя забиндить*/
ignored_keys:['F11','F12'],
/**данные сохранения*/
save:{
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
        /**с каких сторон игрок касается стен*/
        touch_wall:{}
    }
}
}
}