/**
 * Cargador de la carpeta palabras/ (juego Lingo).
 *
 * Formato de `palabras/palabras.txt`: **una palabra por línea**, en
 * castellano y con 5 letras («perro», «árbol», «niños»…).
 *
 * - Las líneas vacías y las que empiezan por `#` se ignoran (para
 *   poder comentar el fichero).
 * - Mayúsculas y acentos no importan: todo se normaliza antes de
 *   jugar («Árbol» = «árbol» = «ARBOL»), pero **la ñ se conserva**
 *   («niños» sigue siendo «NIÑOS»).
 * - Las palabras que no tengan 5 letras o estén repetidas se saltan:
 *   así un error a mano no rompe la partida.
 *
 * La lista es la reserva de palabras a adivinar; para comprobar los
 * intentos se consulta el diccionario de la RAE (ver `rae.js`).
 */

/**
 * Normaliza una palabra para jugar: mayúsculas, sin acentos ni
 * signos y con la ñ intacta («Árbol» → «ARBOL», «niños» → «NIÑOS»).
 */
export function normalizarPalabra(texto) {
  const VOCAL = { Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U", Ü: "U" };
  return String(texto ?? "")
    .normalize("NFC")
    .trim()
    .toUpperCase()
    .replace(/[ÁÉÍÓÚÜ]/g, (c) => VOCAL[c])
    .replace(/[^A-ZÑ]/g, "");
}

/**
 * Lee el texto de un fichero de palabras y devuelve las válidas: 5
 * letras, normalizadas y sin repetir, en el orden del fichero.
 * @returns {string[]}
 */
export function parsePalabras(texto) {
  const vistas = new Set();
  const palabras = [];
  for (const linea of String(texto ?? "").split(/\r?\n/)) {
    const recorte = linea.trim();
    if (!recorte || recorte.startsWith("#")) continue;
    const palabra = normalizarPalabra(recorte);
    if (palabra.length !== 5 || vistas.has(palabra)) continue;
    vistas.add(palabra);
    palabras.push(palabra);
  }
  return palabras;
}

/** Módulos de texto: mock de tests o glob de Vite (igual que plantillas/ y preguntas/). */
export function readPalabrasModulos() {
  const mock = globalThis.__PALABRAS_MOCK__;
  if (mock && typeof mock === "object") return mock;
  if (typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined") {
    return import.meta.glob("./*.txt", { eager: true, query: "?raw", import: "default" });
  }
  return {};
}

/**
 * Todas las palabras de la carpeta, listas para jugar.
 * @returns {{palabras: string[]}}
 */
export function loadPalabras() {
  const vistas = new Set();
  const palabras = [];
  for (const texto of Object.values(readPalabrasModulos())) {
    for (const palabra of parsePalabras(texto)) {
      if (vistas.has(palabra)) continue;
      vistas.add(palabra);
      palabras.push(palabra);
    }
  }
  return { palabras };
}

/**
 * Sortea la palabra de la partida. Si es posible no repite la
 * anterior (`previa`), como en el Trivial.
 */
export function sortearPalabra(palabras, rnd = Math.random, previa = null) {
  const lista = Array.isArray(palabras) ? palabras : [];
  if (lista.length === 0) return null;
  if (lista.length > 1 && previa != null) {
    const otras = lista.filter((p) => p !== previa);
    const banco = otras.length > 0 ? otras : lista;
    return banco[Math.floor(rnd() * banco.length)];
  }
  return lista[Math.floor(rnd() * lista.length)];
}
