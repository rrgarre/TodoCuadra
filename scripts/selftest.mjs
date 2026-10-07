import { readFileSync } from "node:fs";
import {
  buildMultiplication,
  buildDivision,
  buildAddition,
  buildSubtraction,
  additionStepsText,
  subtractionStepsText,
  problemCells,
} from "../src/utils/calculations.js";
import {
  validateStep,
  getStepsCount,
  validateProblemStep,
  lineText,
} from "../src/utils/validation.js";
import {
  parseTemplate,
  buildTemplateSheets,
  loadTemplates,
  FORMATOS,
  applyRemoteFiles,
  getRemoteTemplates,
  resetRemote,
  fetchRemoteFiles,
  refreshRemoteTemplates,
  resetTemplateCache,
  slugify,
} from "../plantillas/templates.js";
import {
  parsePreguntas,
  tituloDesdeRuta,
  buildCategorias,
  loadPreguntas,
  resetPreguntasCache,
  poolPreguntas,
  siguientePregunta,
} from "../preguntas/loader.js";
import {
  toRoman,
  fromRoman,
  descomposicionRomana,
  sortearNumero,
  sortearPregunta,
  construirPregunta,
  respuestaCorrecta,
  DIFICULTADES,
} from "../src/utils/roman.js";
import {
  normalizarPalabra,
  parsePalabras,
  loadPalabras,
  sortearPalabra,
} from "../palabras/loader.js";
import { palabraExiste, verificarIntento } from "../palabras/rae.js";
import {
  TAM,
  FILAS,
  colorear,
  tecladoDesdeFila,
  fusionarTeclado,
  filaCompleta,
} from "../src/utils/lingo.js";

