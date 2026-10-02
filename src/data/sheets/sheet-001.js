/**
 * Hoja de ejercicios nº 1.
 *
 * Los datos están separados de los componentes: para añadir una hoja nueva
 * basta con crear sheet-002.js con la misma forma y registrarla en
 * data/sheets/index.js.
 */

const sheet001 = {
  id: "sheet-001",
  title: "Ejercicios de hoy",
  level: "4º Primaria",

  /* ---------------- Sumas ---------------- */
  additions: [
    { id: "sum-1", type: "addition", a: 348, b: 276 },
    { id: "sum-2", type: "addition", a: 467, b: 585 },
    { id: "sum-3", type: "addition", a: 1256, b: 879 },
    { id: "sum-4", type: "addition", a: 2384, b: 1597 },
    { id: "sum-5", type: "addition", a: 756, b: 468 },
  ],

  /* ---------------- Restas ---------------- */
  subtractions: [
    { id: "res-1", type: "subtraction", a: 532, b: 278 },
    { id: "res-2", type: "subtraction", a: 845, b: 267 },
    { id: "res-3", type: "subtraction", a: 1000, b: 368 },
    { id: "res-4", type: "subtraction", a: 3206, b: 1458 },
    { id: "res-5", type: "subtraction", a: 900, b: 476 },
  ],

  /* -------- Multiplicaciones verticales -------- */
  multiplications: [
    { id: "mul-1", type: "multiplication", a: 236, b: 4 },
    { id: "mul-2", type: "multiplication", a: 457, b: 6 },
    { id: "mul-3", type: "multiplication", a: 236, b: 24 },
    { id: "mul-4", type: "multiplication", a: 148, b: 35 },
    { id: "mul-5", type: "multiplication", a: 267, b: 48 },
  ],

  /* ---------------- Divisiones ---------------- */
  divisions: [
    { id: "div-1", type: "division", a: 384, b: 3 },
    { id: "div-2", type: "division", a: 924, b: 6 },
    { id: "div-3", type: "division", a: 1008, b: 7 },
    { id: "div-4", type: "division", a: 918, b: 18 },
  ],

  /* ---------------- Problemas ---------------- */
  wordProblems: [
    {
      id: "prob-1",
      type: "wordProblem",
      mode: "guided",
      text:
        "En la biblioteca del cole hay 125 libros de aventuras y 87 libros de ciencia. Durante la semana se prestan 46 libros. ¿Cuántos libros quedan en la biblioteca?",
      plan: [
        { op: "add", a: 125, b: 87, result: 212 },
        { op: "sub", a: 212, b: 46, result: 166 },
      ],
      answer: 166,
    },
    {
      id: "prob-2",
      type: "wordProblem",
      mode: "guided",
      text:
        "El cole compra 5 cajas de lápices con 24 lápices en cada caja. Después reparte todos los lápices en 6 bandejas, una por curso. ¿Cuántos lápices hay en cada bandeja?",
      plan: [
        { op: "mul", a: 5, b: 24, result: 120 },
        { op: "div", a: 120, b: 6, result: 20 },
      ],
      answer: 20,
    },
    {
      id: "prob-3",
      type: "wordProblem",
      mode: "choose",
      text:
        "Nico tiene 12 cromos. Compra 3 sobres y en cada sobre hay 8 cromos. Después regala 5 cromos a su prima. ¿Cuántos cromos tiene ahora?",
      plan: [
        { op: "mul", a: 3, b: 8, result: 24 },
        { op: "add", a: 12, b: 24, result: 36 },
        { op: "sub", a: 36, b: 5, result: 31 },
      ],
      answer: 31,
    },
    {
      id: "prob-4",
      type: "wordProblem",
      mode: "choose",
      text:
        "En la panadería del barrio sacan 6 bandejas con 12 panes en cada una. Al rato entran 30 panes más y al final del día se venden 45 panes. ¿Cuántos panes quedan?",
      plan: [
        { op: "mul", a: 6, b: 12, result: 72 },
        { op: "add", a: 72, b: 30, result: 102 },
        { op: "sub", a: 102, b: 45, result: 57 },
      ],
      answer: 57,
    },
  ],

  /* ---------------- Cálculo mental ---------------- */
  mentalCalculations: [
    { id: "men-1", type: "mental", expr: "27 + 19", result: 46, tipId: "tip-1", hint: "Pista: en lugar de sumar 19, suma 20 y después resta 1." },
    { id: "men-2", type: "mental", expr: "43 − 9", result: 34, tipId: "tip-2", hint: "Pista: resta 10 y después suma 1." },
    { id: "men-3", type: "mental", expr: "24 × 5", result: 120, tipId: "tip-3", hint: "Pista: multiplica por 10 y después divide entre 2." },
    { id: "men-4", type: "mental", expr: "120 ÷ 5", result: 24, tipId: "tip-3", hint: "Pista: duplica el número (×2) y después divide entre 10." },
    { id: "men-5", type: "mental", expr: "50 − 18", result: 32, hint: "Pista: resta 20 y devuelve 2." },
    { id: "men-6", type: "mental", expr: "72 + 49", result: 121, hint: "Pista: suma 50 y después resta 1." },
    { id: "men-7", type: "mental", expr: "16 × 10", result: 160, tipId: "tip-4", hint: "Pista: desplaza todas las cifras una posición hacia la izquierda." },
    { id: "men-8", type: "mental", expr: "300 − 125", result: 175, hint: "Pista: resta 100, después 20 y por último 5." },
  ],

  /* --------------- Trucos --------------- */
  tips: [
    {
      id: "tip-1",
      type: "tip",
      title: "Sumar 19 (o 29, 39…)",
      tease: "¿Sabes sumar 27 + 19 sin apenas pensar?",
      short: "Cuando sumes 19, suma 20 y después resta 1.",
      example: { expr: "27 + 19", steps: ["27 + 20 = 47", "47 − 1 = 46"] },
      explanation:
        "Sumar 20 es muy fácil porque solo añades una decena. Como te has pasado 1, después lo restas. El mismo truco sirve para 29 (suma 30 y resta 1) y para 39 (suma 40 y resta 1).",
    },
    {
      id: "tip-2",
      type: "tip",
      title: "Restar 9 (o 8, 7…)",
      tease: "43 − 9 se puede resolver en un instante.",
      short: "Cuando restes 9, resta 10 y después suma 1.",
      example: { expr: "43 − 9", steps: ["43 − 10 = 33", "33 + 1 = 34"] },
      explanation:
        "Restar 10 es más fácil que restar 9. Como te has pasado 1, lo vuelves a sumar. Para restar 8, resta 10 y suma 2. Para restar 7, resta 10 y suma 3.",
    },
    {
      id: "tip-3",
      type: "tip",
      title: "Multiplicar por 5",
      tease: "24 × 5 se puede hacer sin acordarte de la tabla del 5.",
      short: "Multiplicar por 5 es igual que multiplicar por 10 y dividir entre 2.",
      example: { expr: "24 × 5", steps: ["24 × 10 = 240", "240 ÷ 2 = 120"] },
      explanation:
        "Primero multiplicas por 10 (se añade un cero) y luego lo partes en dos. También funciona al revés: primero la mitad y después por 10. Prueba con 60 × 5: 60 × 10 = 600 y 600 ÷ 2 = 300.",
    },
    {
      id: "tip-4",
      type: "tip",
      title: "Multiplicar por 10",
      tease: "Multiplicar por 10 es cuestión de mirar cómo se mueven las cifras.",
      short: "Al multiplicar por 10, cada cifra se mueve un lugar hacia la izquierda.",
      example: { expr: "16 × 10", steps: ["16 × 10 = 160"] },
      explanation:
        "Las unidades pasan a decenas, las decenas a centenas… y por eso parece que se añade un cero al final. Con 125 × 10 obtienes 1250.",
    },
  ],

  /* --------------- Estructura de la hoja ---------------
   * Cada sección agrupa ids de ejercicios (y de trucos). Los "ids" pueden
   * mezclar ejercicios y trucos: así el cálculo mental puede intercalar
   * trucos después de algunos ejercicios. */
  sections: [
    {
      id: "operaciones",
      title: "Operaciones",
      icon: "🧮",
      description: "Sumas, restas, multiplicaciones y divisiones",
      groups: [
        { label: "Sumas", ids: ["sum-1", "sum-2", "sum-3", "sum-4", "sum-5"] },
        { label: "Restas", ids: ["res-1", "res-2", "res-3", "res-4", "res-5"] },
        { label: "Multiplicaciones", ids: ["mul-1", "mul-2", "mul-3", "mul-4", "mul-5"] },
        { label: "Divisiones", ids: ["div-1", "div-2", "div-3", "div-4"] },
      ],
    },
    {
      id: "problemas",
      title: "Problemas matemáticos",
      icon: "📚",
      description: "Problemas de 2 y de 3 pasos",
      groups: [
        { label: "Problemas", ids: ["prob-1", "prob-2", "prob-3", "prob-4"] },
      ],
    },
    {
      id: "mental",
      title: "Cálculo mental",
      icon: "🧠",
      description: "Resuelve rápido y descubre trucos por el camino",
      groups: [
        {
          label: "Ejercicios y trucos",
          ids: [
            "men-1",
            "tip-1",
            "men-2",
            "tip-2",
            "men-3",
            "men-4",
            "tip-3",
            "men-5",
            "men-6",
            "men-7",
            "tip-4",
            "men-8",
          ],
        },
      ],
    },
    {
      id: "tips",
      title: "Trucos de cálculo mental",
      icon: "💡",
      description: "Estrategias para calcular sin esfuerzo",
      groups: [
        { label: "Estrategias", ids: ["tip-1", "tip-2", "tip-3", "tip-4"] },
      ],
    },
  ],
};

export default sheet001;
