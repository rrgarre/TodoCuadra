/**
 * Construcción de las operaciones paso a paso.
 *
 * Todos los ejercicios se "resuelven" aquí de forma pura: los componentes solo
 * pintan lo que devuelven estas funciones y la validación compara contra
 * estos mismos valores esperados.
 */

const UNIT_NAMES = [
  "unidades",
  "decenas",
  "centenas",
  "unidades de millar",
  "decenas de millar",
  "centenas de millar",
];

/** Nombre de la posición decimal (0 = unidades). */
export function placeName(pos) {
  return UNIT_NAMES[pos] ?? `posición ${pos}`;
}

/** Cifras de un número, en orden visual (la más significativa primero). */
export function visualDigits(value) {
  return String(value)
    .split("")
    .map((ch) => Number(ch));
}

/* ------------------------------------------------------------------ */
/* Sumas                                                               */
/* ------------------------------------------------------------------ */

export function buildAddition(a, b) {
  const n = Math.max(String(a).length, String(b).length);
  const A = String(a).padStart(n, "0");
  const B = String(b).padStart(n, "0");
  const columns = [];
  let carry = 0;
  for (let i = n - 1; i >= 0; i--) {
    const da = Number(A[i]);
    const db = Number(B[i]);
    const sum = da + db + carry;
    columns.unshift({
      da,
      db,
      carryIn: carry,
      sum,
      digit: sum % 10,
      carryOut: Math.floor(sum / 10),
    });
    carry = Math.floor(sum / 10);
  }
  const result = a + b;
  return {
    a,
    b,
    result,
    columns,
    finalCarry: carry,
    width: n,
    resultCells: resultCellsFor(result, n),
  };
}

/**
 * Casillas de la fila del resultado, empezando por las unidades (ese es el
 * orden de escritura: de derecha a izquierda).
 *
 * `col` es 0-based dentro de la rejilla de `n + 1` columnas: la unidad
 * queda en la última columna y, si el resultado se alarga una cifra, esa
 * cifra cae en la primera columna (la misma que el signo, en otra fila).
 */
function resultCellsFor(result, n) {
  const str = String(result);
  const cells = [];
  for (let pos = 0; pos < str.length; pos++) {
    cells.push({
      id: `res-${pos}`,
      pos,
      col: n - pos,
      value: Number(str[str.length - 1 - pos]),
      step: 0,
    });
  }
  return cells;
}

/** Frases del procedimiento, de las unidades a la izquierda. */
export function additionStepsText(a, b) {
  const { columns, result, finalCarry } = buildAddition(a, b);
  const lines = columns
    .slice()
    .reverse()
    .map((col, pos) => {
      // columns está en orden visual (izquierda → derecha): al invertirlo,
      // el índice 0 son las unidades.
      const carryText = col.carryOut
        ? ` → escribe ${col.digit} y lleva ${col.carryOut}`
        : "";
      return `${placeName(pos)}: ${col.da} + ${col.db}${
        col.carryIn ? ` + ${col.carryIn} de llevada` : ""
      } = ${col.sum}${carryText}`;
    });
  if (finalCarry) {
    lines.push(`No te olvides de la última llevada: ${finalCarry}`);
  }
  lines.push(`Resultado: ${result}`);
  return lines;
}

/* ------------------------------------------------------------------ */
/* Restas                                                              */
/* ------------------------------------------------------------------ */

export function buildSubtraction(a, b) {
  const n = Math.max(String(a).length, String(b).length);
  const A = String(a).padStart(n, "0");
  const B = String(b).padStart(n, "0");
  const columns = [];
  let borrow = 0;
  for (let i = n - 1; i >= 0; i--) {
    const daRaw = Number(A[i]);
    const db = Number(B[i]);
    let da = daRaw - borrow;
    let neededBorrow = false;
    if (da < db) {
      da += 10;
      neededBorrow = true;
    }
    const digit = da - db;
    columns.unshift({
      daRaw,
      da,
      db,
      borrowIn: borrow,
      neededBorrow,
      digit,
      borrowOut: neededBorrow ? 1 : 0,
    });
    borrow = neededBorrow ? 1 : 0;
  }
  const result = a - b;
  return {
    a,
    b,
    result,
    columns,
    width: n,
    resultCells: resultCellsFor(result, n),
  };
}

