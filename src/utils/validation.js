/**
 * Validación de ejercicios.
 *
 * Cada ejercicio se comprueba **paso a paso** y los mensajes indican dónde
 * está el error sin revelar la solución (para eso está "Ver solución").
 */

import {
  buildAddition,
  buildSubtraction,
  buildMultiplication,
  buildDivision,
  normalizeAnswer,
  placeName,
  OP_NAME,
  OP_SYMBOL,
} from "./calculations.js";

/** Nº de pasos de un ejercicio (1 si es de respuesta única). */
export function getStepsCount(exercise) {
  switch (exercise.type) {
    case "multiplication":
      // El número real de pasos: con multiplicador de una cifra es 1
      // (la fila del producto ya es el resultado).
      return buildMultiplication(exercise.a, exercise.b).steps.length;
    case "division":
      return buildDivision(exercise.a, exercise.b).steps.length;
    case "wordProblem":
      return exercise.plan.length;
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
      return exercise.mode === "choose"
        ? validatePlanStep(exercise, entry)
        : validateGuidedStep(exercise, entry);
    case "multiplication":
      return validateMultiplicationStep(exercise, entry);
    case "division":
      return validateDivisionStep(exercise, entry);
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

/* ---- Problemas ---- */

function validateGuidedStep(exercise, entry) {
  const stepIndex = entry.step;
  const plan = exercise.plan[stepIndex];
  const entered = entry.values.answers[stepIndex];
  if (String(entered ?? "").trim() === "") {
    return fail(`Escribe el resultado del paso ${stepIndex + 1}.`);
  }
  if (sameAnswer(entered, plan.result)) return ok();
  return fail(
    `El paso ${stepIndex + 1} no es correcto. Realiza otra vez la operación con calma.`
  );
}

function validatePlanStep(exercise, entry) {
  const k = entry.step;
  const plan = exercise.plan[k];
  const current = entry.values.steps[k];
  const paso = `del paso ${k + 1}`;

  if (!current.op) {
    return fail(`Elige primero la operación que necesitas ${paso}.`);
  }
  if (current.op !== plan.op) {
    return fail(
      `Has elegido ${OP_NAME[current.op]}. Piensa otra vez: ¿qué operación necesitas ${paso}?`
    );
  }

  const [n0, n1] = current.nums.map((v) => String(v ?? "").trim());
  if (n0 === "" || n1 === "") {
    return fail(`Introduce los dos números ${paso}.`);
  }
  const enteredSet = [Number(n0), Number(n1)];
  const expectedSet = [plan.a, plan.b];
  const sameNumbers = expectedSet.every((v) => enteredSet.includes(v));
  if (!sameNumbers) {
    return fail("Esos números no son los del problema. Vuelve a leerlo con atención.");
  }
  const commutative = plan.op === "add" || plan.op === "mul";
  const ordered = enteredSet[0] === plan.a && enteredSet[1] === plan.b;
  if (!ordered && !commutative) {
    return fail(
      `Fíjate en el orden: primero ${plan.a}, después ${plan.b} (${OP_SYMBOL[plan.op]}).`
    );
  }

  if (String(current.answer ?? "").trim() === "") {
    return fail("Escribe el resultado del cálculo.");
  }
  if (sameAnswer(current.answer, plan.result)) return ok();
  return fail("El cálculo no da ese resultado. Comprueba otra vez.");
}

/* ---- Multiplicaciones ---- */

function validateMultiplicationStep(exercise, entry) {
  const model = buildMultiplication(exercise.a, exercise.b);
  const stepIndex = entry.step;
  const cells = entry.values.cells ?? {};
  const step = model.steps[stepIndex];
  const partial = step.kind === "total" ? step.cells : step.partialCells;
  // Las llevadas no se escriben en casillas: se tienen en cuenta solo
  // para avisar cuando la cifra depende de ellas.
  const carries = step.kind === "total" ? [] : step.carryCells;

  const empty = partial.find((c) => String(cells[c.id] ?? "").trim() === "");
  if (empty && !(partial.length === 1 && partial[0].value === 0 && empty === partial[0])) {
    return fail(
      "Rellena todas las casillas de este paso antes de comprobar.",
      [empty.id]
    );
  }

  // Cifras del resultado (escritura: de derecha a izquierda).
  for (let i = partial.length - 1; i >= 0; i--) {
    const cell = partial[i];
    const entered = String(cells[cell.id] ?? "").trim();
    if (entered === "") continue; // caso especial de "0" ya permitido arriba
    if (Number(entered) !== cell.value) {
      if (step.kind === "total") {
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

  return ok();
}

/* ---- Divisiones ---- */

function validateDivisionStep(exercise, entry) {
  const model = buildDivision(exercise.a, exercise.b);
  const k = entry.step;
  const step = model.steps[k];
  const cells = entry.values.cells ?? {};

  // 1) Las cifras seleccionadas del dividendo: se tocan de izquierda a
  //    derecha, antes de escribir nada.
  for (const bd of step.bringDownCells) {
    const entered = String(cells[bd.id] ?? "").trim();
    if (entered === "") {
      return fail(`Toca en el dividendo la cifra ${bd.value} para seleccionarla.`, [
        bd.id,
      ]);
    }
    if (Number(entered) !== bd.value) {
      return fail(`Tenías que seleccionar la cifra ${bd.value}.`, [bd.id]);
    }
  }

  const ordered = [
    step.quotientCell,
    ...step.remainderCells.slice().reverse(),
  ];
  const empty = ordered.find((c) => String(cells[c.id] ?? "").trim() === "");
  if (empty) {
    return fail("Rellena todas las casillas de este paso antes de comprobar.", [
      empty.id,
    ]);
  }

  const qEntered = String(cells[step.quotientCell.id]).trim();
  if (Number(qEntered) !== step.qDigit) {
    return fail(
      `Piensa: ¿cuántas veces cabe ${exercise.b} en ${step.partial}?`,
      [step.quotientCell.id]
    );
  }

  // El producto (cifra del cociente × divisor) no se escribe: si el
  // resto no cuadra, se recuerda la multiplicación "de cabeza" sin
  // revelar el resultado de la resta.
  for (const cell of step.remainderCells.slice().reverse()) {
    if (Number(String(cells[cell.id]).trim()) !== cell.value) {
      return fail(
        `Piensa: ${step.qDigit} × ${exercise.b} = ${step.product}. ¿Cuánto es ${step.partial} − ${step.product}?`,
        [cell.id]
      );
    }
  }

  return ok();
}
