import ExerciseCard from "../common/ExerciseCard.jsx";
import ProblemKeypad from "./ProblemKeypad.jsx";
import VerticalStep from "./VerticalStep.jsx";
import { OP_SYMBOL, OP_NAME, problemCells } from "../../utils/calculations.js";
import { parseProblemExpr, lineText } from "../../utils/validation.js";

/**
 * Problemas matemáticos: el alumno desarrolla el problema desde cero
 * en un panel de líneas, escribiendo con una botonera (no hay campos
 * de texto: en el móvil no se abre el teclado del sistema).
 *
 * Al pulsar «=» la operación **se pone en vertical**, como en el
 * apartado de operaciones: dos renglones de datos y una casilla por
 * cifra, que se rellena de derecha a izquierda con la botonera. Al
 * terminar hay que **adjuntar** el resultado parcial o final (la
 * magnitud) y el **Comprobar** de la tarjeta comprueba **ese paso**:
 * si está bien, la línea se confirma en el desarrollo con su texto
 * compacto y se pasa a la siguiente operación.
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
    feedback,
    devPress,
    devBackspace,
    devUndo,
    devMagnitude,
  } = controller;

  const lines = Array.isArray(values.lines) ? values.lines : [];
  const raw = values.current;
  // La línea en curso es { expr, eq, cells, mag }; un texto literal es
  // progreso con el formato anterior y se pinta tal cual.
  const current =
    raw && typeof raw === "object"
      ? {
          expr: typeof raw.expr === "string" ? raw.expr : "",
          eq: Boolean(raw.eq),
          cells:
            raw.cells && typeof raw.cells === "object" ? raw.cells : {},
          mag: typeof raw.mag === "string" ? raw.mag : null,
        }
      : null;
  const legacy = typeof raw === "string" ? raw.trim() : "";
  const locked = revealed || status === "correct";
  const exprText = current ? current.expr : legacy;
  const showPlaceholder = lines.length === 0 && !exprText.trim() && !locked;

  // Operación transformada: su rejilla vertical y las casillas que
  // quedan por rellenar (se escriben en orden, de derecha a izquierda).
  const parsed = current && current.eq ? parseProblemExpr(current.expr) : null;
  const order = parsed
    ? problemCells(parsed.a, parsed.op, parsed.b)
    : [];
  const filled = (id) =>
    Boolean(current) && String(current.cells[id] ?? "").trim() !== "";
  const activeCell = !locked && parsed && !current.mag
    ? order.find((c) => !filled(c.id))
    : null;
  const errorIds =
    feedback?.type === "error" ? (feedback.cellIds ?? []) : [];

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

      {/* Desarrollo: una operación por línea. La confirmada se guarda
          como texto compacto; la en curso se escribe o se resuelve en
          vertical, según la fase. */}
      <div className="wf-dev">
        {lines.map((line, i) => (
          <p className="wf-line" key={`line-${i}`}>
            {lineText(line)}
          </p>
        ))}

        {parsed ? (
          <VerticalStep
            a={parsed.a}
            op={parsed.op}
            b={parsed.b}
            cells={current.cells}
            activeId={activeCell ? activeCell.id : null}
            errorIds={errorIds}
            locked={locked}
            revealed={revealed}
          />
        ) : (
          <p
            className={`wf-line is-current${exprText.trim() ? "" : " is-empty"}`}
            aria-live="polite"
          >
            {exprText.trim() ||
              (showPlaceholder
                ? "Escribe la primera operación con la botonera…"
                : locked
                ? ""
                : "Escribe la siguiente operación con la botonera…")}
            {!locked && <span className="wf-caret" aria-hidden="true" />}
          </p>
        )}

        {current && current.mag && <p className="wf-mag">→ {current.mag}</p>}
      </div>

      <ProblemKeypad
        magnitudes={exercise.resultados}
        current={
          current ?? { expr: legacy, eq: false, cells: {}, mag: null }
        }
        linesCount={lines.length}
        locked={locked}
        onKey={devPress}
        onBackspace={devBackspace}
        onUndo={devUndo}
        onMagnitude={devMagnitude}
      />
    </ExerciseCard>
  );
}
