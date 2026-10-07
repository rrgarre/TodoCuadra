import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadPalabras,
  sortearPalabra,
  normalizarPalabra,
} from "../../../palabras/loader.js";
import { verificarIntento } from "../../../palabras/rae.js";
import {
  TAM,
  FILAS,
  colorear,
  tecladoDesdeFila,
  fusionarTeclado,
  filaCompleta,
} from "../../utils/lingo.js";

/**
 * Apartado Lingo: adivinar una palabra de 5 letras en 6 intentos.
 *
 * - El tablero son 6 filas de 5 **campos de una letra**; el cursor
 *   (el foco) salta solo hacia la derecha al escribir y el teclado de
 *   abajo también escribe (además se puede usar el teclado del
 *   dispositivo: físico en el ordenador y el del sistema en el móvil).
 * - Un intento solo cuenta si **existe en el diccionario de la RAE**
 *   (o en la lista local `palabras/palabras.txt`): si no, avisa
 *   «Palabra no existe» y la fila no avanza.
 * - Las letras se pintan contra la palabra a adivinar: **verde** en su
 *   posición, **amarillo** si está pero en otra, **gris** si no está;
 *   el teclado inferior guarda el mejor estado de cada letra. Al
 *   comprobar, la fila **gira como paneles, una letra tras otra**
 *   (≈0,9 s) antes de pintarse el teclado y salir el aviso.
 */

const FILAS_TECLADO = ["QWERTYUIOP", "ASDFGHJKLÑ", "ZXCVBNM"];

/**
 * Duración del volteo que hace la fila al comprobar: las 5 casillas
 * giran como paneles con 150 ms de retardo cada una y 300 ms de giro
 * (0,9 s en total) y, cuando acaba, se pinta el teclado y sale el
 * aviso. Debe casar con el `@keyframes lingo-volteo` de screens.css.
 * Con «prefers-reduced-motion» no hay volteo: respuesta al instante.
 */
export const VOLTEO_MS =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : 950;

const filaVacia = () => Array(TAM).fill("");
const tableroVacio = () => Array.from({ length: FILAS }, filaVacia);

/**
 * Tablero de los 6 intentos: casillas de una letra («input» con una
 * sola casilla, sin teclado extra en el móvil). Solo la fila actual
 * se puede escribir; el resto queda de solo lectura. Cada casilla
 * lleva su orden de volteo (`--volteo-orden`) para que al comprobar
 * las letras giran una detrás de otra.
 */
