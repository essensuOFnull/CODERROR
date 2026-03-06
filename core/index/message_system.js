window.message_bus=new message_bus(window.frames[0],window);
{
let message_bus=window.message_bus;
/*получение сообщений*/
message_bus.on('change_title',(data)=>{
	document.title=data.title;
	return{success:true};
});
message_bus.on('init_file_access',async(data)=>{
	await f.init_file_access();
	return{success:true};
});
message_bus.on('file_exists',async(data)=>{
	return await f.file_exists(data.relPath);
});
message_bus.on('read_file', async (data) => {
    return await f.read_file(data.relPath, data.asText);
});
message_bus.on('write_file',async(data)=>{
	return await f.write_file(data.relPath,data.content);
});
message_bus.on('create_directory',async(data)=>{
	return await f.create_directory(data.relPath);
});
message_bus.on('remove_file',async(data)=>{
	return await f.remove_file(data.relPath);
});
message_bus.on('remove_directory',async(data)=>{
	return await f.remove_directory(data.relPath);
});
message_bus.on('list_files',async(data)=>{
	return await f.list_files(data.relPath);
});
message_bus.on('get_system_info',async()=>{
	return await f.get_system_info();
});
message_bus.on('get_midi_inputs',async()=>{
	return await f.get_midi_inputs();
});
message_bus.on('get_midi_outputs', async () => {
    return await f.get_midi_outputs();
});
// Где-то при старте приложения (один раз регистрируем синтезатор)
JZZ.synth.Tiny.register('Web Audio Synth');

message_bus.on('play_midi', async ({ byteArray }) => {
    try {
        // Открываем MIDI-выход синтезатора
        const synthOut = JZZ().openMidiOut('Web Audio Synth');

        // Создаём SMF из данных
        const smf = new JZZ.MIDI.SMF(byteArray);

        // Создаём плеер и подключаем
        const player = smf.player();
        player.connect(synthOut);
        player.play();

        return { success: true };
    } catch (e) {
        console.error('Ошибка воспроизведения:', e);
        return { success: false, error: e.message };
    }
});
let f=window.f;
}