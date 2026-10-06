/**
 * Validación de ejercicios.
 *
 * Las operaciones verticales (suma, resta, multiplicación y división) y
 * los problemas se comprueban **de una sola vez, al final**: el problema
 * se desarrolla entero con la botonera (sin campos de texto) y se
 * valida el desarrollo completo. Los mensajes indican dónde está el
 * error sin revelar la solución (para eso está "Ver solución").
 */

import {
  buildAddition,
  buildSubtraction,
  buildMultiplication,
  buildDivision,
  normalizeAnswer,
  placeName,
  OP_NAME,
} from "./calculations.js";

/** Nº de pasos de un ejercicio (1 si es de respuesta única). */
export function getStepsCount(exercise) {
  switch (exercise.type) {
    case "multiplication":
    case "division":
      // Sin pasos intermedios: toda la operación se rellena de una vez
      // y se comprueba solo al final.
      return 1;
    case "wordProblem":
      // Desarrollo entero y una sola comprobación al final.
      return 1;
    default:
      return 1;
  }
}

const ok = () => ({ ok: true, message: "¡Correcto!", cellIds: [] });
const fail = (message, cellIds = []) => ({ ok: false, message, cellIds });

/** Compara dos números escritos como texto, ignorando ceros a la izquierda. */
function sameAnswer(entered, expected) {
  const norm = normalizeAnswer(entered);
  if (norm === "") return false;
  return Number(norm) === Number(expected);
}

/* ------------------------------------------------------------------ */

export function validateStep(exercise, entry) {
  switch (exercise.type) {
    case "addition":
      return validateColumnAnswer(
        buildAddition(exercise.a, exercise.b),
        entry,
        "addition"
      );
    case "subtraction":
      return validateColumnAnswer(
        buildSubtraction(exercise.a, exercise.b),
        entry,
        "subtraction"
      );
    case "mental":
      return validateSingleAnswer(
        entry.values.answer,
        exercise.result,
        mentalError,
        exercise,
        entry.attempts ?? 0
      );
    case "wordProblem":
      return validateDevelopment(exercise, entry);
    case "multiplication":
      return validateMultiplicationStep(exercise, entry);
    case "division":
      return validateDivisionStep(exercise, entry);
    case "logica":
      return validateLogicStep(exercise, entry);
    default:
      return fail("Este ejercicio no se puede comprobar.");
  }
}

function validateSingleAnswer(entered, expected, errorBuilder, exercise, attempts = 0) {
  if (String(entered ?? "").trim() === "") {
    return fail("Escribe tu respuesta antes de comprobar.");
  }
  if (sameAnswer(entered, expected)) return ok();
  return fail(errorBuilder(entered, expected, exercise, attempts));
}

/* ---- Sumas y restas ---- */

/**
 * Comprueba el resultado escrito casilla a casilla (una casilla por cifra),
 * empezando por las unidades, que es como se escribe en papel.
 * Cada fallo señala la casilla concreta.
 */
function validateColumnAnswer(model, entry, kind) {
  const cells = entry.values.cells ?? {};
  const expected = model.resultCells; // orden: unidades → izquierda

  const empty = expected.find((c) => String(cells[c.id] ?? "").trim() === "");
  if (empty) {
    return fail("Rellena todas las casillas del resultado antes de comprobar.", [
      empty.id,
    ]);
  }

  for (const cell of expected) {
    const entered = String(cells[cell.id] ?? "").trim();
    if (Number(entered) !== cell.value) {
      return fail(
        kind === "addition"
          ? `Revisa las ${placeName(cell.pos)}. Empieza siempre por las unidades y cuenta bien las llevadas.`
          : `Revisa las ${placeName(cell.pos)}. ¿Has pedido prestado correctamente?`,
        [cell.id]
      );
    }
  }

  return ok();
}

function mentalError(_entered, _expected, exercise, attempts) {
  const base = "No es correcto. Inténtalo otra vez con calma.";
  if (attempts >= 1 && exercise.hint) {
    return `${base} ${exercise.hint}`;
  }
  return base;
}

/* ---- Lógica (series, comparaciones, enigmas, eliminatorias y deducciones) ---- */

