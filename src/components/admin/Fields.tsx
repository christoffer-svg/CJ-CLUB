import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="a-field">
      <span className="a-field__label">{label}</span>
      {children}
      {hint && <span className="a-field__hint">{hint}</span>}
    </label>
  )
}

/** Como Field, pero sin <label> envolvente: para grupos con varios controles (p. ej. un mapa) */
export function FieldGroup({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="a-field" role="group" aria-label={label}>
      <span className="a-field__label">{label}</span>
      {children}
      {hint && <span className="a-field__hint">{hint}</span>}
    </div>
  )
}

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => <input className="a-input" {...props} />
export const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className="a-input a-textarea" rows={3} {...props} />
)
export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => <select className="a-input" {...props} />

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="a-toggle" onClick={() => onChange(!checked)}>
      <span className={checked ? 'a-toggle__track a-toggle__track--on' : 'a-toggle__track'}>
        <span className="a-toggle__thumb" />
      </span>
      <span className="a-toggle__label">{label}</span>
    </button>
  )
}

/** Pareja de campos español / inglés */
export function Bilingual({
  label,
  es,
  en,
  onEs,
  onEn,
  multiline,
}: {
  label: string
  es: string
  en: string
  onEs: (v: string) => void
  onEn: (v: string) => void
  multiline?: boolean
}) {
  const C = multiline ? Textarea : Input
  return (
    <div className="a-bilingual">
      <Field label={`${label} · Español`}>
        <C value={es} onChange={(e: { target: { value: string } }) => onEs(e.target.value)} />
      </Field>
      <Field label={`${label} · Inglés`}>
        <C value={en} onChange={(e: { target: { value: string } }) => onEn(e.target.value)} />
      </Field>
    </div>
  )
}