let failures = 0;
function check(name, cond, extra = "") {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

/* ---------- Multiplicaciones ---------- */
{
  const m = buildMultiplication(236, 24);
  check("236×24: 3 filas (2 parciales + total)", m.steps.length === 3);
  check("236×24: total 5664", m.total === 5664);
  const s0 = m.steps[0];
  check("236×24: parcial 944", s0.prod === 944);
  check(
    "236×24: llevadas [1,2] (valor)",
    JSON.stringify(s0.carryCells.map((c) => c.value)) === "[1,2]"
  );
  check(
    "236×24: llevadas en columnas 2 y 3 (izq→der)",
    JSON.stringify(s0.carryCells.map((c) => c.col)) === "[2,3]"
  );
  check(
    "236×24: parcial 944 en columnas 2,3,4",
    JSON.stringify(s0.partialCells.map((c) => c.col)) === "[2,3,4]"
  );
  const s1 = m.steps[1];
  check("236×24: parcial 472", s1.prod === 472);
  check(
    "236×24: parcial 2 desplazado (cols 1,2,3)",
    JSON.stringify(s1.partialCells.map((c) => c.col)) === "[1,2,3]"
  );
  const total = m.steps[2];
  check(
    "236×24: total en cols 1..4",
    JSON.stringify(total.cells.map((c) => c.col)) === "[1,2,3,4]"
  );
}
{
  const m = buildMultiplication(457, 6);
  check("457×6: total 2742", m.total === 2742);
  check("457×6: llevada al col 0 (fuera del multiplicando)", m.steps[0].carryCells.some((c) => c.col === 0 && c.value === 2));
}
{
  const m = buildMultiplication(267, 48);
  check("267×48: total 12816", m.total === 12816);
  check("267×48: parcial1 2136", m.steps[0].prod === 2136);
  check("267×48: parcial2 1068", m.steps[1].prod === 1068);
}
/* Multiplicador de una cifra: una sola fila y una sola comprobación. */
{
  const ex = { id: "t-m1", type: "multiplication", a: 236, b: 4 };
  const m = buildMultiplication(236, 4);
  check(
    "236×4: 1 sola fila (sin fila de total duplicada)",
    m.steps.length === 1 && m.steps[0].kind === "partial",
    JSON.stringify(m.steps.map((s) => s.kind))
  );
  check("236×4: getStepsCount = 1", getStepsCount(ex) === 1);

  const good = validateStep(ex, {
    step: 0,
    values: { cells: { "partial-0-2": "9", "partial-0-1": "4", "partial-0-0": "4" } },
    attempts: 0,
  });
  check("236×4: fila correcta → ok", good.ok, JSON.stringify(good));

  const bad = validateStep(ex, {
    step: 0,
    values: { cells: { "partial-0-2": "9", "partial-0-1": "4", "partial-0-0": "3" } },
    attempts: 0,
  });
  check(
    "236×4: cifra mal → mensaje de multiplicar",
    !bad.ok && bad.message.includes("× 4"),
    bad.message
  );
}

/* ---------- Divisiones ---------- */
for (const [dividend, divisor, quotient, expectedSteps] of [
  [384, 3, 128, 3],
  [924, 6, 154, 3],
  [1008, 7, 144, 3],
  [918, 18, 51, 2],
]) {
  const d = buildDivision(dividend, divisor);
  check(
    `${dividend}÷${divisor}: cociente ${quotient} y ${expectedSteps} pasos`,
    d.quotient === quotient &&
      d.steps.length === expectedSteps &&
      d.finalRemainder === 0,
    `→ cociente=${d.quotient}, pasos=${d.steps.length}, resto=${d.finalRemainder}`
  );
  check(
    `${dividend}÷${divisor}: el último resto es 0`,
    d.steps[d.steps.length - 1].rem === 0
  );
  check(
    `${dividend}÷${divisor}: todos los restos < divisor`,
    d.steps.every((s) => s.rem < divisor)
  );
  check(
    `${dividend}÷${divisor}: el cociente empieza bajo el divisor y sigue a la derecha`,
    d.quotientCells.every((c, i) => c.col === d.divisorStart + i),
    JSON.stringify(d.quotientCells.map((c) => c.col))
  );
}
{
  const d = buildDivision(918, 18);
  check("918÷18: primer parcial 91 (dígitos 0 y 1)", d.steps[0].partial === 91);
  check(
    "918÷18: producto 90 calculado en el modelo (no se pinta) y resto en la columna 2",
    d.steps[0].product === 90 &&
      JSON.stringify(d.steps[0].remainderCells.map((c) => c.col)) === "[2]"
  );
  check(
    "918÷18: primer paso baja el 9 y el 1 (columnas 1 y 2)",
    JSON.stringify(d.steps[0].bringDownCells.map((c) => [c.value, c.col])) ===
      "[[9,1],[1,2]]"
  );
  check(
    "918÷18: segundo paso baja el 8 en la columna 3",
    d.steps[1].bringDownCells[0].value === 8 &&
      d.steps[1].bringDownCells[0].col === 3
  );
}
{
  const d = buildDivision(384, 3);
  check(
    "384:3: cabecera con dividendo a la izquierda y divisor a la derecha",
    d.dividendCells[0].col === 1 &&
      d.colonCol === 5 &&
      d.staticDivisorCells[0].col === 7 &&
      d.cols === 10
  );
  check(
    "384:3: el cociente empieza bajo el divisor (columna 7) y ensancha la rejilla",
    d.quotientCells.map((c) => c.col).join(",") === "7,8,9"
  );
  check(
    "384:3: margen a la izquierda y sin producto ni signo en el modelo",
    d.ds === 1 &&
      !("productCells" in d.steps[0]) &&
      !("minusCol" in d.steps[0])
  );
}
{
  const d = buildDivision(1008, 7);
  check("1008÷7: primer parcial 10", d.steps[0].partial === 10);
  check("1008÷7: pasos con parciales 10, 30, 28", JSON.stringify(d.steps.map(s => s.partial)) === "[10,30,28]");
}

/* ---------- Sumas y restas ---------- */
{
  const a = buildAddition(348, 276);
  check("348+276 = 624", a.result === 624);
  const lines = additionStepsText(348, 276);
  check("explicación de suma empieza por unidades", lines[0].startsWith("unidades:"), lines[0]);
  check(
    "unidades explicadas con llevada",
    lines[0].includes("8 + 6 = 14") && lines[0].includes("lleva 1"),
    lines[0]
  );
}
{
  const s = buildSubtraction(532, 278);
  check("532−278 = 254", s.result === 254);
  const lines = subtractionStepsText(532, 278);
  check("explicación de resta empieza por unidades", lines[0].startsWith("unidades:"), lines[0]);
  check(
    "unidades con préstamo explicadas",
    lines[0].includes("2 + 10 = 12") && lines[0].includes("12 − 8 = 4"),
    lines[0]
  );
}

/* ---------- Sumas y restas: casilla por cifra ---------- */
{
  const ex = { id: "t-sum", type: "addition", a: 348, b: 276 };
  const m = buildAddition(348, 276);
  check(
    "348+276: casillas del resultado (unidades primero y alineadas)",
    JSON.stringify(m.resultCells.map((c) => c.value)) === "[4,2,6]" &&
      JSON.stringify(m.resultCells.map((c) => c.col)) === "[3,2,1]",
    JSON.stringify(m.resultCells)
  );

  const empty = validateStep(ex, { step: 0, values: { cells: {} }, attempts: 0 });
  check("suma vacía → aviso de rellenar casillas", !empty.ok && empty.message.includes("Rellena"), empty.message);

  const wrongTens = validateStep(ex, {
    step: 0,
    values: { cells: { "res-0": "4", "res-1": "3", "res-2": "6" } },
    attempts: 0,
  });
  check(
    "suma: decenas mal → señala la casilla de las decenas",
    !wrongTens.ok && wrongTens.message.includes("decenas") && wrongTens.cellIds[0] === "res-1",
    JSON.stringify(wrongTens)
  );

  const good = validateStep(ex, {
    step: 0,
    values: { cells: { "res-0": "4", "res-1": "2", "res-2": "6" } },
    attempts: 0,
  });
  check("suma correcta", good.ok, JSON.stringify(good));
}
{
  const ex = { id: "t-res", type: "subtraction", a: 532, b: 278 };
  const m = buildSubtraction(532, 278);
  check(
    "532−278: casillas del resultado (254)",
    JSON.stringify(m.resultCells.map((c) => c.value)) === "[4,5,2]",
    JSON.stringify(m.resultCells)
  );

  const wrongUnits = validateStep(ex, {
    step: 0,
    values: { cells: { "res-0": "5", "res-1": "5", "res-2": "2" } },
    attempts: 0,
  });
  check(
    "resta: unidades mal → señala la casilla de las unidades",
    !wrongUnits.ok && wrongUnits.message.includes("unidades") && wrongUnits.cellIds[0] === "res-0",
    JSON.stringify(wrongUnits)
  );

  const good = validateStep(ex, {
    step: 0,
    values: { cells: { "res-0": "4", "res-1": "5", "res-2": "2" } },
    attempts: 0,
  });
  check("resta correcta", good.ok, JSON.stringify(good));
}

/* ---------- Validación de las operaciones (una sola comprobación) ---------- */
{
  const ex = { id: "t", type: "multiplication", a: 236, b: 24 };
  check("multiplicación: sin pasos (una sola comprobación)", getStepsCount(ex) === 1);

  const todas = {
    "partial-0-2": "9", "partial-0-1": "4", "partial-0-0": "4",
    "partial-1-3": "4", "partial-1-2": "7", "partial-1-1": "2",
    "total-3": "5", "total-2": "6", "total-1": "6", "total-0": "4",
  };

  const good = validateStep(ex, {
    step: 0,
    values: { cells: todas },
    attempts: 0,
  });
  check(
    "multiplicación completa correcta (todo de una vez, sin llevadas escritas)",
    good.ok,
    JSON.stringify(good)
  );

  const badPartial = validateStep(ex, {
    step: 0,
    values: { cells: { ...todas, "partial-0-1": "5" } },
    attempts: 0,
  });
  check("cifra parcial incorrecta → mensaje con 3×4", !badPartial.ok && badPartial.message.includes("3 × 4"), badPartial.message);

  const badRow1 = validateStep(ex, {
    step: 0,
    values: { cells: { ...todas, "partial-1-2": "8" } },
    attempts: 0,
  });
  check("segunda fila parcial incorrecta → mensaje con 3×2", !badRow1.ok && badRow1.message.includes("3 × 2"), badRow1.message);

  const badTotal = validateStep(ex, {
    step: 0,
    values: { cells: { ...todas, "total-2": "7" } },
    attempts: 0,
  });
  check("total incorrecto → recuerda sumar las dos filas", !badTotal.ok && badTotal.message.includes("suma las dos filas"), badTotal.message);

  const empty = validateStep(ex, { step: 0, values: { cells: {} }, attempts: 0 });
  check("casillas vacías → aviso de rellenar", !empty.ok && empty.message.includes("Rellena"), empty.message);

  const half = validateStep(ex, {
    step: 0,
    values: { cells: { "partial-0-2": "9", "partial-0-1": "4", "partial-0-0": "4" } },
    attempts: 0,
  });
  check("solo la primera fila → pide rellenar el resto", !half.ok && half.message.includes("Rellena"), half.message);
}
{
  const ex = { id: "d", type: "division", a: 384, b: 3 };
  check("división: sin pasos (una sola comprobación)", getStepsCount(ex) === 1);

  // Todo lo escribe el alumno: cociente, restos y cifras bajadas.
  const todas = {
    "q-0": "1", "r-0-1": "0", "bd-1-2": "8",
    "q-1": "2", "r-1-2": "2", "bd-2-3": "4",
    "q-2": "8", "r-2-3": "0",
  };

  const good = validateStep(ex, {
    step: 0,
    values: { cells: todas },
    attempts: 0,
  });
  check(
    "división completa correcta (el alumno escribe hasta las cifras bajadas)",
    good.ok,
    JSON.stringify(good)
  );

  const strayBd = validateStep(ex, {
    step: 0,
    values: { cells: { ...todas, "bd-0-1": "9" } },
    attempts: 0,
  });
  check(
    "el primer trozo no se escribe: bd-0 ignorado (se lee en la cabecera)",
    strayBd.ok,
    JSON.stringify(strayBd)
  );

  const empty = validateStep(ex, { step: 0, values: { cells: {} }, attempts: 0 });
  check("división vacía → aviso de rellenar", !empty.ok && empty.message.includes("Rellena"), empty.message);

  const onlyFirst = validateStep(ex, {
    step: 0,
    values: { cells: { "q-0": "1", "r-0-1": "0" } },
    attempts: 0,
  });
  check("solo el primer paso → pide el resto de la operación", !onlyFirst.ok && onlyFirst.message.includes("Rellena"), onlyFirst.message);

  const badQ = validateStep(ex, {
    step: 0,
    values: { cells: { ...todas, "q-0": "2" } },
    attempts: 0,
  });
  check("cociente mal → pregunta cuántas veces cabe", !badQ.ok && badQ.message.includes("cuántas veces cabe 3 en 3"), badQ.message);

  const badRem = validateStep(ex, {
    step: 0,
    values: { cells: { ...todas, "r-0-1": "1" } },
    attempts: 0,
  });
  check("resto mal → recuerda el producto de cabeza (1 × 3)", !badRem.ok && badRem.message.includes("1 × 3"), badRem.message);

  const badBring = validateStep(ex, {
    step: 0,
    values: { cells: { ...todas, "bd-1-2": "9" } },
    attempts: 0,
  });
  check(
    "cifra bajada mal → la que toca del dividendo",
    !badBring.ok && badBring.message.includes("bajar la cifra 8"),
    badBring.message
  );

  // Orden del cursor: tras el resto se pide la cifra bajada ANTES de
  // seguir con la cifra del cociente del paso siguiente.
  const afterRem = validateStep(ex, {
    step: 0,
    values: { cells: { ...todas, "bd-1-2": "", "q-1": "9" } },
    attempts: 0,
  });
  check(
    "tras el resto → cifra bajada pendiente antes que el cociente siguiente",
    !afterRem.ok &&
      afterRem.message.includes("Rellena") &&
      !afterRem.message.includes("Piensa"),
    afterRem.message
  );
}
{
  // Problemas: desarrollo completo escrito con la botonera y una sola
  // comprobación al final (línea a línea: «a op b = r → magnitud»).
  const ex = {
    id: "p", type: "wordProblem", mode: "choose",
    plan: [
      { op: "mul", a: 3, b: 8, result: 24 },
      { op: "add", a: 12, b: 24, result: 36 },
      { op: "sub", a: 36, b: 5, result: 31 },
    ],
    resultados: {
      parciales: ["Cromos de los sobres", "Cromos en total"],
      final: "Cromos que tiene ahora",
    },
  };
  const dev = (lines, current = "") => ({ step: 0, values: { lines, current }, attempts: 0 });
  const L1 = "3 × 8 = 24 → Cromos de los sobres";
  const L2 = "12 + 24 = 36 → Cromos en total";
  const L3 = "36 − 5 = 31 → Cromos que tiene ahora";

  const vacio = validateStep(ex, dev([]));
  check("problema: desarrollo vacío pide la botonera", !vacio.ok && vacio.message.includes("botonera"), vacio.message);

  const rota = validateStep(ex, dev(["3 × 824 → Cromos de los sobres"]));
  check("problema: línea incompleta avisa", !rota.ok && rota.message.includes("línea 1"), rota.message);

  const corto = validateStep(ex, dev([L1, L2]));
  check("problema: faltan operaciones", !corto.ok && corto.message.includes("de 3"), corto.message);

  const opMal = validateStep(ex, dev(["3 + 8 = 24 → Cromos de los sobres", L2, L3]));
  check("problema: operación equivocada", !opMal.ok && opMal.message.includes("Piensa otra vez"), opMal.message);

  const numsMal = validateStep(ex, dev(["3 × 9 = 24 → Cromos de los sobres", L2, L3]));
  check("problema: números ajenos al problema", !numsMal.ok && numsMal.message.includes("no son los del problema"), numsMal.message);

  const resMal = validateStep(ex, dev(["3 × 8 = 25 → Cromos de los sobres", L2, L3]));
  check("problema: resultado que no cuadra", !resMal.ok && resMal.message.includes("no da ese resultado"), resMal.message);

  const sinMag = validateStep(ex, dev(["3 × 8 = 24", L2, L3]));
  check("problema: sin adjuntar el resultado", !sinMag.ok && sinMag.message.includes("Te falta adjuntar"), sinMag.message);

  const magMal = validateStep(ex, dev(["3 × 8 = 24 → Cromos en total", L2, L3]));
  check("problema: resultado que no corresponde", !magMal.ok && magMal.message.includes("no corresponde"), magMal.message);

  const conActual = validateStep(ex, dev([L1, L2], L3));
  check("problema: la línea en curso también se comprueba", conActual.ok, JSON.stringify(conActual));

  const commutativa = validateStep(ex, dev(["8 × 3 = 24 → Cromos de los sobres", L2, L3]));
  check("problema: multiplicación con el orden cambiado vale", commutativa.ok, JSON.stringify(commutativa));

  const sinMagnitudes = validateStep(
    { id: "q", type: "wordProblem", plan: [{ op: "add", a: 5, b: 3, result: 8 }] },
    dev(["5 + 3 = 8"])
  );
  check("problema: sin «resultados» no se piden nombres", sinMagnitudes.ok, JSON.stringify(sinMagnitudes));

  check("problema: un solo paso (la comprobación es operación a operación)", getStepsCount(ex) === 1);

  // Formato transformado: líneas-objeto y línea en curso por fases.
  const objDev = validateStep(
    ex,
    dev([
      { expr: "3 × 8", result: "24", mag: "Cromos de los sobres" },
      { expr: "12 + 24", result: "36", mag: "Cromos en total" },
      { expr: "36 − 5", result: "31", mag: "Cromos que tiene ahora" },
    ])
  );
  check("problema: operaciones transformadas (líneas-objeto)", objDev.ok, JSON.stringify(objDev));

  const sinIgual = validateStep(ex, {
    step: 0,
    values: { lines: [], current: { expr: "3 × 8", eq: false, result: "", mag: null } },
    attempts: 0,
  });
  check(
    "problema: sin pulsar «=» pide terminar la operación",
    !sinIgual.ok && sinIgual.message.includes("Termina"),
    sinIgual.message
  );

  const sinResultado = validateStep(ex, {
    step: 0,
    values: { lines: [], current: { expr: "3 × 8", eq: true, result: "", mag: null } },
    attempts: 0,
  });
  check(
    "problema: tras «=» pide escribir el resultado",
    !sinResultado.ok && sinResultado.message.includes("resultado"),
    sinResultado.message
  );

  const objSinMag = validateStep(ex, {
    step: 0,
    values: {
      lines: [
        { expr: "3 × 8", result: "24", mag: null },
        { expr: "12 + 24", result: "36", mag: "Cromos en total" },
        { expr: "36 − 5", result: "31", mag: "Cromos que tiene ahora" },
      ],
      current: { expr: "", eq: false, result: "", mag: null },
    },
    attempts: 0,
  });
  check(
    "problema: en formato objeto también pide la magnitud",
    !objSinMag.ok && objSinMag.message.includes("Te falta adjuntar"),
    objSinMag.message
  );
}
{
  /* Comprobación POR PASO de la botonera: la operación en curso,
     con los mismos mensajes de las operaciones en las casillas. */
  const ex = {
    id: "p-paso",
    type: "wordProblem",
    plan: [
      { op: "mul", a: 3, b: 8, result: 24 },
      { op: "add", a: 12, b: 24, result: 36 },
      { op: "sub", a: 36, b: 5, result: 31 },
    ],
    answer: 31,
    resultados: {
      parciales: ["Cromos de los sobres", "Cromos en total"],
      final: "Cromos que tiene ahora",
    },
  };
  const C = problemCells(3, "mul", 8); // casillas de 3 × 8 en orden de escritura
  const fill = (cells) =>
    Object.fromEntries(cells.map((c) => [c.id, String(c.value)]));
  const good = fill(C);
  const entry = (current, lines = []) => ({
    step: 0,
    values: { lines, current },
    attempts: 0,
  });
  const cur = (patch) => ({
    expr: "",
    eq: false,
    cells: {},
    mag: null,
    ...patch,
  });

  const vacio = validateProblemStep(ex, entry(cur({})));
  check(
    "paso: sin operación pide la botonera",
    !vacio.ok && vacio.message.includes("botonera"),
    vacio.message
  );

  const sinEq = validateProblemStep(ex, entry(cur({ expr: "3×8" })));
  check(
    "paso: sin «=» pide ponerla en vertical",
    !sinEq.ok && sinEq.message.includes("vertical"),
    sinEq.message
  );

  const rota = validateProblemStep(ex, entry(cur({ expr: "38", eq: true })));
  check(
    "paso: la operación pide número, operación y número",
    !rota.ok && rota.message.includes("número, operación y número"),
    rota.message
  );

  const opMal = validateProblemStep(ex, entry(cur({ expr: "3+8", eq: true })));
  check(
    "paso: operación equivocada",
    !opMal.ok && opMal.message.includes("Piensa otra vez"),
    opMal.message
  );

  const numsMal = validateProblemStep(
    ex,
    entry(cur({ expr: "3×9", eq: true, cells: good, mag: "Cromos de los sobres" }))
  );
  check(
    "paso: números ajenos al problema",
    !numsMal.ok && numsMal.message.includes("no son los del problema"),
    numsMal.message
  );

  const celdaMal = validateProblemStep(
    ex,
    entry(
      cur({
        expr: "3×8",
        eq: true,
        cells: { ...good, [C[0].id]: "9" },
        mag: "Cromos de los sobres",
      })
    )
  );
  check(
    "paso: casilla mal avisa con el mismo mensaje que las operaciones",
    !celdaMal.ok &&
      celdaMal.message.includes("Revisa esta cifra") &&
      celdaMal.cellIds.includes(C[0].id),
    celdaMal.message
  );

  const sinMag = validateProblemStep(
    ex,
    entry(cur({ expr: "3×8", eq: true, cells: good }))
  );
  check(
    "paso: sin magnitud la pide",
    !sinMag.ok && sinMag.message.includes("Te falta adjuntar"),
    sinMag.message
  );

  const magMal = validateProblemStep(
    ex,
    entry(
      cur({ expr: "3×8", eq: true, cells: good, mag: "Cromos en total" })
    )
  );
  check(
    "paso: magnitud que no corresponde",
    !magMal.ok && magMal.message.includes("no corresponde"),
    magMal.message
  );

  const okPaso = validateProblemStep(
    ex,
    entry(
      cur({ expr: "3×8", eq: true, cells: good, mag: "Cromos de los sobres" })
    )
  );
  check(
    "paso: correcto devuelve la línea confirmada",
    okPaso.ok &&
      JSON.stringify(okPaso.line) ===
        JSON.stringify({
          op: "mul",
          a: 3,
          b: 8,
          result: 24,
          mag: "Cromos de los sobres",
        }),
    JSON.stringify(okPaso.line)
  );

  const comm = validateProblemStep(
    ex,
    entry(
      cur({
        expr: "8×3",
        eq: true,
        cells: fill(problemCells(8, "mul", 3)),
        mag: "Cromos de los sobres",
      })
    )
  );
  check(
    "paso: multiplicación con el orden cambiado vale",
    comm.ok && comm.line.a === 8 && comm.line.b === 3,
    JSON.stringify(comm.line)
  );

  const completo = validateProblemStep(
    ex,
    entry(cur({ expr: "3×8", eq: true, cells: good, mag: "x" }), [
      { op: "mul", a: 3, b: 8, result: 24, mag: "Cromos de los sobres" },
      { op: "add", a: 12, b: 24, result: 36, mag: "Cromos en total" },
      { op: "sub", a: 36, b: 5, result: 31, mag: "Cromos que tiene ahora" },
    ])
  );
  check(
    "paso: si ya hay N operaciones avisa",
    !completo.ok && completo.message.includes("se resuelve con 3"),
    completo.message
  );

  // Las líneas confirmadas pasan también por la comprobación entera.
  const entero = validateStep(ex, {
    step: 0,
    values: {
      lines: [
        { op: "mul", a: 3, b: 8, result: 24, mag: "Cromos de los sobres" },
        { op: "add", a: 12, b: 24, result: 36, mag: "Cromos en total" },
        { op: "sub", a: 36, b: 5, result: 31, mag: "Cromos que tiene ahora" },
      ],
      current: null,
    },
    attempts: 0,
  });
  check(
    "problema: la comprobación entera acepta las líneas confirmadas",
    entero.ok,
    JSON.stringify(entero)
  );

  check(
    "problema: la línea confirmada se escribe como texto",
    lineText({
      op: "add",
      a: 125,
      b: 87,
      result: 212,
      mag: "Libros totales en la biblioteca",
    }) === "125 + 87 = 212 → Libros totales en la biblioteca"
  );
}
{
  const ex = { id: "m", type: "mental", expr: "27 + 19", result: 46, hint: "Pista: suma 20 y resta 1." };
  const first = validateStep(ex, { step: 0, values: { answer: "45" }, attempts: 0 });
  check("mental: primer error sin pista", !first.ok && !first.message.includes("Pista"));
  const second = validateStep(ex, { step: 0, values: { answer: "45" }, attempts: 1 });
  check("mental: segundo error con pista", !second.ok && second.message.includes("Pista"), second.message);
}

/* ---------- Números romanos (juego) ---------- */
{
  // Escritura: la forma canónica que se enseña en clase.
  const escritos = [
    [1, "I"], [4, "IV"], [9, "IX"], [14, "XIV"], [20, "XX"], [40, "XL"],
    [58, "LVIII"], [88, "LXXXVIII"], [90, "XC"], [400, "CD"], [500, "D"],
    [900, "CM"], [1994, "MCMXCIV"], [3500, "MMMD"],
  ];
  for (const [n, r] of escritos) {
    check(`romanos: ${n} se escribe ${r}`, toRoman(n) === r, toRoman(n));
  }
  check("romanos: el 0 no tiene escritura romana", toRoman(0) === "");

  // Lectura: acepta mayúsculas y espacios, pero solo la forma canónica.
  check("romanos: «XIV» se lee 14", fromRoman("XIV") === 14);
  check("romanos: «xiv» en minúsculas también", fromRoman("xiv") === 14);
  check("romanos: « x i v » con espacios también", fromRoman(" x i v ") === 14);
  check("romanos: «MCMXCIV» se lee 1994", fromRoman("MCMXCIV") === 1994);
  check("romanos: «MMMD» se lee 3500", fromRoman("MMMD") === 3500);
  check("romanos: «IIII» no es canónico", fromRoman("IIII") === null);
  check("romanos: «XIIII» no es canónico", fromRoman("XIIII") === null);
  check("romanos: «IC» no es canónico", fromRoman("IC") === null);
  check("romanos: letras ajenas no valen", fromRoman("ABC") === null);
  check("romanos: vacío no vale", fromRoman("") === null);

  // Ida y vuelta en los extremos de todos los rangos del juego.
  for (const n of [1, 20, 21, 88, 89, 499, 500, 3500]) {
    check(`romanos: ida y vuelta de ${n}`, fromRoman(toRoman(n)) === n, toRoman(n));
  }

  // El desglose que se enseña al pedir la solución.
  check(
    "romanos: desglose de 14 → X + IV",
    JSON.stringify(descomposicionRomana(14)) === '["X","IV"]'
  );
  check(
    "romanos: desglose de 58 → L + V + III",
    JSON.stringify(descomposicionRomana(58)) === '["L","V","III"]'
  );
  check(
    "romanos: desglose de 47 → XL + V + II",
    JSON.stringify(descomposicionRomana(47)) === '["XL","V","II"]'
  );
  check("romanos: sin desglose fuera de rango", descomposicionRomana(0).length === 0);

  // Dificultades ofrecidas y sus rangos.
  check(
    "romanos: tres dificultades en orden",
    DIFICULTADES.map((d) => d.id).join(",") === "facil,medio,dificil"
  );
  check(
    "romanos: rangos 1–20, 20–88 y 85–3500",
    DIFICULTADES[0].rango.includes("1 al 20") &&
      DIFICULTADES[1].rango.includes("20 al 88") &&
      DIFICULTADES[2].rango.includes("85 al 3500")
  );

  // Sorteo de números: siempre dentro del rango de su dificultad.
  check("romanos: fácil mínimo 1", sortearNumero("facil", () => 0) === 1);
  check("romanos: fácil máximo 20", sortearNumero("facil", () => 0.999999999) === 20);
  check("romanos: medio mínimo 20", sortearNumero("medio", () => 0) === 20);
  check("romanos: medio máximo 88", sortearNumero("medio", () => 0.999999999) === 88);
  const tiradas = (...v) => () => v.shift();
  check("romanos: difícil 50% inferior da 85", sortearNumero("dificil", tiradas(0.4, 0)) === 85);
  check("romanos: difícil 50% inferior da 499", sortearNumero("dificil", tiradas(0.4, 0.999999999)) === 499);
  check("romanos: difícil 50% superior da 500", sortearNumero("dificil", tiradas(0.5, 0)) === 500);
  check("romanos: difícil 50% superior da 3500", sortearNumero("dificil", tiradas(0.5, 0.999999999)) === 3500);

  // Reparto de la dificultad difícil a lo largo de muchas tiradas.
  let i = 0;
  const dadoFalso = () => ((i = (i + 1) * 7919 % 1000) / 1000) || 0.0001;
  const muestras = Array.from({ length: 400 }, () => sortearNumero("dificil", dadoFalso));
  check(
    "romanos: difícil reparte por debajo y por encima de 500",
    muestras.some((n) => n < 500) && muestras.some((n) => n >= 500)
  );
  check(
    "romanos: difícil respeta 85–499 y 500–3500",
    muestras.every((n) => (n >= 85 && n <= 499) || (n >= 500 && n <= 3500))
  );

  // Sentido de la pregunta: 50 % en romano y 50 % en cifras.
  const enRoma = sortearPregunta("facil", tiradas(0, 0.4));
  check("romanos: sentido romano → responder con cifras", enRoma.planteadoEnRomano === true);
  check("romanos: sentido romano → teclado de cifras", enRoma.teclado === "digitos");
  check("romanos: sentido romano → valor «I» y respuesta «1»", enRoma.valor === "I" && enRoma.respuesta === "1");
  const enCifras = sortearPregunta("facil", tiradas(0, 0.6));
  check("romanos: sentido cifras → responder en romanos", enCifras.planteadoEnRomano === false);
  check("romanos: sentido cifras → teclado de letras", enCifras.teclado === "letras");
  check("romanos: sentido cifras → valor «1» y respuesta «I»", enCifras.valor === "1" && enCifras.respuesta === "I");

  // Enunciados y desgloses de cada sentido.
  const q14r = construirPregunta(14, false);
  check(
    "romanos: planteado en cifras pide romanos",
    q14r.instruccion.includes("romanos") && q14r.valor === "14" && q14r.respuesta === "XIV"
  );
  check("romanos: desglose al pasar a romanos", q14r.detalle === "X + IV = 14", q14r.detalle);
  check(
    "romanos: desglose 58 al pasar a romanos",
    construirPregunta(58, false).detalle === "L + V + III = 58"
  );
  const q14d = construirPregunta(14, true);
  check(
    "romanos: planteado en romano pide el número",
    q14d.instruccion.includes("número") && q14d.valor === "XIV" && q14d.respuesta === "14"
  );
  check("romanos: desglose al leerlos", q14d.detalle === "10 + 4 = 14", q14d.detalle);
  check(
    "romanos: desglose 58 al leerlos",
    construirPregunta(58, true).detalle === "50 + 5 + 1 + 1 + 1 = 58"
  );

  // Comprobación de la respuesta escrita.
  check("romanos: cifras aceptan «14»", respuestaCorrecta("14", q14d));
  check("romanos: cifras aceptan «014»", respuestaCorrecta("014", q14d));
  check("romanos: cifras aceptan « 14 »", respuestaCorrecta(" 14 ", q14d));
  check("romanos: cifras aceptan «15»? no", !respuestaCorrecta("15", q14d));
  check("romanos: cifras no aceptan romanos escritos", !respuestaCorrecta("XIV", q14d));
  check("romanos: cifras no aceptan vacío", !respuestaCorrecta("", q14d));
  check("romanos: romanos aceptan «XIV»", respuestaCorrecta("XIV", q14r));
  check("romanos: romanos aceptan «xiv»", respuestaCorrecta("xiv", q14r));
  check("romanos: romanos aceptan « XIV »", respuestaCorrecta(" XIV ", q14r));
  check("romanos: romanos no aceptan «IIII»", !respuestaCorrecta("IIII", construirPregunta(4, false)));
  check("romanos: romanos no aceptan «XIII» de más", !respuestaCorrecta("XIII", q14r));
  check("romanos: romanos no aceptan cifras", !respuestaCorrecta("14", q14r));
  check("romanos: romanos no aceptan vacío", !respuestaCorrecta("", q14r));
}

/* ---------- Lingo (palabra de 5 letras) ---------- */
{
  check("lingo: 5 letras y 6 intentos", TAM === 5 && FILAS === 6);

  // Normalización: mayúsculas, sin tildes, con la ñ.
  check("lingo: normaliza a mayúsculas", normalizarPalabra("perro") === "PERRO");
  check("lingo: quita las tildes", normalizarPalabra("árbol") === "ARBOL");
  check("lingo: conserva la ñ", normalizarPalabra("niños") === "NIÑOS");
  check("lingo: sin espacios ni signos", normalizarPalabra(" ¡Calle! ") === "CALLE");
  check("lingo: sin letras no queda nada", normalizarPalabra("123") === "");

  // Lectura del fichero: comentarios, blancos, longitudes y duplicados.
  const leidas = parsePalabras(
    ["# comentario", "", "perro", "LIBRO", "árbol", "mesa", "Perro", "¡mundo!", "aguas"].join("\n")
  );
  check(
    "lingo: el fichero se lee línea a línea",
    JSON.stringify(leidas) === '["PERRO","LIBRO","ARBOL","MUNDO","AGUAS"]',
    JSON.stringify(leidas)
  );
  check("lingo: fichero vacío → lista vacía", parsePalabras("").length === 0);

  // El fichero real de partida.
  const real = parsePalabras(readFileSync("palabras/palabras.txt", "utf8"));
  check("lingo: palabras.txt trae 10 palabras de 5 letras o más", real.length >= 10, String(real.length));
  check("lingo: palabras.txt todas de 5 letras", real.every((p) => p.length === 5));

  // Cargador con mock (como en el render) y sorteo de la palabra.
  globalThis.__PALABRAS_MOCK__ = { "palabras/palabras.txt": "perro\nlibro\nmango\n" };
  const cargadas = loadPalabras().palabras;
  delete globalThis.__PALABRAS_MOCK__;
  check(
    "lingo: loadPalabras une los ficheros ya normalizados",
    JSON.stringify(cargadas) === '["PERRO","LIBRO","MANGO"]',
    JSON.stringify(cargadas)
  );
  check("lingo: sin palabras no se sortea", sortearPalabra([]) === null);
  check("lingo: sorteo determinista", sortearPalabra(["A", "B", "C"], () => 0) === "A");
  check("lingo: el dado al máximo da la última", sortearPalabra(["A", "B", "C"], () => 0.999999) === "C");
  check("lingo: el sorteo no repite la anterior", sortearPalabra(["A", "B"], () => 0, "A") === "B");

  // Coloreado del intento (estilo Wordle, con repetidas contadas).
  check(
    "lingo: la palabra entera acertada sale toda verde",
    JSON.stringify(colorear("MATAS".split(""), "MATAS".split(""))) === '["ok","ok","ok","ok","ok"]'
  );
  check(
    "lingo: aciertos en su sitio y letras de otra posición",
    JSON.stringify(colorear("MURIA".split(""), "MATAS".split(""))) === '["ok","no","no","no","pos"]',
    JSON.stringify(colorear("MURIA".split(""), "MATAS".split("")))
  );
  check(
    "lingo: primero las verdes (dos A en su sitio)",
    JSON.stringify(colorear("AAAAA".split(""), "BACAD".split(""))) === '["no","ok","no","ok","no"]',
    JSON.stringify(colorear("AAAAA".split(""), "BACAD".split("")))
  );
  check(
    "lingo: las repetidas no se pasan del número en la palabra",
    JSON.stringify(colorear("AAXXX".split(""), "BETAO".split(""))) === '["pos","no","no","no","no"]',
    JSON.stringify(colorear("AAXXX".split(""), "BETAO".split("")))
  );

  // Teclado: el mejor estado de cada fila y fusión sin degradar.
  check(
    "lingo: la fila aporta el mejor estado de cada letra",
    JSON.stringify(tecladoDesdeFila("AAXAA".split(""), ["pos", "ok", "no", "no", "no"])) === '{"A":"ok","X":"no"}'
  );
  check("lingo: el teclado no degrada el verde", fusionarTeclado({ A: "ok" }, { A: "no" }).A === "ok");
  check("lingo: el gris sube a amarillo", fusionarTeclado({ A: "no" }, { A: "pos" }).A === "pos");
  check("lingo: el amarillo sube a verde", fusionarTeclado({ A: "pos" }, { A: "ok" }).A === "ok");
  const mezcla = fusionarTeclado({ A: "ok", B: "pos" }, { A: "pos", B: "ok" });
  check("lingo: mezcla de estados conserva lo mejor", mezcla.A === "ok" && mezcla.B === "ok");

  check("lingo: fila completa de 5", filaCompleta(["P", "E", "R", "R", "O"]));
  check("lingo: fila sin completar", !filaCompleta(["P", "E"]) && !filaCompleta(["P", "E", "R", "R", ""]));

  // Diccionario de la RAE (fetch falso, sin red en los tests).
  const responde = (status, cuerpo) => async () => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => cuerpo,
  });
  const sinRed = async () => {
    throw new Error("sin conexión");
  };
  const okFetch = responde(200, { ok: true, data: { word: "hola" } });
  const noFetch = responde(404, { ok: false, error: "NOT_FOUND", suggestions: null });
  const conSug = responde(404, { ok: false, suggestions: ["árbol"] });
  const otraSug = responde(404, { ok: false, suggestions: ["casa"] });

  check("lingo: la RAE confirma la palabra", (await palabraExiste("hola", { fetchFn: okFetch })) === true);
  check("lingo: la RAE dice que no existe", (await palabraExiste("xyzqwv", { fetchFn: noFetch })) === false);
  check(
    "lingo: sin tilde, la sugerencia equivalente cuenta",
    (await palabraExiste("arbol", { fetchFn: conSug })) === true
  );
  check(
    "lingo: una sugerencia de otra palabra no vale",
    (await palabraExiste("arbol", { fetchFn: otraSug })) === false
  );
  let tiro500 = false;
  try {
    await palabraExiste("hola", { fetchFn: responde(500, {}) });
  } catch {
    tiro500 = true;
  }
  check("lingo: un error de la API se propaga", tiro500);

  check(
    "lingo: intento confirmado por la API",
    (await verificarIntento("hola", { fetchFn: okFetch })).ok === true
  );
  check(
    "lingo: no existe en la API y no está en la lista",
    (await verificarIntento("xyzqwv", { fetchFn: noFetch })).ok === false
  );
  check(
    "lingo: no existe en la API pero sí en la lista local",
    (await verificarIntento("perro", { fetchFn: noFetch, enLista: true })).ok === true
  );
  const sinLista = await verificarIntento("perro", { fetchFn: sinRed });
  check(
    "lingo: sin red y sin lista avisa de conexión",
    sinLista.ok === false && sinLista.error === "red",
    JSON.stringify(sinLista)
  );
  check(
    "lingo: sin red la lista local respalda",
    (await verificarIntento("perro", { fetchFn: sinRed, enLista: true })).ok === true
  );
}

