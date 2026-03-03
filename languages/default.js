window.CODERROR.__originals__.data.languages.default={
	contribution:{
		'⦑color:#f0f⦒essensuOFnull':`инициатор, автор идей, программист.`,
		'⦑color:#c70a0a⦒aliph0th':`главный советчик.`,
		'⦑color:#909⦒仨与与仨刀仁仨・口千・力仨与户升工艮':`обещал продолжить моё дело в случае моей смерти.`,
		'⦑color:#00f⦒Theb.ai, DeepSeek':`помощь в программировании.`
	},
	splashes:["во имя шизы!","t.me/essensuOFnull","феникс","библиотечный соскрёб","made with Holy JS Language"],
	notifications:{
		current_music:(path)=>{
			return`<div class="inherit_colors" style="color:#f00">𝄞</div> сейчас играет: <div class="inherit_colors" style="color:#f0f">${path}</div> <div class="inherit_colors" style="color:#f00">♫</div>`
		},
		current_room:(room)=>{
			return`ℹ️ текущая комната: <div class="inherit_colors" style="color:#f0f">${room}</div>`;
		},
		settings_saved:`✔️ настройки сохранены`,
		settings_loaded:`✔️ настройки загружены`,
		character_saved:`✔️ персонаж сохранён`,
		world_saved:`✔️ мир сохранён`,
	},
	alerts:{
		file_saved:(name)=>{return`файл возможно был сохранён в папку загрузок с именем "${name}"`}
	},
	confirms:{
		is_need_save:`создать файл сохранения? помещенные в одну папку, более новые сохранения будут выше.`
	},
	errors:{
		common:(error)=>{return`❌ <div class="inherit_colors" style="color:#f00">Ошибка: ${error}</div>`},
	},
	prompts:{
		enter_nickname:`Введите ник персонажа:`,
		enter_world_name:`Введите название мира:`
	},
	settings:{
		interface:{
			name:`настройки интерфейса`,
			options:{
				language:{
					name:`приоритет дополнительных языков`
				},
				max_content_width:{
					name:`максимальная ширина содержимого окна`,
					placeholder:`введите значение css свойства ("100%" отключает ограничение)`
				},
				max_content_height:{
					name:`максимальная высота содержимого окна`,
					placeholder:`введите значение css свойства ("100%" отключает ограничение)`
				},
				pause_on_blur:{
					name:`останавливать игру при потере фокуса окна`
				}
			}
		},
		audio:{
			name:`настройки аудио`,
			options:{
				music_volume:{
					name:`громкость музыки`
				},
				sounds_volume:{
					name:`громкость звуков`
				}
			}
		},
		control:{
			name:`настройки управления`,
			options:{
				bind_to_layout:{
					name:`учитывать раскладку клавиатуры`
				},
				open_inventory:{
					name:`открыть инвентарь`
				},
				close_inventory:{
					name:`закрыть инвентарь`
				},
				left:{
					name:`влево`
				},
				right:{
					name:`вправо`
				},
				jump:{
					name:`прыжок`
				},
				previous_hotbar_slot:{
					name:`предыдущий слот хотбара`
				},
				next_hotbar_slot:{
					name:`следующий слот хотбара`
				}
			}
		}
	},
	rooms:{
		main_menu:{
			buttons:{
				singleplayer:`играть в одиночестве`,
				multiplayer:`подключиться к серваку (заглушка)`,
				settings:`иллюзия контроля`,
				authors:`пантеон творцов`,
				room_editor:`редактор комнат (заглушка)`,
				donation:`поддержать разработчика`,
				exit:`вылет`
			}
		},
		character_selection:{
			title:`выбор персонажа`,
			drop_zone:`зона\nзагрузки\nперсонажа`,
			buttons:{
				back:`назад`,
				create:`создать нового персонажа`
			}
		},
		world_selection:{
			title:`выбор мира`,
			drop_zone:`зона\nзагрузки\nмира`,
			buttons:{
				back:`назад`,
				create:`создать новый мир`
			}
		},
		room_editor_selection:{
			title:`выбор комнаты`,
			drop_zone:`зона\nзагрузки\nкомнаты`,
			buttons:{
				back:`назад`,
				create:`создать новую комнату`
			}
		},
		authors:{
			buttons:{
				back:`назад`
			}
		},
		settings:{
			drop_zone:`зона\nзагрузки\nфайлов`,
			button_add:`+`,
			buttons:{
				back:`назад`,
				apply:`применить`,
				save:`сохранить`
			},
			messages:{
				input:`ткни клаву`
			}
		},
		continue:{
			drop_zone:`зона\nзагрузки\nфайла`,
			buttons:{
				back:`назад`
			}
		}
	},
	interface:{
		buttons:{
			to_main_menu:`в главное меню`,
		}
	}
}