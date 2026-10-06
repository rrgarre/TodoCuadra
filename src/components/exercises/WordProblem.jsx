import ExerciseCard from "../common/ExerciseCard.jsx";
import NumberInput from "../common/NumberInput.jsx";
import { OP_SYMBOL, OP_NAME } from "../../utils/calculations.js";

/**
 * Problemas matemáticos.
 *
 * mode "guided"  → se muestran las operaciones y solo se rellenan los
 *                  resultados (problemas de 2 pasos).
 * mode "choose"  → el alumno elige la operación, introduce los números y
 *                  el resultado (problemas de 3 pasos).
 * Si el JSON trae "resultados", bajo el enunciado se lista el nombre de
 * cada resultado parcial (la magnitud de cada paso) y el del final.
 */
export default function WordProblem({ exercise, controller }) {
  const { values, step, stepsDone, revealed, status, setWordStep, setGuidedAnswer } =
    controller;

  const finished = revealed || status === "correct";
  const prevDone = (i) => stepsDone.includes(i) || finished;

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

  function guidedExpression(st, i) {
    const givenA = i === 0 || prevDone(i - 1) ? String(st.a) : "____";
    return (
      <>
        <span className="given">{givenA}</span>
        <span>{OP_SYMBOL[st.op]}</span>
        <span className="given">{st.b}</span>
        <span>=</span>
      </>
    );
  }

  function guidedBody() {
    return (
      <div className="wf-steps">
        {exercise.plan.map((st, i) => {
          const isCurrent = i === step && !finished;
          const isDone = prevDone(i) && (i < step || finished);
          const cls = isDone ? "is-done" : isCurrent ? "is-current" : "is-locked";
          const answerValue =
            isDone && revealed && status !== "correct"
              ? String(st.result)
              : values.answers[i];
          return (
            <div className={`wf-step ${cls}`} key={i}>
              <span className="wf-step-label">
                Paso {i + 1}
                {isDone ? " ✓" : ""}
              </span>
              <div className="wf-expression">
                {guidedExpression(st, i)}
                <NumberInput
                  id={`wf-${exercise.id}-${i}`}
                  label={`Resultado del paso ${i + 1}`}
                  value={answerValue}
                  onValue={(v) => setGuidedAnswer(i, v)}
                  disabled={!isCurrent}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function chooseBody() {
    const current = values.steps[step];
    const ops = ["add", "sub", "mul", "div"];
    return (
      <div className="wf-steps">
        {exercise.plan.map((st, i) => {
          const isDone = prevDone(i);
          if (isDone) {
            return (
              <div className="wf-step is-done" key={i}>
                <span className="wf-step-label">
                  Paso {i + 1} ✓
                </span>
                <div className="wf-expression">
                  <span className="given">{st.a}</span>
                  <span>{OP_SYMBOL[st.op]}</span>
                  <span className="given">{st.b}</span>
                  <span>=</span>
                  <span className="given">{st.result}</span>
                </div>
              </div>
            );
          }
          if (i !== step) {
            return (
              <div className="wf-step is-locked" key={i}>
                <span className="wf-step-label">Paso {i + 1}</span>
                <p>Se activará cuando termines los pasos anteriores.</p>
              </div>
            );
          }

          const prevResult = i > 0 ? exercise.plan[i - 1].result : null;
          const phA = prevResult !== null && st.a === prevResult ? "resultado anterior" : "";
          const phB = prevResult !== null && st.b === prevResult ? "resultado anterior" : "";

          return (
            <div className="wf-step is-current" key={i}>
              <span className="wf-step-label">Paso {i + 1}</span>

              <fieldset className="op-fieldset">
                <legend>¿Qué operación necesitas realizar?</legend>
                <div className="op-choices">
                  {ops.map((op) => (
                    <button
                      key={op}
                      type="button"
                      className={`op-choice${
                        current.op === op ? " is-selected" : ""
                      }`}
                      aria-pressed={current.op === op}
                      onClick={() => setWordStep(i, "op", op)}
                    >
                      <span className="op-symbol" aria-hidden="true">
                        {OP_SYMBOL[op]}
                      </span>
                      {OP_NAME[op]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="wf-calc">
                <span className="wf-field">
                  <NumberInput
                    id={`wf-a-${exercise.id}`}
                    label={`Primer número del paso ${i + 1}`}
                    value={current.nums[0]}
                    placeholder={phA || undefined}
                    onValue={(v) => setWordStep(i, "nums", [v, current.nums[1]])}
                  />
                </span>
                <span className="op-symbol-lg" aria-hidden="true">
                  {current.op ? OP_SYMBOL[current.op] : "?"}
                </span>
                <span className="wf-field">
                  <NumberInput
                    id={`wf-b-${exercise.id}`}
                    label={`Segundo número del paso ${i + 1}`}
                    value={current.nums[1]}
                    placeholder={phB || undefined}
                    onValue={(v) => setWordStep(i, "nums", [current.nums[0], v])}
                  />
                </span>
                <span className="op-symbol-lg" aria-hidden="true">
                  =
                </span>
                <span className="wf-field">
                  <NumberInput
                    id={`wf-r-${exercise.id}`}
                    label={`Resultado del paso ${i + 1}`}
                    value={current.answer}
                    onValue={(v) => setWordStep(i, "answer", v)}
                  />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

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
      {exercise.mode === "choose" ? chooseBody() : guidedBody()}
    </ExerciseCard>
  );
}