/* ---------- Plantillas (carpeta plantillas/*.json) ---------- */
{
  const f = "plantillas/FichaDeLogica01.json";
  const json = JSON.parse(readFileSync(f, "utf8"));
  const r = parseTemplate(json, f);
  check("FichaDeLogica01.json: válida", r.ok, JSON.stringify(r.errors));
  if (r.ok) {
    const sh = r.sheet;
    check("FichaDeLogica01.json: 15 retos de lógica", sh.logicExercises.length === 15, JSON.stringify(sh.logicExercises.length));
    const slug = slugify(sh.title);
    check(
      "FichaDeLogica01.json: ids autogenerados (del slug del título)",
      sh.logicExercises[0].id === `${slug}-1` && sh.logicExercises[14].id === `${slug}-15`,
      JSON.stringify(sh.logicExercises.map((e) => e.id))
    );
    const sec = sh.sections[0];
    check(
      "FichaDeLogica01.json: sección única con el título de la ficha y su icono",
      sec.title === sh.title && sec.icon === "🧩"
    );
    check(
      "FichaDeLogica01.json: grupos Series, Comparaciones, Enigmas, Deducción y Eliminatoria",
      sec.groups.map((g) => g.label).join(",") ===
        "Series,Comparaciones,Enigmas,Deducción,Eliminatoria" &&
        sec.groups.every((g) => g.ids.length === 3),
      JSON.stringify(sec.groups.map((g) => g.label))
    );
    check(
      "FichaDeLogica01.json: tipos internos y explicaciones",
      sh.logicExercises.every((e) => e.type === "logica") &&
        typeof sh.logicExercises[0].explanation === "string" &&
        typeof sh.logicExercises[3].explanation === "string"
    );
    check("FichaDeLogica01.json: formato mates", sh.formato === "mates", sh.formato);

    // Variantes nuevas: deducción (casillas etiquetadas) y eliminatoria (opciones).
    const deds = sh.logicExercises.filter((e) => e.variant === "deduccion");
    const elims = sh.logicExercises.filter((e) => e.variant === "eliminatoria");
    check(
      "FichaDeLogica01.json: 3 deducciones y 3 eliminatorias",
      deds.length === 3 && elims.length === 3,
      JSON.stringify({ deds: deds.length, elims: elims.length })
    );
    check(
      "FichaDeLogica01.json: la deducción del saco (patos y conejos)",
      deds[0] &&
        JSON.stringify(deds[0].labels) === JSON.stringify(["Patos", "Conejos"]) &&
        JSON.stringify(deds[0].answers) === JSON.stringify([2, 1]) &&
        deds[0].answer === "2,1",
      JSON.stringify(deds[0])
    );
    check(
      "FichaDeLogica01.json: la eliminatoria tiene la buena entre sus opciones",
      elims.every((e) => e.options.length === 4 && e.options.includes(e.answer)) &&
        elims[0].answer === "Diego",
      JSON.stringify(elims[0])
    );
  }

  // Registro de asignaturas: cada ficha declara su "tipo" (asignatura) y
  // eso decide su zona y qué motores admite.
  check(
    "asignaturas: registro con mates (sin quiz todavía ni logica aparte)",
    Boolean(FORMATOS.mates) && !FORMATOS.logica && !FORMATOS.quiz &&
      FORMATOS.mates.bloque === "Matemáticas" && FORMATOS.mates.icono === "📐",
    JSON.stringify(Object.keys(FORMATOS))
  );
  check(
    "mates admite operaciones, problemas, mental, trucos y lógica",
    ["suma", "resta", "multiplicacion", "division", "problema", "mental", "truco", "logica"].every((t) =>
      FORMATOS.mates.tipos.includes(t)
    )
  );

  const f2 = "plantillas/prueba.json";
  const noTitulo = parseTemplate({ tipo: "mates", ejercicios: [{ tipo: "suma", a: 1, b: 2 }] }, f2);
  check(
    "plantilla sin titulo: error en español con la ruta",
    !noTitulo.ok && noTitulo.errors.some((e) => e.includes(f2) && e.includes("titulo")),
    JSON.stringify(noTitulo.errors)
  );

  const sinTipo = parseTemplate({ titulo: "X", ejercicios: [{ tipo: "suma", a: 1, b: 2 }] }, f2);
  check(
    "plantilla sin tipo: pide el formato de la ficha",
    !sinTipo.ok && sinTipo.errors.some((e) => e.includes('falta el campo "tipo"')),
    JSON.stringify(sinTipo.errors)
  );

  const tipoFichaMalo = parseTemplate({ titulo: "X", tipo: "quiz", ejercicios: [{ tipo: "suma", a: 1, b: 2 }] }, f2);
  check(
    "tipo de ficha desconocido: lista los formatos válidos",
    !tipoFichaMalo.ok && tipoFichaMalo.errors.some((e) => e.includes("Formatos válidos: mates")),
    JSON.stringify(tipoFichaMalo.errors)
  );

  const tipoMalo = parseTemplate({ titulo: "X", tipo: "mates", ejercicios: [{ tipo: "arpita" }] }, f2);
  check("tipo desconocido: lista los válidos", !tipoMalo.ok && tipoMalo.errors[0].includes("suma, resta"), JSON.stringify(tipoMalo.errors));

  // Una ficha es de UNA sola asignatura: sus motores no pueden ser de otra.
  FORMATOS["lengua-mock"] = {
    bloque: "Lengua",
    icono: "📝",
    orden: 9,
    tipos: ["logica"],
    permiteSecciones: false,
  };
  const fueraDeAsignatura = parseTemplate(
    { titulo: "X", tipo: "lengua-mock", ejercicios: [{ tipo: "suma", a: 1, b: 2 }] },
    f2
  );
  check(
    "ejercicio fuera de la asignatura: el motor no pertenece a la ficha",
    !fueraDeAsignatura.ok && fueraDeAsignatura.errors[0].includes("no pertenece al formato «lengua-mock»"),
    JSON.stringify(fueraDeAsignatura.errors)
  );
  const secEnMock = parseTemplate(
    {
      titulo: "X", tipo: "lengua-mock",
      ejercicios: [{ tipo: "logica", variante: "enigma", enunciado: "¿Cuánto es?", respuesta: 5 }],
      secciones: [{ titulo: "Única", grupos: [{ etiqueta: "G", ids: ["x-1"] }] }],
    },
    f2
  );
  check(
    "asignatura sin secciones: rechaza las escritas a mano",
    !secEnMock.ok && secEnMock.errors[0].includes('no admite "secciones"'),
    JSON.stringify(secEnMock.errors)
  );
  delete FORMATOS["lengua-mock"];

  const restaMala = parseTemplate({ titulo: "X", tipo: "mates", ejercicios: [{ tipo: "resta", a: 5, b: 9 }] }, f2);
  check("resta con a < b: rechazada", !restaMala.ok && restaMala.errors[0].includes("mayor o igual"), JSON.stringify(restaMala.errors));

  const divCero = parseTemplate({ titulo: "X", tipo: "mates", ejercicios: [{ tipo: "division", a: 10, b: 0 }] }, f2);
  check("división entre 0: rechazada", !divCero.ok && divCero.errors[0].includes("mayor que 0"), JSON.stringify(divCero.errors));

  const mulLarga = parseTemplate({ titulo: "X", tipo: "mates", ejercicios: [{ tipo: "multiplicacion", a: 12, b: 123 }] }, f2);
  check("multiplicación con b de 3 cifras: rechazada", !mulLarga.ok && mulLarga.errors[0].includes("una o dos cifras"), JSON.stringify(mulLarga.errors));

  const probMala = parseTemplate(
    {
      titulo: "X",
      tipo: "mates",
      ejercicios: [{ tipo: "problema", texto: "Tengo 5 canicas y recibo 3.", pasos: [{ op: "suma", a: 5, b: 3 }], respuesta: 9 }],
    },
    f2
  );
  check("problema con respuesta que no cuadra: rechazado", !probMala.ok && probMala.errors[0].includes("no coincide") && probMala.errors[0].includes("8"), JSON.stringify(probMala.errors));

  const probOk = parseTemplate(
    {
      titulo: "X",
      tipo: "mates",
      ejercicios: [{ tipo: "problema", texto: "Tengo 5 canicas y recibo 3.", pasos: [{ op: "suma", a: 5, b: 3 }] }],
    },
    f2
  );
  check(
    "problema: resultados calculados (respuesta y último paso)",
    probOk.ok && probOk.sheet.wordProblems[0].answer === 8 && probOk.sheet.wordProblems[0].plan[0].result === 8,
    JSON.stringify(probOk.errors)
  );

  const resMalo = parseTemplate(
    {
      titulo: "X",
      tipo: "mates",
      ejercicios: [
        { tipo: "problema", texto: "Tengo 5 canicas y recibo 3.", pasos: [{ op: "suma", a: 5, b: 3 }], resultados: {} },
      ],
    },
    f2
  );
  check(
    "problema: «resultados» sin final → error en español",
    !resMalo.ok && resMalo.errors[0].includes('"resultados"'),
    JSON.stringify(resMalo.errors)
  );

  const resOk = parseTemplate(
    {
      titulo: "X",
      tipo: "mates",
      ejercicios: [
        {
          tipo: "problema",
          texto: "Tengo 5 canicas y recibo 3.",
          pasos: [{ op: "suma", a: 5, b: 3 }],
          resultados: { parciales: ["  Canicas en total  "], final: " Canicas que tengo " },
        },
      ],
    },
    f2
  );
  check(
    "problema: «resultados» llega al ejercicio con los textos limpios",
    resOk.ok &&
      JSON.stringify(resOk.sheet.wordProblems[0].resultados) ===
        JSON.stringify({ parciales: ["Canicas en total"], final: "Canicas que tengo" }),
    JSON.stringify(resOk)
  );
  check(
    "problema: sin «resultados» el campo no aparece",
    probOk.ok && probOk.sheet.wordProblems[0].resultados === undefined
  );

  const serieMala = parseTemplate(
    { titulo: "X", tipo: "mates", ejercicios: [{ tipo: "logica", variante: "serie", enunciado: "¿Qué sigue?", elementos: [2, 4, 6], respuesta: 9 }] },
    f2
  );
  check("serie con respuesta que no la sigue: rechazada", !serieMala.ok && serieMala.errors[0].includes("esperaba 8"), JSON.stringify(serieMala.errors));

  const compMala = parseTemplate(
    { titulo: "X", tipo: "mates", ejercicios: [{ tipo: "logica", variante: "comparacion", enunciado: "Compara", izquierda: 456, derecha: 465, respuesta: "mayor" }] },
    f2
  );
  check("comparación con respuesta que no cuadra: rechazada", !compMala.ok && compMala.errors[0].includes("menor"), JSON.stringify(compMala.errors));

  const sinResp = parseTemplate(
    { titulo: "X", tipo: "mates", ejercicios: [{ tipo: "logica", variante: "enigma", enunciado: "¿Cuánto es?" }] },
    f2
  );
  check("enigma sin respuesta: rechazado", !sinResp.ok && sinResp.errors[0].includes("respuesta"), JSON.stringify(sinResp.errors));

  const elimMala = parseTemplate(
    {
      titulo: "X", tipo: "mates",
      ejercicios: [{ tipo: "logica", variante: "eliminatoria", enunciado: "¿Quién?", opciones: ["Berta", "Carlos"], respuesta: "Diego" }],
    },
    f2
  );
  check(
    "eliminatoria: respuesta que no está entre las opciones → error",
    !elimMala.ok && elimMala.errors[0].includes("no coincide con ninguna"),
    JSON.stringify(elimMala.errors)
  );

  const elimSinOpciones = parseTemplate(
    { titulo: "X", tipo: "mates", ejercicios: [{ tipo: "logica", variante: "eliminatoria", enunciado: "¿Quién?", respuesta: "Diego" }] },
    f2
  );
  check(
    "eliminatoria: sin opciones → error",
    !elimSinOpciones.ok && elimSinOpciones.errors[0].includes('"opciones"'),
    JSON.stringify(elimSinOpciones.errors)
  );

  const dedMala = parseTemplate(
    {
      titulo: "X", tipo: "mates",
      ejercicios: [{ tipo: "logica", variante: "deduccion", enunciado: "¿Cuántos?", etiquetas: ["Patos", "Conejos"], respuesta: [2] }],
    },
    f2
  );
  check(
    "deduccion: respuesta que no cuadra con las etiquetas → error",
    !dedMala.ok && dedMala.errors[0].includes("por cada etiqueta"),
    JSON.stringify(dedMala.errors)
  );

  const dedSinEtiquetas = parseTemplate(
    { titulo: "X", tipo: "mates", ejercicios: [{ tipo: "logica", variante: "deduccion", enunciado: "¿Cuántos?", respuesta: [2, 1] }] },
    f2
  );
  check(
    "deduccion: sin etiquetas → error",
    !dedSinEtiquetas.ok && dedSinEtiquetas.errors[0].includes('"etiquetas"'),
    JSON.stringify(dedSinEtiquetas.errors)
  );

  // Cargador: la válida entra y la rota solo deja aviso (nunca rompe).
  const built = buildTemplateSheets({
    "C:\\proy\\plantillas\\FichaDeLogica01.json": { default: json },
    "C:\\proy\\plantillas\\rota.json": { default: { titulo: "Rota", tipo: "mates", ejercicios: [{ tipo: "arpita" }] } },
  });
  check(
    "cargador: válida carga y rota avisa con su ruta",
    built.sheets.length === 1 && built.warnings.length === 1 && built.warnings[0].includes("plantillas/rota.json"),
    JSON.stringify(built)
  );
}

