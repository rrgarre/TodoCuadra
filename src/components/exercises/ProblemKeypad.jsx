import { OP_SYMBOL } from "../../utils/calculations.js";

/**
 * Botonera de los problemas: dígitos, operaciones y «=», con los
 * controles de línea (Deshacer, Saltar de línea) y los botones de
 * resultados. No hay <input>: cada pulsación escribe directamente en
 * el desarrollo y en el móvil no se abre el teclado del sistema.
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
    { key: "back", glyph: "⌫", label: "borrar el último carácter" },
  ],
];

export default function ProblemKeypad({
  magnitudes,
  disabled,
  onKey,
  onBackspace,
  onNewline,
  onUndo,
  onMagnitude,
}) {
  return (
    <div className="keypad">
      <div className="keypad-grid" role="group" aria-label="Botonera">
        {KEY_ROWS.flat().map((cell) => (
          <button
            key={cell.key}
            type="button"
            className={`key${cell.key === "back" ? " is-back" : ""}`}
            aria-label={cell.label}
            disabled={disabled}
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
          disabled={disabled}
          title="Borra la línea en curso o, si está vacía, la última línea"
          onClick={onUndo}
        >
          Deshacer
        </button>
        <button
          type="button"
          className="key key-ctrl"
          disabled={disabled}
          title="Termina esta línea y empieza otra"
          onClick={onNewline}
        >
          Saltar de línea
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
              className="key key-mag"
              disabled={disabled}
              onClick={() => onMagnitude(r)}
            >
              {r}
            </button>
          ))}
          <button
            type="button"
            className="key key-mag is-final"
            disabled={disabled}
            onClick={() => onMagnitude(magnitudes.final)}
          >
            {magnitudes.final}
          </button>
        </div>
      )}
    </div>
  );
}
