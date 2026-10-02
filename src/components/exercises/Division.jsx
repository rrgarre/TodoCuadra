import { Fragment, useEffect, useMemo, useState } from "react";
import ExerciseCard from "../common/ExerciseCard.jsx";
import DigitGrid from "../common/DigitGrid.jsx";
import DigitCell from "../common/DigitCell.jsx";
import { buildDivision, placeName } from "../../utils/calculations.js";

/**
 * División larga al estilo del algoritmo de Primaria, con el dividendo a
 * la izquierda y el divisor a la derecha:
 *
 *      2 8 4 : 3        ← cabecera: las cifras del dividendo se tocan
 *                          para SELECCIONARLAS (quedan en azul)
 *      2 7      9 4     ← primer renglón de trabajo: el producto del
 *                          primer paso y, desde el divisor hacia la
 *                          derecha, el cociente
 *      −
 *        1 4            ← resto (en azul); en el paso siguiente esa
 *      1 2                  misma fila recibe la cifra seleccionada
 *      −
 *          2            ← resto final (en azul)
 *
 * Reglas del flujo:
 *  - las cifras del dividendo NO se copian "hacia abajo": se tocan para
 *    seleccionarlas y quedan marcadas en azul en la propia cabecera; la
 *    PRIMERA selección (el primer trozo del dividendo) solo cambia de
 *    color, sin copia ninguna debajo;
 *  - en los pasos siguientes, la cifra seleccionada se añade en azul al
 *    renglón del resto, que es donde nace el parcial siguiente; si el
 *    número todavía no llega al divisor, la app pide tocar otra cifra;
 *  - el mismo azul recorre toda la cadena del resto, del resto parcial
 *    al resto final;
 *  - cada casilla se genera cuando le toca (no se pintan casillas
 *    vacías de pasos futuros);
 *  - cada paso (seleccionar cifras → cifra del cociente → producto →
 *    resto) se comprueba de una en una.
 */
