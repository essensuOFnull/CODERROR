// src/archivist/entries/locations/tower.js

export const tower = {
  id: 'tower',
  title: 'Башня',
  part: 'part2',
  act: 1,
  kind: 'record',
  parent: 'part2',
  tags: ['act1', 'location', 'tower'],
  links: ['space-empty'],
  hidden: false,
  blocks: [
    { t: 'p', text: 'Любопытное строение. Кирпичная. Снизу состоит из символов, которые плавно переходят в кирпичи из спрайтов из субпиксельного текста. Ближе к середине башни по высоте — становится полностью спрайтовой. Наконец-то нормальная графика.' },
    { t: 'p', text: 'Именно в башне лежат 1 слот инвентаря и хлыст из символов.' },
  ],
};