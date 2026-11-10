// src/archivist/entries/items/waste-manipulator.js

export const wasteManipulator = {
  id: 'waste-manipulator',
  title: 'Манипулятор Отходов',
  part: 'part3',
  act: 2,
  kind: 'item',
  parent: 'part3',
  tags: ['act2', 'item', 'essence', 'craft', 'waste-manipulator'],
  links: ['essence', 'neurochip', 'essence-dump', 'essence-quests', 'looter'],
  hidden: false,
  blocks: [
    { t: 'strong', text: 'Тип' },
    { t: 'p', text: 'Инструмент. Крафтовый предмет.' },
    { t: 'strong', text: 'Суть' },
    { t: 'p', text: 'Создаётся из [[neurochip|чипа с нейросетью]] и множества компонентов, выдаваемых за [[essence-quests|сторонние квесты ᙓᔑᔑᙓᙁᙅᙓ・ᗝꘘ・ᙃᖇᙓᗣᙏ]]. Способен печатать многие интересные предметы из мусора с [[essence-dump|той же Свалки]].' },
    { t: 'p', text: 'В частности — например, сет брони на [[looter|хабарщика]].' },
    { t: 'strong', text: 'Крафт' },
    { t: 'p', text: 'Полный рецепт пока не прописан. Известно: чип + компоненты за квесты. Точные компоненты — по мере прописывания сторонних квестов.' },
  ],
};