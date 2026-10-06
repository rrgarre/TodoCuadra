import { useState } from "react";
import {
  DIFICULTADES,
  sortearPregunta,
  respuestaCorrecta,
} from "../../utils/roman.js";

/**
 * Apartado Números romanos: juego paralelo al Trivial. Se elige la
 * dificultad y cada turno sortea un número; la mitad de las veces se
 * plantea en cifras (y hay que responder en romanos) y la mitad en
 * romanos (y hay que responder en cifras). Sin <input>: la respuesta se
 * escribe con una botonera como la de los problemas, que se adapta a lo
 * que toque —letras IVXLCDM o cifras 0–9—, así en el móvil no se abre
 * el teclado del sistema.
 */

/** Botonera de respuesta: letras o cifras, siempre sin campos de texto. */
export function RomanosTeclado({ tipo, onKey, onBackspace, onLimpiar, locked }) {
  const letras = tipo !== "digitos";
  const teclas = letras
    ? ["I", "V", "X", "L", "C", "D", "M"]
    : ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
  return (
    <div className="keypad" role="group" aria-label="Teclado de respuesta">
      <div
        className={`keypad-grid${letras ? "" : " keypad-grid--cinco"}`}
      >
        {teclas.map((t) => (
          <button
            key={t}
            type="button"
            className="key"
            aria-label={letras ? `letra ${t}` : undefined}
            disabled={locked}
            onClick={() => onKey(t)}
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          className="key is-back"
          title="Borra la última cifra o letra"
          disabled={locked}
          onClick={onBackspace}
        >
          ⌫
        </button>
      </div>

      <div className="keypad-controls">
        <button
          type="button"
          className="key key-ctrl"
          title="Borra la respuesta entera"
          disabled={locked}
          onClick={onLimpiar}
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}

/** El algoritmo en los dos sentidos, tras el botón «ⓘ». */
export function RomanosInfo() {
  return (
    <div className="romanos-info" id="romanos-info">
      <h3>Cómo se pasa de número a romano</h3>
      <ol>
        <li>
          Los símbolos valen: <strong>M = 1000, D = 500, C = 100, L = 50,
          X = 10, V = 5, I = 1</strong>.
        </li>
        <li>
          Escribe primero lo que más vale y ve bajando. Por ejemplo, 14 es{" "}
          <strong>X + IV</strong> (10 + 4).
        </li>
        <li>
          Para restar, pon una letra pequeña delante de una mayor: IV = 4,
          IX = 9, XL = 40, XC = 90, CD = 400, CM = 900.
        </li>
        <li>
          Nunca repitas la misma letra más de tres veces seguidas: III vale 3,
          pero IIII no.
        </li>
      </ol>
      <h3>Cómo se leen</h3>
      <ol>
        <li>
          Mira los símbolos de izquierda a derecha y suma su valor:
          XV = 10 + 5 = 15.
        </li>
        <li>
          Si un símbolo pequeño va delante de uno grande, se resta:
          IV = 5 − 1 = 4; XC = 100 − 10 = 90.
        </li>
      </ol>
    </div>
  );
}

/**
 * Pantalla de selección: tres dificultades, cada una con su rango de
 * números.
 */
export function RomanosDificultades({ onElegir }) {
  return (
    <div className="container">
      <h2 className="zona-title">Elige la dificultad</h2>
      <div className="trivial-cats">
        {DIFICULTADES.map((d) => (
          <button
            key={d.id}
            type="button"
            className="trivial-cat"
            aria-label={`Jugar la dificultad ${d.etiqueta}`}
            onClick={() => onElegir(d.id)}
          >
            <span className="trivial-cat-name">{d.etiqueta}</span>
            <span className="romanos-rango">{d.rango}</span>
          </button>
        ))}
      </div>
      <p className="romanos-nota">
        Cada turno se plantea el número la mitad de las veces en cifras (y se
        responde en romanos) y la mitad en romanos (y se responde en cifras).
      </p>
    </div>
  );
}

/**
 * Juego: la pregunta grande, la botonera para responder y «Comprobar»;
 * «Mostrar solución» da la respuesta con su desglose y «Siguiente»
 * sortea otra pregunta. Sin temporizadores ni contadores.
 */
export function RomanosJuego({
  titulo,
  pregunta,
  respuesta,
  resultado,
  solucion,
  info,
  onKey,
  onBackspace,
  onLimpiar,
  onComprobar,
  onMostrar,
  onSiguiente,
  onVolver,
  onInfo,
}) {
  if (!pregunta) return null;
  const acierto = resultado === "ok";
  const cerrado = acierto || solucion;

  return (
    <div className="container">
      <div className="romanos-cab">
        <p className="group-label">{titulo}</p>
        <button
          type="button"
          className="romanos-info-btn"
          aria-expanded={Boolean(info)}
          aria-controls="romanos-info"
          aria-label="Información: cómo escribir y leer números romanos"
          title="Cómo escribir y leer números romanos"
          onClick={onInfo}
        >
          ⓘ
        </button>
      </div>

      {info && <RomanosInfo />}

      <div className="trivial-card">
        <p className="romanos-instruccion">{pregunta.instruccion}</p>
        <p className="romanos-valor">{pregunta.valor}</p>

        {!solucion ? (
          <>
            <p className="romanos-escribe">Tu respuesta</p>
            <p
              className={`romanos-respuesta${respuesta ? "" : " is-vacio"}`}
              aria-live="polite"
            >
              {respuesta || "…"}
            </p>
            <RomanosTeclado
              tipo={pregunta.teclado}
              onKey={onKey}
              onBackspace={onBackspace}
              onLimpiar={onLimpiar}
              locked={acierto}
            />
            {resultado && (
              <p
                className={`romanos-feedback ${acierto ? "is-ok" : "is-mal"}`}
                role="status"
              >
                {acierto
                  ? "¡Correcto!"
                  : "No es correcto: revísalo e inténtalo otra vez."}
              </p>
            )}
          </>
        ) : (
          <div className="trivial-solucion">
            <p className="trivial-respuesta">{pregunta.respuesta}</p>
            <p className="trivial-detalle">{pregunta.detalle}</p>
          </div>
        )}
      </div>

      <nav className="item-nav" aria-label="Controles del romano">
        <button
          type="button"
          className="btn"
          onClick={onComprobar}
          disabled={!respuesta.trim() || cerrado}
        >
          Comprobar
        </button>
        {!cerrado && (
          <button type="button" className="btn btn-ghost" onClick={onMostrar}>
            Mostrar solución
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onVolver}>
          Cambiar dificultad
        </button>
        {cerrado && (
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
 * Apartado Números romanos: dificultad primero y después turno tras
 * turno, al azar y sin acabarse. «‹ Inicio» vuelve a la portada.
 */
export default function RomanosScreen({ onExit }) {
  const [dificultad, setDificultad] = useState(null);
  const [pregunta, setPregunta] = useState(null);
  const [respuesta, setRespuesta] = useState("");
  const [resultado, setResultado] = useState(null); // null | "ok" | "mal"
  const [solucion, setSolucion] = useState(false);
  const [info, setInfo] = useState(false);

  const limpiarTurno = () => {
    setRespuesta("");
    setResultado(null);
    setSolucion(false);
  };

  const elegir = (id) => {
    setDificultad(id);
    setPregunta(sortearPregunta(id));
    limpiarTurno();
  };

  // Escribir o borrar borra también el aviso de fallo (el de acierto
  // cierra el turno: la botonera queda bloqueada).
  const escribir = (fn) => {
    fn();
    setResultado((r) => (r === "mal" ? null : r));
  };

  const comprobar = () => {
    if (!respuesta.trim() || solucion) return;
    setResultado(respuestaCorrecta(respuesta, pregunta) ? "ok" : "mal");
  };

  const siguiente = () => {
    setPregunta(sortearPregunta(dificultad));
    limpiarTurno();
  };

  const volver = () => {
    setDificultad(null);
    setPregunta(null);
    setInfo(false);
    limpiarTurno();
  };

  const titulo =
    DIFICULTADES.find((d) => d.id === dificultad)?.etiqueta ?? "";

  return (
    <div className="screen">
      <header className="topbar">
        <div className="topbar-inner">
          <button type="button" className="btn btn-ghost" onClick={onExit}>
            ‹ Inicio
          </button>
          <span className="topbar-title">🔢 Números romanos</span>
        </div>
      </header>

      {!dificultad ? (
        <RomanosDificultades onElegir={elegir} />
      ) : (
        <RomanosJuego
          titulo={titulo}
          pregunta={pregunta}
          respuesta={respuesta}
          resultado={resultado}
          solucion={solucion}
          info={info}
          onKey={(k) => escribir(() => setRespuesta((r) => r + k))}
          onBackspace={() => escribir(() => setRespuesta((r) => r.slice(0, -1)))}
          onLimpiar={() => escribir(() => setRespuesta(""))}
          onComprobar={comprobar}
          onMostrar={() => setSolucion(true)}
          onSiguiente={siguiente}
          onVolver={volver}
          onInfo={() => setInfo((v) => !v)}
        />
      )}
    </div>
  );
}