/* ---------- Ficha base (HojaDePracticas.json, la que había en código) ---------- */
{
  const f = "plantillas/HojaDePracticas.json";
  const json = JSON.parse(readFileSync(f, "utf8"));
  const r = parseTemplate(json, f);
  check("ficha HojaDePracticas.json: válida", r.ok, JSON.stringify(r.errors));
  if (r.ok) {
    const sh = r.sheet;
    check(
      "hoja: id propio, título, icono y formato",
      sh.id === "sheet-001" && sh.title === "Hoja de práctica" &&
        sh.icon === "📘" && sh.formato === "mates",
      JSON.stringify({ id: sh.id, title: sh.title, icon: sh.icon, formato: sh.formato })
    );
    check(
      "hoja: 31 ejercicios + 4 trucos",
      sh.additions.length === 5 && sh.subtractions.length === 5 &&
        sh.multiplications.length === 5 && sh.divisions.length === 4 &&
        sh.wordProblems.length === 4 && sh.mentalCalculations.length === 8 &&
        sh.tips.length === 4,
      JSON.stringify({
        sum: sh.additions.length, res: sh.subtractions.length, mul: sh.multiplications.length,
        div: sh.divisions.length, prob: sh.wordProblems.length, men: sh.mentalCalculations.length,
        tips: sh.tips.length,
      })
    );
    check(
      "hoja: ids de extremos conservados (sum-1 … tip-4)",
      sh.additions[0].id === "sum-1" && sh.subtractions[4].id === "res-5" &&
        sh.multiplications[0].id === "mul-1" && sh.divisions[3].id === "div-4" &&
        sh.mentalCalculations[7].id === "men-8" && sh.tips[3].id === "tip-4"
    );

    const p1 = sh.wordProblems.find((w) => w.id === "prob-1");
    const p3 = sh.wordProblems.find((w) => w.id === "prob-3");
    check(
      "hoja: prob-1 guiado con dos pasos y respuesta 166",
      p1 && p1.mode === "guided" && p1.plan.length === 2 && p1.answer === 166,
      JSON.stringify(p1)
    );
    check(
      "hoja: prob-3 de elección con tres pasos y respuesta 31",
      p3 && p3.mode === "choose" && p3.plan.length === 3 && p3.answer === 31 &&
        p3.plan[0].op === "mul" && p3.plan[2].op === "sub",
      JSON.stringify(p3)
    );
    check(
      "hoja: textos de los problemas intactos",
      sh.wordProblems.every((w) => w.text.length > 40) &&
        p1.text.startsWith("En la biblioteca del cole")
    );
    check(
      "hoja: los 4 problemas nombran sus resultados (parciales + final)",
      sh.wordProblems.every(
        (w) =>
          w.resultados &&
          w.resultados.parciales.length === w.plan.length - 1 &&
          w.resultados.parciales.every((t) => t.length > 3) &&
          w.resultados.final.length > 3
      ),
      JSON.stringify(sh.wordProblems.map((w) => w.resultados))
    );
    check(
      "prob-1: parcial «Libros totales en la biblioteca» y final «Libros que quedan»",
      p1.resultados.parciales.join(" · ") === "Libros totales en la biblioteca" &&
        p1.resultados.final === "Libros que quedan",
      JSON.stringify(p1.resultados)
    );

    const m1 = sh.mentalCalculations.find((m) => m.id === "men-1");
    const m5 = sh.mentalCalculations.find((m) => m.id === "men-5");
    check(
      "hoja: men-1 enlaza el truco tip-1 y lleva su pista",
      m1.tipId === "tip-1" && m1.result === 46 && m1.hint.includes("Pista: en lugar de sumar 19"),
      JSON.stringify(m1)
    );
    check("hoja: men-5 no enlaza truco", !m5.tipId);
    check(
      "hoja: trucos completos con ejemplo",
      sh.tips[0].title === "Sumar 19 (o 29, 39…)" &&
        sh.tips[0].example.steps.length === 2 &&
        sh.tips.every((t) => t.type === "tip" && typeof t.explanation === "string")
    );

    check(
      "hoja: 4 secciones con sus ids",
      sh.sections.length === 4 &&
        sh.sections.map((s) => s.id).join(",") === "operaciones,problemas,mental,tips",
      JSON.stringify(sh.sections.map((s) => s.id))
    );
    check(
      "hoja: sección Operaciones con sus 4 grupos y sus ids",
      sh.sections[0].title === "Operaciones" && sh.sections[0].icon === "🧮" &&
        sh.sections[0].groups.map((g) => g.label).join(",") ===
          "Sumas,Restas,Multiplicaciones,Divisiones" &&
        sh.sections[0].groups[0].ids.join(",") === "sum-1,sum-2,sum-3,sum-4,sum-5" &&
        sh.sections[0].groups[3].ids.length === 4,
      JSON.stringify(sh.sections[0].groups.map((g) => g.label))
    );
    check(
      "hoja: la sección mental intercala los trucos en su orden",
      JSON.stringify(sh.sections[2].groups[0].ids) ===
        JSON.stringify(["men-1", "tip-1", "men-2", "tip-2", "men-3", "men-4", "tip-3", "men-5", "men-6", "men-7", "tip-4", "men-8"]),
      JSON.stringify(sh.sections[2].groups[0].ids)
    );
    check(
      "hoja: los trucos se repiten en su propia sección",
      sh.sections[3].groups[0].ids.join(",") === "tip-1,tip-2,tip-3,tip-4"
    );
    check(
      "hoja: nada queda fuera de secciones (35 ids cubiertos)",
      new Set(sh.sections.flatMap((s) => s.groups.flatMap((g) => g.ids))).size === 35
    );
  }

  const f2 = "plantillas/prueba.json";

  // secciones: id que no existe.
  const secRota = parseTemplate(
    {
      titulo: "X", tipo: "mates",
      ejercicios: [{ id: "a1", tipo: "suma", a: 1, b: 2 }],
      secciones: [{ titulo: "Única", grupos: [{ etiqueta: "G", ids: ["otro"] }] }],
    },
    f2
  );
  check(
    "secciones: referencia a un id inexistente → error",
    !secRota.ok && secRota.errors[0].includes("no corresponde a ningún ejercicio"),
    JSON.stringify(secRota.errors)
  );

  // secciones: ejercicio que no aparece en ninguna.
  const secHueco = parseTemplate(
    {
      titulo: "X", tipo: "mates",
      ejercicios: [
        { id: "a1", tipo: "suma", a: 1, b: 2 },
        { id: "a2", tipo: "suma", a: 3, b: 4 },
      ],
      secciones: [{ titulo: "Única", grupos: [{ etiqueta: "G", ids: ["a1"] }] }],
    },
    f2
  );
  check(
    "secciones: ejercicio fuera de toda sección → error",
    !secHueco.ok && secHueco.errors.some((e) => e.includes("«a2» no aparece en ninguna sección")),
    JSON.stringify(secHueco.errors)
  );

  // Ficha mixta: varios motores de la MISMA asignatura, con secciones a mano.
  const mixta = parseTemplate(
    {
      titulo: "Examen mixto",
      tipo: "mates",
      ejercicios: [
        { id: "m1", tipo: "multiplicacion", a: 12, b: 3 },
        { id: "l1", tipo: "logica", variante: "enigma", enunciado: "¿Cuánto es 2 + 3?", respuesta: 5 },
        { id: "p1", tipo: "problema", texto: "Tengo 5 canicas y recibo 3.", pasos: [{ op: "suma", a: 5, b: 3 }] },
      ],
      secciones: [
        { titulo: "Operaciones", grupos: [{ etiqueta: "Multiplicaciones", ids: ["m1"] }] },
        { titulo: "Retos", grupos: [{ etiqueta: "Lógica", ids: ["l1"] }, { etiqueta: "Problemas", ids: ["p1"] }] },
      ],
    },
    f2
  );
  check(
    "ficha mixta: operaciones, lógica y problemas en una sola asignatura (mates)",
    mixta.ok &&
      mixta.sheet.formato === "mates" &&
      mixta.sheet.multiplications.length === 1 &&
      mixta.sheet.logicExercises.length === 1 &&
      mixta.sheet.wordProblems.length === 1 &&
      mixta.sheet.sections.length === 2,
    JSON.stringify(mixta.errors)
  );

  // Un mental no puede apuntar a un truco que no existe.
  const trucoRoto = parseTemplate(
    { titulo: "X", tipo: "mates", ejercicios: [{ id: "m1", tipo: "mental", expr: "1 + 1", resultado: 2, trucoId: "tip-9" }] },
    f2
  );
  check(
    "mental: trucoId inexistente → error",
    !trucoRoto.ok && trucoRoto.errors[0].includes("«tip-9»"),
    JSON.stringify(trucoRoto.errors)
  );

  // Ids personalizados: de ficha y de ejercicio.
  const conId = parseTemplate(
    { titulo: "X", id: "mi-ficha", tipo: "mates", ejercicios: [{ id: "custom-1", tipo: "suma", a: 1, b: 2 }] },
    f2
  );
  check(
    "ids: id de ficha y de ejercicio personalizados",
    conId.ok && conId.sheet.id === "mi-ficha" && conId.sheet.additions[0].id === "custom-1",
    JSON.stringify(conId.errors)
  );

  const dup = parseTemplate(
    { titulo: "X", tipo: "mates", ejercicios: [
      { id: "x", tipo: "suma", a: 1, b: 2 },
      { id: "x", tipo: "suma", a: 3, b: 4 },
    ] },
    f2
  );
  check("ids: repetido → error", !dup.ok && dup.errors[0].includes("se repite el id"), JSON.stringify(dup.errors));
}

