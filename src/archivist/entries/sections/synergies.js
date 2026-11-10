// src/archivist/entries/sections/synergies.js

export const synergies = {
  id: 'synergies',
  title: 'Синергии классов',
  part: 'part3',
  act: 2,
  kind: 'section',
  parent: 'part3',
  tags: ['act2', 'synergies'],
  links: ['mage-engineer', 'mage-looter', 'mage-warrior',
          'engineer-warrior', 'engineer-looter', 'looter-warrior'],
  hidden: false,
  blocks: [
    { t: 'p', text: 'На более поздних этапах появляются смешанные архетипы. Они не отменяют базовые классы, а надстраиваются над ними.' },
  ],
};