export function LingoTablero({
  filas,
  estados,
  actual,
  jugando,
  refs,
  onEscribir,
  onKey,
  volteando = false,
}) {
  return (
    <div
      className={`lingo-tablero${volteando ? " is-volteando" : ""}`}
      role="group"
      aria-label="Los 6 intentos"
    >
      {filas.map((fila, f) => (
        <div className="lingo-fila" key={f}>
          {fila.map((letra, c) => {
            const estado = estados[f]?.[c] ?? null;
            const editable = jugando && f === actual;
            return (
              <input
                key={c}
                ref={(el) => {
                  refs.current[f * TAM + c] = el;
                }}
                className={`lingo-celda${estado ? ` is-${estado}` : ""}`}
                style={{ "--volteo-orden": String(c) }}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={1}
                value={letra}
                readOnly={!editable}
                tabIndex={editable ? 0 : -1}
                aria-label={`Intento ${f + 1}, letra ${c + 1}`}
                onFocus={(e) => e.target.select()}
                onChange={(e) => onEscribir(f, c, e.target.value)}
                onKeyDown={(e) => onKey(f, c, e)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * Teclado de pantalla en 3 filas (con Ñ): escribe en la fila actual
 * y se va pintando con los resultados (verde > amarillo > gris).
 * `onMouseDown` sin efecto secundario para que el foco no se escape
 * de la casilla y siga sirviendo el teclado del dispositivo.
 */
export function LingoTeclado({
  estados = {},
  disabled = false,
  onKey,
  onEnviar,
  onBorrar,
}) {
  const mantenerFoco = (e) => e.preventDefault();
  return (
    <div className="lingo-teclado" role="group" aria-label="Teclado de letras">
      {FILAS_TECLADO.map((linea, i) => (
        <div className="lingo-teclado-fila" key={linea}>
          {i === 2 && (
            <button
              type="button"
              className="lingo-tecla lingo-tecla--ancha"
              disabled={disabled}
              onMouseDown={mantenerFoco}
              onClick={onEnviar}
            >
              Enviar
            </button>
          )}
          {linea.split("").map((letra) => (
            <button
              key={letra}
              type="button"
              className={`lingo-tecla${estados[letra] ? ` is-${estados[letra]}` : ""}`}
              aria-label={`letra ${letra}`}
              disabled={disabled}
              onMouseDown={mantenerFoco}
              onClick={() => onKey(letra)}
            >
              {letra}
            </button>
          ))}
          {i === 2 && (
            <button
              type="button"
              className="lingo-tecla lingo-tecla--ancha is-back"
              aria-label="Borrar la última letra"
              title="Borra la última letra del intento"
              disabled={disabled}
              onMouseDown={mantenerFoco}
              onClick={onBorrar}
            >
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** Aviso bajo el tablero: fallo, acierto, conexión o «Faltan letras». */
export function LingoMensaje({ mensaje }) {
  if (!mensaje) return null;
  return (
    <p className={`lingo-mensaje is-${mensaje.tipo}`} role="status">
      {mensaje.texto}
    </p>
  );
}

/**
 * Apartado Lingo: se sortea una palabra al entrar y se juega hasta
 * acertar o agotar los 6 intentos; «Palabra nueva» empieza otra. Sin
 * temporizadores ni marcador, y se sale con *‹ Inicio*.
 */
export default function LingoScreen({ onExit }) {
  const palabras = useMemo(() => loadPalabras().palabras, []);
  const [objetivo, setObjetivo] = useState(() => sortearPalabra(palabras));
  const [filas, setFilas] = useState(tableroVacio);
  const [estados, setEstados] = useState(() => Array(FILAS).fill(null));
  const [actual, setActual] = useState(0);
  const [teclado, setTeclado] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [fase, setFase] = useState("jugando"); // jugando | acertado | fallado
  const [comprobando, setComprobando] = useState(false);
  const [volteando, setVolteando] = useState(false);
  const volteoRef = useRef(null);

  const jugando = fase === "jugando" && Boolean(objetivo);
  const editable = jugando && !comprobando && !volteando;
  const refs = useRef([]);
  const enfocar = (f, c) => refs.current[f * TAM + c]?.focus();

  // El cursor arranca en la primera casilla libre de la fila actual y
  // salta a la siguiente fila al comprobar (los `filas` se leen en el
  // render en que se ejecuta; no se reejecuta al teclear para no
  // robarle el foco a quien está escribiendo).
  useEffect(() => {
    if (!editable) return;
    const fila = filas[actual] ?? [];
    const libre = fila.findIndex((l) => !l);
    enfocar(actual, libre === -1 ? TAM - 1 : libre);
  }, [actual, editable, objetivo]);

  // Si se sale de la pantalla con el volteo en marcha, se corta su reloj.
  useEffect(() => () => clearTimeout(volteoRef.current), []);

  const escribir = (f, c, valor) => {
    if (!editable || f !== actual) return;
    const letra = normalizarPalabra(valor).slice(0, 1);
    setFilas((prev) =>
      prev.map((fila, i) =>
        i === f ? fila.map((l, j) => (j === c ? letra : l)) : fila
      )
    );
    setMensaje(null);
    if (letra) enfocar(f, Math.min(c + 1, TAM - 1));
  };

  const borrar = () => {
    if (!editable) return;
    let ultima = -1;
    for (let c = TAM - 1; c >= 0; c -= 1) {
      if (filas[actual][c]) {
        ultima = c;
        break;
      }
    }
    if (ultima === -1) return;
    setFilas((prev) =>
      prev.map((fila, i) =>
        i === actual ? fila.map((l, j) => (j === ultima ? "" : l)) : fila
      )
    );
    setMensaje(null);
    enfocar(actual, ultima);
  };

  const teclaDispositivo = (f, c, e) => {
    if (!editable || f !== actual) return;
    if (e.key === "Enter") {
      e.preventDefault();
      comprobar();
    } else if (e.key === "Backspace") {
      e.preventDefault();
      borrar();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      enfocar(f, Math.max(0, c - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      enfocar(f, Math.min(TAM - 1, c + 1));
    }
  };

  const escribirConTeclado = (letra) => {
    if (!editable) return;
    const libre = filas[actual].findIndex((l) => !l);
    if (libre === -1) return;
    escribir(actual, libre, letra);
  };

  const comprobar = async () => {
    if (!jugando || comprobando || volteando) return;
    if (!filaCompleta(filas[actual])) {
      setMensaje({ tipo: "info", texto: "Faltan letras: la palabra tiene 5." });
      return;
    }
    const intento = filas[actual].join("");
    setComprobando(true);
    setMensaje({ tipo: "info", texto: "Comprobando la palabra…" });
    const ver = await verificarIntento(intento, {
      enLista: palabras.includes(intento),
    });
    if (!ver.ok) {
      // La fila no avanza: hay que modificar el intento.
      setMensaje(
        ver.error === "red"
          ? {
              tipo: "mal",
              texto:
                "No se ha podido comprobar la palabra. Revisa la conexión e inténtalo otra vez.",
            }
          : { tipo: "mal", texto: "Palabra no existe" }
      );
      setComprobando(false);
      return;
    }
    const pista = intento.split("");
    const nuevos = colorear(pista, objetivo.split(""));
    // Las letras se pintan ya y la animación las va girando cara a
    // cara, una detrás de otra; el teclado, el aviso y la fila
    // siguiente esperan a que el volteo termine.
    setEstados((prev) => prev.map((e, i) => (i === actual ? nuevos : e)));
    setMensaje(null);
    setComprobando(false);
    setVolteando(true);
    clearTimeout(volteoRef.current);
    volteoRef.current = setTimeout(() => {
      volteoRef.current = null;
      setTeclado((prev) =>
        fusionarTeclado(prev, tecladoDesdeFila(pista, nuevos))
      );
      if (nuevos.every((e) => e === "ok")) {
        setFase("acertado");
        setMensaje({
          tipo: "bien",
          texto: `¡Correcto! La palabra era ${objetivo}.`,
        });
      } else if (actual + 1 >= FILAS) {
        setFase("fallado");
        setMensaje({
          tipo: "mal",
          texto: `Se acabaron los intentos. La palabra era ${objetivo}.`,
        });
      } else {
        setActual(actual + 1);
      }
      setVolteando(false);
    }, VOLTEO_MS);
  };

  const nuevaPartida = () => {
    clearTimeout(volteoRef.current);
    volteoRef.current = null;
    setObjetivo(sortearPalabra(palabras, Math.random, objetivo));
    setFilas(tableroVacio());
    setEstados(Array(FILAS).fill(null));
    setActual(0);
    setTeclado({});
    setMensaje(null);
    setFase("jugando");
    setComprobando(false);
    setVolteando(false);
  };

  return (
    <div className="screen">
      <header className="topbar">
        <div className="topbar-inner">
          <button type="button" className="btn btn-ghost" onClick={onExit}>
            ‹ Inicio
          </button>
          <span className="topbar-title">🔤 Lingo</span>
        </div>
      </header>

      {!objetivo ? (
        <div className="container">
          <div className="plantilla-aviso" role="alert">
            <strong>⚠ No hay palabras todavía.</strong> Añade palabras de 5
            letras a palabras/palabras.txt (una por línea) y recarga.
          </div>
        </div>
      ) : (
        <div className="container">
          <p className="group-label">{`Palabra de 5 letras · ${FILAS} intentos`}</p>

          <LingoTablero
            filas={filas}
            estados={estados}
            actual={actual}
            jugando={editable}
            volteando={volteando}
            refs={refs}
            onEscribir={escribir}
            onKey={teclaDispositivo}
          />

          <LingoMensaje mensaje={mensaje} />

          <LingoTeclado
            estados={teclado}
            disabled={!editable}
            onKey={escribirConTeclado}
            onEnviar={comprobar}
            onBorrar={borrar}
          />

          <nav className="item-nav" aria-label="Controles del Lingo">
            <button
              type="button"
              className={`btn${jugando ? " btn-ghost" : " btn-secondary"}`}
              onClick={nuevaPartida}
            >
              Palabra nueva
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
