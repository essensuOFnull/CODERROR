// src/archivist/entries/synergies/mage-warrior.js

export const mageWarrior = {
  id: 'mage-warrior',
  title: 'Маг-воин',
  part: 'part3',
  act: 2,
  kind: 'synergy',
  parent: 'synergies',
  tags: ['synergy', 'mage', 'warrior', 'enchant'],
  links: ['mage', 'warrior'],
  hidden: false,
  blocks: [
    { t: 'p', text: 'Способен зачаровывать оружие ближнего боя, повышая его урон и наделяя эффектами, в том числе дистанционных атак. Атаки ближнего боя при этом тратят ману. Зачарование накладывается до того момента, пока не будет снято намеренно. Может зачаровывать щиты на магический барьер.' },
  ],
};