export function subtractionStepsText(a, b) {
  const { columns, result } = buildSubtraction(a, b);
  const lines = columns
    .slice()
    .reverse()
    .map((col, pos) => {
      // Al invertir, el índice 0 son las unidades.
      const base = `${placeName(pos)}:`;
      if (col.neededBorrow) {
        const left = `${col.daRaw}${col.borrowIn ? " − 1" : ""} + 10`;
        return `${base} ${left} = ${col.da}, luego ${col.da} − ${col.db} = ${col.digit}`;
      }
      if (col.borrowIn) {
        return `${base} ${col.daRaw} − 1 = ${col.da}, luego ${col.da} − ${col.db} = ${col.digit}`;
      }
      return `${base} ${col.daRaw} − ${col.db} = ${col.digit}`;
    });
  lines.push(`Resultado: ${result}`);
  return lines;
}

/* ------------------------------------------------------------------ */
/* Multiplicaciones verticales                                         */
/* ------------------------------------------------------------------ */

/**
 * Construye la operación completa: el multiplicando, el multiplicador, un
 * resultado parcial por cifra del multiplicador (el segundo desplazado una
 * posición a la izquierda) y el total.
 *
 * Las llevadas de cada fila parcial quedan en `carryCells` (no se piden al
 * alumno como casillas: se usan para comprobar y para explicar), alineadas
 * con la cifra del resultado a la que alimentan.
 *
 * Todas las celdas llevan: id, col (columna de la rejilla), pos (posición
 * decimal) y value (cifra esperada).
 */
export function buildMultiplication(a, b) {
  const aStr = String(a);
  const bStr = String(b);
  const n = aStr.length;
  const m = bStr.length;
  const cols = n + m;
  const unitCol = cols - 1;
  const colFor = (pos) => unitCol - pos;
  const aDigits = aStr.split("").map(Number).reverse(); // índice = posición decimal
  const bDigits = bStr.split("").map(Number).reverse();

  const steps = [];

  for (let j = 0; j < m; j++) {
    const digit = bDigits[j];
    const prod = a * digit;

    // Llevadas de esta fila parcial (solo se registran donde hay llevada;
    // no son casillas de entrada).
    const carryCells = [];
    let carry = 0;
    for (let i = 0; i < n; i++) {
      const product = aDigits[i] * digit + carry;
      carry = Math.floor(product / 10);
      if (carry > 0) {
        carryCells.push({
          id: `carry-${j}-${i + 1 + j}`,
          pos: i + 1 + j,
          col: colFor(i + 1 + j),
          value: carry,
          step: j,
        });
      }
    }
    // Orden visual: de izquierda a derecha (posición descendente).
    carryCells.reverse();

    // Cifras del resultado parcial (sin desplazar) en su columna final.
    const prodStr = String(prod);
    const partialCells = [];
    for (let k = prodStr.length - 1; k >= 0; k--) {
      const shiftedPos = k + j;
      partialCells.push({
        id: `partial-${j}-${shiftedPos}`,
        pos: shiftedPos,
        col: colFor(shiftedPos),
        value: Number(prodStr[prodStr.length - 1 - k]),
        step: j,
      });
    }

    steps.push({ kind: "partial", step: j, digit, prod, carryCells, partialCells });
  }

  const total = a * b;
  const totalStr = String(total);
  const totalCells = [];
  for (let k = totalStr.length - 1; k >= 0; k--) {
    const pos = k;
    totalCells.push({
      id: `total-${pos}`,
      pos,
      col: colFor(pos),
      value: Number(totalStr[totalStr.length - 1 - k]),
      step: m,
    });
  }
  // Con multiplicador de una cifra el único producto ya ES el resultado:
  // no se piden dos filas ni dos comprobaciones.
  if (m > 1) {
    steps.push({ kind: "total", step: m, cells: totalCells, value: total });
  }

  // Sin fila de llevadas, la rejilla empieza en el multiplicando:
  //   1 multiplicando · 2 multiplicador · 3 línea · parciales desde la 4.
  return {
    a,
    b,
    aDigits,
    bDigits,
    n,
    m,
    cols,
    unitCol,
    colFor,
    aCells: digitsToCells(aStr, n - 1, (pos) => `a-${pos}`),
    bCells: digitsToCells(bStr, m - 1, (pos) => `b-${pos}`),
    signCol: n - 1,
    steps,
    total,
    rows: {
      multiplicand: 1,
      multiplier: 2,
      line1: 3,
      partialStart: 4, // la fila parcial j está en partialStart + j
      line2: 4 + m,
      total: 5 + m,
      count: 5 + m,
    },
  };
}

