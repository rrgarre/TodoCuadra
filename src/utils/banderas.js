/**
 * Juego de banderas: sorteo del tablero, clics y puntuación.
 *
 * La partida saca hasta `MAX_BANDERAS` banderas al azar (rejilla de
 * `COLUMNAS` columnas, 20 = 4 × 5) y las pregunta **una vez cada
 * una**, en un orden distinto al de la rejilla. Clic en la bandera
 * correcta → siguiente nombre al instante; clic en una equivocada →
 * fallo y esa bandera se descarta hasta la pregunta siguiente.
 *
 * La puntuación es **aciertos × 100 − fallos × 50 − segundos × 2**
 * (con suelo en 0). Los tres pesos son constantes para poder probar
 * y ajustar la mezcla, sobre todo el peso del tiempo.
 */

/** Columnas de la rejilla: 20 banderas = 4 × 5. */
export const COLUMNAS = 4;
/** Cuántas banderas salen por partida (si hay suficientes). */
export const MAX_BANDERAS = 20;
/** Puntos por acierto, fallo y segundo de partida. */
export const PUNTOS_ACIERTO = 100;
export const PUNTOS_FALLO = 50;
export const PUNTOS_SEGUNDO = 2;

/** Barajado copia de la lista (Fisher-Yates) con el azar indicado. */
export function mezclar(lista, rnd = Math.random) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Hasta 20 banderas al azar, sin repetir (o todas si hay menos). */
export function sortearBanderas(paises, n = MAX_BANDERAS, rnd = Math.random) {
  const lista = Array.isArray(paises) ? paises : [];
  return mezclar(lista, rnd).slice(0, Math.min(n, lista.length));
}

/**
 * Partida nueva: tablero sorteado, el orden de las preguntas (una por
 * bandera, barajado aparte) y todo el marcador a cero.
 */
export function crearPartida(paises, rnd = Math.random) {
  const tablero = sortearBanderas(paises, MAX_BANDERAS, rnd);
  return {
    tablero,
    objetivos: mezclar(tablero.map((p) => p.id), rnd),
    idx: 0,
    aciertos: 0,
    fallos: 0,
    descartadas: [],
    marcado: null, // { id, ok } para la animación del último clic
    fase: "jugando", // jugando | fin
    segundos: 0,
  };
}

/**
 * Clic en una bandera: acierto (pasa al siguiente al instante) o
 * fallo (esa bandera se descarta en ESTA pregunta). Una bandera ya
 * acertada o ya descartada no vuelve a contar.
 */
export function clicBandera(partida, id) {
  if (partida.fase !== "jugando") return partida;
  const objetivo = partida.objetivos[partida.idx];
  if (!objetivo) return partida;
  if (partida.objetivos.slice(0, partida.idx).includes(id)) return partida;

  if (id === objetivo) {
    const idx = partida.idx + 1;
    const ultima = idx >= partida.objetivos.length;
    return {
      ...partida,
      idx,
      aciertos: partida.aciertos + 1,
      descartadas: [],
      marcado: { id, ok: true },
      fase: ultima ? "fin" : "jugando",
    };
  }
  if (partida.descartadas.includes(id)) return partida;
  return {
    ...partida,
    fallos: partida.fallos + 1,
    descartadas: [...partida.descartadas, id],
    marcado: { id, ok: false },
  };
}

/**
 * Puntuación final: aciertos × 100 − fallos × 50 − segundos × 2,
 * sin bajar nunca de 0.
 */
export function puntuacion({ aciertos = 0, fallos = 0, segundos = 0 } = {}) {
  const bruto =
    aciertos * PUNTOS_ACIERTO -
    fallos * PUNTOS_FALLO -
    Math.round(segundos) * PUNTOS_SEGUNDO;
  return Math.max(0, bruto);
}

/** Tiempo en m:ss (97 → «1:37»). */
export function formatoTiempo(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
