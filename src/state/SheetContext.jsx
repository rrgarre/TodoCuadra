/**
 * Estado global de la hoja: navegación, progreso por ejercicio y
 * persistencia en localStorage.
 *
 * Separado de la presentación (componentes) y de los datos (data/sheets).
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { getSheet, getSectionItems } from "../data/sheets/index.js";
import { refreshRemoteTemplates } from "../../plantillas/templates.js";
import { validateStep, getStepsCount } from "../utils/validation.js";
import {
  loadSheetState,
  saveSheetState,
  clearSheetState,
  loadActiveSheetId,
  saveActiveSheetId,
} from "../utils/storage.js";

const SheetContext = createContext(null);

/* ------------------------------------------------------------------ */
/* Formato del progreso por ejercicio                                  */
/* ------------------------------------------------------------------ */

function defaultValues(exercise) {
  if (exercise.type === "wordProblem") {
    // Desarrollo escrito con la botonera: líneas confirmadas + línea en curso.
    return { lines: [], current: "" };
  }
  if (
    exercise.type === "multiplication" ||
    exercise.type === "division" ||
    exercise.type === "addition" ||
    exercise.type === "subtraction"
  ) {
    return { cells: {} };
  }
  return { answer: "" };
}

function makeEntry(exercise) {
  return {
    values: defaultValues(exercise),
    status: "pending", // pending | correct | review
    step: 0,
    stepsDone: [],
    feedback: null, // { type, message, cellIds }
    revealed: false,
    attempts: 0,
  };
}

function successMessage(exercise) {
  switch (exercise.type) {
    case "wordProblem":
      return "¡Correcto! Tu desarrollo entero es correcto.";
    case "multiplication":
    case "division":
      return "¡Correcto! Toda la operación está bien hecha.";
    case "logica":
      return "¡Correcto! Has resuelto el reto de lógica.";
    default:
      return "¡Correcto!";
  }
}

