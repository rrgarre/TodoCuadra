/**
 * Sistema de plantillas: TODO vive junto a los JSON que describe.
 *
 * Este fichero es la "lógica para entender las plantillas": parsea cada
 * ficha, la valida y la convierte en una hoja lista para usar. Los JSON
 * de esta misma carpeta (plantillas/*.json) son las fichas de ejercicios.
 *
 * Convierte un JSON escrito en español en una hoja lista para usar:
 * genera los ids, agrupa por tipo (o por el "grupo" indicado), calcula
 * los resultados de los problemas y valida todo con mensajes en
 * español que empiezan por el nombre del fichero.
 *
 * Nunca lanza excepciones: devuelve { ok, sheet, errors } para que la
 * portada pueda avisar y seguir funcionando sin esa ficha.
 *
 * Nota: todo .json de esta carpeta se interpreta como una ficha (la
 * configuración va en ficheros .js, p. ej. remotas.js).
 */

import remotas from "./remotas.js";

/** tipo de la plantilla → tipo interno, array de la hoja y etiqueta. */
const TIPOS = {
  suma: { type: "addition", array: "additions", label: "Sumas" },
  resta: { type: "subtraction", array: "subtractions", label: "Restas" },
  multiplicacion: {
    type: "multiplication",
    array: "multiplications",
    label: "Multiplicaciones",
  },
  division: { type: "division", array: "divisions", label: "Divisiones" },
  problema: { type: "wordProblem", array: "wordProblems", label: "Problemas" },
  mental: { type: "mental", array: "mentalCalculations", label: "Cálculo mental" },
  truco: { type: "tip", array: "tips", label: "Trucos" },
  logica: { type: "logica", array: "logicExercises", label: "Lógica" },
};

export const TIPOS_PLANTILLA = Object.keys(TIPOS);

/**
 * Formatos de ficha: cada JSON declara su "tipo" y eso decide en qué
 * zona del menú principal se lista y qué tipos de ejercicio admite.
 * Para añadir un formato nuevo (p. ej. "quiz") basta con una entrada.
 */
export const FORMATOS = {
  calculo: {
    bloque: "Cálculo",
    icono: "🧮",
    orden: 1,
    tipos: ["suma", "resta", "multiplicacion", "division", "problema", "mental", "truco"],
    permiteSecciones: true,
  },
  logica: {
    bloque: "Lógica",
    icono: "🧩",
    orden: 2,
    tipos: ["logica"],
    permiteSecciones: false,
  },
};

export const FORMATOS_IDS = Object.keys(FORMATOS);

/** Operaciones de los problemas, en español → interno. */
const OPS = { suma: "add", resta: "sub", multiplicacion: "mul", division: "div" };

/** Arrays con corrección que puede rellenar una plantilla. */
const ALL_ARRAYS = [
  "additions",
  "subtractions",
  "multiplications",
  "divisions",
  "wordProblems",
  "mentalCalculations",
  "logicExercises",
  "tips",
];

const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const isInt = (n) => isNum(n) && Number.isInteger(n);
const hasText = (v) => typeof v === "string" && v.trim() !== "";

/** "Lógica" → "logica" (para ids y rutas de sección). */
export function slugify(texto) {
  return (
    String(texto)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "hoja"
  );
}

/* ------------------------------------------------------------------ */
/* Un ejercicio                                                        */
/* ------------------------------------------------------------------ */

