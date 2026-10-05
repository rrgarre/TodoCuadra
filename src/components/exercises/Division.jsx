import { Fragment, useMemo } from "react";
import ExerciseCard from "../common/ExerciseCard.jsx";
import DigitGrid from "../common/DigitGrid.jsx";
import DigitCell from "../common/DigitCell.jsx";
import { buildDivision, placeName } from "../../utils/calculations.js";

/**
 * División larga al estilo del algoritmo de Primaria, con el dividendo a
 * la izquierda y el divisor a la derecha:
 *
 *      2 8 4 : 3        ← cabecera (datos: no se toca nada aquí)
 *        1 4   9 4      ← resto del paso 0 en azul (lo escribe el
 *            2              alumno) y, a la derecha, el cociente
 *
 * Reglas del flujo:
 *  - SIN pasos intermedios: toda la operación (cociente, restos y
 *    cifras bajadas) está visible desde el principio y se comprueba de
 *    una sola vez, al final;
 *  - las cifras del dividendo NO se tocan: las que se bajan se copian
 *    del dividendo al renglón del resto y las escribe el alumno (en
 *    azul); el primer trozo se lee directamente en la cabecera;
 *  - el cursor sigue el algoritmo: al escribir una cifra del cociente
 *    salta al resto parcial, que se escribe de IZQUIERDA a DERECHA (y
 *    al final de esa fila, la cifra que se baja para el paso siguiente);
 *  - el producto (cifra del cociente × divisor) no se escribe: se
 *    calcula de cabeza, y tampoco se pinta el signo −.
 */
export default function Division({ exercise, controller }) {
  const { values, setCell, revealed, status, feedback } = controller;

  const model = useMemo(
    () => buildDivision(exercise.a, exercise.b),
    [exercise]
  );

  const locked = revealed || status === "correct";
  const errorIds = feedback?.type === "error" ? (feedback.cellIds ?? []) : [];
  const cells = values.cells ?? {};

  // Orden de escritura GLOBAL: cifra del cociente → resto del paso (de
  // IZQUIERDA a DERECHA) → cifra que se baja para el paso siguiente; así
  // el cursor salta del cociente al resto parcial y avanza por sus
  // casillas como en el algoritmo. El paso 0 no baja nada: su trozo
  // está en la cabecera.
  const orderById = useMemo(() => {
    const map = new Map();
    let order = 0;
    for (let k = 0; k < model.steps.length; k++) {
      const st = model.steps[k];
      map.set(st.quotientCell.id, order++);
      for (const cell of st.remainderCells) map.set(cell.id, order++);
      const next = model.steps[k + 1];
      if (next) {
        for (const cell of next.bringDownCells) map.set(cell.id, order++);
      }
    }
    return map;
  }, [model]);

  // Sin pasos: todas las casillas se pueden tocar desde el principio.
  function cellMode() {
    if (revealed) return "solution";
    return locked ? "locked" : "input";
  }

  function renderCell(cell, row, label, tone) {
    return (
      <DigitCell
        key={cell.id}
        cell={{ ...cell, order: orderById.get(cell.id) }}
        row={row}
        mode={cellMode()}
        entered={cells[cell.id]}
        label={label}
        error={errorIds.includes(cell.id)}
        onType={setCell}
        tone={tone}
      />
    );
  }

  const solution = (
    <>
      <ul className="solution-steps">
        {model.steps.map((st) => (
          <li key={st.step}>
            {`Tomas ${st.bringDownCells
              .map((c) => c.value)
              .join(" y ")} del dividendo → ${st.partial}; `}
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
        {/* Cabecera: dividendo : divisor (datos). Las cifras del
            dividendo no se tocan: las que se bajan las escribe el
            alumno en el renglón del resto. */}
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

        {/* Todo el trabajo visible desde el principio: el cociente va en
            la fila 2, desde el divisor hacia la derecha; el resto de cada
            paso ocupa una fila (2 + paso) y, al final de esa fila, la
            cifra que se baja para el paso siguiente. */}
        {model.steps.map((st) => {
          const bdRow = 1 + st.step; // = fila del resto del paso anterior
          const remRow = 2 + st.step;
          return (
            <Fragment key={st.step}>
              {/* Cifras que se bajan del dividendo: las escribe el alumno
                  (en azul); el paso 0 no baja nada, su trozo se lee en
                  la cabecera. */}
              {st.step > 0 &&
                st.bringDownCells.map((cell) =>
                  renderCell(
                    cell,
                    bdRow,
                    "Cifra que se baja del dividendo",
                    "chain"
                  )
                )}
              {renderCell(
                st.quotientCell,
                2,
                `Cifra ${st.step + 1} del cociente`
              )}
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
    </ExerciseCard>
  );
}
