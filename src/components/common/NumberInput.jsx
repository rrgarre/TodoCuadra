/**
 * Campo numérico grande y cómodo para móvil (inputMode numérico).
 * Los valores se guardan siempre como texto para no perder lo que escribe
 * el alumno mientras edita.
 */
export default function NumberInput({
  label,
  value,
  onValue,
  disabled,
  invalid,
  placeholder,
  id,
  width,
}) {
  const inputId = id ?? `num-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <>
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={`input-number${invalid ? " is-error" : ""}`}
        style={width ? { width } : undefined}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        spellCheck="false"
        disabled={disabled}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onValue(e.target.value.replace(/[^0-9]/g, ""))}
      />
    </>
  );
}
