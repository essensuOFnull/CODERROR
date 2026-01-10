// ========== КОНФИГУРАЦИЯ И СОСТОЯНИЕ ==========
let objectsToTrack = ['CODERROR.__originals__'];

let audioContext = null;
let audioEnabled = true;

// ========== СИСТЕМА ЗВУКА ==========
function initAudioContext() {
	if (!audioContext) {
		audioContext = new (window.AudioContext || window.webkitAudioContext)();
	}
	if (audioContext.state === 'suspended') {
		audioContext.resume();
	}
	return audioContext;
}

function textToBytes(text) {
	const encoder = new TextEncoder();
	return encoder.encode(text);
}

// Группируем байты в блоки по 8
function groupBytesIntoBlocks(bytes) {
	const blocks = [];
	for (let i = 0; i < bytes.length; i += 8) {
		let block = bytes.slice(i, i + 8);
		
		// Если блок меньше 8 байт, сдвигаем вправо (дополняем нулями слева)
		if (block.length < 8) {
			const temp = new Uint8Array(8);
			temp.set(block, 8 - block.length); // Сдвиг вправо
			block = temp;
		}
		
		blocks.push(block);
	}
	return blocks;
}

// Генерируем детерминированные вариации на основе блока байт
function getVariationsFromBlock(block) {
	// Используем XOR всех байт блока для генерации seed
	let seed = 0;
	for (let i = 0; i < block.length; i++) {
		seed ^= block[i];
	}
	
	// Генерируем вариации громкости (50%-100%)
	const volumeVariation = 0.5 + (seed / 255) * 0.5;
	
	// Генерируем вариации длительности (40-80 мс)
	const durationVariation = 40 + (seed / 255) * 40;
	
	return {
		volume: volumeVariation,
		duration: durationVariation
	};
}

// Асинхронная функция воспроизведения блока с возвратом Promise
function playBlockSound(block) {
	return new Promise((resolve) => {
		if (!audioEnabled||window.has_focus) {
			resolve();
			return;
		}
		
		const ctx = initAudioContext();
		const oscillator = ctx.createOscillator();
		const gainNode = ctx.createGain();
		
		// Получаем вариации на основе блока
		const variations = getVariationsFromBlock(block);
		const volume = variations.volume;
		const actualDuration = variations.duration;
		
		// Используем разные байты для разных параметров звука
		const byte1 = block[0] || 0;
		const byte2 = block[1] || 0;
		const byte3 = block[2] || 0;
		const byte4 = block[3] || 0;
		const byte5 = block[4] || 0;
		const byte6 = block[5] || 0;
		
		// Определяем тип волны по первому байту
		const waveType = byte1 % 3;
		
		switch(waveType) {
			case 0: // PULSE волна
				oscillator.type = 'square';
				// Используем второй байт для ширины импульса
				const pulseWidth = 0.2 + (byte2 / 255) * 0.6;
				if (oscillator.width) {
					oscillator.width.setValueAtTime(pulseWidth, ctx.currentTime);
				}
				break;
				
			case 1: // TRIANGLE волна
				oscillator.type = 'triangle';
				break;
				
			case 2: // NOISE/Sawtooth
				oscillator.type = 'sawtooth';
				const filter = ctx.createBiquadFilter();
				filter.type = 'lowpass';
				// Используем третий байт для частоты фильтра
				filter.frequency.setValueAtTime(200 + (byte3 / 255) * 2000, ctx.currentTime);
				oscillator.connect(filter);
				filter.connect(gainNode);
				break;
		}
		
		// Основная частота на основе четвертого и пятого байтов
		const baseFrequency = 80 + ((byte4 * 256 + byte5) / (256 * 256)) * 1000;
		
		// Детун на основе шестого байта
		const detune = ((byte6 / 255) - 0.5) * 100; // -50 до +50 центов
		
		oscillator.frequency.setValueAtTime(baseFrequency, ctx.currentTime);
		oscillator.detune.setValueAtTime(detune, ctx.currentTime);
		
		// Огибающая с применением вариаций громкости
		gainNode.gain.setValueAtTime(0, ctx.currentTime);
		gainNode.gain.linearRampToValueAtTime(volume * 0.3, ctx.currentTime + 0.005);
		
		if (waveType === 2) { // Для NOISE более резкое затухание
			gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (actualDuration / 1000) * 0.7);
		} else {
			gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (actualDuration / 1000));
		}
		
		if (waveType !== 2) { // Для pulse и triangle подключаем напрямую
			oscillator.connect(gainNode);
		}
		gainNode.connect(ctx.destination);
		
		oscillator.start(ctx.currentTime);
		oscillator.stop(ctx.currentTime + (actualDuration / 1000));
		
		// Разрешаем Promise после окончания звучания блока
		setTimeout(() => {
			resolve();
		}, actualDuration);
	});
}

// Асинхронная функция последовательного воспроизведения блоков
async function playByteSequence(bytes) {
	// Группируем байты в блоки по 8
	const blocks = groupBytesIntoBlocks(bytes);
	
	// Последовательно воспроизводим каждый блок
	for (const block of blocks) {
		await playBlockSound(block);
	}
}

async function captureAndPlayCommand(command) {
	// Преобразуем команду в байты и воспроизводим
	const bytes = textToBytes(command);
	
	// Запускаем воспроизведение без ожидания (не блокируем интерфейс)
	playByteSequence(bytes);
}
// ========== СИСТЕМА МОДИФИКАЦИИ ==========
let whitelist = new Set(['__is_wrapped']);
let blacklist = new Set(['self']);

function clean_dangerous_properties(list) {
	return list.filter(element => 
		whitelist.has(element) || 
		(!element.startsWith('__') && !blacklist.has(element))
	);
}

function recursive_traversal(obj,path,name,parent=window,level=0,visited_objects=new WeakSet()){
	// Базовые случаи остановки рекурсии
	if (!obj|| visited_objects.has(obj)) {
		return;
	}
	visited_objects.add(obj); // Запоминаем объект чтобы избежать циклов
	
	if(typeof obj === 'function'){
		if (obj.__is_wrapped) {
			return; // Уже обернута
		}

		// Сохраняем оригинальную функцию в замыкании
		const originalFn = obj;

		const wrapper = function(...args) {
			//Перед вызовом оригинала запускаем звуковой паттерн
			try{
				if(wrapper.caller===null){
					captureAndPlayCommand(path);
				}
			}catch(e){
				//Не мешаем выполнению функции из-за проблем со звуком
				console.debug('sound_console: capture error', e);
			}
			// Вызываем оригинальную функцию в том же контексте
			return originalFn.apply(this, args);
		};

		/*сохраняем обертку*/
		window.CODERROR.CHEATING.functions[name]=wrapper;

		// Помечаем оригин и обёртку как посещённые, чтобы не заходить в цикл
		visited_objects.add(originalFn);
		visited_objects.add(wrapper);
		return;
	}
	// Рекурсивный обход для объектов
	if (typeof obj === 'object' && !Array.isArray(obj)) {
		let keys = clean_dangerous_properties(Object.keys(obj));
		for (let key of keys) {
			recursive_traversal(obj[key],`${path}.${key}`,key,obj, level + 1, visited_objects);
		}
	}
}

function get_object_by_path(path){
	let obj=window;
	for(let part of path.split('.')){
		if(obj&&part in obj){
			obj=obj[part];
		}
		else{
			return null;
		}
	}
	return obj;
}

function wrap_all_functions() {
	for (let name of objectsToTrack) {
		recursive_traversal(get_object_by_path(name),name,name.split('.').at(-1));
	}
}

wrap_all_functions();