/* ---------- Ficha de práctica (Operaciones01.json: 3 de cada) ---------- */
{
  const f = "plantillas/Operaciones01.json";
  const json = JSON.parse(readFileSync(f, "utf8"));
  const r = parseTemplate(json, f);
  check("ficha Operaciones01.json: válida", r.ok, JSON.stringify(r.errors));
  if (r.ok) {
    const sh = r.sheet;
    check(
      "operaciones: 3 de cada operación y nada más",
      sh.id === "sheet-002" && sh.formato === "mates" &&
        sh.additions.length === 3 && sh.subtractions.length === 3 &&
        sh.multiplications.length === 3 && sh.divisions.length === 3 &&
        sh.wordProblems.length === 0 && sh.mentalCalculations.length === 0 &&
        sh.tips.length === 0 && sh.logicExercises.length === 0,
      JSON.stringify({
        sum: sh.additions.length, res: sh.subtractions.length,
        mul: sh.multiplications.length, div: sh.divisions.length,
      })
    );
    check(
      "operaciones: una sola sección con los 4 grupos (se abre directa)",
      sh.sections.length === 1 &&
        sh.sections[0].groups.map((g) => g.label).join(",") ===
          "Sumas,Restas,Multiplicaciones,Divisiones" &&
        sh.sections[0].groups.every((g) => g.ids.length === 3),
      JSON.stringify(sh.sections.map((s) => s.groups.map((g) => g.label)))
    );
  }
}

