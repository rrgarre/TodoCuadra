/**
 * Tarjeta común de ejercicio: cabecera (qué ejercicio es y en qué paso
 * estamos), cuerpo, feedback, solución y botones de acción.
 *
 * El flujo siempre es el mismo:
 *   Comprobar → feedback → (Siguiente paso)* → Continuar
 */
import { useEffect, useRef } from "react";
import Feedback from "./Feedback.jsx";

const TYPE_LABELS = {
  addition: "Suma",
  subtraction: "Resta",
  multiplication: "Multiplicación",
  division: "División",
  wordProblem: "Problema",
  mental: "Cálculo mental",
};

// Ejercicios en los que el foco arranca en la casilla de la derecha.
const FOCUS_FROM_RIGHT = ["addition", "subtraction", "multiplication"];

export default function ExerciseCard({
  exercise,
  controller,
  solution,
  children,
}) {
  const {
    status,
    feedback,
    revealed,
    step,
    stepsCount,
    stepsDone,
    check,
    reveal,
    nextStep,
    next,
  } = controller;

  const isStepDone = stepsDone.includes(step) || status === "correct";
  const moreSteps = step + 1 < stepsCount;
  const phase = revealed
    ? "continue"
    : !isStepDone
    ? "check"
    : moreSteps
    ? "nextStep"
    : "continue";

  const primaryRef = useRef(null);
  const prevPhaseRef = useRef(phase);

  // Si el error señala una casilla concreta, llevamos el foco a ella.
  useEffect(() => {
    if (feedback?.type === "error" && feedback.cellIds?.length) {
      const el = document.querySelector(
        `[data-cell-id="${feedback.cellIds[0]}"]`
      );
      if (el) el.focus();
    }
  }, [feedback]);

  // Tras validar un paso, el foco pasa al botón principal.
  useEffect(() => {
    if (prevPhaseRef.current === "check" && phase !== "check") {
      primaryRef.current?.focus();
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  // El foco arranca siempre en la casilla de la DERECHA de la fila que
  // toca resolver (las unidades: la primera en escribirse). Vale para
  // sumas, restas y multiplicaciones; en las divisiones el foco se
  // gestiona en su propio flujo.
  useEffect(() => {
    if (!FOCUS_FROM_RIGHT.includes(exercise.type)) return;
    const first = document.querySelector(
      '[data-digit-grid] input[data-order="0"]'
    );
    if (first) first.focus();
  }, [exercise.id, step]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (phase === "check") check();
  };

  return (
    <form className="exercise" onSubmit={handleSubmit}>
      <header className="exercise-head">
        <span className="exercise-type">
          {TYPE_LABELS[exercise.type] ?? "Ejercicio"}
        </span>
        {stepsCount > 1 && (
          <span className="exercise-step">
            Paso {step + 1} de {stepsCount}
          </span>
        )}
        {status === "correct" && (
          <span className="badge badge-ok">✓ Resuelto</span>
        )}
        {revealed && status !== "correct" && (
          <span className="badge badge-info">Solución vista</span>
        )}
      </header>

      <div className="exercise-body">{children}</div>

      <Feedback type={feedback?.type} message={feedback?.message} />

      {revealed && (
        <section className="solution">
          <h3>Solución y procedimiento</h3>
          {solution}
        </section>
      )}

      <div className="exercise-actions">
        {phase === "check" && (
          <button ref={primaryRef} type="submit" className="btn btn-primary">
            Comprobar
          </button>
        )}
        {phase === "nextStep" && (
          <button
            ref={primaryRef}
            type="button"
            className="btn btn-primary"
            onClick={nextStep}
          >
            Siguiente paso
          </button>
        )}
        {phase === "continue" && (
          <button
            ref={primaryRef}
            type="button"
            className="btn btn-primary"
            onClick={next}
          >
            Continuar
          </button>
        )}
        {!revealed && status !== "correct" && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={reveal}
          >
            Ver solución
          </button>
        )}
      </div>
    </form>
  );
}
