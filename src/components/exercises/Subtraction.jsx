import { useMemo } from "react";
import ExerciseCard from "../common/ExerciseCard.jsx";
import DigitGrid from "../common/DigitGrid.jsx";
import DigitCell from "../common/DigitCell.jsx";
import {
  buildSubtraction,
  subtractionStepsText,
  placeName,
} from "../../utils/calculations.js";

/**
 * Resta vertical: el resultado se escribe como en el papel, con una casilla
 * por cifra, alineada bajo cada columna y empezando por las unidades.
 * Al escribir una cifra el foco salta solo a la de la izquierda.
 *
 * Al ver la solución se marcan los préstamos y se explica el procedimiento
 * columna a columna.
 */
export default function Subtraction({ exercise, controller }) {
  const { values, setCell, revealed, status, feedback } = controller;

  const model = useMemo(
    () => buildSubtraction(exercise.a, exercise.b),
    [exercise]
  );
  const lines = useMemo(
    () => subtractionStepsText(exercise.a, exercise.b),
    [exercise]
  );

  const locked = revealed || status === "correct";
  const mode = revealed ? "solution" : locked ? "locked" : "input";
  const errorIds =
    feedback?.type === "error" ? (feedback.cellIds ?? []) : [];
  const cells = values.cells ?? {};

  const cols = model.width + 1; // columna extra a la izquierda para el signo
  const signCol = cols - String(exercise.b).length - 1;

  // Orden de escritura: unidades → izquierda (resultCells ya viene así).
  const orderById = useMemo(() => {
    const map = new Map();
    model.resultCells.forEach((cell, i) => map.set(cell.id, i));
    return map;
  }, [model]);

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

  const solution = (
    <ul className="solution-steps">
      {lines.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );

  return (
    <ExerciseCard exercise={exercise} controller={controller} solution={solution}>
      <DigitGrid cols={cols} onFillDigits={setCell}>
        {revealed &&
          model.columns.map((col, idx) =>
            col.borrowOut > 0 ? (
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

        {digits(exercise.a, 2)}

        <span
          className="vcell vcell--sign"
          style={{ gridColumn: signCol + 1, gridRow: 3 }}
          aria-hidden="true"
        >
          −
        </span>
        {digits(exercise.b, 3)}

        <div
          className="vline"
          style={{ gridColumn: "1 / -1", gridRow: 4 }}
          aria-hidden="true"
        />

        {model.resultCells.map((cell) => (
          <DigitCell
            key={cell.id}
            cell={{ ...cell, order: orderById.get(cell.id) }}
            row={5}
            mode={mode}
            entered={cells[cell.id]}
            label={`Cifra de las ${placeName(cell.pos)} del resultado`}
            error={errorIds.includes(cell.id)}
            onType={setCell}
          />
        ))}
      </DigitGrid>
    </ExerciseCard>
  );
}
