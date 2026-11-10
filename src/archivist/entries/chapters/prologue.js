// src/archivist/entries/chapters/prologue.js

import { physics } from '../physics/index.js'
import { fileEntry } from '../physics/file.js';
import { processEntry } from '../physics/process.js';
import { indexRecordEntry } from '../physics/index-record.js';
import { executionEntry } from '../physics/execution.js';
import { entropyEntry } from '../physics/entropy.js';
import { mappingEntry } from '../physics/mapping.js';
import { storageEntry } from '../physics/storage.js';
import { memoryEntry } from '../physics/memory.js';
import { platformEntry } from '../physics/platform.js';

import {meta} from '../meta/index.js';
import { seon } from '../supreme/seon.js';
import { firstVoice } from '../meta/first-voice.js';
import { archivist } from '../supreme/archivist.js';
import { acts } from '../meta/acts.js';
import { endings } from '../meta/endings.js';
import { goal } from '../meta/goal.js';
import { gods } from '../records/gods.js';
import { supremeNature } from '../meta/supreme-nature.js';
import { npcNature } from '../meta/npc-nature.js';

export const prologue = [
  {
    id: 'prologue',
    title: 'Пролог',
    part: 'prologue',
    act: 0,
    kind: 'chapter',
    parent: null,
    order: 10,
    tags: ['meta'],
    links: ['seon', 'first-voice', 'archivist', 'acts', 'endings', 'goal', 'gods', 'supreme-nature'],
    hidden: false,
    blocks: [
      { t: 'em', text: 'Книга, которую ты держишь, — не про игру. Она про то, из чего игра сделана, и про то, чем она становится, когда в неё смотрят.' },
      { t: 'p', text: 'Она разделена на три части. Сначала — физика: то, на чём всё стоит, без точек зрения и без интерпретаций. Затем — мета: то, как на это можно смотреть. Затем — записи: то, что из этого получилось.' },
      { t: 'p', text: 'Читать можно в любом порядке. Но порядок, в котором части лежат, — не случаен. Сначала среда. Потом взгляд. Потом то, что видно.' },
    ],
  },

  physics,
  fileEntry,
  processEntry,
  indexRecordEntry,
  executionEntry,
  entropyEntry,
  mappingEntry,
  storageEntry,
  memoryEntry,
  platformEntry,

  meta,

  archivist,
  
  gods,
  supremeNature,
  npcNature,
  acts,
  endings,
  goal,

  seon,
  firstVoice,
];