// src/archivist/entries/synergies/looter-warrior.js

export const looterWarrior = {
  id: 'looter-warrior',
  title: 'Воин-хабарщик',
  part: 'part3',
  act: 2,
  kind: 'synergy',
  parent: 'synergies',
  tags: ['synergy', 'warrior', 'looter', 'crit', 'assassin'],
  links: ['warrior', 'looter'],
  hidden: false,
  blocks: [
    { t: 'p', text: 'Имеет шанс уклониться от любой атаки в зависимости от удачи. Все бонусы к урону конвертируются в бонусы шанса критического удара. Ближе к асассину, чем к танку.' },
  ],
};