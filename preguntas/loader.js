/**
 * Cargador de la carpeta preguntas/ (apartado Trivial).
 *
 * Formato estándar: un JSON por categoría y cada fichero es una lista
 * `[ ... ]` de preguntas con esta pinta:
 *
 *   {
 *     "pregunta": "¿Cuántas patas tiene una araña?", // obligatoria
 *     "respuesta": "8",                               // obligatoria
 *     "detalle": "Las arañas son arácnidos: 8 patas", // opcional
 *     "categoria": "Primaria"                         // opcional
 *   }
 *
 * - `categoria` es opcional: si no viene, la pregunta coge el nombre del
 *   fichero (geografia.json → «Geografia»). Las categorías se agrupan sin
 *   distinguir mayúsculas, acentos ni puntuación, así que «Geografía» y
 *   «Geografia», o «Deporte, pasatiempos» y «Deporte pasatiempos», son lo
 *   mismo.
 * - `id` es opcional y se ignora: la app genera su propia clave interna.
 * - Un fichero vacío `[]` es válido: su categoría aparece en la pantalla
 *   de selección como «Aún sin preguntas».
 * - Una pregunta que no cumple el formato se salta y deja un aviso con la
 *   ruta del fichero; nunca se carga nada a medias.
 */

/** Módulos JSON de preguntas: mock de tests o glob de Vite (igual que plantillas/). */
export function readPreguntasModules() {
  const mock = globalThis.__PREGUNTAS_MOCK__;
  if (mock && typeof mock === "object") return mock;
  if (typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined") {
    return import.meta.glob("./*.json", { eager: true });
  }
  return {};
}

const PARTICULAS = new Set(["de", "del", "la", "el", "las", "los", "y", "e", "a", "al", "o"]);

/** «preguntas/ciencia-tecnologia-e-informatica.json» → «Ciencia Tecnologia e Informatica». */
export function tituloDesdeRuta(ruta) {
  const nombre = String(ruta).split(/[\\/]/).pop().replace(/\.json$/i, "");
  return nombre
    .split("-")
    .filter(Boolean)
    .map((palabra, i) => {
      const p = palabra.toLowerCase();
      if (i > 0 && PARTICULAS.has(p)) return p;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(" ");
}

/**
 * Clave de agrupación: sin acentos, sin mayúsculas, sin puntuación y con
 * un solo espacio entre palabras — así «Deporte, pasatiempos y
 * entretenimiento» y «Deporte pasatiempos y entretenimiento» son la misma.
 */
function normalizar(titulo) {
  return String(titulo)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Valida un JSON contra el formato estándar.
 * @returns {{preguntas: object[], errors: string[]}}
 */
export function parsePreguntas(json, shortPath) {
  if (!Array.isArray(json)) {
    return {
      preguntas: [],
      errors: [
        `${shortPath}: debe ser una lista de preguntas ([ { "pregunta", "respuesta" } ]); fichero no cargado.`,
      ],
    };
  }

  const errors = [];
  const preguntas = [];
  const categoriaPorDefecto = tituloDesdeRuta(shortPath);

  json.forEach((item, i) => {
    const pos = `${shortPath}: la pregunta ${i + 1}`;
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${pos} no es un objeto con "pregunta" y "respuesta".`);
      return;
    }
    if (typeof item.pregunta !== "string" || item.pregunta.trim() === "") {
      errors.push(`${pos} no tiene un "pregunta" con texto.`);
      return;
    }
    if (typeof item.respuesta !== "string" || item.respuesta.trim() === "") {
      errors.push(`${pos} no tiene una "respuesta" con texto.`);
      return;
    }
    let detalle = null;
    if (item.detalle != null) {
      if (typeof item.detalle !== "string") {
        errors.push(`${pos}: "detalle" debe ser texto.`);
        return;
      }
      detalle = item.detalle.trim() || null;
    }
    let categoria = categoriaPorDefecto;
    if (item.categoria != null) {
      if (typeof item.categoria !== "string" || item.categoria.trim() === "") {
        errors.push(`${pos}: "categoria" debe ser texto.`);
        return;
      }
      categoria = item.categoria.trim();
    }
    preguntas.push({
      key: `${shortPath}#${i + 1}`,
      pregunta: item.pregunta.trim(),
      respuesta: item.respuesta.trim(),
      detalle,
      categoria,
    });
  });

  return { preguntas, errors };
}

/**
 * Agrupa las preguntas en categorías: manda el campo `categoria` de cada
 * pregunta (o el nombre del fichero si no lo trae). Un fichero sin
 * preguntas crea su categoría vacía, para que aparezca como «Aún sin
 * preguntas»; así nunca nace un grupo vacío duplicado junto al real.
 * @returns {{categorias: {titulo: string, preguntas: object[]}[], warnings: string[]}}
 */
export function buildCategorias(modules) {
  const grupos = new Map();
  const warnings = [];

  const asegurar = (titulo) => {
    const k = normalizar(titulo);
    if (!grupos.has(k)) grupos.set(k, { titulo, preguntas: [] });
    return grupos.get(k);
  };

  for (const path of Object.keys(modules ?? {}).sort()) {
    const mod = modules[path];
    const json =
      mod && typeof mod === "object" && "default" in mod ? mod.default : mod;
    const parts = String(path).split(/[\\/]/);
    const short = parts.slice(-2).join("/");

    if (!Array.isArray(json)) {
      warnings.push(
        `${short}: debe ser una lista de preguntas ([ { "pregunta", "respuesta" } ]); fichero no cargado.`
      );
      continue;
    }

    const result = parsePreguntas(json, short);
    warnings.push(...result.errors);
    if (result.preguntas.length === 0) {
      // Fichero vacío (o con todo roto): su categoría queda visible y
      // desactivada, pendiente de rellenar.
      asegurar(tituloDesdeRuta(short));
      continue;
    }
    for (const p of result.preguntas) asegurar(p.categoria).preguntas.push(p);
  }

  const categorias = [...grupos.values()].sort((a, b) =>
    a.titulo.localeCompare(b.titulo, "es")
  );
  return { categorias, warnings };
}

/** Caché: se lee la carpeta una sola vez por carga de la app. */
let cache = null;

/** @returns {{categorias: object[], warnings: string[]}} */
export function loadPreguntas() {
  if (!cache) cache = buildCategorias(readPreguntasModules());
  return cache;
}

export function resetPreguntasCache() {
  cache = null;
}

/**
 * Preguntas disponibles: las de una categoría o, con `titulo` a null,
 * todas mezcladas.
 */
export function poolPreguntas(categorias, titulo) {
  const lista = Array.isArray(categorias) ? categorias : [];
  if (titulo == null) return lista.flatMap((c) => c.preguntas);
  const cat = lista.find((c) => c.titulo === titulo);
  return cat ? [...cat.preguntas] : [];
}

/**
 * Siguiente pregunta al azar; si es posible, no repite la que se acaba de
 * mostrar (con una sola pregunta en el pool, se repite inevitablemente).
 * @returns {object|null}
 */
export function siguientePregunta(preguntas, keyActual) {
  if (!Array.isArray(preguntas) || preguntas.length === 0) return null;
  const otras =
    keyActual == null
      ? preguntas
      : preguntas.filter((p) => p.key !== keyActual);
  const base = otras.length > 0 ? otras : preguntas;
  return base[Math.floor(Math.random() * base.length)];
}