/* ---------- Fichas remotas (carpeta de GitHub con nombre aleatorio) ---------- */
{
  // La lista de ficheros remotos: la buena carga, las rotas solo avisan.
  const aplicadas = applyRemoteFiles([
    {
      name: "abuela.json",
      content: JSON.stringify({
        titulo: "Retos de la abuela", tipo: "mates",
        ejercicios: [{ tipo: "logica", variante: "enigma", enunciado: "Ana piensa un número y le suma 3. ¿Cuál era si obtiene 10?", respuesta: 7 }],
      }),
    },
    { name: "rota.json", content: "{esto no es un json" },
    {
      name: "formato-raro.json",
      content: JSON.stringify({ titulo: "X", tipo: "alien", ejercicios: [{ tipo: "suma", a: 1, b: 2 }] }),
    },
  ]);
  check(
    "remota: la ficha válida se parsea con su formato",
    aplicadas.sheets.length === 1 &&
      aplicadas.sheets[0].formato === "mates" &&
      aplicadas.sheets[0].logicExercises.length === 1,
    JSON.stringify(aplicadas)
  );
  check(
    "remota: la rota y la de formato desconocido solo dejan aviso con su nombre",
    aplicadas.warnings.length === 2 &&
      aplicadas.warnings.some((w) => w.includes("remoto/rota.json")) &&
      aplicadas.warnings.some((w) => w.includes("remoto/formato-raro.json") && w.includes("formato")),
    JSON.stringify(aplicadas.warnings)
  );

  // Fusionado: si una remota repite el id de una local, gana la local.
  // La ficha local no trae "id": se genera del slug de su título.
  const idLogica = "plantilla-ficha-de-logica-01";
  globalThis.__PLANTILLAS_MOCK__ = {
    "C:\\proy\\plantillas\\FichaDeLogica01.json": JSON.parse(
      readFileSync("plantillas/FichaDeLogica01.json", "utf8")
    ),
  };
  applyRemoteFiles([
    {
      name: "clon.json",
      content: JSON.stringify({
        titulo: "Clon", id: idLogica, tipo: "mates",
        ejercicios: [{ tipo: "logica", variante: "enigma", enunciado: "¿5?", respuesta: 5 }],
      }),
    },
    {
      name: "extra.json",
      content: JSON.stringify({
        titulo: "Extra", tipo: "mates",
        ejercicios: [{ tipo: "logica", variante: "enigma", enunciado: "¿6?", respuesta: 6 }],
      }),
    },
  ]);
  resetTemplateCache();
  const merged = loadTemplates();
  check(
    "remota: gana la local (mismo id) y la extra se suma",
    merged.sheets.filter((s) => s.id === idLogica).length === 1 &&
      merged.sheets.some((s) => s.title === "Extra") &&
      !merged.sheets.some((s) => s.title === "Clon") &&
      merged.warnings.some((w) => w.includes(`ya existe una ficha local con el id «${idLogica}»`)),
    JSON.stringify({ sheets: merged.sheets.map((s) => s.title), warnings: merged.warnings })
  );
  resetRemote();
  resetTemplateCache();
  delete globalThis.__PLANTILLAS_MOCK__;

  // Descarga: solo los .json del listado y el base64 UTF-8 de GitHub.
  const originalFetch = globalThis.fetch;
  const base64 = (obj) => Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
  globalThis.fetch = async (url) =>
    String(url).includes("/contents/")
      ? {
          ok: true,
          status: 200,
          json: async () => [
            { type: "dir", name: "sub" },
            { type: "file", name: "leeme.md", url: "https://api.github.com/x/leeme" },
            { type: "file", name: "remota.json", url: "https://api.github.com/x/remota" },
          ],
        }
      : {
          ok: true,
          status: 200,
          json: async () => ({
            content: base64({
              titulo: "Descargada", tipo: "mates",
              ejercicios: [{ tipo: "logica", variante: "enigma", enunciado: "¿9?", respuesta: 9 }],
            }),
          }),
        };

  const descargadas = await fetchRemoteFiles({ usuario: "usuario-demo", repo: "tc-7f3a9d2b1c8e4f6a", carpeta: "plantillas" });
  check(
    "remota: descarga solo los .json y descodifica el base64",
    descargadas.length === 1 &&
      descargadas[0].name === "remota.json" &&
      JSON.parse(descargadas[0].content).titulo === "Descargada",
    JSON.stringify(descargadas)
  );

  const okRefresh = await refreshRemoteTemplates({ usuario: "u", repo: "r", carpeta: "plantillas" });
  check(
    "remota: refresh con éxito la aplica y señala el cambio",
    okRefresh.changed === true &&
      getRemoteTemplates().sheets.some((s) => s.title === "Descargada"),
    JSON.stringify(getRemoteTemplates())
  );

  // Fallos: sin caché se avisa; con caché, se usa la guardada.
  resetRemote();
  globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({}) });
  const sinCache = await refreshRemoteTemplates({ usuario: "u", repo: "r", carpeta: "plantillas" });
  check(
    "remota: fallo sin caché → aviso para la portada",
    sinCache.changed === true &&
      typeof getRemoteTemplates().aviso === "string" &&
      getRemoteTemplates().aviso.includes("No se han podido descargar"),
    JSON.stringify(getRemoteTemplates())
  );
  applyRemoteFiles([
    {
      name: "guardada.json",
      content: JSON.stringify({
        titulo: "Guardada", tipo: "mates",
        ejercicios: [{ tipo: "logica", variante: "enigma", enunciado: "¿3?", respuesta: 3 }],
      }),
    },
  ]);
  const conCache = await refreshRemoteTemplates({ usuario: "u", repo: "r", carpeta: "plantillas" });
  check(
    "remota: fallo con caché → se mantiene lo guardado sin romper",
    conCache.changed === false && getRemoteTemplates().sheets.length === 1,
    JSON.stringify(getRemoteTemplates())
  );
  globalThis.fetch = originalFetch;
  resetRemote();
}