/** Convierte un número en celdas alineadas a la columna de las unidades. */
function digitsToCells(str, highestPos, idFor) {
  const cells = [];
  for (let k = 0; k < str.length; k++) {
    const pos = highestPos - k;
    cells.push({
      id: idFor(pos),
      pos,
      value: Number(str[k]),
    });
  }
  return cells;
}

/* ------------------------------------------------------------------ */
/* Divisiones largas                                                   */
/* ------------------------------------------------------------------ */

function cellsForValue(value, endCol, idPrefix, step) {
  const str = String(value);
  const cells = [];
  for (let k = 0; k < str.length; k++) {
    const col = endCol - (str.length - 1 - k);
    cells.push({
      id: `${idPrefix}-${step}-${col}`,
      col,
      value: Number(str[k]),
      step,
    });
  }
  return cells;
}

/**
 * Construye la división al estilo del algoritmo de Primaria. Cada paso
 * del modelo es una fila del trabajo; en la app todo el trabajo se
 * rellena de una vez y se comprueba solo al final (sin pasos
 * intermedios).
 *
 * La cabecera es el propio enunciado, con el dividendo a la IZQUIERDA y
 * el divisor a la DERECHA, separados por los dos puntos:
 *
 *   2 8 4 : 3                     ← cabecera (datos: no se toca nada)
 *     1 4   9 4                   ← fila 2: resto del paso 0 (en azul)
 *         2                          y, a la derecha, el cociente
 *
 * El producto (cifra del cociente × divisor) NO se escribe: se calcula
 * de cabeza; tampoco se pinta el signo −. Cada paso es una sola fila
 * de resto.
 *
 * Columnas de la rejilla (dividendo a la izquierda):
 *   0                  : margen (la primera columna queda libre)
 *   1 .. largoDiv      : dividendo (datos: no se tocan; las cifras que
 *                        se bajan las escribe el alumno en el trabajo)
 *   largoDiv + 1       : hueco
 *   largoDiv + 2       : ":"
 *   largoDiv + 3       : hueco
 *   largoDiv + 4 ..    : divisor (datos) y, en la fila 2, el cociente:
 *                        la cifra k del cociente empieza justo debajo del
 *                        divisor (columna divisorStart) y sigue hacia la
 *                        derecha; la rejilla se ensancha si hace falta.
 *
 * Filas:
 *   1                   : cabecera (dividendo : divisor)
 *   2 + k               : resto del paso k (en azul); la fila 2 es
 *                         también el primer renglón de trabajo y, a la
 *                         derecha, va el cociente completo
 *   1 + k (k ≥ 1)       : la cifra seleccionada del paso k, que se
 *                         añade a la fila del resto del paso k−1
 *                         (nace así el parcial siguiente)
 */
