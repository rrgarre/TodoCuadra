import { useEffect, useMemo } from "react";
import {
  useSheet,
  useExerciseController,
  isItemDone,
} from "../../state/SheetContext.jsx";
import { getSectionItems } from "../../data/sheets/index.js";
import { EXERCISE_COMPONENTS } from "../exercises/registry.js";
import MentalTip from "../exercises/MentalTip.jsx";
import TopBar from "./TopBar.jsx";

function ExerciseView({ exercise }) {
  const controller = useExerciseController(exercise);
  const Component = EXERCISE_COMPONENTS[exercise.type];
  if (!Component) {
    return <p className="card">Este ejercicio no está disponible.</p>;
  }
  return <Component exercise={exercise} controller={controller} />;
}

/** Pantalla de una sección: un elemento (ejercicio o truco) por pantalla. */
export default function SectionScreen() {
  const { sheet, state, dispatch } = useSheet();
  const section = sheet.sections[state.sectionIndex];

  const items = useMemo(
    () => (section ? getSectionItems(sheet, section) : []),
    [sheet, section]
  );

  const index = Math.min(state.itemIndex, Math.max(items.length - 1, 0));
  const item = items[index];

  // Si la posición guardada ya no existe, volvemos al inicio.
  useEffect(() => {
    if (section && (!item || index !== state.itemIndex)) {
      dispatch({ type: "GO_HOME" });
    }
  }, [section, item, index, state.itemIndex, dispatch]);

  if (!section || !item) return null;

  const done = items.filter((it) => isItemDone(it, state.progress)).length;

  return (
    <div className="screen">
      <TopBar
        sectionTitle={section.title}
        itemLabel={`${index + 1} / ${items.length}`}
        done={done}
        total={items.length}
        onHome={() => dispatch({ type: "GO_HOME" })}
      />

      <div className="container">
        <p className="group-label">{item.groupLabel}</p>

        {item.kind === "tip" ? (
          <MentalTip tip={item.data} />
        ) : (
          <ExerciseView key={item.id} exercise={item.data} />
        )}

        <nav className="item-nav" aria-label="Navegación entre ejercicios">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={index === 0}
            onClick={() => dispatch({ type: "SET_ITEM", itemIndex: index - 1 })}
          >
            ‹ Anterior
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => dispatch({ type: "GO_HOME" })}
          >
            Todas las secciones
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={index >= items.length - 1}
            onClick={() => dispatch({ type: "SET_ITEM", itemIndex: index + 1 })}
          >
            Siguiente ›
          </button>
        </nav>
      </div>
    </div>
  );
}
