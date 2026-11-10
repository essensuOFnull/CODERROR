// src/archivist/entries/records/goal-act1.js

export const goalAct1 = {
  id: 'goal-act1',
  title: 'Путь акта',
  part: 'part2',
  act: 1,
  kind: 'record',
  parent: 'part2',
  tags: ['act1', 'goal'],
  links: ['terminal', 'space-empty'],
  hidden: false,
  blocks: [
    { t: 'p', text: 'Найти [[terminal|терминал]] с [[access-rights|правом доступа]]. Время ограничено. Локация разлагается.' },
    { t: 'p', text: 'Но это не цель. Это путь. Ты можешь пойти по нему. Или не пойти.' },
  ],
};