function buildExercise(raw, def, n, err, id) {
  switch (raw.tipo) {
    case "suma":
    case "resta":
    case "multiplicacion":
    case "division": {
      if (!isInt(raw.a) || raw.a < 0) {
        err(`el ejercicio ${n} ("${raw.tipo}") necesita "a" como número entero positivo.`);
        return null;
      }
      if (!isInt(raw.b) || raw.b < 0) {
        err(`el ejercicio ${n} ("${raw.tipo}") necesita "b" como número entero positivo.`);
        return null;
      }
      if (raw.tipo === "resta" && raw.a < raw.b) {
        err(
          `el ejercicio ${n} ("resta") no puede restar más de lo que hay: a (${raw.a}) debe ser mayor o igual que b (${raw.b}).`
        );
        return null;
      }
      if (raw.tipo === "division" && raw.b < 1) {
        err(`el ejercicio ${n} ("division") necesita "b" mayor que 0.`);
        return null;
      }
      if (raw.tipo === "multiplicacion" && (raw.b < 1 || raw.b > 99)) {
        err(`el ejercicio ${n} ("multiplicacion") necesita "b" de una o dos cifras (1–99).`);
        return null;
      }
      return { id, type: def.type, a: raw.a, b: raw.b };
    }

    case "problema": {
      if (!hasText(raw.texto)) {
        err(`el ejercicio ${n} ("problema") necesita el campo "texto".`);
        return null;
      }
      if (!Array.isArray(raw.pasos) || raw.pasos.length === 0) {
        err(`el ejercicio ${n} ("problema") necesita "pasos" con al menos una operación.`);
        return null;
      }
      const plan = [];
      for (let p = 0; p < raw.pasos.length; p++) {
        const paso = raw.pasos[p];
        const op = paso && typeof paso === "object" ? OPS[paso.op] : null;
        if (!op) {
          err(
            `el ejercicio ${n} ("problema"), paso ${p + 1}: "op" debe ser una de ${Object.keys(OPS).join(", ")}.`
          );
          return null;
        }
        if (!isNum(paso.a) || !isNum(paso.b)) {
          err(`el ejercicio ${n} ("problema"), paso ${p + 1}: "a" y "b" deben ser números.`);
          return null;
        }
        const result =
          op === "add"
            ? paso.a + paso.b
            : op === "sub"
            ? paso.a - paso.b
            : op === "mul"
            ? paso.a * paso.b
            : paso.a / paso.b;
        if (!isInt(result) || result < 0) {
          err(
            `el ejercicio ${n} ("problema"), paso ${p + 1}: el resultado (${result}) no es un número entero positivo; revisa "a" y "b".`
          );
          return null;
        }
        plan.push({ op, a: paso.a, b: paso.b, result });
      }
      const answer = plan[plan.length - 1].result;
      if (raw.respuesta !== undefined && (!isNum(raw.respuesta) || raw.respuesta !== answer)) {
        err(
          `el ejercicio ${n} ("problema"): la "respuesta" (${raw.respuesta}) no coincide con el resultado calculado (${answer}).`
        );
        return null;
      }
      return {
        id,
        type: "wordProblem",
        mode: raw.modo === "eleccion" ? "choose" : "guided",
        text: raw.texto.trim(),
        plan,
        answer,
      };
    }

    case "mental": {
      if (!hasText(raw.expr)) {
        err(`el ejercicio ${n} ("mental") necesita "expr" (la expresión a resolver).`);
        return null;
      }
      if (!isNum(raw.resultado)) {
        err(`el ejercicio ${n} ("mental") necesita "resultado" como número.`);
        return null;
      }
      const ex = { id, type: "mental", expr: raw.expr.trim(), result: raw.resultado };
      if (hasText(raw.pista)) ex.hint = raw.pista.trim();
      if (hasText(raw.trucoId)) ex.tipId = raw.trucoId.trim();
      return ex;
    }

    case "truco": {
      const faltan = [];
      if (!hasText(raw.titulo)) faltan.push("titulo");
      if (!hasText(raw.gancho)) faltan.push("gancho");
      if (!hasText(raw.resumen)) faltan.push("resumen");
      if (!hasText(raw.explicacion)) faltan.push("explicacion");
      const ej = raw.ejemplo;
      if (
        !ej ||
        typeof ej !== "object" ||
        !hasText(ej.expr) ||
        !Array.isArray(ej.pasos) ||
        ej.pasos.length === 0 ||
        ej.pasos.some((s) => !hasText(s))
      ) {
        faltan.push("ejemplo { expr, pasos }");
      }
      if (faltan.length) {
        err(`el ejercicio ${n} ("truco") le falta: ${faltan.join(", ")}.`);
        return null;
      }
      return {
        id,
        type: "tip",
        title: raw.titulo.trim(),
        tease: raw.gancho.trim(),
        short: raw.resumen.trim(),
        example: { expr: ej.expr.trim(), steps: ej.pasos.map((s) => s.trim()) },
        explanation: raw.explicacion.trim(),
      };
    }

    case "logica": {
      const v = raw.variante;
      if (v !== "serie" && v !== "comparacion" && v !== "enigma") {
        err(`el ejercicio ${n} ("logica") necesita "variante": serie, comparacion o enigma.`);
        return null;
      }
      if (!hasText(raw.enunciado)) {
        err(`el ejercicio ${n} ("logica") necesita "enunciado".`);
        return null;
      }
      const ex = { id, type: "logica", variant: v, prompt: raw.enunciado.trim() };
      if (hasText(raw.pista)) ex.hint = raw.pista.trim();
      const explicacion = hasText(raw.explicacion) ? raw.explicacion.trim() : null;

      if (v === "serie") {
        if (
          !Array.isArray(raw.elementos) ||
          raw.elementos.length < 3 ||
          !raw.elementos.every(isNum)
        ) {
          err(`el ejercicio ${n} ("logica/serie") necesita "elementos" con al menos 3 números.`);
          return null;
        }
        if (!isNum(raw.respuesta)) {
          err(`el ejercicio ${n} ("logica/serie") necesita "respuesta" (el número que sigue).`);
          return null;
        }
        // Si la serie es aritmética, la respuesta se puede comprobar.
        const d = raw.elementos[1] - raw.elementos[0];
        const arit = raw.elementos.every((x, i) => i === 0 || x - raw.elementos[i - 1] === d);
        const esperada = raw.elementos[raw.elementos.length - 1] + d;
        if (arit && raw.respuesta !== esperada) {
          err(
            `el ejercicio ${n} ("logica/serie"): la "respuesta" (${raw.respuesta}) no sigue la serie (esperaba ${esperada}).`
          );
          return null;
        }
        ex.series = [...raw.elementos];
        ex.answer = raw.respuesta;
        if (explicacion) ex.explanation = explicacion;
        else if (arit) {
          ex.explanation =
            d >= 0
              ? `La serie sube de ${d} en ${d}: ${raw.elementos[raw.elementos.length - 1]} + ${d} = ${esperada}.`
              : `La serie baja de ${-d} en ${-d}: ${raw.elementos[raw.elementos.length - 1]} − ${-d} = ${esperada}.`;
        }
        return ex;
      }

      if (v === "comparacion") {
        if (!isNum(raw.izquierda) || !isNum(raw.derecha)) {
          err(`el ejercicio ${n} ("logica/comparacion") necesita "izquierda" y "derecha" como números.`);
          return null;
        }
        const resp = hasText(raw.respuesta) ? raw.respuesta.trim().toLowerCase() : "";
        const esperada = raw.izquierda > raw.derecha ? "mayor" : raw.izquierda < raw.derecha ? "menor" : "igual";
        if (resp !== "mayor" && resp !== "menor" && resp !== "igual") {
          err(`el ejercicio ${n} ("logica/comparacion"): "respuesta" debe ser "mayor", "menor" o "igual".`);
          return null;
        }
        if (resp !== esperada) {
          err(
            `el ejercicio ${n} ("logica/comparacion"): la "respuesta" (${resp}) no coincide: ${raw.izquierda} es ${esperada} que ${raw.derecha}.`
          );
          return null;
        }
        ex.left = raw.izquierda;
        ex.right = raw.derecha;
        ex.answer = esperada;
        ex.explanation =
          explicacion ??
          `${raw.izquierda} ${esperada === "mayor" ? ">" : esperada === "menor" ? "<" : "="} ${raw.derecha}: por eso la respuesta es ${esperada}.`;
        return ex;
      }

      // enigma
      if (!isNum(raw.respuesta)) {
        err(`el ejercicio ${n} ("logica/enigma") necesita "respuesta" como número.`);
        return null;
      }
      ex.answer = raw.respuesta;
      if (explicacion) ex.explanation = explicacion;
      return ex;
    }

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Secciones personalizadas (formatos que lo permiten)                 */
/* ------------------------------------------------------------------ */

/**
 * Convierte el campo "secciones" del JSON en las secciones internas,
 * validando que cada id exista y que nada se quede fuera de sección.
 * Devuelve null si hubo errores (que ya están en `err`).
 */
function buildSecciones(raw, knownIds, err, defaultIcon) {
  if (!Array.isArray(raw) || raw.length === 0) {
    err('"secciones" debe ser una lista con al menos una sección.');
    return null;
  }
  const sections = [];
  const seen = new Set();
  const covered = new Set();

  raw.forEach((sec, i) => {
    const n = i + 1;
    if (!sec || typeof sec !== "object" || Array.isArray(sec)) {
      err(`la sección ${n} no es un objeto.`);
      return;
    }
    if (!hasText(sec.titulo)) {
      err(`la sección ${n} necesita "titulo".`);
      return;
    }
    if (!Array.isArray(sec.grupos) || sec.grupos.length === 0) {
      err(`la sección «${sec.titulo}» necesita "grupos" con al menos un grupo.`);
      return;
    }
    const secId = hasText(sec.id) ? sec.id.trim() : slugify(sec.titulo);
    if (seen.has(secId)) {
      err(`la sección «${sec.titulo}» repite el id «${secId}».`);
      return;
    }
    seen.add(secId);

    const groups = [];
    sec.grupos.forEach((g, gi) => {
      if (!g || typeof g !== "object" || !hasText(g.etiqueta)) {
        err(`la sección «${sec.titulo}», grupo ${gi + 1}: necesita "etiqueta".`);
        return;
      }
      if (!Array.isArray(g.ids) || g.ids.length === 0) {
        err(`la sección «${sec.titulo}», grupo «${g.etiqueta}»: necesita "ids" con al menos un ejercicio.`);
        return;
      }
      const ids = [];
      for (const id of g.ids) {
        if (typeof id !== "string" || !knownIds.has(id)) {
          err(
            `la sección «${sec.titulo}», grupo «${g.etiqueta}»: el id ${JSON.stringify(id)} no corresponde a ningún ejercicio de la ficha.`
          );
          continue;
        }
        ids.push(id);
        covered.add(id);
      }
      groups.push({ label: g.etiqueta.trim(), ids });
    });

    const out = {
      id: secId,
      title: sec.titulo.trim(),
      icon: hasText(sec.icono) ? sec.icono.trim() : defaultIcon,
      groups,
    };
    if (hasText(sec.descripcion)) out.description = sec.descripcion.trim();
    sections.push(out);
  });

  // Todo ejercicio debe aparecer en al menos una sección.
  for (const id of knownIds) {
    if (!covered.has(id)) err(`el ejercicio «${id}» no aparece en ninguna sección.`);
  }

  return sections;
}

/* ------------------------------------------------------------------ */
/* Una plantilla completa                                              */
/* ------------------------------------------------------------------ */

/**
 * Parsea y valida una plantilla.
 * @param {unknown} data contenido del JSON
 * @param {string} file nombre del fichero para los mensajes de error
 * @returns {{ok: true, sheet: object, errors: []} | {ok: false, errors: string[]}}
 */
export function parseTemplate(data, file = "plantilla") {
  const errors = [];
  const err = (msg) => errors.push(`${file}: ${msg}`);

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      ok: false,
      errors: [`${file}: el contenido no es un objeto JSON con "titulo" y "ejercicios".`],
    };
  }

  if (!hasText(data.titulo)) err('falta el campo "titulo" (el nombre de la hoja).');
  const tipoFicha = hasText(data.tipo) ? data.tipo.trim() : "";
  if (!tipoFicha) {
    err(`falta el campo "tipo" (el formato de la ficha: ${FORMATOS_IDS.join(", ")}).`);
  } else if (!FORMATOS[tipoFicha]) {
    err(
      `el campo "tipo" no corresponde a ningún formato: ${JSON.stringify(data.tipo)}. Formatos válidos: ${FORMATOS_IDS.join(", ")}.`
    );
  }
  const fmt = FORMATOS[tipoFicha];
  if (data.id !== undefined && !hasText(data.id)) {
    err('el campo "id" de la ficha debe ser un texto (identificador propio, p. ej. "sheet-001").');
  }
  if (!Array.isArray(data.ejercicios) || data.ejercicios.length === 0) {
    err('falta el campo "ejercicios": debe ser una lista con al menos un ejercicio.');
  }

  const arrays = {};
  const groups = new Map();
  const groupOrder = [];
  const knownIds = new Set();
  const tipLinks = [];
  const raws = Array.isArray(data.ejercicios) ? data.ejercicios : [];
  const tituloSlug = hasText(data.titulo) ? slugify(data.titulo) : "hoja";

  raws.forEach((raw, i) => {
    const n = i + 1;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      err(`el ejercicio ${n} no es un objeto.`);
      return;
    }
    const def = TIPOS[raw.tipo];
    if (!def) {
      err(
        `el ejercicio ${n} tiene un "tipo" no válido: ${JSON.stringify(raw.tipo ?? null)}. Tipos válidos: ${TIPOS_PLANTILLA.join(", ")}.`
      );
      return;
    }
    if (fmt && !fmt.tipos.includes(raw.tipo)) {
      err(
        `el ejercicio ${n} tiene el tipo «${raw.tipo}» que no pertenece al formato «${tipoFicha}» (tipos admitidos: ${fmt.tipos.join(", ")}).`
      );
      return;
    }
    if (raw.id !== undefined && !hasText(raw.id)) {
      err(`el ejercicio ${n}: "id" debe ser un texto (o no ponerlo y se genera solo).`);
      return;
    }
    const id = hasText(raw.id) ? raw.id.trim() : `${tituloSlug}-${n}`;
    if (knownIds.has(id)) {
      err(`el ejercicio ${n} se repite el id «${id}»; cada ejercicio necesita un id distinto.`);
      return;
    }
    const built = buildExercise(raw, def, n, err, id);
    if (!built) return;
    knownIds.add(id);
    (arrays[def.array] ??= []).push(built);
    if (built.type === "mental" && built.tipId) tipLinks.push({ n, ex: built });
    const label = hasText(raw.grupo) ? raw.grupo.trim() : def.label;
    if (!groups.has(label)) {
      groups.set(label, []);
      groupOrder.push(label);
    }
    groups.get(label).push(id);
  });

  // Los ejercicios de cálculo mental pueden enlazar con un truco de la ficha.
  for (const { n, ex } of tipLinks) {
    if (!knownIds.has(ex.tipId)) {
      err(`el ejercicio ${n} ("mental"): el "trucoId" «${ex.tipId}» no corresponde a ningún truco de la ficha.`);
    }
  }

  // Secciones personalizadas (solo en formatos que las admiten).
  let customSections = null;
  if (data.secciones !== undefined) {
    if (!fmt) {
      // El error de la cabecera "tipo" ya está; no se puede validar más.
    } else if (!fmt.permiteSecciones) {
      err(`el formato «${tipoFicha}» no admite "secciones": esa ficha se agrupa sola por "grupo".`);
    } else {
      customSections = buildSecciones(
        data.secciones,
        knownIds,
        err,
        hasText(data.icono) ? data.icono.trim() : "🗂️"
      );
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const titulo = data.titulo.trim();
  const sheetId = hasText(data.id) ? data.id.trim() : `plantilla-${tituloSlug}`;
  const icono = hasText(data.icono) ? data.icono.trim() : "🗂️";
  const sheet = {
    id: sheetId,
    title: titulo,
    level: hasText(data.nivel) ? data.nivel.trim() : "4º Primaria",
    icon: icono,
    formato: tipoFicha,
    template: true,
    sourceFile: file,
    ...Object.fromEntries(ALL_ARRAYS.map((k) => [k, []])),
    ...arrays,
    sections: customSections ?? [
      {
        id: `${sheetId}-seccion`,
        title: titulo,
        icon: icono,
        description: hasText(data.descripcion)
          ? data.descripcion.trim()
          : `${raws.length} ejercicios`,
        groups: groupOrder.map((label) => ({ label, ids: groups.get(label) })),
      },
    ],
  };

  return { ok: true, sheet, errors: [] };
}

/* ------------------------------------------------------------------ */
/* Carga de la carpeta plantillas/                                     */
/* ------------------------------------------------------------------ */

/**
 * Módulos JSON de fichas: mock de tests o glob de Vite.
 *
 * El glob de Vite solo existe en el entorno de la app (Vite define
 * import.meta.env); en las pruebas con esbuild/Node el glob no está y
 * se usa una lista vacía, o el mock global __PLANTILLAS_MOCK__ que
 * preparan los tests con los JSON que quieran.
 */
export function readPlantillasModules() {
  const mock = globalThis.__PLANTILLAS_MOCK__;
  if (mock && typeof mock === "object") return mock;
  if (typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined") {
    return import.meta.glob("./*.json", { eager: true });
  }
  return {};
}

/**
 * Construye las hojas a partir de un mapa { ruta: módulo }.
 * Si una ficha no valida, se entera COMPLETA (nunca a medias) y se
 * guarda su aviso para mostrarlo en la portada.
 * @returns {{sheets: object[], warnings: string[]}}
 */
export function buildTemplateSheets(modules) {
  const sheets = [];
  const warnings = [];
  const seen = new Set();

  for (const path of Object.keys(modules ?? {}).sort()) {
    const mod = modules[path];
    const json =
      mod && typeof mod === "object" && "default" in mod ? mod.default : mod;
    // Mensajes siempre con la ruta corta: plantillas/archivo.json
    const parts = String(path).split(/[\\/]/);
    const short = parts.slice(-2).join("/");

    const result = parseTemplate(json, short);
    if (!result.ok) {
      warnings.push(...result.errors);
      continue;
    }
    if (seen.has(result.sheet.id)) {
      warnings.push(
        `${short}: ya hay otra ficha con el id «${result.sheet.id}»; esta no se ha cargado.`
      );
      continue;
    }
    seen.add(result.sheet.id);
    sheets.push(result.sheet);
  }

  return { sheets, warnings };
}

/* ------------------------------------------------------------------ */
/* Fichas remotas (carpeta de GitHub con nombre aleatorio)             */
/* ------------------------------------------------------------------ */

/** Clave de la caché de fichas descargadas (localStorage). */
export const REMOTE_STORAGE_KEY = "juego-de-calcular:fichas-remoteas:v1";

/** Estado de lo remoto: { sheets, warnings, aviso } (null = sin leer aún). */
let remote = null;

/**
 * Parsea una lista de ficheros remotos [{ name, content }].
 * Cada uno se valida igual que un JSON local; los erróneos solo dejan
 * aviso (con el prefijo "remoto/…"), nunca rompen nada.
 */
export function applyRemoteFiles(files) {
  const sheets = [];
  const warnings = [];
  const seen = new Set();
  const lista = Array.isArray(files) ? [...files] : [];
  lista.sort((a, b) => String(a?.name ?? "").localeCompare(String(b?.name ?? "")));

  for (const file of lista) {
    const name = String(file?.name ?? "sin-nombre.json");
    const label = `remoto/${name}`;
    let json;
    try {
      json = JSON.parse(file.content);
    } catch (e) {
      warnings.push(`${label}: el JSON no se puede leer (${e.message}).`);
      continue;
    }
    const result = parseTemplate(json, label);
    if (!result.ok) {
      warnings.push(...result.errors);
      continue;
    }
    if (seen.has(result.sheet.id)) {
      warnings.push(`${label}: ya hay otra ficha remota con el id «${result.sheet.id}»; esta no se ha cargado.`);
      continue;
    }
    seen.add(result.sheet.id);
    sheets.push(result.sheet);
  }

  remote = { sheets, warnings, aviso: null };
  cache = null;
  return { sheets, warnings };
}

/** Lo remoto cargado (lee la caché de localStorage la primera vez). */
export function getRemoteTemplates() {
  if (remote) return remote;
  remote = { sheets: [], warnings: [], aviso: null };
  try {
    const raw = window.localStorage.getItem(REMOTE_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && Array.isArray(data.files)) applyRemoteFiles(data.files);
  } catch {
    // Sin localStorage o sin caché: solo fichas locales.
  }
  return remote;
}

/** Reinicia lo remoto (solo lo usan las pruebas). */
export function resetRemote() {
  remote = null;
  cache = null;
}

/** Descodifica el base64 UTF-8 que devuelve la API de GitHub. */
function decodeBase64(b64) {
  const clean = String(b64 ?? "").replace(/\s/g, "");
  if (typeof atob === "function") {
    const bin = atob(clean);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  // Respaldo por si atob no existe (Node antiguo).
  return Buffer.from(clean, "base64").toString("utf8");
}

/**
 * Descarga la lista de .json de la carpeta remota y su contenido
 * (API de GitHub, con CORS permitido).
 * @param {{usuario:string, repo:string, carpeta:string}} cfg
 * @returns {Promise<{name:string, content:string}[]>}
 */
export async function fetchRemoteFiles(cfg) {
  if (typeof fetch !== "function") throw new Error("sin soporte de red");
  const headers = { Accept: "application/vnd.github+json" };
  const base =
    `https://api.github.com/repos/${encodeURIComponent(cfg.usuario)}` +
    `/${encodeURIComponent(cfg.repo)}/contents/${encodeURIComponent(cfg.carpeta)}`;
  const res = await fetch(base, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const listing = await res.json();
  if (!Array.isArray(listing)) throw new Error("respuesta inesperada de GitHub");
  const entries = listing.filter(
    (e) => e && e.type === "file" && typeof e.name === "string" && e.name.endsWith(".json")
  );
  return Promise.all(
    entries.map(async (e) => {
      const r = await fetch(e.url, { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status} en ${e.name}`);
      const data = await r.json();
      return { name: e.name, content: decodeBase64(data.content) };
    })
  );
}

/**
 * Descarga y aplica las fichas remotas; guarda la caché.
 * Si falla (sin conexión o límite de GitHub): se usa lo que hubiera en
 * caché; si no hay nada, se deja un aviso. Nunca rompe la app.
 * @returns {Promise<{changed: boolean}>}
 */
export async function refreshRemoteTemplates(cfg = remotas) {
  if (!cfg || !cfg.usuario || !cfg.repo) return { changed: false };
  getRemoteTemplates(); // asegura el estado (caché) antes de tocarlo
  try {
    const files = await fetchRemoteFiles(cfg);
    applyRemoteFiles(files);
    try {
      window.localStorage.setItem(
        REMOTE_STORAGE_KEY,
        JSON.stringify({ savedAt: Date.now(), files })
      );
    } catch {
      // Almacenamiento no disponible: se descarga en cada arranque.
    }
    return { changed: true };
  } catch (e) {
    const hayCaché = remote.warnings.length > 0 || remote.sheets.length > 0;
    if (!hayCaché) {
      remote = {
        sheets: [],
        warnings: [],
        aviso: `No se han podido descargar las fichas remotas (${e.message ?? "sin conexión"}); solo se muestran las locales.`,
      };
      cache = null;
      return { changed: true };
    }
    return { changed: false };
  }
}

let cache = null;

/** Todas las fichas (locales + remotas): { sheets, warnings }. */
export function loadTemplates() {
  if (!cache) {
    const local = buildTemplateSheets(readPlantillasModules());
    const rem = getRemoteTemplates();
    const sheets = [...local.sheets];
    const warnings = [...local.warnings, ...rem.warnings];
    if (rem.aviso) warnings.push(rem.aviso);
    // Si una remota repite el id de una local, gana la local.
    const seen = new Set(local.sheets.map((s) => s.id));
    for (const s of rem.sheets) {
      if (seen.has(s.id)) {
        warnings.push(
          `${s.sourceFile}: ya existe una ficha local con el id «${s.id}»; la remota no se ha cargado.`
        );
        continue;
      }
      seen.add(s.id);
      sheets.push(s);
    }
    cache = { sheets, warnings };
  }
  return cache;
}

/** Reinicia la caché (solo lo usan las pruebas). */
export function resetTemplateCache() {
  cache = null;
}
