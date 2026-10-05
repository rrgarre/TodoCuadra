/**
 * Casilla de una sola cifra para las operaciones verticales.
 *
 * Comportamiento de escritura (el orden lo fija cada ejercicio con
 * data-order; normalmente de derecha a izquierda como en papel —y en
 * divisiones, el resto parcial de izquierda a derecha):
 *  - al escribir una cifra, el foco pasa a la siguiente casilla del
 *    orden (data-order + 1);
 *  - Retroceso borra la cifra; si está vacía, vuelve a la anterior;
 *  - Flechas ← → se mueven por la rejilla;
 *  - Pegar varias cifras (ver DigitGrid) rellena casillas seguidas.
 */

function moveByOrder(input, delta) {
  const grid = input.closest("[data-digit-grid]");
  if (!grid) return;
  const order = Number(input.dataset.order);
  if (Number.isNaN(order)) return;
  const next = grid.querySelector(`input[data-order="${order + delta}"]`);
  if (next) {
    next.focus();
    next.select();
  }
}

function moveVisually(input, delta) {
  const grid = input.closest("[data-digit-grid]");
  if (!grid) return;
  const inputs = Array.from(grid.querySelectorAll("input[data-digit]"));
  const index = inputs.indexOf(input);
  const next = inputs[index + delta];
  if (next) {
    next.focus();
    next.select();
  }
}

export default function DigitCell({
  cell,
  row,
  mode, // "input" | "solution" | "locked" | "future"
  entered,
  label,
  error,
  onType,
  tone, // "chain" → azul de la cadena del resto (las demás, normal)
}) {
  const style = { gridColumn: cell.col + 1, gridRow: row };
  // En modo "solution" se muestra siempre la cifra esperada; en "locked"
  // se muestra lo escrito y, si no hubiera nada (progreso guardado de una
  // versión anterior), la cifra correcta, para no dejar casillas en blanco.
  const shown =
    mode === "solution" || !(entered ?? "")
      ? String(cell.value)
      : String(entered);
  const isChain = tone === "chain";

  if (mode === "input") {
    return (
      <input
        className={`digit${isChain ? " digit--chain" : ""}${
          error ? " is-error" : ""
        }`}
        style={style}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={1}
        autoComplete="off"
        spellCheck="false"
        data-digit=""
        data-cell-id={cell.id}
        data-order={cell.order}
        aria-label={label}
        aria-invalid={error ? "true" : undefined}
        value={entered ?? ""}
        onChange={(e) => {
          const digit = e.target.value.replace(/[^0-9]/g, "").slice(0, 1);
          onType(cell.id, digit);
          if (digit) moveByOrder(e.target, 1); // siguiente en el orden
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            moveVisually(e.target, -1);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            moveVisually(e.target, 1);
          } else if (e.key === "Backspace") {
            e.preventDefault();
            if (e.target.value) onType(cell.id, "");
            else moveByOrder(e.target, -1);
          } else if (e.key === "Delete") {
            onType(cell.id, "");
          }
        }}
      />
    );
  }

  if (mode === "future") {
    return <span className="vcell vcell--future" style={style} aria-hidden="true" />;
  }
  if (mode === "locked") {
    return (
      <span
        className={`vcell ${isChain ? "vcell--chain" : "vcell--done"}`}
        style={style}
      >
        {shown || "\u00a0"}
      </span>
    );
  }
  return (
    <span
      className={`vcell vcell--box${isChain ? " vcell--chain" : ""}`}
      style={style}
    >
      {shown || "\u00a0"}
    </span>
  );
}
