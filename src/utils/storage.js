/**
 * Persistencia local del progreso (localStorage, sin servidor).
 *
 * Clave versionada: si el modelo de datos cambia en el futuro, una versión
 * nueva empieza limpio en lugar de romper la lectura.
 */

const PREFIX = "juego-de-calcular";
const SCHEMA_VERSION = 1;

/** Clave del progreso de una hoja (exportada para las pruebas). */
export function sheetStateKey(sheetId) {
  return `${PREFIX}:${sheetId}:v${SCHEMA_VERSION}`;
}

/** Clave de la hoja activa (cuál se está usando ahora). */
export const ACTIVE_STORAGE_KEY = `${PREFIX}:hoja-activa`;

function keyFor(sheetId) {
  return sheetStateKey(sheetId);
}

/** Hoja activa guardada; null si no hay o falla la lectura. */
export function loadActiveSheetId() {
  try {
    return window.localStorage.getItem(ACTIVE_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/** Guarda la hoja activa. Silencioso ante errores. */
export function saveActiveSheetId(sheetId) {
  try {
    window.localStorage.setItem(ACTIVE_STORAGE_KEY, sheetId);
  } catch {
    // Almacenamiento no disponible: la app arranca con la hoja principal.
  }
}

/** Carga el estado guardado de una hoja; null si no hay o falla la lectura. */
export function loadSheetState(sheetId) {
  try {
    const raw = window.localStorage.getItem(keyFor(sheetId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== SCHEMA_VERSION) return null;
    return parsed.state ?? null;
  } catch {
    return null;
  }
}

/** Guarda el estado completo de una hoja. Silencioso ante errores. */
export function saveSheetState(sheetId, state) {
  try {
    window.localStorage.setItem(
      keyFor(sheetId),
      JSON.stringify({ version: SCHEMA_VERSION, savedAt: Date.now(), state })
    );
  } catch {
    // Almacenamiento lleno o no disponible: la app sigue funcionando.
  }
}

/** Borra el progreso de una hoja. */
export function clearSheetState(sheetId) {
  try {
    window.localStorage.removeItem(keyFor(sheetId));
  } catch {
    // Nada que hacer.
  }
}
