// src/archivist/entries/records/supreme-roll.js

export const supremeRoll = {
  id: 'supreme-roll',
  title: 'Верховный Рулон и его последствия',
  part: 'part4',
  act: 3,
  kind: 'record',
  parent: 'part4',
  tags: ['act3', 'supreme-roll', 'seon', 'klyaty'],
  links: ['collectible', 'seon', 'battle-seon'],
  hidden: 'spoiler',
  blocks: [
    { t: 'p', text: 'Если игрок собрал все файлы в первом акте и получил [[collectible|Верховный Рулон]] — при встрече с [[seon|Ⓢ═Ⓔ═Ⓞ═Ⓝ]] происходит следующее.' },
    { t: 'strong', text: 'Клятый «бомбанёт» и скажет:' },
    { t: 'quote', text: '«Было сложно найти все эти мусорные файлы! Мы выкинули их специально! А ты их восстановил блять!!! Ууу сука иди сюда!!!»' },
    { t: 'p', text: 'И все этапы скипнутся вплоть до битвы с Клятым напрямую. Правда, с ним битва самая сложная — но так или иначе битва будет сильно короче.' },
  ],
};