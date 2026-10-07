/**
 * Entrada de comprobación de renderizado: renderiza la aplicación real
 * (react-dom/server) en cada pantalla y elemento de la hoja, y ejercita
 * el reducer. No forma parte del bundle de producción.
 */

import React from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import App from "../src/App.jsx";
import { reducer } from "../src/state/SheetContext.jsx";
import { problemCells } from "../src/utils/calculations.js";
import { getSheet, getSectionItems, resetSheetCache } from "../src/data/sheets/index.js";
import { sheetStateKey, ACTIVE_STORAGE_KEY } from "../src/utils/storage.js";
import {
  REMOTE_STORAGE_KEY,
  resetRemote,
  resetTemplateCache,
} from "../plantillas/templates.js";
import TrivialScreen, {
  TrivialJuego,
} from "../src/components/layout/TrivialScreen.jsx";
import RomanosScreen, {
  RomanosJuego,
} from "../src/components/layout/RomanosScreen.jsx";
import { construirPregunta } from "../src/utils/roman.js";
import LingoScreen, {
  LingoTablero,
  LingoTeclado,
  LingoMensaje,
  VOLTEO_MS,
} from "../src/components/layout/LingoScreen.jsx";

let failures = 0;
function check(name, cond, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures += 1;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

/* Plantillas simuladas: una válida (FichaDeLogica01.json) y una rota, para
 * comprobar que la portada carga las buenas y avisa de las malas. */
globalThis.__PLANTILLAS_MOCK__ = {
  "C:\\proy\\plantillas\\HojaDePracticas.json": {
    default: JSON.parse(readFileSync("plantillas/HojaDePracticas.json", "utf8")),
  },
  "C:\\proy\\plantillas\\FichaDeLogica01.json": {
    default: JSON.parse(readFileSync("plantillas/FichaDeLogica01.json", "utf8")),
  },
  "C:\\proy\\plantillas\\rota.json": {
    default: { titulo: "Rota", tipo: "mates", ejercicios: [{ tipo: "arpita" }] },
  },
};

/* Preguntas simuladas del Trivial: el banco real (primaria.json), una
 * categoría vacía (pendiente de rellenar) y un fichero roto para el aviso. */
globalThis.__PREGUNTAS_MOCK__ = {
  "C:\\proy\\preguntas\\primaria.json": {
    default: JSON.parse(readFileSync("preguntas/primaria.json", "utf8")),
  },
  "C:\\proy\\preguntas\\geografia.json": { default: [] },
  "C:\\proy\\preguntas\\rota.json": { default: { titulo: "No soy una lista" } },
};

/* Palabras simuladas del Lingo: el fichero real (una palabra por línea,
 * los valores son texto plano como el glob ?raw de Vite). */
globalThis.__PALABRAS_MOCK__ = {
  "palabras/palabras.txt": readFileSync("palabras/palabras.txt", "utf8"),
};

/* localStorage simulada, por clave: el progreso de cada hoja y la
 * hoja activa se guardan en claves distintas. */
let stored = {};
globalThis.window = {
  localStorage: {
    getItem: (k) => (k in stored ? stored[k] : null),
    setItem: (k, v) => {
      stored[k] = String(v);
    },
    removeItem: (k) => {
      delete stored[k];
    },
  },
  scrollTo: () => {},
};

function render(state, opts = {}) {
  const sheetId = opts.sheetId ?? "sheet-001";
  stored = {
    // Claves extra (p. ej. la caché de fichas remotas).
    ...(opts.storedExtra ?? {}),
    [sheetStateKey(sheetId)]: JSON.stringify({ version: 1, state }),
    [ACTIVE_STORAGE_KEY]: sheetId,
  };
  // React separa los nodos de texto con <!-- --> al hidratar; los quitamos
  // para poder comparar cadenas de texto normales.
  return renderToString(React.createElement(App)).replace(/<!-- -->/g, "");
}

/* ---------------- Render de pantallas ---------------- */

{
  const html = render({ screen: "home", sectionIndex: 0, itemIndex: 0, progress: {} });
  check("portada: título", html.includes("Juego de Calcular"));
  check("portada: nivel", html.includes("4º Primaria"));
  check("portada: hoja de práctica", html.includes("Hoja de práctica"));
  check(
    "portada: las 4 secciones",
    ["Operaciones", "Problemas matemáticos", "Cálculo mental", "Trucos de cálculo mental"].every((t) => html.includes(t))
  );
  check("portada: botón Empezar", html.includes("Empezar"));
  check("portada: botón Resetear todo", html.includes("Resetear todo"));
  check("portada: zona Matemáticas en el menú", html.includes("📐 Matemáticas"));
  check("portada: sin zona Lógica propia (vive en Matemáticas)", !html.includes("🧩 Lógica"));
  check(
    "portada: zona Trivial en el menú",
    html.includes("🎯 Trivial") && html.includes('aria-label="Jugar al Trivial"')
  );
  check("portada: secciones desplegadas bajo la ficha en uso", html.includes("section-list--hija"));
  check("portada: la ficha base está en uso", html.includes('aria-label="Hoja de práctica: ficha en uso"'));
  check(
    "portada: la ficha de Lógica se puede usar",
    html.includes('aria-label="Usar la ficha Ficha de Lógica 01"')
  );
  check("portada: tarjeta de la hoja Lógica (plantilla)", html.includes("Lógica") && html.includes("· plantilla"));
  check("portada: aviso de la plantilla rota", html.includes("plantillas/rota.json"));
  check("portada: la hoja en uso está marcada", html.includes("✓ En uso"));
  check(
    "portada: cada ficha con su zona para desplegar o recoger (aria-expanded)",
    html.includes('aria-expanded="true"') && html.includes('aria-expanded="false"')
  );
  check(
    "portada: la ficha en uso se puede recoger sin navegar",
    html.includes('aria-label="Recoger los apartados de Hoja de práctica"')
  );
  const posFlecha = html.indexOf('class="ficha-toggle"');
  const posIcono = html.indexOf('class="section-icon"');
  check(
    "portada: la flecha va incrustada a la izquierda, dentro de la tarjeta",
    html.includes("section-card ficha-cabecera") &&
      posFlecha > -1 &&
      posIcono > -1 &&
      posFlecha < posIcono
  );
}

{
  const html = render({ screen: "summary", sectionIndex: 0, itemIndex: 0, progress: {} });
  check("resumen: totals", html.includes("Ejercicios") && html.includes("Para revisar"));
  check("resumen: 31 ejercicios", html.includes(">31<"), html.slice(0, 200));
  check("resumen: 0 % sin progreso", html.includes("0 %"));
}

/* Cada item de cada sección debe renderizar sin errores. */
{
  const sheet = getSheet();
  let count = 0;
  sheet.sections.forEach((section, s) => {
    const items = getSectionItems(sheet, section);
    items.forEach((item, i) => {
      count += 1;
      let html = "";
      try {
        html = render({ screen: "section", sectionIndex: s, itemIndex: i, progress: {} });
      } catch (error) {
        failures += 1;
        console.error(`FAIL  render ${section.id}/${item.id}: ${error.message}`);
        return;
      }
      const expected =
        item.kind === "tip"
          ? "Ver truco"
          : item.data.type === "wordProblem"
          ? "Comprobar"
          : "Comprobar";
      const ok =
        html.includes(expected) &&
        html.includes(section.title) &&
        !html.includes("undefined") &&
        !html.includes("[object Object]");
      check(`render ${section.id} → ${item.id}`, ok);
    });
  });
  // 31 ejercicios + 4 trucos intercalados en cálculo mental + 4 trucos de la
  // sección de trucos (los mismos, contados como items de su sección).
  check(`se renderizan los ${count} items de la hoja`, count === 39, `fueron ${count}`);
}

/* Marcas concretas de los ejercicios clave. */
{
  const sheet = getSheet();
  const findItem = (id) => {
    for (const section of sheet.sections) {
      const items = getSectionItems(sheet, section);
      const index = items.findIndex((it) => it.id === id);
      if (index >= 0) return { s: sheet.sections.indexOf(section), i: index };
    }
    return null;
  };

  const at = findItem("mul-3");
  const htmlMul = render({ screen: "section", sectionIndex: at.s, itemIndex: at.i, progress: {} });
  check(
    "mul-3: tipo y sin pasos (una sola comprobación)",
    htmlMul.includes("Multiplicación") && !/Paso \d+ de \d+/.test(htmlMul)
  );
  check("mul-3: muestra el multiplicando y el multiplicador", />2</.test(htmlMul) && />6</.test(htmlMul) && />4</.test(htmlMul));
  check(
    "mul-3: las 10 casillas editables desde el principio (2 filas parciales + total)",
    (htmlMul.match(/data-cell-id/g) || []).length === 10,
    `fueron ${(htmlMul.match(/data-cell-id/g) || []).length}`
  );
  check(
    "mul-3: sin filas futuras (todo visible, sin comprobaciones intermedias)",
    !htmlMul.includes("vcell--future")
  );
  check("mul-3: sin casillas de llevadas", !htmlMul.includes("Llevada"));
  check(
    "mul-3: primera fila parcial en la fila 4 (sin filas de llevadas)",
    (htmlMul.match(/grid-row:4/g) || []).length === 3,
    `fueron ${(htmlMul.match(/grid-row:4/g) || []).length}`
  );
  check("mul-3: línea de resultado final", htmlMul.includes("vline"));
  check("mul-3: botón Ver solución", htmlMul.includes("Ver solución"));

  // Multiplicador de una cifra: una sola fila, una sola comprobación.
  const atMul1 = findItem("mul-1");
  const htmlMul1 = render({ screen: "section", sectionIndex: atMul1.s, itemIndex: atMul1.i, progress: {} });
  check("mul-1: sin contador de pasos (1 comprobación)", !/Paso \d+ de \d+/.test(htmlMul1));
  check(
    "mul-1: 3 casillas de resultado y una sola línea",
    (htmlMul1.match(/data-cell-id/g) || []).length === 3 &&
      (htmlMul1.match(/class="vline"/g) || []).length === 1,
    `casillas=${(htmlMul1.match(/data-cell-id/g) || []).length}, líneas=${(htmlMul1.match(/class="vline"/g) || []).length}`
  );
  check("mul-1: etiqueta del resultado", htmlMul1.includes("del resultado") && !htmlMul1.includes("resultado parcial"));

  const atDiv = findItem("div-4");
  const htmlDiv = render({ screen: "section", sectionIndex: atDiv.s, itemIndex: atDiv.i, progress: {} });
  check(
    "div-4: cabecera con dividendo a la izquierda, dos puntos y divisor a la derecha (5 cifras dadas, sin paréntesis)",
    (htmlDiv.match(/vcell--given/g) || []).length >= 5 &&
      !htmlDiv.includes(">)</span>") &&
      htmlDiv.includes(">:</span>")
  );
  const iDivid = htmlDiv.indexOf("vcell--given");
  const iColon = htmlDiv.indexOf(">:</span>");
  const iDivis = htmlDiv.indexOf("vcell--given", iColon);
  check(
    "div-4: el dividendo va antes que el divisor",
    iDivid > -1 && iDivid < iColon && iColon < iDivis,
    `dividendo=${iDivid}, dosPuntos=${iColon}, divisor=${iDivis}`
  );
  check(
    "div-4: las cifras del dividendo son datos (no se tocan para bajarlas)",
    !htmlDiv.includes("Tocar la cifra") && !htmlDiv.includes("vcell--pick")
  );
  check(
    "div-4: sin avisos de selección (las cifras bajan solas)",
    !htmlDiv.includes("para seleccionarla") && !htmlDiv.includes("grid-hint")
  );
  check("div-4: cociente con casillas", htmlDiv.includes("Cifra 1 del cociente"));
  check(
    "div-4: el cociente empieza bajo el divisor (columna 8, fila 2)",
    /grid-column:8;grid-row:2[^>]*data-cell-id="q-0"/.test(htmlDiv),
    htmlDiv.slice(htmlDiv.indexOf('data-cell-id="q-0"') - 120, htmlDiv.indexOf('data-cell-id="q-0"'))
  );
  check(
    "div-4: el primer trozo se lee en la cabecera (sin celdas bd-0)",
    !htmlDiv.includes('data-cell-id="bd-0-')
  );
  check(
    "div-4: el resto del paso 0 comparte fila con el cociente",
    /grid-column:3;grid-row:2[^>]*data-cell-id="r-0-2"/.test(htmlDiv)
  );
  check(
    "div-4: sin producto ni signo (el producto es de cabeza)",
    !htmlDiv.includes('data-cell-id="p-') && !htmlDiv.includes("−</span>")
  );
  check(
    "div-4: el resto lleva el azul de la cadena",
    htmlDiv.includes("digit--chain")
  );
  check(
    "div-4: todo el trabajo visible desde el inicio (sin pasos): 2 cifras de cociente y el 2.º resto",
    htmlDiv.includes('data-cell-id="q-1"') &&
      htmlDiv.includes('data-cell-id="r-1-') &&
      !htmlDiv.includes("vcell--future"),
    htmlDiv.slice(0, 400)
  );
  check(
    "div-4: las cifras bajadas son casillas que escribe el alumno (5 casillas en total)",
    htmlDiv.includes('data-cell-id="bd-1-') &&
      htmlDiv.includes('aria-label="Cifra que se baja del dividendo"') &&
      (htmlDiv.match(/data-cell-id/g) || []).length === 5,
    `fueron ${(htmlDiv.match(/data-cell-id/g) || []).length}`
  );

  const atProb = findItem("prob-3");
  const htmlProb = render({ screen: "section", sectionIndex: atProb.s, itemIndex: atProb.i, progress: {} });
  check(
    "prob-3: botonera con dígitos, operaciones y «=» (sin campos de texto)",
    htmlProb.includes("keypad-grid") &&
      !htmlProb.includes("<input") &&
      ["7", "8", "9", "0", "+", "−", "×", "÷", "="].every((t) =>
        htmlProb.includes(`>${t}<`)
      )
  );
  check("prob-3: las 4 operaciones (etiquetas de la botonera)", ["suma", "resta", "multiplicación", "división"].every((t) => htmlProb.includes(t)));
  check(
    "prob-3: control Deshacer (sin «Saltar de línea»: la comprobación confirma)",
    htmlProb.includes("Deshacer") && !htmlProb.includes("Saltar de línea")
  );
  check(
    "prob-3: los 3 nombres de resultados son botones",
    (htmlProb.match(/key-mag/g) || []).length === 3,
    `fueron ${(htmlProb.match(/key-mag/g) || []).length}`
  );

  const atGuided = findItem("prob-1");
  const htmlG = render({ screen: "section", sectionIndex: atGuided.s, itemIndex: atGuided.i, progress: {} });
  check(
    "prob-1: desarrollo vacío con su aviso (sin pasos ni campos de texto)",
    htmlG.includes("wf-dev") &&
      htmlG.includes("Escribe la primera operación") &&
      !htmlG.includes("<input")
  );
  check(
    "prob-1: resultados parciales y final listados bajo el enunciado",
    htmlG.includes("problem-resultados") &&
      htmlG.indexOf("problem-resultados") > htmlG.indexOf("problem-text") &&
      htmlG.includes("Libros totales en la biblioteca") &&
      htmlG.includes("Libros que quedan")
  );
  check(
    "prob-3: sus dos parciales y su final listados",
    htmlProb.includes("Parcial 1") &&
      htmlProb.includes("Parcial 2") &&
      htmlProb.includes("Cromos de los sobres") &&
      htmlProb.includes("Cromos que tiene ahora")
  );

  // Con progreso: una línea confirmada y la otra puesta en vertical por «=».
  const devProgreso = {
    "prob-1": {
      values: {
        lines: [
          {
            op: "add",
            a: 125,
            b: 87,
            result: 212,
            mag: "Libros totales en la biblioteca",
          },
        ],
        current: { expr: "212−46", eq: true, cells: {}, mag: null },
      },
      status: "pending",
      step: 0,
      stepsDone: [],
      feedback: null,
      revealed: false,
      attempts: 0,
    },
  };
  const htmlTrans = render({
    screen: "section",
    sectionIndex: atGuided.s,
    itemIndex: atGuided.i,
    progress: devProgreso,
  });
  check(
    "prob-1: al pulsar «=» la operación se pone en vertical (2 renglones + casillas)",
    htmlTrans.includes("vgrid") &&
      (htmlTrans.match(/kcell/g) || []).length === 3 &&
      htmlTrans.includes("kcell is-active") &&
      htmlTrans.includes("wf-caret") &&
      !htmlTrans.includes("<input"),
    `casillas: ${(htmlTrans.match(/kcell/g) || []).length}`
  );
  check(
    "prob-1: la línea confirmada se guarda como texto compacto",
    htmlTrans.includes("125 + 87 = 212 → Libros totales en la biblioteca") &&
      !htmlTrans.includes("wf-op"),
    "texto de la línea confirmada"
  );

  // Con todas las casillas rellenas y la magnitud adjuntada (sella).
  const devSellado = {
    "prob-1": {
      ...devProgreso["prob-1"],
      values: {
        lines: devProgreso["prob-1"].values.lines,
        current: {
          expr: "212−46",
          eq: true,
          cells: { "res-0": "6", "res-1": "6", "res-2": "1" },
          mag: "Libros que quedan",
        },
      },
    },
  };
  const htmlSellado = render({
    screen: "section",
    sectionIndex: atGuided.s,
    itemIndex: atGuided.i,
    progress: devSellado,
  });
  check(
    "prob-1: con las casillas llenas se adjunta la magnitud y la línea queda sellada",
    htmlSellado.includes("wf-mag") &&
      htmlSellado.includes("→ Libros que quedan") &&
      htmlSellado.includes("is-pressed"),
    "chip de magnitud y botón pulsado"
  );

  // Sumas y restas: casilla por cifra (sin campo único).
  const atSum = findItem("sum-1");
  const htmlSum = render({ screen: "section", sectionIndex: atSum.s, itemIndex: atSum.i, progress: {} });
  check(
    "sum-1: 3 casillas de resultado",
    (htmlSum.match(/data-cell-id/g) || []).length === 3,
    `fueron ${(htmlSum.match(/data-cell-id/g) || []).length}`
  );
  check("sum-1: sin campo único de respuesta", !htmlSum.includes("input-number"));
  check("sum-1: etiqueta de la casilla de las unidades", htmlSum.includes("Cifra de las unidades del resultado"));
  check(
    "sum-1: casillas alineadas bajo las columnas (4,3,2 en la fila 5)",
    /grid-column:4;grid-row:5/.test(htmlSum) &&
      /grid-column:3;grid-row:5/.test(htmlSum) &&
      /grid-column:2;grid-row:5/.test(htmlSum),
    "no aparecen las posiciones esperadas"
  );
  check("sum-1: botón Reiniciar (en cada operación)", htmlSum.includes("Reiniciar"));

  const atMen = findItem("men-1");
  const htmlMen = render({
    screen: "section",
    sectionIndex: atMen.s,
    itemIndex: atMen.i,
    progress: {},
  });
  check("men-1: sin botón Reiniciar (es exclusivo de operaciones)", !htmlMen.includes("Reiniciar"));

  const atRes = findItem("res-1");
  const htmlRes = render({ screen: "section", sectionIndex: atRes.s, itemIndex: atRes.i, progress: {} });
  check(
    "res-1: 3 casillas de resultado (254)",
    (htmlRes.match(/data-cell-id/g) || []).length === 3,
    `fueron ${(htmlRes.match(/data-cell-id/g) || []).length}`
  );
  check("res-1: sin campo único de respuesta", !htmlRes.includes("input-number"));

  // Con error, la casilla señalada se resalta; al revelar, se ven las cifras.
  const htmlErr = render({
    screen: "section",
    sectionIndex: atSum.s,
    itemIndex: atSum.i,
    progress: {
      "sum-1": {
        values: { cells: { "res-0": "4", "res-1": "3", "res-2": "6" } },
        status: "review", step: 0, stepsDone: [],
        feedback: { type: "error", message: "Revisa las decenas.", cellIds: ["res-1"] },
        revealed: false, attempts: 1,
      },
    },
  });
  check(
    "sum-1 con error: la casilla señalada lleva is-error",
    htmlErr.includes("is-error") && htmlErr.includes('data-cell-id="res-1"')
  );

  const htmlSol = render({
    screen: "section",
    sectionIndex: atSum.s,
    itemIndex: atSum.i,
    progress: {
      "sum-1": {
        values: { cells: {} },
        status: "review", step: 0, stepsDone: [], feedback: null,
        revealed: true, attempts: 1,
      },
    },
  });
  check(
    "sum-1 revelado: cifras del resultado y procedimiento",
    htmlSol.includes("Resultado: 624") && !htmlSol.includes("input-number")
  );

  // Con una solución revelada debe pintarse la operación completa.
  const htmlReveal = render({
    screen: "section",
    sectionIndex: at.s,
    itemIndex: at.i,
    progress: { "mul-3": { values: { cells: {} }, status: "review", step: 0, stepsDone: [], feedback: null, revealed: true, attempts: 1 } },
  });
  check("mul-3 revelado: solución completa", htmlReveal.includes("Solución y procedimiento") && htmlReveal.includes("Resultado: 5664"));
}

/* ---------------- Hoja plantilla (Lógica) ---------------- */

{
  const l = getSheet("plantilla-ficha-de-logica-01");
  check(
    "hoja plantilla: existe, es plantilla y se llama Ficha de Lógica 01",
    Boolean(l) && l.template === true && l.sections[0].title === "Ficha de Lógica 01"
  );
  check("hoja plantilla: 15 retos", l.logicExercises.length === 15, JSON.stringify(l.logicExercises?.length));

  const htmlHome = render(
    { screen: "home", sectionIndex: 0, itemIndex: 0, progress: {} },
    { sheetId: l.id }
  );
  check(
    "portada de la hoja Lógica: su tarjeta y la zona de Matemáticas",
    htmlHome.includes("Series, comparaciones y enigmas para pensar") &&
      htmlHome.includes("📐 Matemáticas") &&
      !htmlHome.includes("🧩 Lógica"),
    htmlHome.slice(0, 400)
  );
  check(
    "portada de la hoja Lógica: su ficha (una sola sección) se puede tocar",
    !htmlHome.includes('disabled="" aria-label="Ficha de Lógica 01: ficha en uso"')
  );
  check(
    "portada de la hoja Lógica: la otra ficha no despliega sus secciones",
    !htmlHome.includes("Sumas, restas, multiplicaciones y divisiones")
  );

  const items = getSectionItems(l, l.sections[0]);
  check("hoja plantilla: 15 items en su sección", items.length === 15, `fueron ${items.length}`);

  items.forEach((item, i) => {
    try {
      const h = render(
        { screen: "section", sectionIndex: 0, itemIndex: i, progress: {} },
        { sheetId: l.id }
      );
      check(`reto ${item.id}: renderiza con etiqueta Lógica`, h.includes("Lógica") && h.includes("Comprobar"));
    } catch (e) {
      failures += 1;
      console.error(`FAIL reto ${item.id}: ${e.message}`);
    }
  });

  const htmlSerie = render(
    { screen: "section", sectionIndex: 0, itemIndex: 0, progress: {} },
    { sheetId: l.id }
  );
  check(
    "serie: fichas de la serie con el signo ?",
    htmlSerie.includes("logic-chip--q") && htmlSerie.includes("Serie: 2, 4, 6, 8"),
    htmlSerie.slice(0, 300)
  );

  const htmlComp = render(
    { screen: "section", sectionIndex: 0, itemIndex: 3, progress: {} },
    { sheetId: l.id }
  );
  check(
    "comparación: opciones Mayor/Menor/Igual",
    ["Mayor", "Menor", "Igual"].every((t) => htmlComp.includes(t))
  );

  const htmlDed = render(
    { screen: "section", sectionIndex: 0, itemIndex: 9, progress: {} },
    { sheetId: l.id }
  );
  check(
    "deducción: casillas etiquetadas Patos y Conejos",
    htmlDed.includes("logic-fields") &&
      htmlDed.includes("Patos") &&
      htmlDed.includes("Conejos"),
    htmlDed.slice(0, 300)
  );

  const htmlElim = render(
    { screen: "section", sectionIndex: 0, itemIndex: 12, progress: {} },
    { sheetId: l.id }
  );
  check(
    "eliminatoria: opciones para descartar con la correcta entre ellas",
    htmlElim.includes("logic-options") &&
      htmlElim.includes("Diego") &&
      htmlElim.includes("No se puede saber") &&
      htmlElim.includes('aria-pressed="false"'),
    htmlElim.slice(0, 300)
  );

  const htmlLSummary = render(
    { screen: "summary", sectionIndex: 0, itemIndex: 0, progress: {} },
    { sheetId: l.id }
  );
  check("resumen de la hoja Lógica: 15 ejercicios", htmlLSummary.includes(">15<"), htmlLSummary.slice(0, 200));
}

/* ---------------- Apartado Trivial ---------------- */

{
  // Pantalla de categorías (fase inicial del contenedor).
  const tCat = renderToString(React.createElement(TrivialScreen, { onExit() {} }));
  check(
    "trivial: categorías con «Todas» y con «Primaria»",
    tCat.includes("🎯 Trivial") &&
      tCat.includes("Todas las categorías") &&
      tCat.includes('aria-label="Jugar la categoría Primaria"'),
    tCat.slice(0, 300)
  );
  check(
    "trivial: la categoría sin preguntas sale desactivada y avisada",
    tCat.includes('disabled="" aria-label="Jugar la categoría Geografia"') &&
      tCat.includes("Aún sin preguntas"),
    tCat.slice(0, 400)
  );
  check(
    "trivial: el fichero roto deja aviso con su ruta",
    tCat.includes("preguntas/rota.json"),
    tCat.slice(0, 400)
  );

  // Juego: la pregunta con sus botones, sin respuesta hasta pedirla.
  const pregunta = {
    key: "preguntas/primaria.json#1",
    pregunta: "¿Cuántas patas tiene una araña?",
    respuesta: "8",
    detalle: "Las arañas son arácnidos: tienen ocho patas.",
    categoria: "Primaria",
  };
  const props = {
    titulo: "Primaria",
    pregunta,
    solucion: false,
    onMostrar() {},
    onSiguiente() {},
    onVolver() {},
  };
  const tJuego = renderToString(React.createElement(TrivialJuego, props));
  check(
    "trivial: el juego muestra la pregunta y sus botones",
    tJuego.includes("¿Cuántas patas tiene una araña?") &&
      tJuego.includes("Mostrar solución") &&
      tJuego.includes("Cambiar categoría") &&
      tJuego.includes("Primaria"),
    tJuego.slice(0, 300)
  );

  // En «Todas las categorías», el título va seguido de la categoría de
  // la pregunta que se está leyendo.
  const tTodas = renderToString(
    React.createElement(TrivialJuego, { ...props, titulo: null })
  );
  check(
    "trivial: en «Todas» el título añade la categoría de la pregunta",
    tTodas.includes("Todas las categorías") &&
      tTodas.includes('class="trivial-cat-actual"') &&
      tTodas.includes(">Primaria<"),
    tTodas.slice(0, 300)
  );
  check(
    "trivial: en una categoría concreta no se repite la categoría",
    !tJuego.includes("trivial-cat-actual"),
    tJuego.slice(0, 300)
  );
  check(
    "trivial: sin solución vista aún no aparece «Siguiente»",
    !tJuego.includes("Siguiente"),
    tJuego.slice(0, 400)
  );
  check(
    "trivial: sin pedir la solución no se ve la respuesta",
    !tJuego.includes("arácnidos") && !tJuego.includes(">8<"),
    tJuego.slice(0, 400)
  );
  check(
    "trivial: sin temporizadores, contadores ni progreso",
    !/Pregunta \d|\d+\s*\/\s*\d+|<progress|<time/.test(tJuego)
  );

  const tSol = renderToString(
    React.createElement(TrivialJuego, { ...props, solucion: true })
  );
  check(
    "trivial: al mostrar la solución aparece respuesta y detalle",
    tSol.includes(">8<") && tSol.includes("arácnidos"),
    tSol.slice(0, 400)
  );
  check(
    "trivial: visto el detalle, aparece «Siguiente»",
    tSol.includes("Siguiente ›"),
    tSol.slice(0, 400)
  );
  check(
    "trivial: «Mostrar solución» queda pulsado tras verse",
    tSol.includes('class="btn" disabled=""'),
    tSol.slice(0, 400)
  );
}

/* ---------------- Apartado Números romanos ---------------- */

{
  // Portada: la zona del juego, paralela a la del Trivial.
  const home = render({ screen: "home", sectionIndex: 0, itemIndex: 0, progress: {} });
  check(
    "romanos: la portada ofrece la zona del juego",
    home.includes("🔢 Números romanos") &&
      home.includes('aria-label="Jugar a números romanos"'),
    home.slice(0, 300)
  );

  // Pantalla inicial: las tres dificultades con su rango de números.
  const pantalla = renderToString(React.createElement(RomanosScreen, { onExit() {} }));
  check(
    "romanos: al entrar se pide la dificultad",
    pantalla.includes("Elige la dificultad") &&
      pantalla.includes('aria-label="Jugar la dificultad Fácil"') &&
      pantalla.includes('aria-label="Jugar la dificultad Medio"') &&
      pantalla.includes('aria-label="Jugar la dificultad Difícil"'),
    pantalla.slice(0, 400)
  );
  check(
    "romanos: los rangos 1–20, 20–88 y 85–3500",
    pantalla.includes("del 1 al 20") &&
      pantalla.includes("del 20 al 88") &&
      pantalla.includes("del 85 al 3500"),
    pantalla.slice(0, 400)
  );
  check("romanos: ningún campo de texto en la pantalla", !pantalla.includes("<input"));

  const handlers = {
    onKey() {},
    onBackspace() {},
    onLimpiar() {},
    onComprobar() {},
    onMostrar() {},
    onSiguiente() {},
    onVolver() {},
    onInfo() {},
  };

  // Turno respondiendo en romanos: teclado de letras, sin cifras sueltas.
  const qLetras = construirPregunta(14, false);
  const pLetras = {
    titulo: "Fácil",
    pregunta: qLetras,
    respuesta: "XI",
    resultado: null,
    solucion: false,
    info: false,
    ...handlers,
  };
  const jLetras = renderToString(React.createElement(RomanosJuego, pLetras));
  check(
    "romanos: preguntado en cifras pide romanos y abre el teclado de letras",
    jLetras.includes("Escribe este número en números romanos") &&
      jLetras.includes(">14<") &&
      jLetras.includes('aria-label="Teclado de respuesta"') &&
      jLetras.includes('aria-label="letra M"') &&
      !jLetras.includes(">7<"),
    jLetras.slice(0, 500)
  );
  check(
    "romanos: la respuesta escrita se muestra sin <input>",
    jLetras.includes(">XI<") && !jLetras.includes("<input"),
    jLetras.slice(0, 500)
  );
  check(
    "romanos: con respuesta se puede comprobar y aún no hay «Siguiente»",
    jLetras.includes('class="btn">Comprobar') &&
      !jLetras.includes("Siguiente") &&
      !jLetras.includes("¡Correcto!"),
    jLetras.slice(0, 500)
  );

  // Sin respuesta escrita, «Comprobar» espera.
  const jVacio = renderToString(
    React.createElement(RomanosJuego, { ...pLetras, respuesta: "" })
  );
  check(
    "romanos: sin respuesta escrita «Comprobar» está desactivado",
    jVacio.includes('class="btn" disabled="">Comprobar'),
    jVacio.slice(0, 500)
  );

  // Turno respondiendo en cifras: teclado de dígitos, sin letras.
  const pDigitos = {
    titulo: "Fácil",
    pregunta: construirPregunta(14, true),
    respuesta: "",
    resultado: null,
    solucion: false,
    info: false,
    ...handlers,
  };
  const jDigitos = renderToString(React.createElement(RomanosJuego, pDigitos));
  check(
    "romanos: preguntado en romano pide el número y abre el teclado de cifras",
    jDigitos.includes("¿Qué número es?") &&
      jDigitos.includes(">XIV<") &&
      jDigitos.includes(">7<") &&
      !jDigitos.includes('aria-label="letra M"'),
    jDigitos.slice(0, 500)
  );

  // Acierto y fallo tras «Comprobar», sin desvelar nada en el fallo.
  const jOk = renderToString(
    React.createElement(RomanosJuego, { ...pLetras, resultado: "ok" })
  );
  check(
    "romanos: acierto con «Comprobar» da su aviso y «Siguiente»",
    jOk.includes("¡Correcto!") &&
      jOk.includes("Siguiente ›") &&
      jOk.includes('class="btn" disabled="">Comprobar'),
    jOk.slice(0, 500)
  );
  const jMal = renderToString(
    React.createElement(RomanosJuego, { ...pLetras, resultado: "mal" })
  );
  check(
    "romanos: fallo avisa sin resolver y sin «Siguiente»",
    jMal.includes("No es correcto") &&
      !jMal.includes("Siguiente") &&
      !jMal.includes("X + IV"),
    jMal.slice(0, 500)
  );

  // Solución de apoyo: respuesta y desglose, y se pasa de turno.
  const jSol = renderToString(
    React.createElement(RomanosJuego, { ...pLetras, solucion: true })
  );
  check(
    "romanos: al mostrar la solución aparecen respuesta y desglose",
    jSol.includes(">XIV<") && jSol.includes("X + IV = 14"),
    jSol.slice(0, 500)
  );
  check(
    "romanos: vista la solución hay «Siguiente» y ya no se teclea",
    jSol.includes("Siguiente ›") &&
      !jSol.includes('aria-label="Teclado de respuesta"'),
    jSol.slice(0, 500)
  );

  // El botón «ⓘ» despliega el algoritmo de los dos sentidos.
  const pInfo = { ...pLetras, info: true };
  const jInfo = renderToString(React.createElement(RomanosJuego, pInfo));
  check(
    "romanos: «ⓘ» discreto siempre visible",
    jLetras.includes('aria-label="Información: cómo escribir y leer números romanos"'),
    jLetras.slice(0, 300)
  );
  check(
    "romanos: el algoritmo de ida y de vuelta tras el «ⓘ»",
    jInfo.includes("Cómo se pasa de número a romano") &&
      jInfo.includes("Cómo se leen") &&
      jInfo.includes("M = 1000") &&
      jInfo.includes("se resta"),
    jInfo.slice(0, 500)
  );
  check(
    "romanos: sin pedirlo, el algoritmo no ocupa la pantalla",
    !jLetras.includes("M = 1000")
  );

  // Sin temporizadores, contadores ni progreso (como el Trivial).
  check(
    "romanos: sin temporizadores, contadores ni progreso",
    !/<progress|<time|Pregunta \d|\d+\s*\/\s*\d+/.test(jLetras + jOk + jSol)
  );
}

/* ---------------- Fichas remotas (caché en localStorage) ---------------- */

{
  const fichaRemota = JSON.stringify({
    titulo: "Retos de la abuela",
    tipo: "mates",
    ejercicios: [
      { tipo: "logica", variante: "enigma", enunciado: "Ana piensa un número y le suma 3. ¿Cuál era si obtiene 10?", respuesta: 7 },
    ],
  });
  const extra = {
    [REMOTE_STORAGE_KEY]: JSON.stringify({
      savedAt: Date.now(),
      files: [{ name: "abuela.json", content: fichaRemota }],
    }),
  };

  resetRemote();
  resetTemplateCache();
  resetSheetCache();
  const html = render(
    { screen: "home", sectionIndex: 0, itemIndex: 0, progress: {} },
    { storedExtra: extra }
  );
  check(
    "fichas remotas: la guardada en la caché se lista en su zona",
    html.includes("Retos de la abuela") && html.includes("📐 Matemáticas"),
    html.slice(0, 300)
  );

  resetRemote();
  resetTemplateCache();
  resetSheetCache();
  const html2 = render({ screen: "home", sectionIndex: 0, itemIndex: 0, progress: {} });
  check("fichas remotas: sin caché no aparece", !html2.includes("Retos de la abuela"));
}

/* ---------------- Pruebas del reducer ---------------- */

{
  const base = { screen: "home", sectionIndex: 0, itemIndex: 0, progress: {} };
  const sum = { id: "sum-1", type: "addition", a: 348, b: 276 };

  let s = reducer(base, { type: "SET_CELL", exercise: sum, cellId: "res-0", value: "4" });
  check("SET_CELL guarda la casilla", s.progress["sum-1"].values.cells["res-0"] === "4");

  s = reducer(s, { type: "CHECK", exercise: sum });
  check(
    "CHECK incompleto → review + aviso de rellenar",
    s.progress["sum-1"].status === "review" &&
      s.progress["sum-1"].feedback.type === "error" &&
      s.progress["sum-1"].feedback.message.includes("Rellena"),
    JSON.stringify(s.progress["sum-1"].feedback)
  );

  s = reducer(s, { type: "SET_CELL", exercise: sum, cellId: "res-1", value: "2" });
  s = reducer(s, { type: "SET_CELL", exercise: sum, cellId: "res-2", value: "6" });
  s = reducer(s, { type: "CHECK", exercise: sum });
  check("CHECK correcto → correct", s.progress["sum-1"].status === "correct" && s.progress["sum-1"].feedback.type === "ok");

  // SET_ANSWER sigue vigente para los ejercicios de respuesta única.
  const men = { id: "men-1", type: "mental", result: 46, hint: "Pista." };
  const withAnswer = reducer(base, { type: "SET_ANSWER", exercise: men, value: "6" });
  check("SET_ANSWER guarda el valor", withAnswer.progress["men-1"].values.answer === "6");

  const mult = { id: "mul-3", type: "multiplication", a: 236, b: 24 };
  let m = reducer(base, { type: "CHECK", exercise: mult });
  check("multiplicación vacía → aviso de casillas", m.progress["mul-3"].feedback.message.includes("Rellena"));
  m = reducer(m, { type: "SET_CELL", exercise: mult, cellId: "partial-0-2", value: "9" });
  check("SET_CELL guarda la casilla de la multiplicación", m.progress["mul-3"].values.cells["partial-0-2"] === "9");

  // NEXT recorre secciones y termina en el resumen.
  const sheet = getSheet();
  const counts = sheet.sections.map((sec) => getSectionItems(sheet, sec).length);
  let nav = { ...base, screen: "section", sectionIndex: 0, itemIndex: 0 };
  nav = reducer(nav, { type: "NEXT", itemsCount: counts[0], sectionsCount: 4 });
  check("NEXT avanza de item", nav.itemIndex === 1 && nav.screen === "section");
  nav = { ...nav, itemIndex: counts[0] - 1 };
  nav = reducer(nav, { type: "NEXT", itemsCount: counts[0], sectionsCount: 4 });
  check("NEXT al final de sección pasa a la siguiente", nav.sectionIndex === 1 && nav.itemIndex === 0);
  nav = { ...nav, sectionIndex: 3, itemIndex: counts[3] - 1 };
  nav = reducer(nav, { type: "NEXT", itemsCount: counts[3], sectionsCount: 4 });
  check("NEXT al final de todo → resumen", nav.screen === "summary");

  // Multiplicación: una sola comprobación al final (sin pasos).
  let mp = reducer(base, { type: "SET_CELL", exercise: mult, cellId: "x", value: "1" });
  const multEntry = {
    values: {
      cells: {
        "partial-0-2": "9", "partial-0-1": "4", "partial-0-0": "4",
        "partial-1-3": "4", "partial-1-2": "7", "partial-1-1": "2",
        "total-3": "5", "total-2": "6", "total-1": "6", "total-0": "4",
      },
    },
    status: "pending", step: 0, stepsDone: [], feedback: null, revealed: false, attempts: 0,
  };
  mp = { ...mp, progress: { "mul-3": multEntry } };
  mp = reducer(mp, { type: "CHECK", exercise: mult });
  check(
    "multiplicación: una sola comprobación completa → correcto",
    mp.progress["mul-3"].status === "correct" &&
      mp.progress["mul-3"].feedback.type === "ok",
    JSON.stringify(mp.progress["mul-3"].feedback)
  );
  mp = reducer(mp, { type: "NEXT_STEP", exercise: mult });
  check("NEXT_STEP sigue disponible en el reducer", mp.progress["mul-3"].step === 1 && mp.progress["mul-3"].feedback === null);

  // Botonera del problema: la línea se escribe pulsando teclas (sin
  // teclado); al pulsar «=» la operación se pone en vertical y las
  // teclas rellenan sus casillas; «Comprobar» valida ese paso y
  // confirma la línea en el desarrollo.
  const wordProb = {
    id: "prob-1",
    type: "wordProblem",
    plan: [{ op: "add", a: 5, b: 3, result: 8 }],
    resultados: { parciales: ["Total"], final: "Todo" },
  };
  const press = (state, ex, keys) =>
    keys.reduce(
      (s, key) => reducer(s, { type: "DEV", exercise: ex, op: "key", key }),
      state
    );
  const fillCells = (state, ex, a, op, b) =>
    problemCells(a, op, b).reduce(
      (s, cell) =>
        reducer(s, {
          type: "DEV",
          exercise: ex,
          op: "key",
          key: String(cell.value),
        }),
      state
    );

  let dev = press(base, wordProb, ["5", "+", "3"]);
  check(
    "botonera: las teclas escriben la operación",
    dev.progress["prob-1"].values.current.expr === "5+3",
    JSON.stringify(dev.progress["prob-1"].values.current)
  );
  dev = reducer(dev, { type: "DEV", exercise: wordProb, op: "key", key: "=" });
  check(
    "botonera: «=» pone la operación en vertical",
    dev.progress["prob-1"].values.current.eq === true &&
      dev.progress["prob-1"].values.current.expr === "5+3",
    JSON.stringify(dev.progress["prob-1"].values.current)
  );
  dev = reducer(dev, { type: "DEV", exercise: wordProb, op: "key", key: "8" });
  check(
    "botonera: tras «=» las teclas escriben en las casillas",
    Object.values(dev.progress["prob-1"].values.current.cells)[0] === "8",
    JSON.stringify(dev.progress["prob-1"].values.current)
  );

  // Sin comprobar no hay línea: «Comprobar» exige la magnitud adjunta.
  const sinMag = reducer(dev, { type: "CHECK", exercise: wordProb });
  check(
    "botonera: sin magnitud «Comprobar» no confirma la línea",
    sinMag.progress["prob-1"].values.lines.length === 0 &&
      sinMag.progress["prob-1"].feedback.type === "error" &&
      sinMag.progress["prob-1"].feedback.message.includes("Te falta adjuntar"),
    JSON.stringify(sinMag.progress["prob-1"].feedback)
  );

  dev = reducer(dev, { type: "DEV", exercise: wordProb, op: "magnitude", name: "Total" });
  dev = reducer(dev, { type: "DEV", exercise: wordProb, op: "magnitude", name: "Todo" });
  check(
    "botonera: el resultado se adjunta y sella la línea",
    dev.progress["prob-1"].values.current.mag === "Total",
    JSON.stringify(dev.progress["prob-1"].values.current)
  );
  dev = reducer(dev, { type: "DEV", exercise: wordProb, op: "key", key: "9" });
  check(
    "botonera: con la línea sellada no se escribe más",
    Object.values(dev.progress["prob-1"].values.current.cells)[0] === "8",
    JSON.stringify(dev.progress["prob-1"].values.current)
  );
  dev = reducer(dev, { type: "DEV", exercise: wordProb, op: "back" });
  check(
    "botonera: borrar deshace en orden inverso (la magnitud primero)",
    dev.progress["prob-1"].values.current.mag === null &&
      Object.values(dev.progress["prob-1"].values.current.cells)[0] === "8",
    JSON.stringify(dev.progress["prob-1"].values.current)
  );
  dev = reducer(dev, { type: "DEV", exercise: wordProb, op: "magnitude", name: "Todo" });
  dev = reducer(dev, { type: "CHECK", exercise: wordProb });
  check(
    "botonera: «Comprobar» valida el paso y confirma la línea",
    dev.progress["prob-1"].values.lines.length === 1 &&
      dev.progress["prob-1"].values.current.expr === "" &&
      dev.progress["prob-1"].values.current.eq === false &&
      dev.progress["prob-1"].status === "correct" &&
      dev.progress["prob-1"].feedback.type === "ok",
    JSON.stringify(dev.progress["prob-1"])
  );
  dev = reducer(dev, { type: "DEV", exercise: wordProb, op: "undo" });
  check(
    "botonera: deshacer borra la última línea confirmada",
    dev.progress["prob-1"].values.lines.length === 0,
    JSON.stringify(dev.progress["prob-1"].values)
  );

  // Comprobación por paso en un problema de dos operaciones.
  const wordProb2 = {
    id: "prob-2p",
    type: "wordProblem",
    plan: [
      { op: "add", a: 5, b: 3, result: 8 },
      { op: "add", a: 10, b: 5, result: 15 },
    ],
    resultados: { parciales: ["Total"], final: "Todo" },
  };
  let paso = press(base, wordProb2, ["5", "+", "3", "="]);
  paso = fillCells(paso, wordProb2, 5, "add", 3);
  paso = reducer(paso, { type: "DEV", exercise: wordProb2, op: "magnitude", name: "Total" });
  paso = reducer(paso, { type: "CHECK", exercise: wordProb2 });
  check(
    "CHECK (problema): el paso correcto confirma la línea y pide la siguiente",
    paso.progress["prob-2p"].values.lines.length === 1 &&
      paso.progress["prob-2p"].status === "pending" &&
      paso.progress["prob-2p"].feedback.type === "ok" &&
      paso.progress["prob-2p"].feedback.message.includes("Paso 1 de 2"),
    JSON.stringify(paso.progress["prob-2p"])
  );

  // La última operación con una casilla mal: señala la casilla y no
  // confirma.
  paso = press(paso, wordProb2, ["1", "0", "+", "5", "="]);
  paso = press(paso, wordProb2, ["9", "9"]);
  paso = reducer(paso, { type: "DEV", exercise: wordProb2, op: "magnitude", name: "Todo" });
  paso = reducer(paso, { type: "CHECK", exercise: wordProb2 });
  check(
    "CHECK (problema): casilla incorrecta señala la casilla y no confirma",
    paso.progress["prob-2p"].values.lines.length === 1 &&
      paso.progress["prob-2p"].feedback.type === "error" &&
      paso.progress["prob-2p"].feedback.cellIds.length > 0,
    JSON.stringify(paso.progress["prob-2p"].feedback)
  );

  // La corregimos y, al comprobar el último paso, queda resuelto.
  paso = reducer(paso, { type: "DEV", exercise: wordProb2, op: "back" }); // magnitud
  paso = reducer(paso, { type: "DEV", exercise: wordProb2, op: "back" }); // casilla
  paso = reducer(paso, { type: "DEV", exercise: wordProb2, op: "back" }); // casilla
  paso = fillCells(paso, wordProb2, 10, "add", 5);
  paso = reducer(paso, { type: "DEV", exercise: wordProb2, op: "magnitude", name: "Todo" });
  paso = reducer(paso, { type: "CHECK", exercise: wordProb2 });
  check(
    "CHECK (problema): el último paso correcto resuelve el problema",
    paso.progress["prob-2p"].values.lines.length === 2 &&
      paso.progress["prob-2p"].status === "correct" &&
      paso.progress["prob-2p"].feedback.type === "ok",
    JSON.stringify(paso.progress["prob-2p"])
  );

  const sinIgual = reducer(base, { type: "DEV", exercise: wordProb, op: "key", key: "9" });
  const sinIgual2 = reducer(sinIgual, { type: "DEV", exercise: wordProb, op: "magnitude", name: "Total" });
  check(
    "botonera: sin «=» no se adjunta el resultado",
    sinIgual2.progress["prob-1"].values.current.expr === "9" &&
      sinIgual2.progress["prob-1"].values.current.mag === null,
    JSON.stringify(sinIgual2.progress["prob-1"].values.current)
  );

  // REVEAL marca como visto.
  const revealed = reducer({ ...base, progress: { "sum-1": { ...multEntry, values: { cells: {} } } } }, { type: "REVEAL", exercise: sum });
  check("REVEAL muestra solución y marca review", revealed.progress["sum-1"].revealed === true && revealed.progress["sum-1"].status === "review");

  // RESET limpia todo.
  const reset = reducer({ ...base, progress: { "sum-1": { ...multEntry } } }, { type: "RESET" });
  check("RESET limpia el progreso", Object.keys(reset.progress).length === 0 && reset.screen === "home");

  // RESET_ITEM reinicia un solo ejercicio (el botón «Reiniciar»).
  const ri = reducer(
    { ...base, progress: { "sum-1": { ...multEntry }, "mul-3": { ...multEntry } } },
    { type: "RESET_ITEM", exercise: sum }
  );
  check(
    "RESET_ITEM borra solo ese ejercicio",
    !ri.progress["sum-1"] && Boolean(ri.progress["mul-3"]) && ri.screen === "home",
    JSON.stringify(Object.keys(ri.progress))
  );
  const riNoop = reducer(base, { type: "RESET_ITEM", exercise: sum });
  check("RESET_ITEM sin progreso no cambia nada", riNoop === base);

  // SET_SHEET: cambiar de ficha (se queda en la portada, con su progreso).
  const swFresh = reducer(base, { type: "SET_SHEET", sheetId: "plantilla-ficha-de-logica-01", saved: null });
  check(
    "SET_SHEET sin progreso guardado: vuelve a la portada",
    swFresh.sheetId === "plantilla-ficha-de-logica-01" && swFresh.screen === "home" && swFresh.sectionIndex === 0 && swFresh.itemIndex === 0,
    JSON.stringify(swFresh)
  );
  const swSaved = reducer(base, {
    type: "SET_SHEET",
    sheetId: "plantilla-ficha-de-logica-01",
    saved: { screen: "summary", sectionIndex: 2, itemIndex: 3, progress: { "logica-1": { status: "correct" } } },
  });
  check(
    "SET_SHEET con progreso guardado: lo conserva y sigue en la portada",
    swSaved.sheetId === "plantilla-ficha-de-logica-01" && swSaved.screen === "home" &&
      Boolean(swSaved.progress["logica-1"]) && swSaved.itemIndex === 0 && swSaved.sectionIndex === 0,
    JSON.stringify(swSaved)
  );
  const keepSheet = reducer({ ...base, sheetId: "plantilla-ficha-de-logica-01" }, { type: "RESET" });
  check("RESET conserva la hoja activa", keepSheet.sheetId === "plantilla-ficha-de-logica-01");
}

/* ---------------- Apartado Lingo (palabra de 5 letras) ---------------- */

{
  // La portada lanza el juego con su zona y su botón.
  const portada = render({ screen: "home", sectionIndex: 0, itemIndex: 0, progress: {} });
  check(
    "lingo: la portada tiene la zona y el botón del Lingo",
    portada.includes("🔤 Lingo") && portada.includes('aria-label="Jugar al Lingo"') && portada.includes("Adivina la palabra"),
    portada.slice(0, 300)
  );

  // Pantalla inicial: tablero de 6×5 casillas y teclado con Ñ.
  const pantalla = renderToString(React.createElement(LingoScreen, { onExit() {} }));
  check(
    "lingo: 6 filas de 5 casillas (30 campos de una letra)",
    (pantalla.match(/class="lingo-fila"/g) || []).length === 6 &&
      (pantalla.match(/<input/g) || []).length === 30,
    String((pantalla.match(/<input/g) || []).length)
  );
  check(
    "lingo: teclado con Ñ, Enviar y ⌫",
    pantalla.includes('aria-label="Teclado de letras"') &&
      pantalla.includes('aria-label="letra Ñ"') &&
      pantalla.includes("Enviar") &&
      pantalla.includes("⌫"),
    pantalla.slice(0, 500)
  );
  check(
    "lingo: el grupo, «Palabra nueva» y sin aviso al empezar",
    pantalla.includes("Palabra de 5 letras · 6 intentos") &&
      pantalla.includes("Palabra nueva") &&
      !pantalla.includes('class="lingo-mensaje')
  );
  const ban = ["PERRO", "LIBRO", "MANGO", "ARBOL", "NIÑOS", "MADRE", "SILLA", "CALLE", "MUNDO", "AGUAS"];
  check(
    "lingo: la palabra a adivinar no se revela al empezar",
    ban.every((p) => !pantalla.includes(p)),
    pantalla.slice(0, 300)
  );
  check(
    "lingo: sin temporizadores ni progreso",
    !/<progress|<time|role="timer"/.test(pantalla)
  );

  // Sin palabras en el fichero: aviso con la ruta y sin teclado.
  const mockPalabras = globalThis.__PALABRAS_MOCK__;
  globalThis.__PALABRAS_MOCK__ = {};
  const sinPalabras = renderToString(React.createElement(LingoScreen, { onExit() {} }));
  globalThis.__PALABRAS_MOCK__ = mockPalabras;
  check(
    "lingo: sin palabras se avisa con la ruta del fichero",
    sinPalabras.includes("No hay palabras todavía") &&
      sinPalabras.includes("palabras/palabras.txt") &&
      !sinPalabras.includes("Teclado de letras"),
    sinPalabras.slice(0, 400)
  );

  // Tablero con estados fijos: colores de fila y solo la fila actual editable.
  const filas = [
    ["P", "E", "R", "R", "O"],
    ["M", "A", "T", "A", "S"],
    ["L", "I", "B", "R", "O"],
    Array(5).fill(""),
    Array(5).fill(""),
    Array(5).fill(""),
  ];
  const estados = [
    ["ok", "pos", "no", "no", "ok"],
    ["no", "no", "ok", "no", "pos"],
    null,
    null,
    null,
    null,
  ];
  const tab = renderToString(
    React.createElement(LingoTablero, {
      filas,
      estados,
      actual: 2,
      jugando: true,
      refs: { current: [] },
      onEscribir() {},
      onKey() {},
    })
  );
  check(
    "lingo: las letras se pintan de verde, amarillo y gris",
    tab.includes("is-ok") && tab.includes("is-pos") && tab.includes("is-no"),
    tab.slice(0, 600)
  );
  check(
    "lingo: solo la fila actual se puede escribir (el resto, de solo lectura)",
    (tab.match(/readonly/g) || []).length === 25 &&
      (tab.match(/tabindex="0"/g) || []).length === 5,
    `${(tab.match(/readonly/g) || []).length} ro / ${(tab.match(/tabindex="0"/g) || []).length} focus`
  );
  check(
    "lingo: cada casilla dice a qué intento y a qué letra pertenece",
    tab.includes('aria-label="Intento 1, letra 1"') && tab.includes('aria-label="Intento 6, letra 5"')
  );

  check(
    "lingo: cada casilla lleva el orden de su volteo (una tras otra)",
    (tab.match(/--volteo-orden/g) || []).length === 30 &&
      tab.includes("--volteo-orden:0") &&
      tab.includes("--volteo-orden:4"),
    String((tab.match(/--volteo-orden/g) || []).length)
  );
  check(
    "lingo: el volteo de las letras no llega a 1 segundo",
    VOLTEO_MS > 0 && VOLTEO_MS <= 1000,
    String(VOLTEO_MS)
  );
  check(
    "lingo: nada de giro al entrar (se anima solo al comprobar)",
    !tab.includes("is-volteando") && !pantalla.includes("is-volteando")
  );

  // Teclado con estados: pinta el fondo de la letra y se puede bloquear.
  const tec = renderToString(
    React.createElement(LingoTeclado, {
      estados: { A: "ok", B: "pos", C: "no" },
      disabled: false,
      onKey() {},
      onEnviar() {},
      onBorrar() {},
    })
  );
  check(
    "lingo: el teclado se pinta con el mejor estado de cada letra",
    tec.includes('class="lingo-tecla is-ok"') &&
      tec.includes('class="lingo-tecla is-pos"') &&
      tec.includes('class="lingo-tecla is-no"'),
    tec.slice(0, 600)
  );
  check(
    "lingo: tres filas de teclado con 27 letras",
    (tec.match(/class="lingo-teclado-fila"/g) || []).length === 3 &&
      (tec.match(/class="lingo-tecla[^"]*"[^>]*aria-label="letra /g) || []).length === 27,
    String((tec.match(/aria-label="letra /g) || []).length)
  );
  const tecOff = renderToString(
    React.createElement(LingoTeclado, {
      estados: {},
      disabled: true,
      onKey() {},
      onEnviar() {},
      onBorrar() {},
    })
  );
  check(
    "lingo: mientras comprueba o acaba, las teclas quedan desactivadas",
    (tecOff.match(/disabled="/g) || []).length === 29,
    String((tecOff.match(/disabled="/g) || []).length)
  );

  // Avisos: «Palabra no existe» no es un error del juego, es un fallo.
  const msgMal = renderToString(
    React.createElement(LingoMensaje, { mensaje: { tipo: "mal", texto: "Palabra no existe" } })
  );
  check(
    "lingo: «Palabra no existe» en su aviso rojo, sin adelantar fila",
    msgMal.includes("Palabra no existe") && msgMal.includes("is-mal") && msgMal.includes('role="status"'),
    msgMal
  );
  const msgOk = renderToString(
    React.createElement(LingoMensaje, { mensaje: { tipo: "bien", texto: "¡Correcto!" } })
  );
  check("lingo: el acierto se avisa en verde", msgOk.includes("is-bien"));
  check(
    "lingo: sin mensaje no hay nada bajo el tablero",
    renderToString(React.createElement(LingoMensaje, { mensaje: null })) === ""
  );
}

console.log(failures === 0 ? "\nRENDER Y REDUCER CORRECTOS" : `\n${failures} FALLOS`);
process.exit(failures === 0 ? 0 : 1);
