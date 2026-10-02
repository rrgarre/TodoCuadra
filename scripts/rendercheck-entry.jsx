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
import { getSheet, getSectionItems, resetSheetCache } from "../src/data/sheets/index.js";
import { sheetStateKey, ACTIVE_STORAGE_KEY } from "../src/utils/storage.js";
import {
  REMOTE_STORAGE_KEY,
  resetRemote,
  resetTemplateCache,
} from "../plantillas/templates.js";

let failures = 0;
function check(name, cond, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures += 1;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

/* Plantillas simuladas: una válida (logica.json) y una rota, para
 * comprobar que la portada carga las buenas y avisa de las malas. */
globalThis.__PLANTILLAS_MOCK__ = {
  "C:\\proy\\plantillas\\calculo.json": {
    default: JSON.parse(readFileSync("plantillas/calculo.json", "utf8")),
  },
  "C:\\proy\\plantillas\\logica.json": {
    default: JSON.parse(readFileSync("plantillas/logica.json", "utf8")),
  },
  "C:\\proy\\plantillas\\rota.json": {
    default: { titulo: "Rota", tipo: "calculo", ejercicios: [{ tipo: "arpita" }] },
  },
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
  check("portada: hoja de hoy", html.includes("Ejercicios de hoy"));
  check(
    "portada: las 4 secciones",
    ["Operaciones", "Problemas matemáticos", "Cálculo mental", "Trucos de cálculo mental"].every((t) => html.includes(t))
  );
  check("portada: botón Empezar", html.includes("Empezar"));
  check("portada: botón Resetear todo", html.includes("Resetear todo"));
  check("portada: zona Cálculo en el menú", html.includes("🧮 Cálculo"));
  check("portada: zona Lógica en el menú", html.includes("🧩 Lógica"));
  check("portada: secciones desplegadas bajo la ficha en uso", html.includes("section-list--hija"));
  check("portada: la ficha de Cálculo está en uso", html.includes('aria-label="Ejercicios de hoy: ficha en uso"'));
  check("portada: la ficha de Lógica se puede usar", html.includes('aria-label="Usar la ficha Lógica"'));
  check("portada: tarjeta de la hoja Lógica (plantilla)", html.includes("Lógica") && html.includes("· plantilla"));
  check("portada: aviso de la plantilla rota", html.includes("plantillas/rota.json"));
  check("portada: la hoja en uso está marcada", html.includes("✓ En uso"));
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
  check("mul-3: tipo y paso", htmlMul.includes("Multiplicación") && htmlMul.includes("Paso 1 de 3"));
  check("mul-3: muestra el multiplicando y el multiplicador", />2</.test(htmlMul) && />6</.test(htmlMul) && />4</.test(htmlMul));
  check(
    "mul-3: 3 casillas editables en el paso 1 (sin llevadas)",
    (htmlMul.match(/data-cell-id/g) || []).length === 3,
    `fueron ${(htmlMul.match(/data-cell-id/g) || []).length}`
  );
  check(
    "mul-3: filas futuras visibles como marcadores",
    (htmlMul.match(/vcell--future/g) || []).length > 0
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
  const iDivid = htmlDiv.indexOf('aria-label="Tocar la cifra');
  const iColon = htmlDiv.indexOf(">:</span>");
  const iDivis = htmlDiv.indexOf("vcell--given", iColon);
  check(
    "div-4: el dividendo va antes que el divisor",
    iDivid > -1 && iDivid < iColon && iColon < iDivis,
    `dividendo=${iDivid}, dosPuntos=${iColon}, divisor=${iDivis}`
  );
  check(
    "div-4: las cifras del dividendo se seleccionan tocándolas",
    htmlDiv.includes('aria-label="Tocar la cifra 9 del dividendo"')
  );
  check(
    "div-4: aviso para seleccionar la primera cifra",
    htmlDiv.includes("para seleccionarla")
  );
  check("div-4: cociente con casillas", htmlDiv.includes("Cifra 1 del cociente"));
  check(
    "div-4: el cociente empieza bajo el divisor (columna 8, fila 2)",
    /grid-column:8;grid-row:2[^>]*data-cell-id="q-0"/.test(htmlDiv),
    htmlDiv.slice(htmlDiv.indexOf('data-cell-id="q-0"') - 120, htmlDiv.indexOf('data-cell-id="q-0"'))
  );
  check(
    "div-4: la primera selección no se copia al trabajo (sin celdas bd-0)",
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
    "div-4: sin casillas de pasos futuros",
    !htmlDiv.includes("vcell--future") && !htmlDiv.includes('data-cell-id="q-1"')
  );

  const atProb = findItem("prob-3");
  const htmlProb = render({ screen: "section", sectionIndex: atProb.s, itemIndex: atProb.i, progress: {} });
  check("prob-3: pregunta la operación", htmlProb.includes("¿Qué operación necesitas realizar?"));
  check("prob-3: las 4 operaciones", ["suma", "resta", "multiplicación", "división"].every((t) => htmlProb.includes(t)));

  const atGuided = findItem("prob-1");
  const htmlG = render({ screen: "section", sectionIndex: atGuided.s, itemIndex: atGuided.i, progress: {} });
  check("prob-1: estructura de pasos", htmlG.includes("Paso 1") && htmlG.includes("Paso 2"));

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
  const l = getSheet("plantilla-logica");
  check(
    "hoja plantilla: existe, es plantilla y se llama Lógica",
    Boolean(l) && l.template === true && l.sections[0].title === "Lógica"
  );
  check("hoja plantilla: 15 retos", l.logicExercises.length === 15, JSON.stringify(l.logicExercises?.length));

  const htmlHome = render(
    { screen: "home", sectionIndex: 0, itemIndex: 0, progress: {} },
    { sheetId: l.id }
  );
  check(
    "portada de la hoja Lógica: sus secciones anidadas y las zonas del menú",
    htmlHome.includes("Series, comparaciones y enigmas para pensar") &&
      htmlHome.includes("🧮 Cálculo") &&
      htmlHome.includes("🧩 Lógica"),
    htmlHome.slice(0, 400)
  );
  check(
    "portada de la hoja Lógica: su ficha (una sola sección) se puede tocar",
    !htmlHome.includes('disabled="" aria-label="Lógica: ficha en uso"')
  );
  check(
    "portada de la hoja Lógica: la ficha de Cálculo no despliega sus secciones",
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

/* ---------------- Fichas remotas (caché en localStorage) ---------------- */

{
  const fichaRemota = JSON.stringify({
    titulo: "Retos de la abuela",
    tipo: "logica",
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
    html.includes("Retos de la abuela") && html.includes("🧩 Lógica"),
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

  // Multiplicación: paso a paso.
  let mp = reducer(base, { type: "SET_CELL", exercise: mult, cellId: "x", value: "1" });
  const multEntry = {
    values: {
      cells: {
        "partial-0-2": "9", "partial-0-1": "4", "partial-0-0": "4",
      },
    },
    status: "pending", step: 0, stepsDone: [], feedback: null, revealed: false, attempts: 0,
  };
  mp = { ...mp, progress: { "mul-3": multEntry } };
  mp = reducer(mp, { type: "CHECK", exercise: mult });
  check("multiplicación: paso 1 correcto → paso pendiente de avanzar", mp.progress["mul-3"].stepsDone.includes(0) && mp.progress["mul-3"].status === "pending" && mp.progress["mul-3"].feedback.type === "ok");
  mp = reducer(mp, { type: "NEXT_STEP", exercise: mult });
  check("NEXT_STEP pasa al paso 2", mp.progress["mul-3"].step === 1 && mp.progress["mul-3"].feedback === null);

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
  const swFresh = reducer(base, { type: "SET_SHEET", sheetId: "plantilla-logica", saved: null });
  check(
    "SET_SHEET sin progreso guardado: vuelve a la portada",
    swFresh.sheetId === "plantilla-logica" && swFresh.screen === "home" && swFresh.sectionIndex === 0 && swFresh.itemIndex === 0,
    JSON.stringify(swFresh)
  );
  const swSaved = reducer(base, {
    type: "SET_SHEET",
    sheetId: "plantilla-logica",
    saved: { screen: "summary", sectionIndex: 2, itemIndex: 3, progress: { "logica-1": { status: "correct" } } },
  });
  check(
    "SET_SHEET con progreso guardado: lo conserva y sigue en la portada",
    swSaved.sheetId === "plantilla-logica" && swSaved.screen === "home" &&
      Boolean(swSaved.progress["logica-1"]) && swSaved.itemIndex === 0 && swSaved.sectionIndex === 0,
    JSON.stringify(swSaved)
  );
  const keepSheet = reducer({ ...base, sheetId: "plantilla-logica" }, { type: "RESET" });
  check("RESET conserva la hoja activa", keepSheet.sheetId === "plantilla-logica");
}

console.log(failures === 0 ? "\nRENDER Y REDUCER CORRECTOS" : `\n${failures} FALLOS`);
process.exit(failures === 0 ? 0 : 1);
