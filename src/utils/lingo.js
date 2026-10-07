/**
 * Lógica del juego Lingo: comparar el intento con la palabra y
 * pintar filas y teclado.
 *
 * Estados de una letra:
 * - `ok`  (verde):  está en su posición.
 * - `pos` (amarillo): está en la palabra pero en otra posición.
 * - `no`  (gris):   no está en la palabra.
 */

/** Letras por palabra. */
export const TAM = 5;
/** Intentos (filas del tablero). */
export const FILAS = 6;

/** Peso de cada estado: verde gana a amarillo y amarillo a gris. */
const PESO = { no: 1, pos: 2, ok: 3 };

/**
 * Compara el intento con la palabra objetivo letra a letra, contando
 * bien las repetidas (primero las verdes; después, de izquierda a
 * derecha, las amarillas sin pasarse del número de repeticiones que
 * quedan en la palabra).
 * @param {string[]} intento 5 letras
 * @param {string[]} objetivo 5 letras
 * @returns {string[]} 5 estados
 */
export function colorear(intento, objetivo) {
  const res = Array(TAM).fill("no");
  for (let i = 0; i < TAM; i += 1) {
    if (intento[i] === objetivo[i]) res[i] = "ok";
  }
  const restantes = {};
  for (let i = 0; i < TAM; i += 1) {
    if (res[i] !== "ok") restantes[objetivo[i]] = (restantes[objetivo[i]] ?? 0) + 1;
  }
  for (let i = 0; i < TAM; i += 1) {
    if (res[i] !== "ok" && restantes[intento[i]] > 0) {
      res[i] = "pos";
      restantes[intento[i]] -= 1;
    }
  }
  return res;
}

/**
 * Estados de las letras de un intento para el teclado, guardando el
 * mejor de cada letra en la fila (verde > amarillo > gris).
 */
export function tecladoDesdeFila(intento, estados) {
  const mapa = {};
  for (let i = 0; i < intento.length; i += 1) {
    const letra = intento[i];
    const estado = estados[i];
    if (!mapa[letra] || PESO[estado] > PESO[mapa[letra]]) mapa[letra] = estado;
  }
  return mapa;
}

/**
 * Mezcla los estados del teclado: lo mejor gana y nunca se degrada
 * (un verde se queda verde; un gris puede subir si luego aparece).
 */
export function fusionarTeclado(actual, nuevos) {
  const salida = { ...actual };
  for (const [letra, estado] of Object.entries(nuevos ?? {})) {
    const previo = salida[letra];
    if (!previo || PESO[estado] > PESO[previo]) salida[letra] = estado;
  }
  return salida;
}

/** ¿La fila entera está escrita (las 5 letras)? */
export function filaCompleta(fila) {
  return Array.isArray(fila) && fila.length === TAM && fila.every((l) => Boolean(l));
}
