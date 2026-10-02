import {
  buildMultiplication,
  buildDivision,
  buildAddition,
  buildSubtraction,
  additionStepsText,
  subtractionStepsText,
} from "../src/utils/calculations.js";
import { validateStep, getStepsCount } from "../src/utils/validation.js";

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
  check("236×24: 3 pasos", m.steps.length === 3);
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
    "236×4: 1 solo paso (sin fila de total duplicada)",
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
    "918÷18: producto 90 en columnas 1 y 2",
    JSON.stringify(d.steps[0].productCells.map((c) => c.col)) === "[1,2]"
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
    "384:3: sin paréntesis, con margen a la izquierda para el signo −",
    d.steps[0].minusCol >= 0 && d.ds === 1
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

/* ---------- Validación paso a paso ---------- */
{
  const ex = { id: "t", type: "multiplication", a: 236, b: 24 };
  check("multiplicación: 3 pasos", getStepsCount(ex) === 3);

  const noCarries = validateStep(ex, {
    step: 0,
    values: { cells: { "partial-0-2": "9", "partial-0-1": "4", "partial-0-0": "4" } },
    attempts: 0,
  });
  check("paso 1 sin casillas de llevada → correcto (no se piden)", noCarries.ok, JSON.stringify(noCarries));

  const badPartial = validateStep(ex, {
    step: 0,
    values: { cells: { "partial-0-2": "9", "partial-0-1": "5", "partial-0-0": "4" } },
    attempts: 0,
  });
  check("paso 1 con cifra parcial incorrecta → mensaje con 3×4", !badPartial.ok && badPartial.message.includes("3 × 4"), badPartial.message);

  const step0 = validateStep(ex, {
    step: 0,
    values: { cells: { "partial-0-2": "9", "partial-0-1": "4", "partial-0-0": "4" } },
    attempts: 0,
  });
  check("paso 1 correcto", step0.ok, JSON.stringify(step0));

  const empty = validateStep(ex, { step: 0, values: { cells: {} }, attempts: 0 });
  check("casillas vacías → aviso de rellenar", !empty.ok && empty.message.includes("Rellena"), empty.message);

  const step1 = validateStep(ex, {
    step: 1,
    values: { cells: { "partial-1-3": "4", "partial-1-2": "7", "partial-1-1": "2" } },
    attempts: 0,
  });
  check("paso 2 (472 desplazado) correcto", step1.ok, JSON.stringify(step1));

  const total = validateStep(ex, {
    step: 2,
    values: { cells: { "total-3": "5", "total-2": "6", "total-1": "6", "total-0": "4" } },
    attempts: 0,
  });
  check("paso 3 (total 5664) correcto", total.ok, JSON.stringify(total));
}
{
  const ex = { id: "d", type: "division", a: 384, b: 3 };
  check("división: 3 pasos", getStepsCount(ex) === 3);

  const noBd = validateStep(ex, {
    step: 0,
    values: { cells: { "q-0": "1", "p-0-1": "3", "r-0-1": "0" } },
    attempts: 0,
  });
  check(
    "sin seleccionar la cifra → pide tocar el dividendo",
    !noBd.ok && noBd.message.includes("para seleccionarla"),
    noBd.message
  );

  const wrongBd = validateStep(ex, {
    step: 0,
    values: { cells: { "bd-0-1": "5", "q-0": "1", "p-0-1": "3", "r-0-1": "0" } },
    attempts: 0,
  });
  check(
    "cifra seleccionada equivocada → la que toca",
    !wrongBd.ok && wrongBd.message.includes("la cifra 3"),
    wrongBd.message
  );

  const good0 = validateStep(ex, {
    step: 0,
    values: { cells: { "bd-0-1": "3", "q-0": "1", "p-0-1": "3", "r-0-1": "0" } },
    attempts: 0,
  });
  check("división paso 1 correcto", good0.ok, JSON.stringify(good0));

  const badProd = validateStep(ex, {
    step: 0,
    values: { cells: { "bd-0-1": "3", "q-0": "1", "p-0-1": "4", "r-0-1": "0" } },
    attempts: 0,
  });
  check("producto parcial mal → ¿cuánto es 1×3?", !badProd.ok && badProd.message.includes("1 × 3"), badProd.message);
  const badQ = validateStep(ex, {
    step: 0,
    values: { cells: { "bd-0-1": "3", "q-0": "2", "p-0-1": "3", "r-0-1": "0" } },
    attempts: 0,
  });
  check("cociente mal → pregunta cuántas veces cabe", !badQ.ok && badQ.message.includes("cuántas veces cabe 3 en 3"), badQ.message);

  const good1 = validateStep(ex, {
    step: 1,
    values: { cells: { "bd-1-2": "8", "q-1": "2", "p-1-2": "6", "r-1-2": "2" } },
    attempts: 0,
  });
  check("división paso 2 correcto (selecciona el 8)", good1.ok, JSON.stringify(good1));
}
{
  const ex = {
    id: "p", type: "wordProblem", mode: "choose",
    plan: [
      { op: "mul", a: 3, b: 8, result: 24 },
      { op: "add", a: 12, b: 24, result: 36 },
      { op: "sub", a: 36, b: 5, result: 31 },
    ],
  };
  const needOp = validateStep(ex, { step: 0, values: { steps: [{ op: null, nums: ["", ""], answer: "" }] }, attempts: 0 });
  check("problema 3 pasos: pide elegir operación", !needOp.ok && needOp.message.includes("Elige"), needOp.message);
  const needNums = validateStep(ex, { step: 0, values: { steps: [{ op: "mul", nums: ["", ""], answer: "" }] }, attempts: 0 });
  check("problema 3 pasos: pide números", !needNums.ok && needNums.message.includes("los dos números"), needNums.message);
  const good = validateStep(ex, { step: 0, values: { steps: [{ op: "mul", nums: ["3", "8"], answer: "24" }] }, attempts: 0 });
  check("problema 3 pasos: paso 1 correcto", good.ok, JSON.stringify(good));
}
{
  const ex = { id: "m", type: "mental", expr: "27 + 19", result: 46, hint: "Pista: suma 20 y resta 1." };
  const first = validateStep(ex, { step: 0, values: { answer: "45" }, attempts: 0 });
  check("mental: primer error sin pista", !first.ok && !first.message.includes("Pista"));
  const second = validateStep(ex, { step: 0, values: { answer: "45" }, attempts: 1 });
  check("mental: segundo error con pista", !second.ok && second.message.includes("Pista"), second.message);
}

console.log(failures === 0 ? "\nTODO CORRECTO" : `\n${failures} FALLOS`);
process.exit(failures === 0 ? 0 : 1);
