// src/archivist/entries/chapters/part1.js

import { worldFirst } from '../records/world-first.js';
import { cleanup } from '../records/cleanup.js';
import { voidEntry } from '../locations/void.js';
import { planetCore } from '../records/planet-core.js';
import { vesselSemiotics } from '../meta/vessel_semiotics.js';

export const part1 = [
  {
    id: 'part1',
    title: 'До начала',
    part: 'part1',
    act: 0,
    kind: 'chapter',
    parent: null,
    tags: ['world', 'before'],
    links: ['world-first', 'void', 'cleanup', 'podmirye', 'bog-machine', 'gods', 'planet-core'],
    hidden: false,
    blocks: [],
  },

  worldFirst,
  planetCore,
  vesselSemiotics,
  cleanup,
  voidEntry,
];