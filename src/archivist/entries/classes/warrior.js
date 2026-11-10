// src/archivist/entries/classes/warrior.js

export const warrior = {
  id: 'warrior',
  title: 'Воин',
  part: 'part3',
  act: 2,
  kind: 'class',
  parent: 'classes',
  tags: ['class', 'warrior', 'melee', 'tank'],
  links: ['mage-warrior', 'engineer-warrior', 'looter-warrior'],
  hidden: false,
  blocks: [
    { t: 'p', text: 'Тупо машет оружиями ближнего боя, качается в защиту и урон, может парировать. Самый скучный, нечего сказать, для тех, кто любит быть танком.' },
  ],
};