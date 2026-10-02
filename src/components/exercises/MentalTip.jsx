import { useTipController } from "../../state/SheetContext.jsx";

/**
 * Tarjeta de truco/estrategia de cálculo mental.
 * Se muestra después de algunos ejercicios y también en la sección de
 * "Trucos de cálculo mental".
 */
export default function MentalTip({ tip }) {
  const { revealed, toggle, next } = useTipController(tip);

  return (
    <article className="card tip">
      <header className="tip-head">
        <span className="tip-badge">💡 Truco de cálculo</span>
        <h2>{tip.title}</h2>
      </header>

      {!revealed ? (
        <>
          <p className="tip-tease">{tip.tease}</p>
          <div className="tip-actions">
            <button type="button" className="btn btn-primary" onClick={toggle}>
              Ver truco
            </button>
            <button type="button" className="btn btn-ghost" onClick={next}>
              Continuar
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="tip-short">{tip.short}</p>
          <div className="tip-example">
            <p className="tip-expr">{tip.example.expr}</p>
            <ol>
              {tip.example.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
          <p className="tip-explanation">{tip.explanation}</p>
          <div className="tip-actions">
            <button type="button" className="btn btn-primary" onClick={next}>
              Continuar
            </button>
          </div>
        </>
      )}
    </article>
  );
}