function validateLogicStep(exercise, entry) {
  const entered = entry.values.answer;
  const raw = String(entered ?? "").trim();

  if (exercise.variant === "eliminatoria") {
    if (raw === "") {
      return fail("Elige una de las opciones antes de comprobar.");
    }
    if (raw === String(exercise.answer)) return ok();
    return fail(logicChoiceError(exercise, entry.attempts ?? 0));
  }

  if (exercise.variant === "deduccion") {
    const parts = raw.split(",").map((p) => p.trim());
    if (
      parts.length !== exercise.answers.length ||
      parts.some((p) => p === "")
    ) {
      return fail(
        `Rellena las ${exercise.answers.length} casillas con cada cantidad antes de comprobar.`
      );
    }
    const aciertos = parts.every(
      (p, i) => /^\d+$/.test(p) && Number(p) === exercise.answers[i]
    );
    if (aciertos) return ok();
    return fail(logicDeductionError(exercise, entry.attempts ?? 0));
  }

  if (raw === "") {
    return fail(
      exercise.variant === "comparacion"
        ? "Elige mayor, menor o igual antes de comprobar."
        : "Escribe tu respuesta antes de comprobar."
    );
  }

  if (exercise.variant === "comparacion") {
    if (raw.toLowerCase() === String(exercise.answer).toLowerCase()) return ok();
    return fail(
      logicCompareError(entered, exercise.answer, exercise, entry.attempts ?? 0)
    );
  }

  return validateSingleAnswer(entered, exercise.answer, mentalError, exercise, entry.attempts ?? 0);
}

function logicCompareError(_entered, _expected, exercise, attempts) {
  const base = "No es correcto. Compara las dos cantidades con calma.";
  if (attempts >= 1 && exercise.hint) {
    return `${base} ${exercise.hint}`;
  }
  return base;
}

function logicChoiceError(exercise, attempts) {
  const base = "No es correcto. Descarta esa opción e inténtalo otra vez.";
  if (attempts >= 1 && exercise.hint) {
    return `${base} ${exercise.hint}`;
  }
  return base;
}

function logicDeductionError(exercise, attempts) {
  const base = "No es correcto. Repasa las pistas y vuelve a contar.";
  if (attempts >= 1 && exercise.hint) {
    return `${base} ${exercise.hint}`;
  }
  return base;
}

/* ---- Problemas ---- */

// Formato de una línea del desarrollo: «a op b = r», con el nombre del
// resultado opcional («→ magnitud») que se adjunta con la botonera.
const LINE_RE =
  /^\s*(\d+)\s*([+\-−×÷*:])\s*(\d+)\s*=\s*(\d+)(?:\s*→\s*(.+))?\s*$/;
const OP_BY_SYMBOL = {
  "+": "add",
  "-": "sub",
  "−": "sub",
  "*": "mul",
  "×": "mul",
  ":": "div",
  "÷": "div",
};

/**
 * El problema se desarrolla entero en el panel (una operación por
 * línea) con la botonera y se valida de una sola vez, al final.
 * Los mensajes no revelan la solución: señalan qué línea falla.
 */
function validateDevelopment(exercise, entry) {
  const values = entry.values ?? {};
  const committed = Array.isArray(values.lines) ? values.lines : [];
  const current =
    typeof values.current === "string" ? values.current.trim() : "";
  const rawLines = [...committed, ...(current ? [current] : [])].filter(
    (l) => String(l).trim() !== ""
  );

  if (rawLines.length === 0) {
    return fail(
      "Escribe las operaciones del desarrollo con la botonera antes de comprobar."
    );
  }

  // 1) Cada línea debe ser una operación completa: a op b = r (→ magnitud).
  const parsed = [];
  for (let i = 0; i < rawLines.length; i++) {
    const m = String(rawLines[i]).trim().match(LINE_RE);
    if (!m) {
      return fail(
        `La línea ${i + 1} no es una operación completa: número, operación, número, = y resultado.`
      );
    }
    parsed.push({
      a: Number(m[1]),
      op: OP_BY_SYMBOL[m[2]],
      b: Number(m[3]),
      result: Number(m[4]),
      mag: m[5] ? m[5].trim() : null,
    });
  }

  // 2) Una operación por cada paso del plan.
  const plan = exercise.plan;
  if (parsed.length !== plan.length) {
    return fail(
      parsed.length > plan.length
        ? `Tu desarrollo tiene ${parsed.length} operaciones; este problema se resuelve con ${plan.length}.`
        : `Llevas ${parsed.length} de ${plan.length} operaciones: continúa con el desarrollo.`
    );
  }

  // 3) Operación a operación: símbolo, números, resultado y magnitud.
  for (let i = 0; i < plan.length; i++) {
    const st = plan[i];
    const p = parsed[i];
    const n = i + 1;

    if (p.op !== st.op) {
      return fail(
        `En la operación ${n} has escrito ${OP_NAME[p.op]}. Piensa otra vez: ¿qué operación necesitas ahí?`
      );
    }

    const commutative = st.op === "add" || st.op === "mul";
    const sameNumbers =
      (p.a === st.a && p.b === st.b) ||
      (commutative && p.a === st.b && p.b === st.a);
    if (!sameNumbers) {
      return fail(
        `Los números de la operación ${n} no son los del problema. Vuelve a leerlo con atención.`
      );
    }

    if (p.result !== st.result) {
      return fail(
        `La operación ${n} no da ese resultado. Haz el cálculo otra vez con calma.`
      );
    }

    const expected = exercise.resultados
      ? i < plan.length - 1
        ? exercise.resultados.parciales[i]
        : exercise.resultados.final
      : null;
    if (expected) {
      if (!p.mag) {
        return fail(
          `Te falta adjuntar el resultado de la operación ${n}: usa los botones de resultados.`
        );
      }
      if (p.mag !== expected) {
        return fail(
          `El resultado «${p.mag}» no corresponde a la operación ${n}. Mira la lista bajo el enunciado.`
        );
      }
    }
  }

  return ok();
}

