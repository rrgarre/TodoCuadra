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
import { validateStep, getStepsCount, validateProblemStep, parseProblemExpr } from "../utils/validation.js";
import { problemCells } from "../utils/calculations.js";
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

/**
 * Línea en curso del problema: { expr, eq, cells, mag } —la operación
 * se escribe como texto y, al pulsar «=», se pone en vertical y sus
 * casillas (cells: id de casilla → cifra) se rellenan una a una con la
 * botonera. También normaliza el texto literal de versiones anteriores
 * de la botonera («5+3=8 → Total»): se conserva la magnitud y las
 * casillas se reescriben.
 */
function toCurrent(raw) {
  if (raw && typeof raw === "object") {
    return {
      expr: typeof raw.expr === "string" ? raw.expr : "",
      eq: Boolean(raw.eq),
      cells:
        raw.cells && typeof raw.cells === "object" ? { ...raw.cells } : {},
      mag: typeof raw.mag === "string" ? raw.mag : null,
    };
  }
  if (typeof raw === "string" && raw.trim()) {
    let text = raw;
    let mag = null;
    const arrow = text.indexOf("→");
    if (arrow >= 0) {
      mag = text.slice(arrow + 1).trim() || null;
      text = text.slice(0, arrow);
    }
    const eq = text.includes("=");
    const [expr = ""] = text.split(/=(.+)/);
    return { expr: expr.trimEnd(), eq, cells: {}, mag };
  }
  return { expr: "", eq: false, cells: {}, mag: null };
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
    // Al pulsar «=» la operación se pone en vertical y las teclas
    // rellenan sus casillas de derecha a izquierda; la línea se
    // confirma con «Comprobar», que exige la magnitud adjunta.
    case "DEV": {
      return updateEntry(state, action.exercise, (entry) => {
        const v = entry.values ?? {};
        const lines = Array.isArray(v.lines) ? v.lines : [];
        const cur = toCurrent(v.current);
        // Cada escritura normaliza la forma { lines, current } (el
        // progreso guardado con el formato antiguo empieza de cero).
        const set = (patch) => ({
          ...entry,
          values: { ...v, lines, current: cur, ...patch },
        });
        const reset = { expr: "", eq: false, cells: {}, mag: null };

        // Modelo de la operación transformada: sus casillas, en el
        // orden en que se escriben en papel.
        const parsed = cur.eq ? parseProblemExpr(cur.expr) : null;
        const order = parsed ? problemCells(parsed.a, parsed.op, parsed.b) : [];
        const filled = (id) => String(cur.cells[id] ?? "").trim() !== "";
        const nextEmpty = order.find((c) => !filled(c.id));
        const complete = parsed !== null && order.length > 0 && !nextEmpty;

        switch (action.op) {
          case "key": {
            if (cur.mag) return entry; // la línea está sellada
            if (action.key === "=") {
              // Solo se transforma una operación completa: a op b.
              if (cur.eq || !parseProblemExpr(cur.expr)) return entry;
              return set({ current: { ...cur, eq: true } });
            }
            if (cur.eq) {
              // Puesta en vertical: las teclas escriben en las casillas,
              // casilla por casilla en el orden de papel.
              if (!/^[0-9]$/.test(action.key) || !nextEmpty) return entry;
              return set({
                current: {
                  ...cur,
                  cells: { ...cur.cells, [nextEmpty.id]: action.key },
                },
              });
            }
            return set({ current: { ...cur, expr: cur.expr + action.key } });
          }
          case "back":
            // Borrado en orden inverso: magnitud, casilla, «=» y texto.
            if (cur.mag) return set({ current: { ...cur, mag: null } });
            // La última casilla rellenada (la más a la izquierda).
            for (let i = order.length - 1; i >= 0; i--) {
              if (filled(order[i].id)) {
                const rest = { ...cur.cells };
                delete rest[order[i].id];
                return set({ current: { ...cur, cells: rest } });
              }
            }
            if (cur.eq) return set({ current: { ...cur, eq: false } });
            if (cur.expr)
              return set({
                current: { ...cur, expr: cur.expr.slice(0, -1) },
              });
            return entry;
          case "undo": {
            const hasAny =
              cur.expr.trim() || cur.eq || Object.keys(cur.cells).length > 0 || cur.mag;
            if (hasAny) return set({ current: reset });
            if (lines.length === 0) return entry;
            return set({ lines: lines.slice(0, -1) });
          }
          case "magnitude": {
            const name = String(action.name ?? "").trim();
            // Solo se adjunta a una operación transformada y con todas
            // sus casillas rellenas, y una sola vez (después se sella).
            if (!name || !cur.eq || !complete || cur.mag) {
              return entry;
            }
            return set({ current: { ...cur, mag: name } });
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

      // Problemas: «Comprobar» comprueba ESA operación (la línea en
      // curso) contra el paso que toca; si está bien, la línea se
      // confirma en el panel y, con la última, se repasa entero.
      if (exercise.type === "wordProblem") {
        const values = entry.values ?? {};
        const lines = Array.isArray(values.lines) ? values.lines : [];
        const cur = values.current;
        const hasCurrent = Boolean(
          cur &&
            typeof cur === "object" &&
            ((cur.expr && String(cur.expr).trim()) ||
              cur.eq ||
              cur.mag ||
              (cur.cells && Object.keys(cur.cells).length > 0))
        );
        const fail = (res) =>
          updateEntry(state, exercise, () => ({
            ...entry,
            status: entry.status === "correct" ? "correct" : "review",
            attempts: (entry.attempts ?? 0) + 1,
            feedback: {
              type: "error",
              message: res.message,
              cellIds: res.cellIds ?? [],
            },
          }));
        const done = (patch) =>
          updateEntry(state, exercise, () => ({
            ...entry,
            stepsDone: entry.stepsDone.includes(entry.step)
              ? entry.stepsDone
              : [...entry.stepsDone, entry.step],
            status: "correct",
            attempts: 0,
            feedback: { type: "ok", message: successMessage(exercise), cellIds: [] },
            ...patch,
          }));

        if (!hasCurrent) {
          // Sin línea en curso se repasa el desarrollo completo.
          const whole = validateStep(exercise, entry);
          if (!whole.ok) return fail(whole);
          return done({});
        }

        const step = validateProblemStep(exercise, entry);
        if (!step.ok) return fail(step);

        const newLines = [...lines, step.line];
        const confirmed = {
          ...values,
          lines: newLines,
          current: toCurrent(null),
        };

        if (newLines.length < exercise.plan.length) {
          // Paso correcto: se confirma la línea y se pide la siguiente.
          return updateEntry(state, exercise, () => ({
            ...entry,
            values: confirmed,
            status: "pending",
            attempts: 0,
            feedback: {
              type: "ok",
              message: `¡Correcto! Paso ${newLines.length} de ${exercise.plan.length}: pasa a la siguiente operación.`,
              cellIds: [],
            },
          }));
        }

        // Última operación: además se repasa el desarrollo entero (por
        // si una línea anterior viene de una versión anterior del panel).
        const whole = validateStep(exercise, {
          ...entry,
          values: { lines: newLines, current: null },
        });
        if (!whole.ok) return fail(whole);
        return done({ values: confirmed });
      }

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
  if (exercise.type === "wordProblem") {
    const v = entry.values ?? {};
    if (!("lines" in v)) {
      // Los problemas pasaron de pasos a botonera: el progreso con el
      // formato antiguo (steps/answers) empieza de cero, salvo que ya
      // esté resuelto o con la solución vista.
      entry =
        entry.status === "correct" || entry.revealed
          ? { ...entry, values: { lines: [], current: toCurrent(null) } }
          : makeEntry(exercise);
    } else {
      // La línea en curso se normaliza a objeto de fases; así se
      // conserva también lo escrito con la botonera de la versión
      // anterior (texto literal con «=» y magnitud).
      entry = {
        ...entry,
        values: {
          ...v,
          lines: Array.isArray(v.lines) ? v.lines : [],
          current: toCurrent(v.current),
        },
      };
    }
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
