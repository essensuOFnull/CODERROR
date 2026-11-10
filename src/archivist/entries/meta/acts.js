// src/archivist/entries/meta/acts.js

export const acts = {
  id: 'acts',
  title: 'Акты',
  part: 'prologue',
  act: 0,
  kind: 'record',
  parent: 'prologue',
  tags: ['meta', 'acts'],
  links: ['seon', 'part2', 'part3', 'part4', 'goal'],
  hidden: false,
  blocks: [
    { t: 'p', text: 'Акты отражают степень развития персонажа:' },
    { t: 'list', ordered: false, items: [
      'Акт 1: Выживание — от очистки до перезаписи.',
      'Акт 2: Развитие — с момента окончания первого акта.',
      'Акт 3: Божественность — наступает после победы над [[seon|Ⓢ═Ⓔ═Ⓞ═Ⓝ]].',
    ]},
    { t: 'p', text: 'Но акты — не цели. Это описание. Ты можешь пройти их. Или не пройти. Игра не осудит.' },
  ],
};