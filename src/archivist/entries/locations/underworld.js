// src/archivist/entries/locations/underworld.js
// id остаётся 'podmirye' — так он referenced во всех остальных файлах.

export const podmirye = {
  id: 'podmirye',
  title: 'Подмирье',
  part: 'part1',
  act: 0,
  kind: 'record',
  parent: 'part1',
  tags: ['location', 'podmirye', 'bog-machine'],
  links: ['bog-machine', 'dive', 'shinjo'],
  hidden: false,
  blocks: [
    { t: 'p', text: 'Локация внутри игры, а не сама игра. Игра внутри игры. Одна из локаций, просто особая. Управляет ей [[bog-machine|Бог-Машина]].' },
  ],
};