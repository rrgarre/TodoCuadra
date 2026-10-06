import { useMemo, useState } from "react";
import { useSheet, isItemDone } from "../../state/SheetContext.jsx";
import {
  getSectionItems,
  listSheets,
  getTemplateWarnings,
} from "../../data/sheets/index.js";
import { FORMATOS } from "../../../plantillas/templates.js";
import { loadSheetState } from "../../utils/storage.js";

/**
 * Portada por asignaturas: cada zona es una asignatura (Matemáticas,
 * Lengua…) y dentro lista sus fichas con su progreso. Cada tarjeta
 * lleva incrustada a la izquierda una flecha que solo despliega o
 * recoge sus apartados sin salir del menú; el resto de la tarjeta
 * activa la ficha y, si tiene una sola sección, se abre directa a
 * los ejercicios.
 */
export default function HomeScreen({ onOpenTrivial }) {
  const { sheet, state, dispatch, reset, setSheet } = useSheet();
  const hasProgress = useMemo(
    () => Object.keys(state.progress).length > 0,
    [state.progress]
  );
  const warnings = getTemplateWarnings();

  // Fichas con sus apartados desplegados: la activa al arrancar; después,
  // cada una se abre o cierra a mano, sin navegar a ningún sitio.
  const [abiertas, setAbiertas] = useState(() => new Set([sheet.id]));

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
        return { s, done, total: items.length, active: s.id === sheet.id, progress };
      }),
    [sheet.id, state.progress]
  );

  // Asignaturas del menú, en el orden del registro FORMATOS; solo las
  // que tienen fichas (Lengua y demás aparecerán cuando haya).
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

  /** Zona de la flecha: solo despliega o recoge los apartados de la ficha. */
  const alternarFicha = (id) => {
    setAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Tocar la tarjeta: activa la ficha (y despliega sus apartados); si
   *  tiene una sola sección, se abre directa a los ejercicios. */
  const abrirFicha = (ficha) => {
    if (ficha.s.id !== sheet.id) {
      setSheet(ficha.s.id);
      setAbiertas((prev) => new Set(prev).add(ficha.s.id));
    }
    if (ficha.s.sections.length === 1) {
      dispatch({ type: "OPEN_SECTION", sectionIndex: 0 });
    }
  };

  /** Tarjeta de apartado de una ficha, con el progreso de esa ficha. */
  const sectionCard = (ficha, section, index) => {
    const items = getSectionItems(ficha.s, section);
    const done = items.filter((item) => isItemDone(item, ficha.progress)).length;
    const all = items.length;
    const cta = done === 0 ? "Empezar" : done === all ? "Repasar" : "Continuar";
    return (
      <li key={section.id}>
        <button
          type="button"
          className="section-card"
          onClick={() => {
            if (!ficha.active) setSheet(ficha.s.id);
            dispatch({ type: "OPEN_SECTION", sectionIndex: index });
          }}
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
                const desplegada = abiertas.has(ficha.s.id);
                return (
                  <li key={ficha.s.id}>
                    <div
                      className={`section-card ficha-cabecera${
                        ficha.active ? " section-card--activa" : ""
                      }`}
                    >
                      {/* Flecha incrustada: solo despliega o recoge. */}
                      <button
                        type="button"
                        className="ficha-toggle"
                        aria-expanded={desplegada}
                        aria-label={`${
                          desplegada ? "Recoger" : "Desplegar"
                        } los apartados de ${ficha.s.title}`}
                        onClick={() => alternarFicha(ficha.s.id)}
                      >
                        <span aria-hidden="true">
                          {desplegada ? "▾" : "▸"}
                        </span>
                      </button>

                      {/* El resto de la tarjeta: activa la ficha. */}
                      <button
                        type="button"
                        className="ficha-zona"
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
                    </div>

                    {desplegada && (
                      <ul className="section-list section-list--hija">
                        {ficha.s.sections.map((section, i) =>
                          sectionCard(ficha, section, i)
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {/* Trivial: asignatura de juego (sin fichas): preguntas al azar. */}
        <section className="zona">
          <h2 className="zona-title">🎯 Trivial</h2>
          <ul className="section-list">
            <li>
              <button
                type="button"
                className="section-card"
                aria-label="Jugar al Trivial"
                onClick={onOpenTrivial}
              >
                <span className="section-icon" aria-hidden="true">
                  🎯
                </span>
                <span className="section-body">
                  <strong>Preguntas al azar</strong>
                  <span>Elige una categoría o mézclalas todas</span>
                </span>
                <span className="section-cta">Jugar</span>
              </button>
            </li>
          </ul>
        </section>

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
