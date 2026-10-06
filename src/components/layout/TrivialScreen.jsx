import { useState } from "react";
import {
  loadPreguntas,
  poolPreguntas,
  siguientePregunta,
} from "../../../preguntas/loader.js";

/**
 * Pantalla de selección del Trivial: una categoría por botón (las vacías
 * salen desactivadas) y «Todas las categorías» para mezclarlo todo.
 */
export function TrivialCategorias({ categorias, warnings, onElegir }) {
  const total = categorias.reduce((n, c) => n + c.preguntas.length, 0);
  return (
    <div className="container">
      <h2 className="zona-title">Elige una categoría</h2>

      {total === 0 && (
        <div className="plantilla-aviso" role="alert">
          <strong>⚠ No hay preguntas todavía.</strong> Rellena los JSON de la
          carpeta preguntas/ y recarga.
        </div>
      )}

      {warnings.length > 0 && (
        <div className="plantilla-aviso" role="alert">
          <strong>⚠ Preguntas no cargadas:</strong>
          <ul>
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="trivial-cats">
        <button
          type="button"
          className="trivial-cat"
          disabled={total === 0}
          onClick={() => onElegir(null)}
        >
          <span className="trivial-cat-name">🎲 Todas las categorías</span>
        </button>

        {categorias.map((c) => (
          <button
            key={c.titulo}
            type="button"
            className="trivial-cat"
            disabled={c.preguntas.length === 0}
            aria-label={`Jugar la categoría ${c.titulo}`}
            onClick={() => onElegir(c.titulo)}
          >
            <span className="trivial-cat-name">{c.titulo}</span>
            {c.preguntas.length === 0 && (
              <span className="trivial-cat-empty">Aún sin preguntas</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Pantalla de juego: una pregunta y «Mostrar solución» cuando quieras;
 * «Siguiente» solo aparece después de haber visto la respuesta. Sin
 * temporizadores, sin contadores y sin nada más. Si se está en «Todas
 * las categorías», junto al título se muestra la categoría de la
 * pregunta que está en pantalla.
 */
export function TrivialJuego({
  titulo,
  pregunta,
  solucion,
  onMostrar,
  onSiguiente,
  onVolver,
}) {
  if (!pregunta) return null;
  const todas = titulo == null;
  return (
    <div className="container">
      <p className="group-label">
        {titulo ?? "Todas las categorías"}
        {todas && pregunta.categoria && (
          <>
            {" · "}
            <span className="trivial-cat-actual">{pregunta.categoria}</span>
          </>
        )}
      </p>

      <div className="trivial-card">
        <p className="trivial-pregunta">{pregunta.pregunta}</p>
        {solucion && (
          <div className="trivial-solucion">
            <p className="trivial-respuesta">{pregunta.respuesta}</p>
            {pregunta.detalle && (
              <p className="trivial-detalle">{pregunta.detalle}</p>
            )}
          </div>
        )}
      </div>

      <nav className="item-nav" aria-label="Controles del trivial">
        <button
          type="button"
          className="btn"
          onClick={onMostrar}
          disabled={solucion}
        >
          Mostrar solución
        </button>
        <button type="button" className="btn btn-ghost" onClick={onVolver}>
          Cambiar categoría
        </button>
        {solucion && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onSiguiente}
          >
            Siguiente ›
          </button>
        )}
      </nav>
    </div>
  );
}

/**
 * Apartado Trivial: pregunta al azar de la categoría elegida (o de todas
 * mezcladas) y solución a demanda. El juego no se acaba nunca: «Siguiente»
 * sortea otra (puede repetir) y se sale con «‹ Inicio».
 */
export default function TrivialScreen({ onExit }) {
  const { categorias, warnings } = loadPreguntas();
  // null = en la pantalla de categorías; después, el juego en marcha.
  const [juego, setJuego] = useState(null); // { titulo, preguntas }
  const [actual, setActual] = useState(null);
  const [solucion, setSolucion] = useState(false);

  const elegir = (titulo) => {
    const preguntas = poolPreguntas(categorias, titulo);
    if (preguntas.length === 0) return;
    setJuego({ titulo, preguntas });
    setActual(siguientePregunta(preguntas, null));
    setSolucion(false);
  };

  const volverACategorias = () => {
    setJuego(null);
    setActual(null);
    setSolucion(false);
  };

  const siguiente = () => {
    setActual(siguientePregunta(juego.preguntas, actual?.key));
    setSolucion(false);
  };

  return (
    <div className="screen">
      <header className="topbar">
        <div className="topbar-inner">
          <button type="button" className="btn btn-ghost" onClick={onExit}>
            ‹ Inicio
          </button>
          <span className="topbar-title">🎯 Trivial</span>
        </div>
      </header>

      {!juego ? (
        <TrivialCategorias
          categorias={categorias}
          warnings={warnings}
          onElegir={elegir}
        />
      ) : (
        <TrivialJuego
          titulo={juego.titulo}
          pregunta={actual}
          solucion={solucion}
          onMostrar={() => setSolucion(true)}
          onSiguiente={siguiente}
          onVolver={volverACategorias}
        />
      )}
    </div>
  );
}