export function buildDivision(dividend, divisor) {
  const dStr = String(dividend);
  const divisorStr = String(divisor);
  const divisorLen = divisorStr.length;

  const ds = 1; // primera columna del dividendo (la 0 queda como margen)
  const colonCol = ds + dStr.length + 1;
  const divisorStart = colonCol + 2;

  // Cociente entero: el resto (si lo hay) se ve en el último resto.
  const quotient = Math.floor(dividend / divisor);
  const quotientStr = String(quotient);

  const steps = [];
  let idx = 0; // índice del último dígito del dividendo consumido
  let partial = Number(dStr[0]);
  while (partial < divisor && idx + 1 < dStr.length) {
    idx += 1;
    partial = partial * 10 + Number(dStr[idx]);
  }

  let guard = 0;
  let startIdx = 0; // primera cifra del dividendo que se baja en este paso
  while (guard++ < 30) {
    const k = steps.length;
    const qDigit = Math.floor(partial / divisor);
    const product = qDigit * divisor;
    const rem = partial - product;
    const endCol = ds + idx;
    const hasNext = idx + 1 < dStr.length;

    // Cifras que se seleccionan en ESTE paso tocándolas en el dividendo.
    // En el paso 0 pueden ser varias (hasta que el número llega al
    // divisor) y no se copian abajo: solo se marcan en azul en la
    // cabecera; en los demás, una sola, y esa sí se añade al renglón
    // del resto (en azul).
    const bringDownCells = [];
    for (let i = startIdx; i <= idx; i++) {
      bringDownCells.push({
        id: `bd-${k}-${ds + i}`,
        col: ds + i,
        value: Number(dStr[i]),
        step: k,
      });
    }

    steps.push({
      step: k,
      partial,
      qDigit,
      product,
      rem,
      endCol,
      endIdx: idx,
      remainderCells: cellsForValue(rem, endCol, "r", k),
      bringDownCells,
      quotientCell: {
        id: `q-${k}`,
        // El cociente empieza justo debajo del divisor y sigue hacia
        // la derecha (una cifra por paso).
        col: divisorStart + k,
        value: Number(quotientStr[k]),
        step: k,
      },
    });

    if (!hasNext) break;
    startIdx = idx + 1;
    idx = startIdx;
    partial = rem * 10 + Number(dStr[idx]);
  }

  // La rejilla llega hasta donde acaben el divisor y el cociente (este
  // empieza bajo el divisor y sigue hacia la derecha).
  const cols =
    divisorStart + Math.max(divisorLen, quotientStr.length, steps.length);

  return {
    dividend,
    divisor,
    divisorStr,
    quotient,
    quotientStr,
    divisorLen,
    ds,
    colonCol,
    divisorStart,
    cols,
    steps,
    finalRemainder: steps[steps.length - 1].rem,
    // Fijas (no se teclean): dividendo, ":" y divisor.
    staticDivisorCells: divisorStr.split("").map((ch, k) => ({
      col: divisorStart + k,
      value: Number(ch),
    })),
    dividendCells: dStr.split("").map((ch, k) => ({
      col: ds + k,
      value: Number(ch),
    })),
    quotientCells: steps.map((s) => s.quotientCell),
  };
}

/* ------------------------------------------------------------------ */
/* Utilidades varias                                                   */
/* ------------------------------------------------------------------ */

export const OP_SYMBOL = {
  add: "+",
  sub: "−",
  mul: "×",
  div: "÷",
};

export const OP_NAME = {
  add: "suma",
  sub: "resta",
  mul: "multiplicación",
  div: "división",
};

export function computeOp(op, a, b) {
  switch (op) {
    case "add":
      return a + b;
    case "sub":
      return a - b;
    case "mul":
      return a * b;
    case "div":
      return b === 0 ? NaN : a / b;
    default:
      return NaN;
  }
}

/** Normaliza una respuesta escrita por el alumno: "" si está vacía. */
export function normalizeAnswer(value) {
  const raw = String(value ?? "").trim();
  if (raw === "") return "";
  const asNumber = Number(raw);
  if (Number.isNaN(asNumber)) return raw;
  return String(asNumber);
}
