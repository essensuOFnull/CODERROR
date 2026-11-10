// src/archivist/entries/chapters/part4.js

import { whatNext } from '../records/what-next.js';
import { playerName } from '../records/player-name.js';

import { sunGod } from '../supreme/sun-god.js';

export const part4 = [
  {
    id: 'part4',
    title: 'АКТ 3: БОЖЕСТВЕННОСТЬ',
    part: 'part4',
    act: 3,
    kind: 'chapter',
    parent: null,
    tags: ['act3'],
    links: ['lair-seon', 'moral-principles', 'scenes', 'core-item', 'what-next', 'supreme-roll','sun-god','player-name'],
    hidden: false,
    blocks: [
      { t: 'em', text: 'Ты прошёл путь. От выброшенного файла — до того, кто стоит перед лицом собственного создателя. Осталось последнее. Самое честное. Самое болезненное.' },
      { t: 'strong', text: 'Маска ломается' },
      { t: 'p', text: 'В третьем акте «маска» у всех резко ломается. Каждая Высшая Сущность теперь смотрит буквально в лицо игроку, а не на его персонажа. И разговаривает подобающе. Обращается напрямую. Не через персонажа. Не через мир. К тому, кто сидит за экраном.' },
      { t: 'p', text: 'Это не «финальный твист». Это просто — конец притворства. Мир больше не делает вид, что он мир. Он делает вид, что он игра. И говорит с тобой. Не с твоим персонажем. С тобой.' },
      { t: 'p', text: 'Первое, что они делают, — спрашивают, как к тебе обращаться. Подробнее — в записи об [[player-name|имени игрока]].' },
      { t: 'p', text: 'Победа над [[seon|Ⓢ═Ⓔ═Ⓞ═Ⓝ]] меняет диалоги с каждой Высшей Сущностью. Включая диалоги с ними на [[lair-seon|базе]]. Подробнее — в записи о базе.' },
    ],
  },

  whatNext,
  playerName,
  sunGod,
];