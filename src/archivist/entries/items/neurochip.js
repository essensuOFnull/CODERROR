// src/archivist/entries/items/neurochip.js

export const neurochip = {
  id: 'neurochip',
  title: 'Чип с нейросетью',
  part: 'part3',
  act: 2,
  kind: 'item',
  parent: 'part3',
  tags: ['act2', 'item', 'essence', 'neurochip', 'quest-reward'],
  links: ['essence', 'dump-meeting', 'waste-manipulator'],
  hidden: false,
  blocks: [
    { t: 'strong', text: 'Тип' },
    { t: 'p', text: 'Чип. Материал для крафта.' },
    { t: 'strong', text: 'Суть' },
    { t: 'p', text: 'Квадратный сантиметр. Нейросеть на 400 миллиардов параметров. Создавалась для борьбы с DeepSeek\'ом. Оказалась тупее.' },
    { t: 'p', text: 'При первом показе [[essence|ᙓᔑᔑᙓᙁᙅᙓ・ᗝꘘ・ᙃᖇᙓᗣᙏ]] выводит поток визуализации прямо в разум игрока — чтобы тот понял, что именно он получает.' },
    { t: 'strong', text: 'Применение' },
    { t: 'p', text: 'Выдаётся как награда за [[dump-meeting|квест на Свалке]]. Не используется напрямую. Пригодится для создания [[waste-manipulator|Манипулятора Отходов]] — но для этого нужны ещё компоненты, выдаваемые за [[essence-quests|сторонние квесты ᙓᔑᔑᙓᙁᙅᙓ・ᗝꘘ・ᙃᖇᙓᗣᙏ]].' },
  ],
};