export default function Division({ exercise, controller }) {
  const { values, setCell, revealed, status, feedback, step, stepsDone } =
    controller;

  const model = useMemo(
    () => buildDivision(exercise.a, exercise.b),
    [exercise]
  );

  const locked = revealed || status === "correct";
  const isStepDone = stepsDone.includes(step);
  const errorIds = feedback?.type === "error" ? (feedback.cellIds ?? []) : [];
  const cells = values.cells ?? {};

  // Aviso de los toques en el dividendo; se limpia al escribir o al
  // cambiar de paso.
  const [pickError, setPickError] = useState(null);
  useEffect(() => {
    setPickError(null);
  }, [step]);

  const handleType = (cellId, value) => {
    setPickError(null);
    setCell(cellId, value);
  };

  // Cada columna del dividendo tiene su casilla de selección (bd-k-c):
  // su valor marca la cifra como seleccionada (azul) en la cabecera.
  const bdIdByCol = useMemo(() => {
    const map = new Map();
    for (const st of model.steps) {
      for (const c of st.bringDownCells) map.set(c.col, c.id);
    }
    return map;
  }, [model]);

  const selectedCols = useMemo(() => {
    const set = new Set();
    for (const st of model.steps) {
      for (const c of st.bringDownCells) if (cells[c.id]) set.add(c.col);
    }
    return set;
  }, [model, cells]);

  // Orden de escritura de cada paso: cifra del cociente, producto (de
  // derecha a izquierda) y resto (de derecha a izquierda). Las cifras
  // del dividendo no se teclean: se tocan para seleccionarlas.
  const orderById = useMemo(() => {
    const map = new Map();
    for (const st of model.steps) {
      const sequence = [
        st.quotientCell,
        ...[...st.productCells].reverse(),
        ...[...st.remainderCells].reverse(),
      ];
      sequence.forEach((cell, i) => map.set(cell.id, i));
    }
    return map;
  }, [model]);

  function cellMode(cellStep) {
    if (revealed) return "solution";
    if (cellStep < step) return "locked";
    if (cellStep > step) return "future";
    return isStepDone || locked ? "locked" : "input";
  }

  const stepModel = model.steps[step];
  const broughtCount = stepModel
    ? stepModel.bringDownCells.filter((c) => cells[c.id]).length
    : 0;
  const nextBring =
    stepModel && broughtCount < stepModel.bringDownCells.length
      ? stepModel.bringDownCells[broughtCount]
      : null;

  /** Tocar una cifra del dividendo la selecciona (la marca en azul). */
  function handlePick(col) {
    if (locked || isStepDone || !nextBring) return;
    if (selectedCols.has(col)) return; // ya seleccionada
    if (col !== nextBring.col) {
      setPickError(
        `La siguiente es la cifra ${nextBring.value}: tócala en el dividendo.`
      );
      return;
    }
    setPickError(null);
    setCell(nextBring.id, String(nextBring.value));
  }

  function renderCell(cell, row, label, tone) {
    const mode = cellMode(cell.step);
    // Sin casillas de pasos futuros: se generan cuando les toca.
    if (mode === "future") return null;
    return (
      <DigitCell
        key={cell.id}
        cell={{ ...cell, order: orderById.get(cell.id) }}
        row={row}
        mode={mode}
        entered={cells[cell.id]}
        label={label}
        error={errorIds.includes(cell.id)}
        onType={handleType}
        tone={tone}
      />
    );
  }

  /**
   * Cifra seleccionada que se añade al renglón del resto (pasos ≥ 1):
   * aparece con un toque en el dividendo (no se teclea). En el paso
   * actual solo se pinta el hueco de la próxima cifra.
   */
  function renderBringCell(cell, row, idx, st, stBrought) {
    const filled = cells[cell.id];
    const isCurrent = st.step === step && !locked && !isStepDone;
    if (isCurrent && !filled && idx > stBrought) return null;
    const shown = filled || (isCurrent ? "" : String(cell.value));
    const isError = errorIds.includes(cell.id);
    return (
      <span
        key={cell.id}
        className={`vcell ${shown ? "vcell--chain" : "vcell--box"} vcell--bring${
          isError ? " vcell--error" : ""
        }`}
        style={{ gridColumn: cell.col + 1, gridRow: row }}
        data-cell-id={cell.id}
        tabIndex={-1}
        title="Cifra del dividendo seleccionada"
        aria-label={
          shown
            ? `Cifra ${shown} del dividendo seleccionada`
            : "Celda de la cifra del dividendo pendiente de selección"
        }
      >
        {shown || "\u00a0"}
      </span>
    );
  }

  // Aviso bajo la rejilla: guía el flujo del paso actual.
  const hint =
    locked || isStepDone || !stepModel
      ? null
      : pickError ??
        (nextBring
          ? broughtCount === 0
            ? `Toca en el dividendo la cifra ${nextBring.value} para seleccionarla.`
            : `${stepModel.bringDownCells
                .slice(0, broughtCount)
                .map((c) => c.value)
                .join("")} todavía no llega a ${exercise.b}: toca la cifra ${nextBring.value}.`
          : cells[stepModel.quotientCell.id]
          ? null
          : "Ahora escribe la cifra del cociente.");

  const solution = (
    <>
      <ul className="solution-steps">
        {model.steps.map((st) => (
          <li key={st.step}>
            {`Seleccionas ${st.bringDownCells
              .map((c) => c.value)
              .join(" y ")} → ${st.partial}; `}
            {st.qDigit} × {exercise.b} = {st.product}; {st.partial} −{" "}
            {st.product} = {st.rem}.
          </li>
        ))}
      </ul>
      <p className="solution-final">
        Cociente: {model.quotient}
        {model.finalRemainder > 0 ? `, resto ${model.finalRemainder}` : ""}.
        Comprueba: {exercise.b} × {model.quotient}
        {model.finalRemainder > 0 ? ` + ${model.finalRemainder}` : ""} ={" "}
        {exercise.a}.
      </p>
    </>
  );

  return (
    <ExerciseCard exercise={exercise} controller={controller} solution={solution}>
      <DigitGrid cols={model.cols} onFillDigits={setCell}>
        {/* Cabecera: dividendo : divisor (datos). Tocar una cifra del
            dividendo la selecciona y la marca en azul; la primera
            selección no se copia al trabajo. */}
        {model.dividendCells.map((cell) => {
          const isSelected =
            revealed || Boolean(cells[bdIdByCol.get(cell.col)]);
          return (
            <button
              key={`dd-${cell.col}`}
              type="button"
              className={`vcell vcell--given vcell--pick${
                isSelected ? " vcell--selected" : ""
              }`}
              style={{ gridColumn: cell.col + 1, gridRow: 1 }}
              onClick={() => handlePick(cell.col)}
              disabled={locked || isStepDone}
              aria-label={
                isSelected
                  ? `Cifra ${cell.value} del dividendo seleccionada`
                  : `Tocar la cifra ${cell.value} del dividendo`
              }
            >
              {cell.value}
            </button>
          );
        })}
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

        {/* Pasos: el cociente va en la fila 2, desde el divisor hacia la
            derecha; el trabajo empieza en esa misma fila con el producto
            del paso 0 y sigue hacia abajo (3 filas por paso). */}
        {model.steps.map((st) => {
          // Nada de casillas (ni signos) de pasos futuros.
          if (!revealed && st.step > step) return null;
          const bdRow = 1 + st.step * 3; // = fila del resto del paso anterior
          const prodRow = 2 + st.step * 3;
          const minusRow = 3 + st.step * 3;
          const remRow = 4 + st.step * 3;
          const stBrought = st.bringDownCells.filter(
            (c) => cells[c.id]
          ).length;
          return (
            <Fragment key={st.step}>
              {/* Cifras seleccionadas de este paso (en azul): el paso 0 no
                  pinta nada, su selección vive en la cabecera. */}
              {st.step > 0 &&
                st.bringDownCells.map((cell, idx) =>
                  renderBringCell(cell, bdRow, idx, st, stBrought)
                )}
              {renderCell(
                st.quotientCell,
                2,
                `Cifra ${st.step + 1} del cociente`
              )}
              {st.productCells.map((cell) =>
                renderCell(
                  cell,
                  prodRow,
                  `Cifra de las ${placeName(
                    st.endCol - cell.col
                  )} del producto parcial`
                )
              )}
              <span
                className="vcell vcell--sign"
                style={{ gridColumn: st.minusCol + 1, gridRow: minusRow }}
                aria-hidden="true"
              >
                −
              </span>
              {st.remainderCells.map((cell) =>
                renderCell(
                  cell,
                  remRow,
                  `Cifra de las ${placeName(
                    st.endCol - cell.col
                  )} de la resta`,
                  "chain"
                )
              )}
            </Fragment>
          );
        })}
      </DigitGrid>
      {hint && (
        <p className="grid-hint" role="status">
          {hint}
        </p>
      )}
    </ExerciseCard>
  );
}
