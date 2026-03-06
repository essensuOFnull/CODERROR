{
let d = window.d;
window.f = {
open_handles_DB() {
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
save_handle_to_DB(handle) {
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
get_handle_from_DB() {
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
init_file_access(){
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
request_directory_via_user_gesture(){
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
file_exists(relPath){
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
read_file(relPath, asText = true) {
    return new Promise((resolve, reject) => {
        if (!d.directory_handle) return reject(new Error('Directory handle is not available'));
        const parts = relPath.split('/').filter(Boolean);
        let dir = d.directory_handle;
        const next = (i) => {
            if (i >= parts.length - 1) {
                dir.getFileHandle(parts[parts.length - 1])
                    .then(fileHandle => fileHandle.getFile())
                    .then(file => asText ? file.text() : file.arrayBuffer())
                    .then(resolve)
                    .catch(error => {
                        if (error.name === 'NotFoundError') {
                            resolve(null);
                        } else {
                            reject(error);
                        }
                    });
                return;
            }
            dir.getDirectoryHandle(parts[i])
                .then(newDir => {
                    dir = newDir;
                    next(i + 1);
                })
                .catch(error => {
                    if (error.name === 'NotFoundError') {
                        resolve(null);
                    } else {
                        reject(error);
                    }
                });
        };
        next(0);
    });
},
/**записывает содержимое в текстовый файл (с автоматическим созданием директорий)*/
write_file(relPath, contents) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!d.directory_handle) {
                reject(new Error('Directory handle is not available'));
                return;
            }

            const parts = relPath.split('/').filter(Boolean);
            let currentDir = d.directory_handle;

            // Создаем директории по пути
            for (let i = 0; i < parts.length - 1; i++) {
                currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
            }

            // Создаем файл
            const fileName = parts[parts.length - 1];
            const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();

            try {
                // Упрощенная обработка содержимого
                if (contents instanceof Uint8Array) {
                    await writable.write(contents);
                } else if (contents instanceof Blob) {
                    const arrayBuffer = await contents.arrayBuffer();
                    await writable.write(new Uint8Array(arrayBuffer));
                } else if (typeof contents === 'string') {
                    await writable.write(contents);
                } else {
                    await writable.write(contents);
                }
                
                await writable.close();
                console.log(`File ${relPath} written successfully`);
                resolve();
            } catch (writeError) {
                await writable.close();
                reject(writeError);
            }
        } catch (error) {
            reject(error);
        }
    });
},
/**создает папку*/
create_directory(relPath){
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
remove_file(relPath){
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
remove_directory(relPath){
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
list_files(relPath){
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
generate_favicon(){
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
get_system_info() {
    let system_info = {
        browser: {
            user_agent: navigator.userAgent,
            name: navigator.appName,
            version: navigator.appVersion,
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            cookie_enabled: navigator.cookieEnabled,
            java_enabled: navigator.javaEnabled ? navigator.javaEnabled() : false,
            pdf_enabled: navigator.pdfViewerEnabled || false
        },
        hardware: {
            cpu: {
                cores: navigator.hardwareConcurrency || 'unavailable'
            },
            ram: {
                size: navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'unavailable'
            },
            gpu: {},
            max_touch_points: navigator.maxTouchPoints || 0
        },
        screen: {
            width: screen.width,
            height: screen.height,
            color_depth: screen.colorDepth + ' bit',
            pixel_depth: screen.pixelDepth + ' bit',
            pixel_ratio: window.devicePixelRatio || 1,
            available_width: screen.availWidth,
            available_height: screen.availHeight
        }
    };

    // 🎨 GPU Information
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                system_info.hardware.gpu.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                system_info.hardware.gpu.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
        }
    } catch (e) {
        system_info.hardware.gpu.error = 'WebGL unavailable';
    }

    // 🌐 Network Information
    if (navigator.connection) {
        const connection = navigator.connection;
        system_info.network = {
            type: connection.effectiveType || 'unknown',
            downlink: connection.downlink + ' Mbps',
            rtt: connection.rtt + ' ms',
            save_data: connection.saveData || false
        };
    }

    // 💾 Storage
    system_info.storage = {};
    if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(estimate => {
            system_info.storage.used = estimate.usage;
            system_info.storage.quota = estimate.quota;
            system_info.storage.usage_percentage = ((estimate.usage / estimate.quota) * 100).toFixed(2) + '%';
        });
    }

    // 📍 Time & Location
    system_info.time = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezone_offset: new Date().getTimezoneOffset(),
        locale: navigator.language
    };

    // 🔋 Battery
    system_info.battery = {};
    if (navigator.getBattery) {
        navigator.getBattery().then(battery => {
            system_info.battery = {
                level: (battery.level * 100) + '%',
                charging: battery.charging,
                charging_time: battery.chargingTime,
                discharging_time: battery.dischargingTime
            };
        });
    }

    // ⚡ Performance
    system_info.performance = {};
    if (performance) {
        // Memory information
        if (performance.memory) {
            system_info.performance.memory = {
                used_js_heap: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
                total_js_heap: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
                js_heap_size_limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB'
            };
        }
        
        // Timing information
        if (performance.timing) {
            system_info.performance.timing = {
                dom_content_loaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart + ' ms',
                full_load: performance.timing.loadEventEnd - performance.timing.navigationStart + ' ms',
                dom_interactive: performance.timing.domInteractive - performance.timing.navigationStart + ' ms'
            };
        }
    }

    // 🎧 Audio
    system_info.audio = {};
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        system_info.audio.sample_rate = audioContext.sampleRate;
    } catch (e) {
        system_info.audio.error = 'AudioContext unavailable';
    }

    // 📊 Additional APIs availability
    system_info.available_apis = {
        virtual_reality: !!navigator.getVRDisplays,
        notifications: 'Notification' in window,
        service_worker: 'serviceWorker' in navigator,
        geolocation: 'geolocation' in navigator,
        bluetooth: 'bluetooth' in navigator,
        usb: 'usb' in navigator,
        media_devices: 'mediaDevices' in navigator,
        permissions: 'permissions' in navigator,
        clipboard: 'clipboard' in navigator,
        credentials: 'credentials' in navigator
    };

    // 🔍 Advanced fingerprinting data
    system_info.advanced = {
        canvas_fingerprint: this.get_canvas_fingerprint(),
        webgl_fingerprint: this.get_webgl_fingerprint(),
        fonts: this.get_available_fonts()
    };
	return system_info;
},

// Вспомогательные методы для fingerprinting
get_canvas_fingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Hello, world!', 2, 15);
    return canvas.toDataURL();
},

get_webgl_fingerprint() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return null;
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        return {
            vendor: gl.getParameter(debugInfo ? debugInfo.UNMASKED_VENDOR_WEBGL : gl.VENDOR),
            renderer: gl.getParameter(debugInfo ? debugInfo.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
            version: gl.getParameter(gl.VERSION),
            shading_language: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
        };
    } catch (e) {
        return null;
    }
},

get_available_fonts() {
    // Базовый список шрифтов для проверки
    const fonts = [
        'Arial', 'Helvetica', 'Times New Roman', 'Courier New',
        'Verdana', 'Georgia', 'Palatino', 'Garamond',
        'Bookman', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black',
        'Impact'
    ];
    
    const available = [];
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.left = '-9999px';
    div.style.fontSize = '72px';
    
    document.body.appendChild(div);
    
    fonts.forEach(font => {
        div.style.fontFamily = font;
        if (div.offsetWidth !== div.offsetHeight) {
            available.push(font);
        }
    });
    
    document.body.removeChild(div);
    return available;
},
/**инициализирует доступ к midi-устройствам*/
async init_midi(){
	try{
		d.midi_access=await navigator.requestMIDIAccess();
	}catch(e){
		console.error('Ошибка доступа к MIDI:',error);
	}
},
/**получает список midi устройств ввода*/
async get_midi_inputs(){
	await f.init_midi();
	if(!d.midi_access){
		return{};
	}else{
		let inputs={};
		for(let input of d.midi_access.inputs.values()){
			inputs[`${input.id}`]={
				name:input.name
			};
		}
		return inputs;
	}
},
/**получает список midi устройств вывода*/
async get_midi_outputs() {
    await f.init_midi();
    if (!d.midi_access) return {};
    let outputs = {};
    for (let output of d.midi_access.outputs.values()) {
        outputs[output.id] = { name: output.name };
    }
    return outputs;
}
}
let f = window.f;
}