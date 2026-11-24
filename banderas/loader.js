/**
 * Cargador de la carpeta banderas/ (juego de banderas).
 *
 * Los países están en `banderas/paises.json` y sus banderas en
 * `banderas/imagenes/`, **con el mismo id**: la bandera de
 * `{ "id": "espana", "nombre": "España" }` es `imagenes/espana.png`
 * (también sirven `.svg`, `.jpg`, `.jpeg` o `.webp`).
 *
 * - Solo se juega con los países que **ya tienen imagen**: la carpeta
 *   se puede ir llenando una bandera a la vez y el juego usa las que
 *   estén (el título de la pantalla cuenta cuántas hay).
 * - Un JSON roto o una entrada sin `id`/`nombre` se salta sin romper
 *   el resto, igual que las palabras del Lingo.
 */

/** Países de un JSON: entradas con `id` y `nombre`, sin repetir id. */
export function parsePaises(texto) {
  let datos;
  try {
    datos = typeof texto === "string" ? JSON.parse(texto) : texto;
  } catch {
    return [];
  }
  const lista = Array.isArray(datos)
    ? datos
    : datos && Array.isArray(datos.paises)
      ? datos.paises
      : [];
  const vistos = new Set();
  const paises = [];
  for (const item of lista) {
    if (!item || typeof item !== "object") continue;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const nombre = typeof item.nombre === "string" ? item.nombre.trim() : "";
    if (!id || !nombre || vistos.has(id)) continue;
    vistos.add(id);
    paises.push({ id, nombre });
  }
  return paises;
}

/** Módulos de la carpeta: mock de tests o globs de Vite (igual que
 *  plantillas/, preguntas/ y palabras/). */
export function readBanderasModulos() {
  const mock = globalThis.__BANDERAS_MOCK__;
  if (mock && typeof mock === "object") return mock;
  if (typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined") {
    return {
      imagenes: import.meta.glob("./imagenes/*.{png,svg,jpg,jpeg,webp}", {
        eager: true,
        query: "?url",
        import: "default",
      }),
      paises: import.meta.glob("./paises.json", {
        eager: true,
        query: "?raw",
        import: "default",
      }),
    };
  }
  return { imagenes: {}, paises: {} };
}

/**
 * Todos los países de la carpeta listos para jugar: los del JSON
 * **que ya tengan su imagen**, con la url de la bandera.
 * @returns {{paises: Array<{id: string, nombre: string, url: string}>}}
 */
export function loadBanderas() {
  const modulos = readBanderasModulos();

  // Imagen por id: «banderas/imagenes/espana.png» → id «espana».
  const imagenes = new Map();
  for (const [ruta, url] of Object.entries(modulos.imagenes ?? {})) {
    const archivo = String(ruta).split(/[\\/]/).pop() ?? "";
    const id = archivo.replace(/\.[^.]+$/, "");
    if (id && !imagenes.has(id)) imagenes.set(id, url);
  }

  const paises = [];
  const vistos = new Set();
  for (const texto of Object.values(modulos.paises ?? {})) {
    for (const pais of parsePaises(texto)) {
      if (vistos.has(pais.id)) continue;
      const url = imagenes.get(pais.id);
      if (!url) continue; // Sin imagen todavía: se salta.
      vistos.add(pais.id);
      paises.push({ ...pais, url });
    }
  }
  return { paises };
}
