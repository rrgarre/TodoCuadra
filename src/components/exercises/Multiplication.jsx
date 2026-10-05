import { Fragment, useMemo } from "react";
import ExerciseCard from "../common/ExerciseCard.jsx";
import DigitGrid from "../common/DigitGrid.jsx";
import DigitCell from "../common/DigitCell.jsx";
import { buildMultiplication, placeName } from "../../utils/calculations.js";

/**
 * Multiplicación vertical hecha "como en papel":
 *
 *  - un resultado parcial por cifra del multiplicador, el segundo
 *    desplazado una posición a la izquierda;
 *  - línea y resultado final.
 *
 * Las llevadas NO se escriben en casillas: se calculan mentalmente (aunque
 * el feedback avisa cuando hay que sumar una).
 *
 * TODA la operación se rellena de una vez —cada fila parcial y, al final,
 * la suma— **sin comprobaciones intermedias**: una sola pulsación de
 * «Comprobar» al final. Las casillas se escriben de derecha a izquierda,
 * fila a fila (de arriba abajo), y el foco arranca en la casilla de la
 * derecha de la primera fila.
 */
export default function Multiplication({ exercise, controller }) {
  const { values, setCell, revealed, status, feedback } = controller;

  const model = useMemo(
    () => buildMultiplication(exercise.a, exercise.b),
    [exercise]
  );

  const locked = revealed || status === "correct";
  const errorIds =
    feedback?.type === "error" ? (feedback.cellIds ?? []) : [];
  const cells = values.cells ?? {};

  // Orden de escritura GLOBAL: de derecha a izquierda dentro de cada
  // fila y de arriba abajo entre filas (como se escribe en papel).
  const orderById = useMemo(() => {
    const map = new Map();
    let order = 0;
    for (const st of model.steps) {
      const sequence =
        st.kind === "total" ? [...st.cells].reverse() : [...st.partialCells].reverse();
      for (const cell of sequence) map.set(cell.id, order++);
    }
    return map;
  }, [model]);

  // Sin pasos: todas las casillas se pueden tocar desde el principio.
  function cellMode() {
    if (revealed) return "solution";
    return locked ? "locked" : "input";
  }

  function renderCell(cell, row, kind) {
    const mode = cellMode();
    const label =
      kind === "total"
        ? `Cifra de las ${placeName(cell.pos)} del resultado final`
        : model.m === 1
        ? `Cifra de las ${placeName(cell.pos)} del resultado`
        : `Cifra de las ${placeName(cell.pos - cell.step)} del resultado parcial`;
    return (
      <DigitCell
        key={cell.id}
        cell={{ ...cell, order: orderById.get(cell.id) }}
        row={row}
        mode={mode}
        entered={cells[cell.id]}
        label={label}
        error={errorIds.includes(cell.id)}
        onType={setCell}
      />
    );
  }

  const { rows } = model;
  const hasTotal = model.steps.some((st) => st.kind === "total");
  const signCol = model.signCol;
  const solution = (
    <>
      <ul className="solution-steps">
        {model.steps.map((st) =>
          st.kind === "partial" ? (
            <li key={`s${st.step}`}>
              {model.steps.length > 1
                ? `${st.step === 0 ? "Primero" : "Después"}: `
                : ""}
              {exercise.a} × {st.digit} ={" "}
              {st.prod}
              {st.step > 0
                ? ` (escribes ${st.prod} desplazado ${st.step} ${st.step === 1 ? "posición" : "posiciones"} a la izquierda)`
                : ""}
              .
            </li>
          ) : (
            <li key="sum">
              Al final sumas los productos parciales cuidando las llevadas.
            </li>
          )
        )}
      </ul>
      <p className="solution-final">Resultado: {model.total}</p>
    </>
  );

  return (
    <ExerciseCard exercise={exercise} controller={controller} solution={solution}>
      <DigitGrid cols={model.cols} onFillDigits={setCell}>
        {/* Multiplicando */}
        {model.aCells.map((cell) => (
          <span
            key={cell.id}
            className="vcell"
            style={{ gridColumn: model.colFor(cell.pos) + 1, gridRow: rows.multiplicand }}
          >
            {cell.value}
          </span>
        ))}

        {/* Signo y multiplicador */}
        <span
          className="vcell vcell--sign"
          style={{ gridColumn: signCol + 1, gridRow: rows.multiplier }}
          aria-hidden="true"
        >
          ×
        </span>
        {model.bCells.map((cell) => (
          <span
            key={cell.id}
            className="vcell"
            style={{ gridColumn: model.colFor(cell.pos) + 1, gridRow: rows.multiplier }}
          >
            {cell.value}
          </span>
        ))}

        <div
          className="vline"
          style={{ gridColumn: "1 / -1", gridRow: rows.line1 }}
          aria-hidden="true"
        />

        {/* Productos parciales y resultado final (sin casillas de llevadas) */}
        {model.steps.map((st) => {
          if (st.kind === "total") {
            return (
              <Fragment key="total">
                {st.cells.map((cell) => renderCell(cell, rows.total, "total"))}
              </Fragment>
            );
          }
          return (
            <Fragment key={`step-${st.step}`}>
              {st.partialCells.map((cell) =>
                renderCell(cell, rows.partialStart + st.step, "partial")
              )}
            </Fragment>
          );
        })}

        {/* Línea inferior: solo si hay fila de total que sumar */}
        {hasTotal && (
          <div
            className="vline"
            style={{ gridColumn: "1 / -1", gridRow: rows.line2 }}
            aria-hidden="true"
          />
        )}
      </DigitGrid>
    </ExerciseCard>
  );
}
