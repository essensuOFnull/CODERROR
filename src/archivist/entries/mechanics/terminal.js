// src/archivist/entries/mechanics/terminal.js

export const terminal = {
  id: 'terminal',
  title: 'Терминал',
  part: 'part2',
  act: 1,
  kind: 'record',
  parent: 'part2',
  tags: ['act1', 'terminal', 'dd', 'end-act1'],
  links: ['dd', 'lost-data-keeper', 'access-rights', 'world-first', 'part3'],
  hidden: false,
  blocks: [
    { t: 'p', text: 'Побеждён босс — открывается дверь. За ней — терминал.' },
    { t: 'p', text: 'В терминале вбито 2 символа: [[dd|dd]].' },
    { t: 'p', text: 'Игрок:' },
    { t: 'list', ordered: false, items: [
      'Прописывает свои координаты в памяти и свой размер — которые, благо, будучи кодом, он и так чувствует.',
      'Перезаписывает себя как ФАЙЛ, с ИМЕНЕМ.',
      'Координаты, куда себя записать, выбрать не может — это, как и [[dd|dd]], неизменяемая часть строки.',
      'Нажимает Enter...',
    ]}
  ],
};