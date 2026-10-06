import { OP_SYMBOL, problemCells } from "../../utils/calculations.js";
import { parseProblemExpr } from "../../utils/validation.js";

/**
 * Botonera de los problemas: dígitos, operaciones y «=», con el control
 * de Deshacer y los botones de resultados. No hay <input>: cada
 * pulsación escribe directamente en el desarrollo y en el móvil no se
 * abre el teclado del sistema.
 *
 * Los botones se habilitan según la fase de la línea en curso: hasta
 * «=» se escriben operandos; al pulsar «=» la operación se pone en
 * vertical y las teclas rellenan sus casillas (de derecha a izquierda);
 * y **solo con todas las casillas llenas se puede adjuntar** el
 * resultado. La línea se confirma con «Comprobar» de la tarjeta.
 */

const KEY_ROWS = [
  [
    { key: "7" },
    { key: "8" },
    { key: "9" },
    { key: OP_SYMBOL.div, label: "división" },
  ],
  [
    { key: "4" },
    { key: "5" },
    { key: "6" },
    { key: OP_SYMBOL.mul, label: "multiplicación" },
  ],
  [
    { key: "1" },
    { key: "2" },
    { key: "3" },
    { key: OP_SYMBOL.sub, label: "resta" },
  ],
  [
    { key: "0" },
    { key: "=", label: "igual" },
    { key: OP_SYMBOL.add, label: "suma" },
    { key: "back", glyph: "⌫", label: "borrar el último paso" },
  ],
];

export default function ProblemKeypad({
  magnitudes,
  current,
  linesCount,
  locked,
  onKey,
  onBackspace,
  onUndo,
  onMagnitude,
}) {
  const expr = (current.expr ?? "").trim();
  const sealed = Boolean(current.mag);
  const cells = current.cells ?? {};

  // Operación que se puede poner en vertical y sus casillas.
  const parsed = parseProblemExpr(expr);
  const order = parsed
    ? problemCells(parsed.a, parsed.op, parsed.b)
    : [];
  const allFilled =
    current.eq && order.every((c) => String(cells[c.id] ?? "").trim() !== "");
  const hasAny =
    Boolean(expr) || Boolean(current.eq) || Object.keys(cells).length > 0 || sealed;

  // Fases: operandos → «=» → casillas (de derecha a izquierda) →
  // magnitud (sella la línea y la comprueba «Comprobar»).
  const canEq = !locked && !current.eq && !sealed && Boolean(parsed);
  const canDigits = !locked && !sealed && (!current.eq || !allFilled);
  const canOp = !locked && !sealed && !current.eq;
  const canBack = !locked && hasAny;
  const canMag = !locked && current.eq && allFilled && !sealed && Boolean(magnitudes);
  const canUndo = !locked && (hasAny || linesCount > 0);

  const keyDisabled = (cell) => {
    if (cell.key === "back") return !canBack;
    if (cell.key === "=") return !canEq;
    if (/[0-9]/.test(cell.key)) return !canDigits;
    return !canOp;
  };

  const eqTitle = current.eq
    ? "La operación ya está en vertical"
    : !expr
    ? "Escribe primero la operación con la botonera"
    : !parsed
    ? "La operación debe ser número, operación y número (por ejemplo 125+87)"
    : "Pon la operación en vertical para resolverla";

  const magTitle = !current.eq || !allFilled
    ? "Primero resuelve la operación en todas sus casillas"
    : sealed
    ? "Esta operación ya tiene su resultado adjunto"
    : "Adjunta a esta operación su resultado";

  return (
    <div className="keypad">
      <div className="keypad-grid" role="group" aria-label="Botonera">
        {KEY_ROWS.flat().map((cell) => (
          <button
            key={cell.key}
            type="button"
            className={`key${cell.key === "back" ? " is-back" : ""}${
              cell.key === "=" && canEq ? " is-ready" : ""
            }`}
            aria-label={cell.label}
            title={
              cell.key === "="
                ? eqTitle
                : cell.key === "back"
                ? "Borra el último paso de la línea (magnitud, casilla, «=» o número)"
                : undefined
            }
            disabled={keyDisabled(cell)}
            onClick={() =>
              cell.key === "back" ? onBackspace() : onKey(cell.key)
            }
          >
            {cell.glyph ?? cell.key}
          </button>
        ))}
      </div>

      <div className="keypad-controls">
        <button
          type="button"
          className="key key-ctrl"
          disabled={!canUndo}
          title="Borra la línea en curso o, si está vacía, la última línea"
          onClick={onUndo}
        >
          Deshacer
        </button>
      </div>

      {magnitudes && (
        <div
          className="keypad-magnitudes"
          role="group"
          aria-label="Resultados del problema"
        >
          <span className="keypad-magnitudes-titulo">
            Adjunta a cada operación su resultado:
          </span>
          {magnitudes.parciales.map((r, i) => (
            <button
              key={`mag-${i}`}
              type="button"
              className={`key key-mag${
                current.mag === r ? " is-pressed" : ""
              }`}
              disabled={!canMag}
              title={magTitle}
              onClick={() => onMagnitude(r)}
            >
              {r}
            </button>
          ))}
          <button
            type="button"
            className={`key key-mag is-final${
              current.mag === magnitudes.final ? " is-pressed" : ""
            }`}
            disabled={!canMag}
            title={magTitle}
            onClick={() => onMagnitude(magnitudes.final)}
          >
            {magnitudes.final}
          </button>
        </div>
      )}
    </div>
  );
}