function updateEntry(state, exercise, updater) {
  const entry = state.progress[exercise.id] ?? makeEntry(exercise);
  return {
    ...state,
    progress: {
      ...state.progress,
      [exercise.id]: updater(entry),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

// Exportado para las pruebas (scripts/rendercheck): es una función pura.
export function reducer(state, action) {
  switch (action.type) {
    case "GO_HOME":
      return { ...state, screen: "home" };

    case "OPEN_SECTION":
      return {
        ...state,
        screen: "section",
        sectionIndex: action.sectionIndex,
        itemIndex: action.itemIndex ?? 0,
      };

    case "SET_ITEM":
      return { ...state, itemIndex: action.itemIndex };

    case "GO_SUMMARY":
      return { ...state, screen: "summary" };

    case "SET_ANSWER":
      return updateEntry(state, action.exercise, (entry) => ({
        ...entry,
        values: { ...entry.values, answer: action.value },
      }));

    case "SET_CELL":
      return updateEntry(state, action.exercise, (entry) => ({
        ...entry,
        values: {
          ...entry.values,
          cells: { ...(entry.values.cells ?? {}), [action.cellId]: action.value },
        },
      }));

    // Botonera del problema: la línea se escribe pulsando teclas, sin
    // campos de texto (en el móvil no se abre el teclado del sistema).
    case "DEV": {
      return updateEntry(state, action.exercise, (entry) => {
        const v = entry.values ?? {};
        const lines = Array.isArray(v.lines) ? v.lines : [];
        const current = typeof v.current === "string" ? v.current : "";
        // Cada escritura normaliza la forma { lines, current } (el
        // progreso guardado con el formato antiguo empieza de cero).
        const set = (patch) => ({
          ...entry,
          values: { ...v, lines, current, ...patch },
        });

        switch (action.op) {
          case "key":
            return set({ current: current + action.key });
          case "back":
            return set({ current: current.slice(0, -1) });
          case "newline": {
            const line = current.trim();
            if (!line) return entry;
            return set({ lines: [...lines, line], current: "" });
          }
          case "undo":
            if (current.trim()) return set({ current: "" });
            if (lines.length === 0) return entry;
            return set({ lines: lines.slice(0, -1) });
          case "magnitude": {
            const name = String(action.name ?? "").trim();
            if (!name) return entry;
            // El nombre se adjunta a la operación de la línea en curso
            // (cuando ya lleva «=»); con la línea vacía, a la última
            // confirmada. Solo una magnitud por línea.
            if (current.includes("=") && !current.includes("→")) {
              return set({ current: `${current.trimEnd()} → ${name}` });
            }
            if (current.trim()) return entry;
            const last = lines[lines.length - 1];
            if (!last || !last.includes("=") || last.includes("→")) {
              return entry;
            }
            return set({
              lines: [...lines.slice(0, -1), `${last} → ${name}`],
            });
          }
          default:
            return entry;
        }
      });
    }

    case "CHECK": {
      const exercise = action.exercise;
      const entry = state.progress[exercise.id] ?? makeEntry(exercise);
      if (entry.revealed || entry.status === "correct") return state;

      const result = validateStep(exercise, entry);

      if (result.ok) {
        const stepsCount = getStepsCount(exercise);
        const isLast = entry.step >= stepsCount - 1;
        const stepsDone = entry.stepsDone.includes(entry.step)
          ? entry.stepsDone
          : [...entry.stepsDone, entry.step];
        return updateEntry(state, exercise, () => ({
          ...entry,
          stepsDone,
          status: isLast ? "correct" : entry.status,
          attempts: 0,
          feedback: {
            type: "ok",
            message: isLast
              ? successMessage(exercise)
              : "¡Paso correcto! Ahora pasa al siguiente paso.",
            cellIds: [],
          },
        }));
      }

      return updateEntry(state, exercise, () => ({
        ...entry,
        status: entry.status === "correct" ? "correct" : "review",
        attempts: (entry.attempts ?? 0) + 1,
        feedback: { type: "error", message: result.message, cellIds: result.cellIds },
      }));
    }

    case "NEXT_STEP":
      return updateEntry(state, action.exercise, (entry) => ({
        ...entry,
        step: entry.step + 1,
        feedback: null,
      }));

    case "REVEAL":
      return updateEntry(state, action.exercise, (entry) => ({
        ...entry,
        revealed: true,
        feedback: null,
        status: entry.status === "correct" ? "correct" : "review",
      }));

    case "TOGGLE_TIP":
      return updateEntry(state, action.tip, (entry) => ({
        ...entry,
        revealed: !entry.revealed,
      }));

    case "NEXT": {
      if (state.itemIndex + 1 < action.itemsCount) {
        return { ...state, itemIndex: state.itemIndex + 1 };
      }
      if (state.sectionIndex + 1 < action.sectionsCount) {
        return {
          ...state,
          screen: "section",
          sectionIndex: state.sectionIndex + 1,
          itemIndex: 0,
        };
      }
      return { ...state, screen: "summary" };
    }

    case "RESET":
      return { ...state, screen: "home", sectionIndex: 0, itemIndex: 0, progress: {} };

    case "RESET_ITEM": {
      // Reinicia un solo ejercicio (sus casillas, paso y avisos) sin
      // tocar el resto del progreso; seguimos en el mismo ejercicio.
      if (!state.progress[action.exercise.id]) return state;
      const progress = { ...state.progress };
      delete progress[action.exercise.id];
      return { ...state, progress };
    }

    case "SET_SHEET": {
      // Cambia de ficha: carga su progreso y vuelve a la portada, donde
      // sus secciones se despliegan bajo su tarjeta.
      const progress =
        action.saved && typeof action.saved === "object" && action.saved.progress
          ? action.saved.progress
          : {};
      return {
        sheetId: action.sheetId,
        screen: "home",
        sectionIndex: 0,
        itemIndex: 0,
        progress,
      };
    }

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/* Proveedor                                                           */
/* ------------------------------------------------------------------ */

function initState(sheet) {
  const base = {
    sheetId: sheet.id,
    screen: "home",
    sectionIndex: 0,
    itemIndex: 0,
    progress: {},
  };
  const saved = loadSheetState(sheet.id);
  if (saved && typeof saved === "object") {
    // El progreso guardado manda, pero la hoja activa es la que toca.
    return { ...base, ...saved, sheetId: sheet.id };
  }
  return base;
}

export function SheetProvider({ children }) {
  // La hoja activa se guarda en su propia clave; el resto del estado
  // (pantalla y progreso) es el de esa hoja.
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    initState(getSheet(loadActiveSheetId() ?? undefined))
  );
  const sheet = useMemo(() => getSheet(state.sheetId), [state.sheetId]);

  // Al arrancar se actualizan las fichas remotas (si hay carpeta
  // configurada); al terminar, se fuerza un re render para listirlas.
  const [remoteVersion, setRemoteVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    refreshRemoteTemplates().then((r) => {
      if (alive && r.changed) setRemoteVersion((v) => v + 1);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    saveSheetState(state.sheetId, state);
  }, [state]);

  useEffect(() => {
    saveActiveSheetId(state.sheetId);
  }, [state.sheetId]);

  /** Avanza al siguiente item; si termina la sección, a la siguiente; si no
   *  hay más secciones, al resumen. */
  const goNext = () => {
    const section = sheet.sections[state.sectionIndex];
    const items = section ? getSectionItems(sheet, section) : [];
    dispatch({
      type: "NEXT",
      itemsCount: items.length,
      sectionsCount: sheet.sections.length,
    });
  };

  const value = useMemo(
    () => ({
      sheet,
      state,
      dispatch,
      goNext,
      /** Cambia a otra ficha en la portada (con su progreso cargado). */
      setSheet: (id) => {
        if (id === state.sheetId) return;
        const target = getSheet(id);
        dispatch({
          type: "SET_SHEET",
          sheetId: target.id,
          saved: loadSheetState(target.id),
        });
      },
      reset: () => {
        clearSheetState(state.sheetId);
        dispatch({ type: "RESET" });
      },
    }),
    // goNext se recrea con cada render; lo incluimos vía state, e
    // idem con remoteVersion para refrescar cuando llegan fichas.
    [sheet, state, remoteVersion]
  );

  return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>;
}

export function useSheet() {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error("useSheet debe usarse dentro de <SheetProvider>");
  return ctx;
}

/** ¿Está terminado un item de la sección (ejercicio correcto o truco visto)? */
export function isItemDone(item, progress) {
  const entry = progress[item.id];
  if (!entry) return false;
  return item.kind === "tip"
    ? Boolean(entry.revealed)
    : entry.status === "correct";
}

/* ------------------------------------------------------------------ */
/* Controladores de ejercicio y de truco                               */
/* ------------------------------------------------------------------ */

export function useExerciseController(exercise) {
  const { state, dispatch, goNext } = useSheet();
  let entry = state.progress[exercise.id] ?? makeEntry(exercise);
  // Los problemas pasaron de pasos a botonera: el progreso guardado
  // con el formato antiguo (steps/answers) empieza de cero.
  if (
    exercise.type === "wordProblem" &&
    !Array.isArray(entry.values?.lines) &&
    entry.status !== "correct" &&
    !entry.revealed
  ) {
    entry = makeEntry(exercise);
  }
  const stepsCount = getStepsCount(exercise);

  return {
    entry,
    values: entry.values,
    status: entry.status,
    step: entry.step,
    stepsCount,
    stepsDone: entry.stepsDone,
    feedback: entry.feedback,
    revealed: entry.revealed,
    check: () => dispatch({ type: "CHECK", exercise }),
    reveal: () => dispatch({ type: "REVEAL", exercise }),
    nextStep: () => dispatch({ type: "NEXT_STEP", exercise }),
    next: goNext,
    setAnswer: (value) => dispatch({ type: "SET_ANSWER", exercise, value }),
    setCell: (cellId, value) =>
      dispatch({ type: "SET_CELL", exercise, cellId, value }),
    // Botonera del problema: se escribe pulsando teclas, sin teclado.
    devPress: (key) => dispatch({ type: "DEV", exercise, op: "key", key }),
    devBackspace: () => dispatch({ type: "DEV", exercise, op: "back" }),
    devNewline: () => dispatch({ type: "DEV", exercise, op: "newline" }),
    devUndo: () => dispatch({ type: "DEV", exercise, op: "undo" }),
    devMagnitude: (name) =>
      dispatch({ type: "DEV", exercise, op: "magnitude", name }),
    resetItem: () => dispatch({ type: "RESET_ITEM", exercise }),
  };
}

export function useTipController(tip) {
  const { dispatch, goNext, state } = useSheet();
  const entry = state.progress[tip.id] ?? makeEntry(tip);
  return {
    revealed: entry.revealed,
    toggle: () => dispatch({ type: "TOGGLE_TIP", tip }),
    next: goNext,
  };
}
