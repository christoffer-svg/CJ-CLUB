/** Interruptor "Compartir con CJ". Desmarcado, el dato sigue siendo privado. */
export default function ShareField({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  hint: string
}) {
  return (
    <label className="share-field">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="share-field__label">{label}</span>
        <span className="share-field__hint">{hint}</span>
      </span>
    </label>
  )
}
