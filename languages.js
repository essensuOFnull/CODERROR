window.languages={
/*хотите перевести? скопируйте весь default, киньте в нейронку, попросите перевести не нарушая структуру файла, переименуйте его в название другого языка, после чего вставьте полученный язык после default. вы сможете применить полученный язык в настройках игры. чтобы попасть в них, нажмите кнопку "иллюзия контроля" в главном меню*/
default:{
	contribution:{
		'⦑color:#f0f⦒essensuOFnull':`инициатор, автор идей, программист.`,
		'⦑color:#909⦒仨与与仨刀仁仨・口千・力仨与户升工艮':`возможно нарисует текстуры в будущем.`,
		'⦑color:#00f⦒Theb.ai, DeepSeek':`помощь в программировании.`
	},
	settings:{
		interface:{
			name:`настройки интерфейса`,
			options:{
				language:`приоритет дополнительных языков`,
				font_size:`размер знакомест (не рекомендуется менять)`,
				max_content_width:`максимальная ширина содержимого окна`,
				max_content_height:`максимальная высота содержимого окна`
			}
		},
		audio:{
			name:`настройки аудио`,
			options:{
				music_volume:`громкость музыки`,
				sounds_volume:`громкость звуков`
			}
		},
		control:{
			name:`настройки управления`,
			options:{
				left:`влево`,
				right:`вправо`,
				jump:`прыжок`
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
                language:`additional languages priority`,
                font_size:`character cell size (not recommended to change)`,
                max_content_width:`maximum window content width`,
                max_content_height:`maximum window content height`
            }
        },
        audio:{
            name:`audio settings`,
            options:{
                music_volume:`music volume`,
                sounds_volume:`sound effects volume`
            }
        },
        control:{
            name:`control settings`,
            options:{
                left:`left`,
                right:`right`,
                jump:`jump`
            }
        }
    },
    alerts:{
        file_saved:(name)=>{return`the file might have been saved to your Downloads folder as "${name}". I can't choose the save location. You may want to move it to the "YOUR_DATA" folder in the project directory for convenience`}
    },
    rooms:{
        main_menu:{
            buttons:{
                new_game:`take the risk to start new game`,
                continue:`continue aimlessly`,
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
            drop_zone:`file\ndrop\nzone`,
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