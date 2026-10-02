/**
 * Registro de hojas.
 *
 * Esta primera versión solo tiene sheet-001. En el futuro será posible
 * añadir sheet-002, sheet-003… (o hojas con fecha) añadiendo el fichero y
 * una línea aquí, sin tocar los componentes.
 */

import sheet001 from "./sheet-001.js";

/** Arrays de la hoja que contienen ejercicios con corrección. */
export const EXERCISE_ARRAYS = [
  "additions",
  "subtractions",
  "multiplications",
  "divisions",
  "wordProblems",
  "mentalCalculations",
];

export const sheets = [sheet001];
export const defaultSheetId = "sheet-001";

export function getSheet(id = defaultSheetId) {
  return sheets.find((s) => s.id === id) ?? sheets[0];
}

/** Índice id → ejercicio o truco de una hoja. */
export function buildItemIndex(sheet) {
  const index = new Map();
  for (const key of EXERCISE_ARRAYS) {
    for (const exercise of sheet[key] ?? []) {
      index.set(exercise.id, { kind: "exercise", data: exercise });
    }
  }
  for (const tip of sheet.tips ?? []) {
    index.set(tip.id, { kind: "tip", data: tip });
  }
  return index;
}

/**
 * Items de una sección en orden, aplanando sus grupos.
 * Devuelve [{ kind, id, data, groupLabel }].
 */
export function getSectionItems(sheet, section) {
  const index = buildItemIndex(sheet);
  const items = [];
  for (const group of section.groups ?? []) {
    for (const id of group.ids) {
      const found = index.get(id);
      if (found) {
        items.push({ ...found, id, groupLabel: group.label });
      }
    }
  }
  return items;
}

/** Todos los ejercicios con corrección de la hoja (sin trucos), en orden. */
export function getAllExercises(sheet) {
  return EXERCISE_ARRAYS.flatMap((key) => sheet[key] ?? []);
}
