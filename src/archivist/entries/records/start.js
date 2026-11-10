// src/archivist/entries/records/start.js

export const start = {
  id: 'start',
  title: 'Начало',
  part: 'part2',
  act: 1,
  kind: 'record',
  parent: 'part2',
  tags: ['act1', 'player-js', 'symbols'],
  links: ['cleanup', 'space-empty', 'access-rights'],
  hidden: false,
  blocks: [
    { t: 'p', text: 'Игра начинается со сцены: файл player.js признаётся неудачным, выбрасывается в корзину, и она очищается. Игрок попадает в первую локацию — [[space-empty|Пустое пространство]].' },
    { t: 'strong', text: 'Состояние игрока на старте:' },
    { t: 'list', ordered: false, items: [
      'Простой квадрат из символов блоков.',
      'Символьная, даже не спрайтовая сущность.',
      'Без полоски HP.',
      '1 слот инвентаря.',
      'Умеет прыгать и двигаться.',
      'Может перемещаться так, что находится между знакоместами — рисуясь двумя символами половинок блока или четырьмя символами четвертинок.',
    ]},
  ],
};