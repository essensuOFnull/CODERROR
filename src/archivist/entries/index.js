// src/archivist/entries/index.js
//
// Свод. Собирается из частей. Хелперы — здесь же.
//
// — Архивариус

import { front } from './front.js';
import { prologue } from './chapters/prologue.js';
import { part1 } from './chapters/part1.js';
import { part2 } from './chapters/part2.js';
import { part3 } from './chapters/part3.js';
import { part4 } from './chapters/part4.js';
import { epilogue } from './chapters/epilogue.js';

export const entries = [
  ...front,
  ...prologue,
  ...part1,
  ...part2,
  ...part3,
  ...part4,
  ...epilogue,
];

export const entriesById = Object.fromEntries(
  entries.map((e) => [e.id, e])
);

export function getEntry(id) {
  return entriesById[id] || null;
}

export function getByNature(nature) {
  return entries.filter((e) => e.nature === nature);
}