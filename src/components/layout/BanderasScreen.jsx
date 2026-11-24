import { useEffect, useMemo, useRef, useState } from "react";
import { loadBanderas } from "../../../banderas/loader.js";
import {
  PUNTOS_ACIERTO,
  PUNTOS_FALLO,
  PUNTOS_SEGUNDO,
  crearPartida,
  clicBandera,
  puntuacion,
  formatoTiempo,
} from "../../utils/banderas.js";

/**
 * Apartado Banderas: adivinar la bandera de un país.
 *
 * - Se sortean hasta **20 banderas** de las que haya en
 *   `banderas/` y salen en una **rejilla de 4 columnas** (4 × 5).
 * - Abajo aparece el nombre de un país y hay que **tocar su
 *   bandera**: al acertar, el nombre pasa al siguiente **al
 *   instante** (la bandera acertada chilla un momento y se queda con
 *   su ✓); un clic equivocado tiembla en rojo, suma un fallo y esa
 *   bandera se apaga hasta la pregunta siguiente.
 * - Marcador con **aciertos, fallos y tiempo total**; al terminar,
 *   la puntuación se desglosa (acierto +100, fallo −50, segundo −2)
 *   para ir probando cómo pesa cada parte.
 */

/**
 * Rejilla de banderas: cada una es un botón con su imagen (sin
 * nombre a la vista). Las ya acertadas quedan con ✓ y las
 * descartadas en la pregunta actual, apagadas.
 */
