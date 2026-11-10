// src/archivist/entries/synergies/engineer-warrior.js

export const engineerWarrior = {
  id: 'engineer-warrior',
  title: 'Инженер-воин',
  part: 'part3',
  act: 2,
  kind: 'synergy',
  parent: 'synergies',
  tags: ['synergy', 'engineer', 'warrior', 'tank', 'tech-melee'],
  links: ['engineer', 'warrior'],
  hidden: false,
  blocks: [
    { t: 'p', text: 'Вместо оружия дальнего боя использует научные знания для создания более крепкой брони, лазерных мечей и прочего «непростого», технологичного оружия ближнего боя и щитов, включая барьерные.' },
    { t: 'p', text: 'По сути — «усиленный танк».' },
  ],
};