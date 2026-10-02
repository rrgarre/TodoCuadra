import { useMemo } from "react";
import { useSheet, isItemDone } from "../../state/SheetContext.jsx";
import { getAllExercises, getSectionItems } from "../../data/sheets/index.js";

/** Busca el primer elemento sin terminar para poder repasarlo. */
function findFirstPending(sheet, progress) {
  for (let s = 0; s < sheet.sections.length; s++) {
    const items = getSectionItems(sheet, sheet.sections[s]);
    for (let i = 0; i < items.length; i++) {
      if (!isItemDone(items[i], progress)) {
        return { sectionIndex: s, itemIndex: i };
      }
    }
  }
  return null;
}

/** Resumen final de la hoja: totales, porcentaje y reparto por secciones. */
export default function SummaryScreen() {
  const { sheet, state, dispatch, reset } = useSheet();

  const stats = useMemo(() => {
    const exercises = getAllExercises(sheet);
    const total = exercises.length;
    const correct = exercises.filter(
      (e) => state.progress[e.id]?.status === "correct"
    ).length;
    const sections = sheet.sections.map((section) => {
      const items = getSectionItems(sheet, section);
      const done = items.filter((item) => isItemDone(item, state.progress)).length;
      return { id: section.id, title: section.title, done, total: items.length };
    });
    return {
      total,
      correct,
      review: total - correct,
      pct: total ? Math.round((correct / total) * 100) : 0,
      sections,
    };
  }, [sheet, state.progress]);

  const pending = useMemo(
    () => findFirstPending(sheet, state.progress),
    [sheet, state.progress]
  );
  const allDone = stats.correct === stats.total;

  return (
    <div className="screen">
      <div className="container summary">
        <h1>{allDone ? "¡Hoja terminada!" : "Resumen de la hoja"}</h1>
        <p className="summary-sub">
          {allDone
            ? "¡Muy bien! Has completado todos los ejercicios de la hoja."
            : "Puedes seguir practicando: te queda algo por terminar."}
        </p>

        <div className="summary-stats">
          <div className="stat">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Ejercicios</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.correct}</span>
            <span className="stat-label">Correctos</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.review}</span>
            <span className="stat-label">Para revisar</span>
          </div>
          <div className="stat stat--pct">
            <span className="stat-value">{stats.pct} %</span>
            <span className="stat-label">Aciertos</span>
          </div>
        </div>

        <div className="summary-sections">
          {stats.sections.map((section) => (
            <div className="summary-row" key={section.id}>
              <span>{section.title}</span>
              <strong>
                {section.done}/{section.total}
              </strong>
            </div>
          ))}
        </div>

        <div className="summary-actions">
          {pending && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                dispatch({
                  type: "OPEN_SECTION",
                  sectionIndex: pending.sectionIndex,
                  itemIndex: pending.itemIndex,
                })
              }
            >
              Repasar lo que falta
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => dispatch({ type: "GO_HOME" })}
          >
            Volver al inicio
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (
                window.confirm(
                  "¿Resetear todo? Se borrará tu progreso y la hoja quedará en blanco."
                )
              ) {
                reset();
              }
            }}
          >
            Resetear todo
          </button>
        </div>
      </div>
    </div>
  );
}
