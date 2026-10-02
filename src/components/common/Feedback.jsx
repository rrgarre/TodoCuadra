/**
 * Mensaje de corrección. Usa icono + texto + color (nunca solo color)
 * y es anunciado por los lectores de pantalla (aria-live).
 */
export default function Feedback({ type, message }) {
  const icon = type === "ok" ? "✓" : type === "error" ? "✗" : "·";
  return (
    <div
      className={`feedback feedback--${type ?? "empty"}`}
      role="status"
      aria-live="polite"
    >
      <span className="feedback-icon" aria-hidden="true">
        {icon}
      </span>
      <p>{message ?? "\u00a0"}</p>
    </div>
  );
}
