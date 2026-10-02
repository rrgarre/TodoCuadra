/**
 * Rejilla de las operaciones verticales.
 *
 * Se posiciona con CSS Grid usando columnas/filas calculadas (nada de
 * posiciones absolutas), de modo que las cifras quedan alineadas en
 * cualquier pantalla.
 */
export default function DigitGrid({ cols, onFillDigits, children }) {
  const handlePaste = (event) => {
    if (!onFillDigits) return;
    const text = event.clipboardData?.getData("text") ?? "";
    const digits = text.replace(/[^0-9]/g, "");
    if (!digits) return;
    event.preventDefault();

    const inputs = Array.from(
      event.currentTarget.querySelectorAll("input[data-digit]")
    ).sort((a, b) => Number(a.dataset.order) - Number(b.dataset.order));
    if (!inputs.length) return;

    // Se alinean por la derecha: la última cifra va a la casilla de las
    // unidades (orden 0) y el resto avanza hacia la izquierda.
    const chars = digits.split("").reverse();
    chars.forEach((ch, i) => {
      const input = inputs[i];
      if (input && !input.disabled) {
        onFillDigits(input.dataset.cellId, ch);
      }
    });
  };

  return (
    <div className="vgrid-wrap">
      <div
        className="vgrid"
        data-digit-grid=""
        style={{ gridTemplateColumns: `repeat(${cols}, var(--cell))` }}
        onPaste={onFillDigits ? handlePaste : undefined}
      >
        {children}
      </div>
    </div>
  );
}
