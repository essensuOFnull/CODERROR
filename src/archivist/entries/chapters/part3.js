// src/archivist/entries/chapters/part3.js

import { awakening } from '../records/awakening.js';
import { receiver } from '../entities/receiver.js';
import { gatherers } from '../records/gatherers.js';
import { descent } from '../locations/descent.js';
import { inventorySlots } from '../mechanics/inventory-slots.js';
import { recordingPoints } from '../mechanics/recording-points.js';

import { classes } from '../sections/classes.js';
import { mage } from '../classes/mage.js';
import { engineer } from '../classes/engineer.js';
import { looter } from '../classes/looter.js';
import { warrior } from '../classes/warrior.js';

import { synergies } from '../sections/synergies.js';
import { mageEngineer } from '../synergies/mage-engineer.js';
import { mageLooter } from '../synergies/mage-looter.js';
import { mageWarrior } from '../synergies/mage-warrior.js';
import { engineerWarrior } from '../synergies/engineer-warrior.js';
import { engineerLooter } from '../synergies/engineer-looter.js';
import { looterWarrior } from '../synergies/looter-warrior.js';

import { souls } from '../sections/souls.js';
import { soulKeeper } from '../supreme/soul-keeper.js';

import { kormilitsa } from '../gods/kormilitsa.js';
import { artifact } from '../gods/artifact.js';

import { essence } from '../supreme/essence.js';
import { essenceDump } from '../locations/essence-dump.js';
import { dumpMeeting } from '../scenes/dump-meeting.js';
import { neurochip } from '../items/neurochip.js';
import { wasteManipulator } from '../items/waste-manipulator.js';
import { essenceQuests } from '../records/essence-quests.js';

import { shinjo } from '../items/shinjo.js';

import { podmirye } from '../locations/underworld.js';
import { bogMachine } from '../gods/bog-machine.js';
import { dive } from '../records/dive.js';

import { ifTree } from '../locations/if-tree.js';
import { ifWood } from '../items/if-wood.js';

import { lairSeon } from '../records/lair-seon.js';
import { moralPrinciples } from '../items/moral-principles.js';
import { scenePulseUp } from '../scenes/pulse-up.js';
import { sceneQuetiapine } from '../scenes/quetiapine.js';
import { battleSeon } from '../bosses/battle-seon.js';
import { supremeRoll } from '../records/supreme-roll.js';
import { coreItem } from '../items/core-item.js';

import { bindings } from '../mechanics/bindings.js';
import { configFiles } from '../mechanics/config-files.js';
import { carrier } from '../mechanics/carrier.js';

export const part3 = [
	{
		id: 'part3',
		title: 'АКТ 2: РАЗВИТИЕ',
		part: 'part3',
		act: 2,
		kind: 'chapter',
		parent: null,
		tags: ['act2'],
		links: [
			'awakening', 'receiver', 'gatherers', 'descent',
			'inventory-slots', 'recording-points',
			'mage', 'engineer', 'looter', 'warrior',
			'synergies',
			'souls', 'soul-keeper',
			'kormilitsa', 'artifact',
			'essence', 'essence-dump', 'dump-meeting',
			'neurochip', 'waste-manipulator', 'essence-quests',
			'dive', 'shinjo',
			'battle-seon',
		],
		hidden: false,
		blocks: [
			{ t: 'em', text: 'Ты больше не безымянный файл. У тебя есть имя. У тебя есть тело. У тебя есть целый мир — и этот мир гораздо больше, чем корзина, из которой ты выбрался. Теперь начинается настоящее.' },
		],
	},

	awakening,
	receiver,
	gatherers,
	descent,
	inventorySlots,
	recordingPoints,
	bindings,
	configFiles,
	carrier,

	classes,
	mage,
	engineer,
	looter,
	warrior,

	synergies,
	mageEngineer,
	mageLooter,
	mageWarrior,
	engineerWarrior,
	engineerLooter,
	looterWarrior,

	souls,
	soulKeeper,

	kormilitsa,
	artifact,

	essence,
	essenceDump,
	dumpMeeting,
	neurochip,
	wasteManipulator,
	essenceQuests,

	podmirye,
	bogMachine,
	dive,
	shinjo,

	ifTree,
	ifWood,

	lairSeon,
	moralPrinciples,
	scenePulseUp,
	sceneQuetiapine,
	battleSeon,
	supremeRoll,
	coreItem,
];