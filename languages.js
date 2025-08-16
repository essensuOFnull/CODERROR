window.languages={
/*хотите перевести? скопируйте весь default, киньте в нейронку, попросите перевести не нарушая структуру файла, переименуйте его в название другого языка, после чего вставьте полученный язык после default. вы сможете применить полученный язык в настройках игры. чтобы попасть в них, нажмите кнопку "иллюзия контроля" в главном меню*/
default:{
	contribution:{
		'⦑color:#f0f⦒essensuOFnull':`инициатор, автор идей, программист.`,
		'⦑color:#909⦒仨与与仨刀仁仨・口千・力仨与户升工艮':`обещал продолжить моё дело в случае моей смерти.`,
		'⦑color:#00f⦒Theb.ai, DeepSeek':`помощь в программировании.`
	},
	splashes:["во имя шизы!","t.me/essensuOFnull","феникс"],
	notifications:{
		current_music:(path)=>{
			return`<div class="inherit_colors" style="color:#f00">𝄞</div> сейчас играет: <div class="inherit_colors" style="color:#f0f">${path}</div> <div class="inherit_colors" style="color:#f00">♫</div>`
		},
		current_room:(room)=>{
			return`ℹ️ текущая комната: <div class="inherit_colors" style="color:#f0f">${room}</div>`;
		},
	},
	settings:{
		interface:{
			name:`настройки интерфейса`,
			options:{
				language:{
					name:`приоритет дополнительных языков`
				},
				/*font_size:{
					name:`размер знакомест (ОЧЕНЬ не рекомендуется менять)`,
					placeholder:`введите число - значение в пикселях`
				},*/
				max_content_width:{
					name:`максимальная ширина содержимого окна`,
					placeholder:`введите значение css свойства ("100%" отключает ограничение)`
				},
				max_content_height:{
					name:`максимальная высота содержимого окна`,
					placeholder:`введите значение css свойства ("100%" отключает ограничение)`
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
	alerts:{
		file_saved:(name)=>{return`файл возможно был сохранён в папку загрузок с именем "${name}", я не могу выбрать куда его сохранить. возможно стоит перенести его в папку "YOUR_DATA" в папке проекта для удобства`}
	},
	confirms:{
		is_need_save:`создать файл сохранения? помещенные в одну папку, более новые сохранения будут выше.`
	},
	rooms:{
		main_menu:{
			buttons:{
				new_game:`рискнуть начать новую игру`,
				continue:`бесцельно продолжить`,
				settings:`иллюзия контроля`,
				authors:`пантеон творцов`,
				room_editor:`редактор комнат`,
				exit:`вылет`
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
				save:`сохранить в файл`
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
},
адекватность:{
	rooms:{
		main_menu:{
			buttons:{
				new_game:`новая игра`,
				continue:`продолжить`,
				settings:`настройки`,
				authors:`авторы`,
				exit:`выход`
			}
		}
	}
},
}