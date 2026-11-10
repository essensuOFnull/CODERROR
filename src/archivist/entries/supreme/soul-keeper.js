// src/archivist/entries/supreme/soul-keeper.js

export const soulKeeper = {
  id: 'soul-keeper',
  title: 'Хранительница Душ',
  part: 'part3',
  act: 2,
  kind: 'boss',
  nature: 'supreme',
  parent: 'part3',
  tags: ['act2', 'boss', 'supreme', 'souls', 'dushnaya'],
  links: ['souls', 'seon'],
  hidden: false,
  blocks: [
    { t: 'strong', text: 'Высшая Сущность.' },
    { t: 'p', text: 'Списана с реального человека. Существует одновременно в реальном мире и в CODERROR\'е. Её внутриигровой Отголосок носит титул Хранительницы Душ.' },
    { t: 'p', text: 'Бессмертный босс, выдающий [[souls|души]] за очки, набранные во время боя. Чем лучше душа — тем лучше всё. Душа Бога-Императора не продаётся. При «духоте» навсегда переименовывается в «Душную Хранительницу».' },
  ],
};