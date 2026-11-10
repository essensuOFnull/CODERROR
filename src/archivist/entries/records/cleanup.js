// src/archivist/entries/records/cleanup.js

export const cleanup = {
  id: 'cleanup',
  title: 'Очистка',
  part: 'part1',
  act: 0,
  kind: 'record',
  parent: 'part1',
  tags: ['world', 'player-js'],
  links: ['start', 'part2'],
  hidden: false,
  blocks: [
    { t: 'p', text: 'Процедура, которая должна была уничтожить player.js. Она сработала. Файл был признан неудачным и выброшен. И — не исчез.' },
  ],
};