/* ---------- Trivial (carpeta preguntas/) ---------- */
{
  // Formato estándar de una pregunta.
  const bien = parsePreguntas(
    [
      { pregunta: "¿Uno?", respuesta: "1" },
      { pregunta: "¿Dos?", respuesta: "2", detalle: " par ", categoria: "X", id: 7 },
    ],
    "preguntas/test.json"
  );
  check(
    "trivial: pregunta mínima y completa válidas",
    bien.errors.length === 0 &&
      bien.preguntas.length === 2 &&
      bien.preguntas[0].detalle === null &&
      bien.preguntas[0].categoria === "Test" &&
      bien.preguntas[1].categoria === "X" &&
      bien.preguntas[1].detalle === "par",
    JSON.stringify(bien)
  );

  const noLista = parsePreguntas({ pregunta: "¿Uno?" }, "preguntas/mala.json");
  check(
    "trivial: fichero que no es lista → error con la ruta",
    noLista.preguntas.length === 0 &&
      noLista.errors[0].includes("preguntas/mala.json"),
    JSON.stringify(noLista.errors)
  );

  const rotas = parsePreguntas(
    [{ respuesta: "solo respuesta" }, "no soy objeto", { pregunta: "¿Sin respuesta?" }],
    "preguntas/geografia.json"
  );
  check(
    "trivial: preguntas rotas se saltan y avisan con su posición",
    rotas.preguntas.length === 0 &&
      rotas.errors.length === 3 &&
      rotas.errors[0].includes("la pregunta 1") &&
      rotas.errors[0].includes('"pregunta"') &&
      rotas.errors[2].includes("la pregunta 3") &&
      rotas.errors[2].includes('"respuesta"'),
    JSON.stringify(rotas.errors)
  );

  const vacias = parsePreguntas([], "preguntas/geografia.json");
  check(
    "trivial: fichero vacío sin errores",
    vacias.errors.length === 0 && vacias.preguntas.length === 0
  );

  check(
    "trivial: categoría por defecto del nombre del fichero",
    tituloDesdeRuta("preguntas/deporte-pasatiempos-y-entretenimiento.json") ===
      "Deporte Pasatiempos y Entretenimiento" &&
      parsePreguntas(
        [{ pregunta: "a", respuesta: "b" }],
        "preguntas/ciencia-tecnologia-e-informatica.json"
      ).preguntas[0].categoria === "Ciencia Tecnologia e Informatica",
    tituloDesdeRuta("preguntas/deporte-pasatiempos-y-entretenimiento.json")
  );

  // Agrupación con mock de ficheros.
  globalThis.__PREGUNTAS_MOCK__ = {
    "C:\\proy\\preguntas\\animales.json": {
      default: [
        { pregunta: "P1", respuesta: "R1", categoria: "Animales" },
        { pregunta: "P2", respuesta: "R2" },
        { pregunta: "G1", respuesta: "GR", categoria: "Geografía" },
      ],
    },
    "C:\\proy\\preguntas\\coches.json": {
      default: [{ pregunta: "C1", respuesta: "CR", categoria: "Coches" }],
    },
    "C:\\proy\\preguntas\\geografia.json": { default: [] },
    "C:\\proy\\preguntas\\historia.json": { default: [] },
    "C:\\proy\\preguntas\\rota.json": { default: { no: "soy una lista" } },
  };
  resetPreguntasCache();
  const { categorias, warnings } = loadPreguntas();
  check(
    "trivial: categorías agrupadas y ordenadas (con acentos mergeados)",
    categorias.map((c) => c.titulo).join(",") ===
      "Animales,Coches,Geografía,Historia",
    JSON.stringify(categorias.map((c) => c.titulo))
  );
  check(
    "trivial: la categoría del fichero vacío queda pendiente",
    categorias.find((c) => c.titulo === "Historia")?.preguntas.length === 0 &&
      categorias.find((c) => c.titulo === "Geografía")?.preguntas.length === 1,
    JSON.stringify(categorias)
  );
  check(
    "trivial: el fichero que no es lista deja aviso con su ruta",
    warnings.length === 1 && warnings[0].includes("preguntas/rota.json"),
    JSON.stringify(warnings)
  );

  // Regresión: una `categoria` con coma no coincide con el nombre del
  // fichero; no debe nacer un grupo vacío duplicado (bug de deportes y
  // ciencia y tecnología).
  const conComa = buildCategorias({
    "C:\\proy\\preguntas\\deporte-x.json": {
      default: [
        {
          pregunta: "¿Quién gana?",
          respuesta: "El que marca más goles",
          categoria: "Deporte, pasatiempos y entretenimiento",
        },
      ],
    },
  });
  check(
    "trivial: categoria con coma → un solo grupo, con las preguntas",
    conComa.categorias.length === 1 &&
      conComa.categorias[0].titulo ===
        "Deporte, pasatiempos y entretenimiento" &&
      conComa.categorias[0].preguntas.length === 1,
    JSON.stringify(conComa.categorias.map((c) => `${c.titulo}:${c.preguntas.length}`))
  );

  const fusion = buildCategorias({
    "C:\\proy\\preguntas\\dep-a.json": {
      default: [{ pregunta: "P1", respuesta: "R1", categoria: "Deporte, pasatiempos" }],
    },
    "C:\\proy\\preguntas\\dep-b.json": {
      default: [{ pregunta: "P2", respuesta: "R2", categoria: "deporte pasatiempos." }],
    },
  });
  check(
    "trivial: categorías con puntuación distinta se fusionan",
    fusion.categorias.length === 1 && fusion.categorias[0].preguntas.length === 2,
    JSON.stringify(fusion.categorias.map((c) => `${c.titulo}:${c.preguntas.length}`))
  );

  const poolCat = poolPreguntas(categorias, "Animales");
  const poolTodo = poolPreguntas(categorias, null);
  check(
    "trivial: pool por categoría y pool de todas",
    poolCat.length === 2 && poolTodo.length === 4,
    JSON.stringify({ cat: poolCat.length, todo: poolTodo.length })
  );
  const p1 = siguientePregunta(poolTodo, null);
  const p2 = siguientePregunta(poolTodo, p1.key);
  check(
    "trivial: siguiente aleatoria dentro del pool y sin repetir la actual",
    poolTodo.includes(p1) && Boolean(p2) && p2.key !== p1.key,
    JSON.stringify({ p1: p1.key, p2: p2?.key })
  );
  check(
    "trivial: sin preguntas → null",
    siguientePregunta([], null) === null && siguientePregunta(null, null) === null
  );

  resetPreguntasCache();
  delete globalThis.__PREGUNTAS_MOCK__;

  // El banco real que se ha pasado, contra el formato estándar.
  const prim = parsePreguntas(
    JSON.parse(readFileSync("preguntas/primaria.json", "utf8")),
    "preguntas/primaria.json"
  );
  check(
    "trivial: primaria.json cumple el formato (200 preguntas)",
    prim.errors.length === 0 && prim.preguntas.length === 200,
    JSON.stringify(prim.errors.slice(0, 3))
  );
}

