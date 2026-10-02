/**
 * Registro de hojas.
 *
 * Todas las fichas viven en plantillas/*.json y se leen con el sistema
 * de plantillas (plantillas/templates.js): cada ficha es una hoja
 * independiente con su propio progreso. Añadir hojas = soltar un JSON
 * en plantillas/, sin tocar los componentes.
 */

import { loadTemplates } from "../../../plantillas/templates.js";

/** Arrays de la hoja que contienen ejercicios con corrección. */
export const EXERCISE_ARRAYS = [
  "additions",
  "subtractions",
  "multiplications",
  "divisions",
  "wordProblems",
  "mentalCalculations",
  "logicExercises",
];

export const defaultSheetId = "sheet-001";

/** Hoja vacía de emergencia: solo si no hay ninguna ficha cargada. */
const EMPTY_SHEET = {
  id: "vacio",
  title: "Sin fichas cargadas",
  level: "4º Primaria",
  icon: "🗂️",
  sections: [],
  tips: [],
  template: true,
  ...Object.fromEntries(EXERCISE_ARRAYS.map((k) => [k, []])),
};

let allSheets = null;

/** Todas las fichas válidas de la carpeta plantillas/. */
export function listSheets() {
  if (!allSheets) allSheets = loadTemplates().sheets;
  return allSheets;
}

/** Avisos de las fichas que no se han podido cargar. */
export function getTemplateWarnings() {
  return loadTemplates().warnings;
}

/** Reinicia la caché de fichas (solo lo usan las pruebas). */
export function resetSheetCache() {
  allSheets = null;
}

export function getSheet(id = defaultSheetId) {
  const list = listSheets();
  return list.find((s) => s.id === id) ?? list[0] ?? EMPTY_SHEET;
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
