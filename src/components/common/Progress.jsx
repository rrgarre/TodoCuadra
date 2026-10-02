/** Barra de progreso de la sección. */
export default function Progress({ done, total }) {
  const safeTotal = Math.max(total, 1);
  const pct = Math.round((done / safeTotal) * 100);
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label={`Progreso: ${done} de ${total} completados`}
    >
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-label">
        {done}/{total}
      </span>
    </div>
  );
}