/* ---------- Lógica: validación paso a paso ---------- */
{
  const serie = { id: "l1", type: "logica", variant: "serie", prompt: "¿Qué sigue?", series: [2, 4, 6, 8], answer: 10, hint: "Sube de 2 en 2." };
  const empty = validateStep(serie, { step: 0, values: { answer: "" }, attempts: 0 });
  check("lógica serie: sin respuesta avisa", !empty.ok && empty.message.includes("Escribe tu respuesta"), empty.message);
  const wrong = validateStep(serie, { step: 0, values: { answer: "12" }, attempts: 0 });
  check("lógica serie: primer fallo sin pista", !wrong.ok && !wrong.message.includes("Sube de 2"), wrong.message);
  const wrong2 = validateStep(serie, { step: 0, values: { answer: "12" }, attempts: 1 });
  check("lógica serie: segundo fallo con pista", !wrong2.ok && wrong2.message.includes("Sube de 2 en 2"), wrong2.message);
  const good = validateStep(serie, { step: 0, values: { answer: "010" }, attempts: 0 });
  check("lógica serie: correcto aunque lleve ceros", good.ok, JSON.stringify(good));

  const comp = { id: "l4", type: "logica", variant: "comparacion", prompt: "Compara", left: 456, right: 465, answer: "menor", hint: "Mira las centenas." };
  const sinEligir = validateStep(comp, { step: 0, values: { answer: "" }, attempts: 0 });
  check("lógica comparación: pide elegir opción", !sinEligir.ok && sinEligir.message.includes("mayor, menor o igual"), sinEligir.message);
  const eligioMal = validateStep(comp, { step: 0, values: { answer: "mayor" }, attempts: 1 });
  check("lógica comparación: fallo con pista", !eligioMal.ok && eligioMal.message.includes("Mira las centenas"), eligioMal.message);
  const okComp = validateStep(comp, { step: 0, values: { answer: "menor" }, attempts: 0 });
  check("lógica comparación: correcto", okComp.ok, JSON.stringify(okComp));

  const enigma = { id: "l7", type: "logica", variant: "enigma", prompt: "Enigma", answer: 8 };
  const okEn = validateStep(enigma, { step: 0, values: { answer: "8" }, attempts: 0 });
  check("lógica enigma: correcto", okEn.ok, JSON.stringify(okEn));
  const badEn = validateStep(enigma, { step: 0, values: { answer: "7" }, attempts: 0 });
  check("lógica enigma: incorrecto", !badEn.ok);
  check("lógica: un solo paso", getStepsCount(enigma) === 1);

  const elim = {
    id: "l8", type: "logica", variant: "eliminatoria", prompt: "¿Quién va al final?",
    options: ["Berta", "Carlos", "Diego", "No se puede saber"],
    answer: "Diego",
    hint: "El orden es Berta, Carlos y Diego.",
  };
  const sinOpcion = validateStep(elim, { step: 0, values: { answer: "" }, attempts: 0 });
  check(
    "lógica eliminatoria: pide elegir opción",
    !sinOpcion.ok && sinOpcion.message.includes("Elige una de las opciones"),
    sinOpcion.message
  );
  const optMal = validateStep(elim, { step: 0, values: { answer: "Carlos" }, attempts: 0 });
  check(
    "lógica eliminatoria: primer fallo sin pista",
    !optMal.ok && !optMal.message.includes("El orden es"),
    optMal.message
  );
  const optMal2 = validateStep(elim, { step: 0, values: { answer: "Carlos" }, attempts: 1 });
  check(
    "lógica eliminatoria: segundo fallo con pista",
    !optMal2.ok && optMal2.message.includes("El orden es Berta"),
    optMal2.message
  );
  const optOk = validateStep(elim, { step: 0, values: { answer: "Diego" }, attempts: 0 });
  check("lógica eliminatoria: correcta", optOk.ok, JSON.stringify(optOk));

  const ded = {
    id: "l9", type: "logica", variant: "deduccion", prompt: "Patos y conejos",
    labels: ["Patos", "Conejos"],
    answers: [2, 1],
    answer: "2,1",
    hint: "Los patos tienen 2 patas y los conejos 4.",
  };
  const casillasVacias = validateStep(ded, { step: 0, values: { answer: "" }, attempts: 0 });
  check(
    "lógica deducción: casillas vacías avisan",
    !casillasVacias.ok && casillasVacias.message.includes("Rellena las 2 casillas"),
    casillasVacias.message
  );
  const unaSola = validateStep(ded, { step: 0, values: { answer: "2" }, attempts: 0 });
  check(
    "lógica deducción: una sola casilla no basta",
    !unaSola.ok && unaSola.message.includes("Rellena las 2 casillas"),
    unaSola.message
  );
  const dedMal = validateStep(ded, { step: 0, values: { answer: "1,2" }, attempts: 1 });
  check(
    "lógica deducción: fallo con pista",
    !dedMal.ok && dedMal.message.includes("Los patos tienen 2 patas"),
    dedMal.message
  );
  const dedOk = validateStep(ded, { step: 0, values: { answer: "2,1" }, attempts: 0 });
  check("lógica deducción: correcta", dedOk.ok, JSON.stringify(dedOk));
  const dedCeros = validateStep(ded, { step: 0, values: { answer: "02,01" }, attempts: 0 });
  check("lógica deducción: acepta ceros a la izquierda", dedCeros.ok, JSON.stringify(dedCeros));
}

console.log(failures === 0 ? "\nTODO CORRECTO" : `\n${failures} FALLOS`);
process.exit(failures === 0 ? 0 : 1);
