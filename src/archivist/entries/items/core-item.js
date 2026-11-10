// src/archivist/entries/items/core-item.js

export const coreItem = {
  id: 'core-item',
  title: 'Ядро (предмет)',
  part: 'part4',
  act: 3,
  kind: 'item',
  parent: 'part4',
  tags: ['act3', 'item', 'core', 'accessory', 'summon'],
  links: ['core', 'seon', 'scene-quetiapine'],
  hidden: false,
  blocks: [
    { t: 'p', text: 'Аксессуар и предмет призыва одновременно.' },
    { t: 'list', ordered: false, items: [
      'Будучи надетым, позволяет разделять себя на функциональные модули/грани личности.',
      'Если промазать им и случайно активировать — Ⓢ═Ⓔ═Ⓞ═Ⓝ призовутся, но не в виде босса, а в виде НПС. Впрочем, сразиться можно будет — просто в диалоге кнопочку нажать.',
    ]},
  ],
};