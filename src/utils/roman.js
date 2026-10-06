/**
 * Números romanos: conversión en ambos sentidos, dificultades y sorteos
 * del juego. Todo es puro —la aleatoriedad entra por parámetro— para que
 * las pruebas puedan repetir cualquier tirada.
 *
 * Reglas canónicas (las que se enseñan en clase): símbolos de mayor a
 * menor, repetidos como mucho tres veces, y resta solo con IV, IX, XL,
 * XC, CD y CM.
 */

/** De mayor a menor; las parejas de resta dan la forma canónica. */
const SIMBOLOS = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

const PAREJAS = [
  ["CM", 900],
  ["CD", 400],
  ["XC", 90],
  ["XL", 40],
  ["IX", 9],
  ["IV", 4],
];

const SINGLES = { M: 1000, D: 500, C: 100, L: 50, X: 10, V: 5, I: 1 };

/** Mayúsculas y sin espacios: «x i v» cuenta como «XIV». */
function normalizarRomano(texto) {
  return String(texto ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

/**
 * Desglose de un número en símbolos romanos, fusionando las repeticiones
 * (14 → ["X", "IV"]; 58 → ["L", "V", "III"]).
 */
export function descomposicionRomana(numero) {
  if (!Number.isInteger(numero) || numero < 1 || numero > 3999) return [];
  let rest = numero;
  const partes = [];
  for (const [valor, letra] of SIMBOLOS) {
    while (rest >= valor) {
      partes.push(letra);
      rest -= valor;
    }
  }
  // Junta solo repeticiones seguidas del mismo símbolo (["I","I","I"] →
  // ["III"]); las parejas de resta («IV», «CM»…) nunca se pegan.
  const grupos = [];
  let previo = null;
  for (const parte of partes) {
    if (previo !== null && parte === previo && parte.length === 1) {
      grupos[grupos.length - 1] += parte;
    } else {
      grupos.push(parte);
    }
    previo = parte;
  }
  return grupos;
}

/** 14 → "XIV". Fuera del rango 1–3999 no hay escritura romana. */
export function toRoman(numero) {
  return descomposicionRomana(numero).join("");
}

/**
 * "XIV" → 14. Acepta mayúsculas y espacios, pero devuelve `null` si no es
 * un número romano canónico ("IIII", "IC" o letras ajenas no valen).
 */
export function fromRoman(texto) {
  const norm = normalizarRomano(texto);
  if (!norm || !/^[IVXLCDM]+$/.test(norm)) return null;
  let total = 0;
  for (let i = 0; i < norm.length; ) {
    const par = PAREJAS.find(([simbolo]) => simbolo === norm.slice(i, i + 2));
    if (par) {
      total += par[1];
      i += 2;
      continue;
    }
    total += SINGLES[norm[i]];
    i += 1;
  }
  // Debe reescribirse igual: si al volver a números no coincide, la
  // entrada no era la forma canónica («IIII» u «OX»).
  if (toRoman(total) !== norm) return null;
  return total;
}

/* ------------------------------------------------------------------ */
/* Dificultades y sorteos                                              */
/* ------------------------------------------------------------------ */

export const DIFICULTADES = [
  { id: "facil", etiqueta: "Fácil", rango: "del 1 al 20" },
  { id: "medio", etiqueta: "Medio", rango: "del 20 al 88" },
  {
    id: "dificil",
    etiqueta: "Difícil",
    rango: "del 85 al 3500 (la mitad por debajo del 500)",
  },
];

/** Entero entre min y max incluidos, usando el «dado» recibido. */
function dado(rnd, min, max) {
  return min + Math.floor(rnd() * (max - min + 1));
}

/**
 * Sortea un número según la dificultad. En «difícil» el 50 % cae por
 * debajo del 500 (85–499) y el otro 50 % reparte el resto hasta 3500.
 */
export function sortearNumero(dificultad, rnd = Math.random) {
  switch (dificultad) {
    case "medio":
      return dado(rnd, 20, 88);
    case "dificil":
      return rnd() < 0.5 ? dado(rnd, 85, 499) : dado(rnd, 500, 3500);
    default:
      return dado(rnd, 1, 20);
  }
}

/**
 * Pregunta completa: la mitad de las veces se plantea el número en
 * romanos (y se responde con cifras) y la mitad en cifras (y se responde
 * en romanos). El teclado se adapta a lo que hay que escribir.
 */
export function construirPregunta(numero, planteadoEnRomano) {
  const romano = toRoman(numero);
  if (planteadoEnRomano) {
    return {
      numero,
      romano,
      planteadoEnRomano: true,
      instruccion: "¿Qué número es?",
      valor: romano,
      respuesta: String(numero),
      teclado: "digitos",
      detalle: `${leerRomano(romano)} = ${numero}`,
    };
  }
  return {
    numero,
    romano,
    planteadoEnRomano: false,
    instruccion: "Escribe este número en números romanos",
    valor: String(numero),
    respuesta: romano,
    teclado: "letras",
    detalle: `${descomposicionRomana(numero).join(" + ")} = ${numero}`,
  };
}

/** «XIV» → "10 + 4" (lo que se lee, símbolo a símbolo). */
function leerRomano(romano) {
  const valores = [];
  for (let i = 0; i < romano.length; ) {
    const par = PAREJAS.find(([simbolo]) => simbolo === romano.slice(i, i + 2));
    if (par) {
      valores.push(par[1]);
      i += 2;
      continue;
    }
    valores.push(SINGLES[romano[i]]);
    i += 1;
  }
  return valores.join(" + ");
}

/** Sortea la pregunta del turno: número, dificultad y sentido al 50 %. */
export function sortearPregunta(dificultad, rnd = Math.random) {
  const numero = sortearNumero(dificultad, rnd);
  const planteadoEnRomano = rnd() < 0.5;
  return construirPregunta(numero, planteadoEnRomano);
}

/**
 * ¿Es correcta la respuesta escrita? En números se aceptan ceros a la
 * izquierda («014»); en romanos, cualquier mayúscula o espacios, pero
 * solo la forma canónica.
 */
export function respuestaCorrecta(entrada, pregunta) {
  const txt = String(entrada ?? "").trim();
  if (!txt || !pregunta) return false;
  if (pregunta.planteadoEnRomano) {
    if (!/^\d+$/.test(txt)) return false;
    return Number(txt) === pregunta.numero;
  }
  return fromRoman(txt) === pregunta.numero;
}
