import ExerciseCard from "../common/ExerciseCard.jsx";
import NumberInput from "../common/NumberInput.jsx";

const OPTIONS = ["mayor", "menor", "igual"];
const OPTION_LABEL = { mayor: "Mayor", menor: "Menor", igual: "Igual" };

/**
 * Retos de Lógica: series numéricas para completar, comparaciones
 * (mayor/menor/igual) y enigmas con respuesta numérica.
 * Un solo paso: se comprueba la respuesta entera.
 */
export default function Logica({ exercise, controller }) {
  const { values, setAnswer, revealed, status, feedback } = controller;

  const locked = revealed || status === "correct";
  const isCompare = exercise.variant === "comparacion";
  const answer =
    revealed && status !== "correct" ? String(exercise.answer) : values.answer;
  const selected = String(values.answer ?? "");

  const solution = (
    <>
      <p className="solution-final">Respuesta: {exercise.answer}</p>
      {exercise.explanation && (
        <p className="solution-note">{exercise.explanation}</p>
      )}
    </>
  );

  const hint = isCompare
    ? "Elige mayor, menor o igual."
    : exercise.variant === "serie"
    ? "Escribe el número que sigue."
    : "Escribe solo el número.";

  return (
    <ExerciseCard exercise={exercise} controller={controller} solution={solution}>
      <p className="logic-prompt">{exercise.prompt}</p>

      {exercise.variant === "serie" && (
        <div
          className="logic-series"
          aria-label={`Serie: ${exercise.series.join(", ")}`}
        >
          {exercise.series.map((n, i) => (
            <span key={i} className="logic-chip">
              {n}
            </span>
          ))}
          <span className="logic-chip logic-chip--q" aria-hidden="true">
            ?
          </span>
        </div>
      )}

      {isCompare && (
        <div className="logic-compare">
          <span className="logic-chip">{exercise.left}</span>
          <span className="logic-chip logic-chip--op">{answer || "?"}</span>
          <span className="logic-chip">{exercise.right}</span>
        </div>
      )}

      {isCompare ? (
        <div className="logic-options">
          {OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`logic-option${selected === opt ? " is-selected" : ""}`}
              aria-pressed={selected === opt}
              disabled={locked}
              onClick={() => setAnswer(opt)}
            >
              {selected === opt ? "✓ " : ""}
              {OPTION_LABEL[opt]}
            </button>
          ))}
        </div>
      ) : (
        <div className="logic-answer">
          <NumberInput
            id={`logic-${exercise.id}`}
            label="Tu respuesta"
            value={answer}
            onValue={setAnswer}
            disabled={locked}
            invalid={feedback?.type === "error"}
          />
        </div>
      )}

      <p className="mental-hint">{hint}</p>
    </ExerciseCard>
  );
}
