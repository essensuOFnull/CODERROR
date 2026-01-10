window.languages={
/*хотите перевести? скопируйте весь default, киньте в нейронку, попросите перевести не нарушая структуру файла, переименуйте его в название другого языка, после чего вставьте полученный язык после default. вы сможете применить полученный язык в настройках игры. чтобы попасть в них, нажмите кнопку "иллюзия контроля" в главном меню*/
default:{
	contribution:{
		'⦑color:#f0f⦒essensuOFnull':`инициатор, автор идей, программист.`,
		'⦑color:#909⦒仨与与仨刀仁仨・口千・力仨与户升工艮':`возможно нарисует текстуры в будущем.`,
		'⦑color:#00f⦒Theb.ai, DeepSeek':`помощь в программировании.`
	},
	splashes:["во имя шизы!","t.me/essensuOFnull","феникс"],
	settings:{
		interface:{
			name:`настройки интерфейса`,
			options:{
				language:{
					name:`приоритет дополнительных языков`
				},
				font_size:{
					name:`размер знакомест (ОЧЕНЬ не рекомендуется менять)`,
					placeholder:`введите число - значение в пикселях`
				},
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
				left:{
					name:`влево`
				},
				right:{
					name:`вправо`
				},
				jump:{
					name:`прыжок`
				}
			}
		}
	},
	alerts:{
		file_saved:(name)=>{return`файл возможно был сохранён в папку загрузок с именем "${name}", я не могу выбрать куда его сохранить. возможно стоит перенести его в папку "YOUR_DATA" в папке проекта для удобства`}
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
'test english':{
	contribution:{
		'⦑color:#f0f⦒essensuOFnull':`initiator, idea author, programmer.`,
		'⦑color:#909⦒仨与与仨刀仁仨・口千・力仨与户升工艮':`might draw textures in the future.`,
		'⦑color:#00f⦒Theb.ai, DeepSeek':`programming assistance.`
	},
	settings:{
		interface:{
			name:`interface settings`,
			options:{
				language:{
					name:`priority of additional languages`
				},
				font_size:{
					name:`character cell size (not recommended to change)`,
					placeholder:`enter a number - value in pixels`
				},
				max_content_width:{
					name:`maximum window content width`,
					placeholder:`enter CSS property value ("100%" disables limit)`
				},
				max_content_height:{
					name:`maximum window content height`,
					placeholder:`enter CSS property value ("100%" disables limit)`
				}
			}
		},
		audio:{
			name:`audio settings`,
			options:{
				music_volume:{
					name:`music volume`
				},
				sounds_volume:{
					name:`sound effects volume`
				}
			}
		},
		control:{
			name:`control settings`,
			options:{
				bind_to_layout:{
					name:`take into account the keyboard layout`
				},
				left:{
					name:`left`
				},
				right:{
					name:`right`
				},
				jump:{
					name:`jump`
				}
			}
		}
	},
	alerts:{
		file_saved:(name)=>{return`file might have been saved to Downloads folder as "${name}", I can't choose save location. You might want to move it to "YOUR_DATA" folder in project directory for convenience`}
	},
	rooms:{
		main_menu:{
			buttons:{
				new_game:`take the risk to start new game`,
				continue:`aimlessly continue`,
				settings:`illusion of control`,
				authors:`pantheon of creators`,
				exit:`exit`
			}
		},
		authors:{
			buttons:{
				back:`back`
			}
		},
		settings:{
			drop_zone:`file\nupload\nzone`,
			button_add:`+`,
			buttons:{
				back:`back`,
				apply:`apply`,
				save:`save to file`
			}
		}
	}
}
}