/* ---- Multiplicaciones ---- */

function validateMultiplicationStep(exercise, entry) {
  const model = buildMultiplication(exercise.a, exercise.b);
  const cells = entry.values.cells ?? {};

  // Toda la operación de una sola vez, fila a fila (de arriba abajo) y,
  // dentro de cada fila, de derecha a izquierda (como se escribe en
  // papel): primero las casillas sin rellenar de la fila y después sus
  // cifras.
  for (const step of model.steps) {
    const isTotal = step.kind === "total";
    const row = isTotal ? step.cells : step.partialCells;
    // Las llevadas no se escriben en casillas: se tienen en cuenta solo
    // para avisar cuando la cifra depende de ellas.
    const carries = isTotal ? [] : step.carryCells;
    const ordered = [...row].reverse(); // escritura: derecha → izquierda

    const empty = ordered.find((c) => String(cells[c.id] ?? "").trim() === "");
    // Casilla de un "0" de fila: se permite dejarla vacía.
    const zeroRow = row.length === 1 && row[0].value === 0;
    if (empty && !(zeroRow && empty === row[0])) {
      return fail("Rellena todas las casillas de la operación antes de comprobar.", [
        empty.id,
      ]);
    }

    for (const cell of ordered) {
      const entered = String(cells[cell.id] ?? "").trim();
      if (entered === "") continue; // caso especial de "0" ya permitido arriba
      if (Number(entered) !== cell.value) {
        if (isTotal) {
          return fail(
            "Revisa esta cifra: suma las dos filas anteriores y cuenta bien las llevadas.",
            [cell.id]
          );
        }
        const aDigits = String(exercise.a).split("").reverse().map(Number);
        const aDigit = aDigits[cell.pos - step.step] ?? 0;
        // La llevada que alimenta esta cifra es la que va justo encima.
        const carryIn = carries.find((c) => c.pos === cell.pos)?.value ?? 0;
        const carryNote = carryIn > 0 ? " Y recuerda sumar la llevada." : "";
        return fail(
          `Revisa esta cifra: ¿cuánto es ${aDigit} × ${step.digit}?${carryNote}`,
          [cell.id]
        );
      }
    }
  }

  return ok();
}

/* ---- Divisiones ---- */

function validateDivisionStep(exercise, entry) {
  const model = buildDivision(exercise.a, exercise.b);
  const cells = entry.values.cells ?? {};

  // Toda la división de una sola vez, en el orden en que se escribe:
  // cifra del cociente → resto del paso (de izquierda a derecha) →
  // cifra que se baja para el paso siguiente. Las cifras que se bajan
  // las escribe el alumno: se comprueban como cualquier otra casilla.
  const ordered = [];
  for (let k = 0; k < model.steps.length; k++) {
    const st = model.steps[k];
    ordered.push({ cell: st.quotientCell, kind: "quotient", st });
    for (const cell of st.remainderCells) {
      ordered.push({ cell, kind: "remainder", st });
    }
    const next = model.steps[k + 1];
    if (next) {
      for (const cell of next.bringDownCells) {
        ordered.push({ cell, kind: "bring", st: next });
      }
    }
  }

  for (const item of ordered) {
    const entered = String(cells[item.cell.id] ?? "").trim();
    if (entered === "") {
      return fail("Rellena todas las casillas de la operación antes de comprobar.", [
        item.cell.id,
      ]);
    }
    if (Number(entered) === item.cell.value) continue;

    if (item.kind === "quotient") {
      return fail(
        `Piensa: ¿cuántas veces cabe ${exercise.b} en ${item.st.partial}?`,
        [item.cell.id]
      );
    }
    if (item.kind === "bring") {
      return fail(
        `Tenías que bajar la cifra ${item.cell.value} del dividendo.`,
        [item.cell.id]
      );
    }
    // El producto (cifra del cociente × divisor) no se escribe: si el
    // resto no cuadra, se recuerda la multiplicación "de cabeza" sin
    // revelar el resultado de la resta.
    return fail(
      `Piensa: ${item.st.qDigit} × ${exercise.b} = ${item.st.product}. ¿Cuánto es ${item.st.partial} − ${item.st.product}?`,
      [item.cell.id]
    );
  }

  return ok();
}
