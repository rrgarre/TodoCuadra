import ExerciseCard from "../common/ExerciseCard.jsx";
import NumberInput from "../common/NumberInput.jsx";

const OPTIONS = ["mayor", "menor", "igual"];
const OPTION_LABEL = { mayor: "Mayor", menor: "Menor", igual: "Igual" };

/**
 * Retos de Lógica: series numéricas para completar, comparaciones
 * (mayor/menor/igual), enigmas con respuesta numérica, eliminatorias
 * (varias opciones y solo una correcta) y deducciones (una casilla
 * etiquetada por cada cantidad que hay que descubrir).
 * Un solo paso: se comprueba la respuesta entera.
 */
export default function Logica({ exercise, controller }) {
  const { values, setAnswer, revealed, status, feedback } = controller;

  const locked = revealed || status === "correct";
  const isCompare = exercise.variant === "comparacion";
  const isChoice = exercise.variant === "eliminatoria";
  const isDeduccion = exercise.variant === "deduccion";
  const answer =
    revealed && status !== "correct" ? String(exercise.answer) : values.answer;
  const selected = String(values.answer ?? "");

  // Deducción: una casilla por etiqueta; el valor va en "2,1" (partes unidas).
  const parts = isDeduccion
    ? exercise.labels.map((_, i) => String(answer ?? "").split(",")[i] ?? "")
    : [];
  const setField = (index, value) => {
    setAnswer(
      exercise.labels
        .map((_, i) => (i === index ? value : parts[i] ?? ""))
        .join(",")
    );
  };

  // Opciones: las de comparación (mayor/menor/igual) o las de la eliminatoria.
  const choices = isCompare
    ? OPTIONS.map((o) => ({ value: o, label: OPTION_LABEL[o] }))
    : isChoice
    ? exercise.options.map((o) => ({ value: o, label: o }))
    : null;

  const solution = (
    <>
      <p className="solution-final">
        {isDeduccion
          ? `Respuesta: ${exercise.labels
              .map(
                (et, i) => `${et}: ${String(exercise.answer).split(",")[i]}`
              )
              .join(" · ")}`
          : `Respuesta: ${exercise.answer}`}
      </p>
      {exercise.explanation && (
        <p className="solution-note">{exercise.explanation}</p>
      )}
    </>
  );

  const hint = isCompare
    ? "Elige mayor, menor o igual."
    : isChoice
    ? "Toca la respuesta correcta: descarta las que no encajan."
    : exercise.variant === "serie"
    ? "Escribe el número que sigue."
    : isDeduccion
    ? "Escribe cada cantidad en su casilla."
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

      {choices ? (
        <div className="logic-options">
          {choices.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`logic-option${selected === opt.value ? " is-selected" : ""}`}
              aria-pressed={selected === opt.value}
              disabled={locked}
              onClick={() => setAnswer(opt.value)}
            >
              {selected === opt.value ? "✓ " : ""}
              {opt.label}
            </button>
          ))}
        </div>
      ) : isDeduccion ? (
        <div className="logic-fields">
          {exercise.labels.map((et, i) => (
            <span className="logic-field" key={et}>
              <span className="logic-field-label" aria-hidden="true">
                {et}
              </span>
              <NumberInput
                id={`logic-${exercise.id}-${i}`}
                label={et}
                value={parts[i]}
                onValue={(v) => setField(i, v)}
                disabled={locked}
                invalid={feedback?.type === "error"}
              />
            </span>
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
