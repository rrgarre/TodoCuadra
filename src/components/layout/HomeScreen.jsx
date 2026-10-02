import { useMemo } from "react";
import { useSheet, isItemDone } from "../../state/SheetContext.jsx";
import { getSectionItems } from "../../data/sheets/index.js";

/** Portada: título, nivel y lista de secciones con su progreso. */
export default function HomeScreen() {
  const { sheet, state, dispatch, reset } = useSheet();
  const hasProgress = useMemo(
    () => Object.keys(state.progress).length > 0,
    [state.progress]
  );

  return (
    <div className="screen">
      <header className="hero">
        <h1>Juego de Calcular</h1>
        <div>
          <span className="hero-level">{sheet.level}</span>
        </div>
        <p className="hero-sub">{sheet.title}</p>
      </header>

      <div className="container">
        <ul className="section-list">
          {sheet.sections.map((section, index) => {
            const items = getSectionItems(sheet, section);
            const done = items.filter((item) =>
              isItemDone(item, state.progress)
            ).length;
            const all = items.length;
            const cta =
              done === 0 ? "Empezar" : done === all ? "Repasar" : "Continuar";
            return (
              <li key={section.id}>
                <button
                  type="button"
                  className="section-card"
                  onClick={() =>
                    dispatch({ type: "OPEN_SECTION", sectionIndex: index })
                  }
                >
                  <span className="section-icon" aria-hidden="true">
                    {section.icon}
                  </span>
                  <span className="section-body">
                    <strong>{section.title}</strong>
                    <span>{section.description}</span>
                  </span>
                  <span className="section-progress">
                    {done}/{all}
                  </span>
                  <span className="section-cta">{cta}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="home-footer">
          {hasProgress && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => dispatch({ type: "GO_SUMMARY" })}
            >
              Ver resumen
            </button>
          )}
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
          <p>Tu progreso se guarda solo en este dispositivo.</p>
        </div>
      </div>
    </div>
  );
}
