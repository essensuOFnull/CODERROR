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
read_file(relPath){
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
write_file(relPath,contents){
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
}
let f = window.f;
}