import { Fragment } from "react";
import DigitGrid from "../common/DigitGrid.jsx";
import {
  buildAddition,
  buildSubtraction,
  buildMultiplication,
  buildDivision,
  placeName,
  OP_SYMBOL,
} from "../../utils/calculations.js";

/**
 * La operación de un problema, puesta en vertical al pulsar «=»: los
 * dos renglones de datos y las casillas del trabajo, igual que en el
 * apartado de operaciones, pero resueltas con la botonera (spans, sin
 * <input>: en el móvil no se abre el teclado del sistema).
 *
 * El alumno escribe casilla por casilla siguiendo el orden de papel
 * (de derecha a izquierda en sumas, restas y multiplicaciones; el
 * algoritmo entero en divisiones) y `activeId` marca cuál va ahora.
 */
export default function VerticalStep({
  a,
  op,
  b,
  cells,
  activeId,
  errorIds,
  locked,
  revealed,
}) {
  const mode = revealed ? "solution" : locked ? "locked" : "input";

  // Casilla de trabajo (la que escribe el alumno) en su modo actual.
  function workCell(cell, row, label, chain) {
    const style = { gridColumn: cell.col + 1, gridRow: row };
    if (mode === "solution") {
      return (
        <span
          key={cell.id}
          className={`vcell ${chain ? "vcell--chain" : "vcell--box"}`}
          style={style}
          title={label}
        >
          {String(cell.value)}
        </span>
      );
    }
    const entered = String(cells[cell.id] ?? "");
    if (mode === "locked") {
      return (
        <span
          key={cell.id}
          className={`vcell ${chain ? "vcell--chain" : "vcell--done"}`}
          style={style}
          title={label}
        >
          {entered || String(cell.value)}
        </span>
      );
    }
    const active = activeId === cell.id;
    const error = errorIds.includes(cell.id);
    return (
      <span
        key={cell.id}
        className={`kcell${chain ? " is-chain" : ""}${error ? " is-error" : ""}${
          active ? " is-active" : ""
        }`}
        style={style}
        data-cell-id={cell.id}
        tabIndex={-1}
        aria-label={label}
        aria-invalid={error ? "true" : undefined}
        title={active ? "La casilla que va ahora" : undefined}
      >
        {entered || (active ? <span className="wf-caret" aria-hidden="true" /> : "\u00a0")}
      </span>
    );
  }

  /* ---- Sumas y restas: dos renglones y la fila del resultado ---- */
  if (op === "add" || op === "sub") {
    const model = op === "add" ? buildAddition(a, b) : buildSubtraction(a, b);
    const cols = model.width + 1; // columna extra a la izquierda para el signo
    const signCol = cols - String(b).length - 1;

    const digits = (value, row) => {
      const str = String(value);
      return str.split("").map((ch, k) => (
        <span
          key={k}
          className="vcell"
          style={{ gridColumn: cols - str.length + k + 1, gridRow: row }}
        >
          {ch}
        </span>
      ));
    };

    return (
      <DigitGrid cols={cols}>
        {revealed &&
          model.columns.map((col, idx) =>
            op === "add" ? (
              col.carryOut > 0 ? (
                <span
                  key={`c${idx}`}
                  className="vcell vcell--carry"
                  style={{ gridColumn: idx + 1, gridRow: 1 }}
                  title="Llevada"
                >
                  {col.carryOut}
                </span>
              ) : null
            ) : col.borrowOut > 0 ? (
              <span
                key={`b${idx}`}
                className="vcell vcell--carry"
                style={{ gridColumn: idx + 2, gridRow: 1 }}
                title="Préstamo: se le resta 1 a esta cifra"
              >
                1
              </span>
            ) : null
          )}

        {digits(a, 2)}
        <span
          className="vcell vcell--sign"
          style={{ gridColumn: signCol + 1, gridRow: 3 }}
          aria-hidden="true"
        >
          {OP_SYMBOL[op]}
        </span>
        {digits(b, 3)}
        <div
          className="vline"
          style={{ gridColumn: "1 / -1", gridRow: 4 }}
          aria-hidden="true"
        />
        {model.resultCells.map((cell) =>
          workCell(cell, 5, `Cifra de las ${placeName(cell.pos)} del resultado`)
        )}
      </DigitGrid>
    );
  }

  /* ---- Multiplicaciones: parciales y total ---- */
  if (op === "mul") {
    const model = buildMultiplication(a, b);
    const { rows } = model;
    const hasTotal = model.steps.some((st) => st.kind === "total");

    return (
      <DigitGrid cols={model.cols}>
        {model.aCells.map((cell) => (
          <span
            key={cell.id}
            className="vcell"
            style={{
              gridColumn: model.colFor(cell.pos) + 1,
              gridRow: rows.multiplicand,
            }}
          >
            {cell.value}
          </span>
        ))}
        <span
          className="vcell vcell--sign"
          style={{ gridColumn: model.signCol + 1, gridRow: rows.multiplier }}
          aria-hidden="true"
        >
          {OP_SYMBOL.mul}
        </span>
        {model.bCells.map((cell) => (
          <span
            key={cell.id}
            className="vcell"
            style={{
              gridColumn: model.colFor(cell.pos) + 1,
              gridRow: rows.multiplier,
            }}
          >
            {cell.value}
          </span>
        ))}
        <div
          className="vline"
          style={{ gridColumn: "1 / -1", gridRow: rows.line1 }}
          aria-hidden="true"
        />

        {model.steps.map((st) => {
          if (st.kind === "total") {
            return (
              <Fragment key="total">
                {st.cells.map((cell) =>
                  workCell(
                    cell,
                    rows.total,
                    `Cifra de las ${placeName(cell.pos)} del resultado final`
                  )
                )}
              </Fragment>
            );
          }
          return (
            <Fragment key={`step-${st.step}`}>
              {st.partialCells.map((cell) =>
                workCell(
                  cell,
                  rows.partialStart + st.step,
                  model.m === 1
                    ? `Cifra de las ${placeName(cell.pos)} del resultado`
                    : `Cifra de las ${placeName(
                        cell.pos - cell.step
                      )} del resultado parcial`
                )
              )}
            </Fragment>
          );
        })}

        {hasTotal && (
          <div
            className="vline"
            style={{ gridColumn: "1 / -1", gridRow: rows.line2 }}
            aria-hidden="true"
          />
        )}
      </DigitGrid>
    );
  }

  /* ---- Divisiones: el algoritmo entero (cabecera + trabajo) ---- */
  const model = buildDivision(a, b);
  return (
    <DigitGrid cols={model.cols}>
      {model.dividendCells.map((cell) => (
        <span
          key={`dd-${cell.col}`}
          className="vcell vcell--given"
          style={{ gridColumn: cell.col + 1, gridRow: 1 }}
        >
          {cell.value}
        </span>
      ))}
      <span
        className="vcell vcell--sign"
        style={{ gridColumn: model.colonCol + 1, gridRow: 1 }}
        aria-hidden="true"
      >
        :
      </span>
      {model.staticDivisorCells.map((cell) => (
        <span
          key={`div-${cell.col}`}
          className="vcell vcell--given"
          style={{ gridColumn: cell.col + 1, gridRow: 1 }}
        >
          {cell.value}
        </span>
      ))}

      {model.steps.map((st) => {
        const bdRow = 1 + st.step; // = fila del resto del paso anterior
        const remRow = 2 + st.step;
        return (
          <Fragment key={st.step}>
            {st.step > 0 &&
              st.bringDownCells.map((cell) =>
                workCell(
                  cell,
                  bdRow,
                  "Cifra que se baja del dividendo",
                  true
                )
              )}
            {workCell(
              st.quotientCell,
              2,
              `Cifra ${st.step + 1} del cociente`
            )}
            {st.remainderCells.map((cell) =>
              workCell(
                cell,
                remRow,
                `Cifra de las ${placeName(st.endCol - cell.col)} de la resta`,
                true
              )
            )}
          </Fragment>
        );
      })}
    </DigitGrid>
  );
}
