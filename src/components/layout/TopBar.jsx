import Progress from "../common/Progress.jsx";

/** Barra superior de una sección: dónde estoy y botón de inicio. */
export default function TopBar({
  sectionTitle,
  itemLabel,
  done,
  total,
  onHome,
}) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          ⌂ Inicio
        </button>
        <span className="topbar-title">{sectionTitle}</span>
        <span className="topbar-meta">{itemLabel}</span>
      </div>
      <Progress done={done} total={total} />
    </header>
  );
}
