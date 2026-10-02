import { useMemo } from "react";
import { useSheet, isItemDone } from "../../state/SheetContext.jsx";
import {
  getSectionItems,
  listSheets,
  getTemplateWarnings,
} from "../../data/sheets/index.js";
import { FORMATOS } from "../../../plantillas/templates.js";
import { loadSheetState } from "../../utils/storage.js";

/**
 * Portada organizada por zonas: cada zona es un formato (Cálculo,
 * Lógica…) y dentro lista sus fichas con su progreso. Al tocar una
 * ficha se activa y sus secciones se despliegan justo debajo; si la
 * ficha tiene una sola sección, se abre directa a los ejercicios.
 */
export default function HomeScreen() {
  const { sheet, state, dispatch, reset, setSheet } = useSheet();
  const hasProgress = useMemo(
    () => Object.keys(state.progress).length > 0,
    [state.progress]
  );
  const warnings = getTemplateWarnings();

  // Todas las fichas con su progreso guardado.
  const fichas = useMemo(
    () =>
      listSheets().map((s) => {
        const progress =
          s.id === sheet.id
            ? state.progress
            : loadSheetState(s.id)?.progress ?? {};
        const items = s.sections.flatMap((sec) => getSectionItems(s, sec));
        const done = items.filter((it) => isItemDone(it, progress)).length;
        return { s, done, total: items.length, active: s.id === sheet.id };
      }),
    [sheet.id, state.progress]
  );

  // Zonas del menú, en el orden del registro de formatos; solo las que
  // tienen fichas (los formatos sin contenido aparecerán cuando haya).
  const zonas = useMemo(
    () =>
      Object.entries(FORMATOS)
        .sort(([, a], [, b]) => a.orden - b.orden)
        .map(([tipo, def]) => ({
          tipo,
          def,
          fichas: fichas.filter((f) => f.s.formato === tipo),
        }))
        .filter((z) => z.fichas.length > 0),
    [fichas]
  );

  /** Tocar una ficha: se activa en su zona; si tiene una sola sección, se abre. */
  const abrirFicha = (ficha) => {
    if (ficha.s.id !== sheet.id) setSheet(ficha.s.id);
    if (ficha.s.sections.length === 1) {
      dispatch({ type: "OPEN_SECTION", sectionIndex: 0 });
    }
  };

  /** Tarjeta de sección (solo se pinta de la ficha activa, anidada). */
  const sectionCard = (section, index) => {
    const items = getSectionItems(sheet, section);
    const done = items.filter((item) => isItemDone(item, state.progress)).length;
    const all = items.length;
    const cta = done === 0 ? "Empezar" : done === all ? "Repasar" : "Continuar";
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
  };

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
        {fichas.length === 0 && (
          <div className="plantilla-aviso" role="alert">
            <strong>⚠ No hay ninguna ficha cargada.</strong> Revisa los JSON de
            la carpeta plantillas/ y recarga.
          </div>
        )}

        {zonas.map(({ tipo, def, fichas: lista }) => (
          <section className="zona" key={tipo}>
            <h2 className="zona-title">{`${def.icono} ${def.bloque}`}</h2>
            <ul className="section-list">
              {lista.map((ficha) => {
                const soloUna =
                  ficha.active && ficha.s.sections.length === 1;
                return (
                  <li key={ficha.s.id}>
                    <button
                      type="button"
                      className={`section-card${
                        ficha.active ? " section-card--activa" : ""
                      }`}
                      disabled={ficha.active && !soloUna}
                      aria-label={
                        ficha.active
                          ? `${ficha.s.title}: ficha en uso`
                          : `Usar la ficha ${ficha.s.title}`
                      }
                      onClick={() => abrirFicha(ficha)}
                    >
                      <span className="section-icon" aria-hidden="true">
                        {ficha.s.icon ?? "🗂️"}
                      </span>
                      <span className="section-body">
                        <strong>{ficha.s.title}</strong>
                        <span>
                          {ficha.s.level}
                          {ficha.s.template ? " · plantilla" : ""}
                        </span>
                      </span>
                      <span className="section-progress">
                        {ficha.done}/{ficha.total}
                      </span>
                      <span className="section-cta">
                        {ficha.active ? "✓ En uso" : "Usar"}
                      </span>
                    </button>

                    {ficha.active && (
                      <ul className="section-list section-list--hija">
                        {ficha.s.sections.map(sectionCard)}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {warnings.length > 0 && (
          <div className="plantilla-aviso" role="alert">
            <strong>⚠ Plantillas no cargadas:</strong>
            <ul>
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

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
