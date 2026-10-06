import ExerciseCard from "../common/ExerciseCard.jsx";
import ProblemKeypad from "./ProblemKeypad.jsx";
import { OP_SYMBOL, OP_NAME } from "../../utils/calculations.js";

/**
 * Problemas matemáticos: el alumno desarrolla el problema desde cero
 * en un panel de líneas, escribiendo con una botonera (no hay campos
 * de texto: en el móvil no se abre el teclado del sistema).
 *
 * Los botones de resultados adjuntan el nombre de cada magnitud a la
 * operación en curso («a op b = r → nombre»); se comprueba **una sola
 * vez, al final**.
 *
 * Si el JSON trae "resultados", bajo el enunciado se lista el nombre de
 * cada resultado parcial (la magnitud de cada paso) y el del final, y
 * esos nombres son también botones de la botonera.
 */
export default function WordProblem({ exercise, controller }) {
  const {
    values,
    revealed,
    status,
    devPress,
    devBackspace,
    devNewline,
    devUndo,
    devMagnitude,
  } = controller;

  const lines = Array.isArray(values.lines) ? values.lines : [];
  const current = typeof values.current === "string" ? values.current : "";
  const locked = revealed || status === "correct";

  const solution = (
    <>
      <ul className="solution-steps">
        {exercise.plan.map((st, i) => (
          <li key={i}>
            Paso {i + 1}: {st.a} {OP_SYMBOL[st.op]} {st.b} = {st.result} (
            {OP_NAME[st.op]})
          </li>
        ))}
      </ul>
      <p className="solution-final">Respuesta: {exercise.answer}</p>
    </>
  );

  return (
    <ExerciseCard exercise={exercise} controller={controller} solution={solution}>
      <p className="problem-text">{exercise.text}</p>
      {exercise.resultados && (
        <ul className="problem-resultados" aria-label="Resultados del problema">
          {exercise.resultados.parciales.map((r, i) => (
            <li key={`parcial-${i}`}>
              <span className="resultado-tag">
                {exercise.resultados.parciales.length > 1
                  ? `Parcial ${i + 1}`
                  : "Parcial"}
              </span>
              <span>{r}</span>
            </li>
          ))}
          <li className="es-final">
            <span className="resultado-tag">Final</span>
            <span>{exercise.resultados.final}</span>
          </li>
        </ul>
      )}

      {/* Desarrollo: una operación por línea, escrito solo con la botonera. */}
      <div className="wf-dev">
        {lines.map((line, i) => (
          <p className="wf-line" key={`line-${i}`}>
            {line}
          </p>
        ))}
        <p
          className={`wf-line is-current${current ? "" : " is-empty"}`}
          aria-live="polite"
        >
          {current ||
            (lines.length === 0
              ? "Escribe la primera operación con la botonera…"
              : "")}
          {!locked && <span className="wf-caret" aria-hidden="true" />}
        </p>
      </div>

      <ProblemKeypad
        magnitudes={exercise.resultados}
        disabled={locked}
        onKey={devPress}
        onBackspace={devBackspace}
        onNewline={devNewline}
        onUndo={devUndo}
        onMagnitude={devMagnitude}
      />
    </ExerciseCard>
  );
}
