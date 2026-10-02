import { useSheet } from "../../state/SheetContext.jsx";
import ExerciseCard from "../common/ExerciseCard.jsx";
import NumberInput from "../common/NumberInput.jsx";

/** Cálculo mental: una expresión y un único campo para el resultado. */
export default function MentalCalculation({ exercise, controller }) {
  const { values, setAnswer, revealed, status, feedback } = controller;
  const { sheet } = useSheet();

  const tip = exercise.tipId
    ? sheet.tips.find((t) => t.id === exercise.tipId)
    : null;

  const locked = revealed || status === "correct";
  const answer =
    revealed && status !== "correct" ? String(exercise.result) : values.answer;

  const solution = (
    <>
      <p className="solution-final">Resultado: {exercise.result}</p>
      {tip && (
        <>
          <p className="tip-short">{tip.short}</p>
          <div className="tip-example">
            <p className="tip-expr">{tip.example.expr}</p>
            <ol>
              {tip.example.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        </>
      )}
    </>
  );

  return (
    <ExerciseCard exercise={exercise} controller={controller} solution={solution}>
      <div className="mental-expr">
        <span>{exercise.expr} =</span>
        <NumberInput
          id={`men-${exercise.id}`}
          label={`Resultado de ${exercise.expr}`}
          value={answer}
          onValue={setAnswer}
          disabled={locked}
          invalid={feedback?.type === "error"}
        />
      </div>
      <p className="mental-hint">Escribe solo el resultado.</p>
    </ExerciseCard>
  );
}