export function BanderasMatriz({
  banderas,
  usadas = [],
  descartadas = [],
  marcado = null,
  onClic,
}) {
  return (
    <div className="banderas-grid" role="group" aria-label="Las banderas">
      {banderas.map((pais, i) => {
        const usada = usadas.includes(pais.id);
        const descartada = descartadas.includes(pais.id);
        const animado =
          marcado && marcado.id === pais.id
            ? marcado.ok
              ? " is-acerto"
              : " is-fallo"
            : "";
        return (
          <button
            key={pais.id}
            type="button"
            className={`bandera${usada ? " is-usada" : ""}${
              descartada ? " is-descartada" : ""
            }${animado}`}
            disabled={usada || descartada}
            aria-label={`Bandera ${i + 1}${usada ? " (acertada)" : ""}`}
            onClick={() => onClic(pais.id)}
          >
            <img src={pais.url} alt="" draggable={false} />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Resumen al terminar: la puntuación con su desglose (aciertos,
 * fallos y tiempo) y los botones de repetir o salir.
 */
export function BanderasResumen({ partida, onOtra, onExit }) {
  const puntos = puntuacion(partida);
  const ptsAciertos = partida.aciertos * PUNTOS_ACIERTO;
  const ptsFallos = partida.fallos * PUNTOS_FALLO;
  const ptsTiempo = partida.segundos * PUNTOS_SEGUNDO;
  // Punto de millar a mano (es-ES): igual en el navegador y en los
  // tests, sin depender de los datos de Intl de cada máquina.
  const n = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (
    <div className="banderas-resumen" role="status">
      <p className="banderas-resumen-cifra">
        <strong>{n(puntos)}</strong> puntos
      </p>
      <ul className="banderas-desglose">
        <li>
          <span>Aciertos</span>
          <span>{`${partida.aciertos} × ${PUNTOS_ACIERTO} = ${n(ptsAciertos)}`}</span>
        </li>
        <li>
          <span>Fallos</span>
          <span>{`${partida.fallos} × ${PUNTOS_FALLO} = −${n(ptsFallos)}`}</span>
        </li>
        <li>
          <span>Tiempo</span>
          <span>{`${partida.segundos} s × ${PUNTOS_SEGUNDO} = −${n(ptsTiempo)}`}</span>
        </li>
      </ul>
      <p className="banderas-resumen-nota">
        {`${partida.aciertos} banderas · ${partida.fallos} ${
          partida.fallos === 1 ? "fallo" : "fallos"
        } · ${formatoTiempo(partida.segundos)}`}
      </p>
      <nav className="item-nav" aria-label="Controles de Banderas">
        <button type="button" className="btn btn-primary" onClick={onOtra}>
          Otra partida
        </button>
        <button type="button" className="btn btn-ghost" onClick={onExit}>
          ‹ Inicio
        </button>
      </nav>
    </div>
  );
}

/** Cuánto se ve la animación del último clic (los keyframes duran
 *  menos: el check y el re-habilitar esperan a que se vea). */
const MARCA_MS = 600;

/**
 * Apartado Banderas: rejilla arriba, el nombre del país abajo y
 * puntuación con aciertos, fallos y tiempo. Sin temporizador que
 * apure (el reloj corre, pero solo se mira al final) y se sale con
 * *‹ Inicio*.
 */
export default function BanderasScreen({ onExit }) {
  const { paises } = useMemo(() => loadBanderas(), []);
  const [partida, setPartida] = useState(() => crearPartida(paises));
  const marcaRef = useRef(null);

  // Reloj: un segundo por tic mientras se juega (al terminar se
  // queda congelado, porque el tic ya no toca nada).
  useEffect(() => {
    if (paises.length === 0) return undefined;
    const reloj = setInterval(() => {
      setPartida((p) => (p.fase === "jugando" ? { ...p, segundos: p.segundos + 1 } : p));
    }, 1000);
    return () => clearInterval(reloj);
  }, [paises.length]);

  // La marca del último clic (✓ verde o temblor rojo) se borra sola
  // para que la siguiente pregunta arranque limpia.
  useEffect(() => {
    if (!partida.marcado) return undefined;
    clearTimeout(marcaRef.current);
    marcaRef.current = setTimeout(() => {
      marcaRef.current = null;
      setPartida((p) => (p.marcado ? { ...p, marcado: null } : p));
    }, MARCA_MS);
    return () => clearTimeout(marcaRef.current);
  }, [partida.marcado]);
  useEffect(() => () => clearTimeout(marcaRef.current), []);

  const jugando = partida.fase === "jugando";
  const objetivo = partida.objetivos[partida.idx];
  const paisActual = partida.tablero.find((p) => p.id === objetivo) ?? null;
  const usadas = partida.objetivos.slice(0, partida.idx);

  const nuevaPartida = () => {
    clearTimeout(marcaRef.current);
    marcaRef.current = null;
    setPartida(crearPartida(paises));
  };

  return (
    <div className="screen">
      <header className="topbar">
        <div className="topbar-inner">
          <button type="button" className="btn btn-ghost" onClick={onExit}>
            ‹ Inicio
          </button>
          <span className="topbar-title">
            {`🏁 Banderas · ${paises.length} ${
              paises.length === 1 ? "país" : "países"
            }`}
          </span>
        </div>
      </header>

      {paises.length === 0 ? (
        <div className="container">
          <div className="plantilla-aviso" role="alert">
            <strong>⚠ No hay banderas todavía.</strong> Guarda las imágenes en
            banderas/imagenes/ con el mismo nombre que el id de
            banderas/paises.json (p. ej. espana.png) y recarga.
          </div>
        </div>
      ) : !jugando ? (
        <div className="container">
          <p className="group-label">🏁 ¡Terminado!</p>
          <BanderasResumen
            partida={partida}
            onOtra={nuevaPartida}
            onExit={onExit}
          />
        </div>
      ) : (
        <div className="container">
          <p className="group-label">¿De qué país es esta bandera?</p>

          <div className="banderas-marcador" role="status" aria-label="Marcador">
            <span aria-label="Aciertos">✔ {partida.aciertos}</span>
            <span aria-label="Fallos">✘ {partida.fallos}</span>
            <span aria-label="Tiempo">⏱ {formatoTiempo(partida.segundos)}</span>
            <span className="banderas-progreso">
              {partida.idx}/{partida.objetivos.length}
            </span>
          </div>

          <BanderasMatriz
            banderas={partida.tablero}
            usadas={usadas}
            descartadas={partida.descartadas}
            marcado={partida.marcado}
            onClic={(id) => setPartida((p) => clicBandera(p, id))}
          />

          <p className="banderas-pregunta" aria-live="polite">
            <strong className="banderas-nombre" key={partida.idx}>
              {paisActual ? paisActual.nombre : ""}
            </strong>
          </p>
        </div>
      )}
    </div>
  );
}
