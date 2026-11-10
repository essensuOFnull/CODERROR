// src/archivist/entries/chapters/part2.js

import { start } from '../records/start.js';
import { goalAct1 } from '../records/goal-act1.js';
import { accessRights } from '../mechanics/access-rights.js';
import { collectible } from '../mechanics/collectible.js';
import { tower } from '../locations/tower.js';
import { lostDataKeeper } from '../bosses/lost-data-keeper.js';
import { afterVictory } from '../records/after-victory.js';
import { keeperFate } from '../records/keeper-fate.js';
import { terminal } from '../mechanics/terminal.js';
import { dd } from '../mechanics/dd.js';
import { transition } from '../records/transition.js';

export const part2 = [
	{
		id: 'part2',
		title: 'АКТ 1: ВЫЖИВАНИЕ',
		part: 'part2',
		act: 1,
		kind: 'chapter',
		parent: null,
		tags: ['act1'],
		links: [
			'start', 'goal-act1', 'access-rights', 'collectible', 'tower',
			'lost-data-keeper', 'after-victory', 'keeper-fate', 'terminal',
			'dd', 'transition',
		],
		hidden: false,
		blocks: [
			{ t: 'em', text: 'Вот и всё. Файл, который должен был стать кем-то, признан неудачным. Корзина открывается. Корзина закрывается. И в этот момент что-то, что должно было исчезнуть, открывает глаза.' },
		],
	},

	start,
	goalAct1,
	accessRights,
	collectible,
	tower,
	lostDataKeeper,
	afterVictory,
	keeperFate,
	terminal,
	dd,
	transition,
];