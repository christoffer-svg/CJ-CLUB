import { useEffect, type FormEvent, type ReactNode } from 'react'

/** Ventana para añadir o editar, con "Cancelar" y "Guardar" */
export default function Dialog({
  title,
  onClose,
  onSubmit,
  busy,
  submitLabel = 'Guardar',
  children,
}: {
  title: string
  onClose: () => void
  onSubmit: () => void
  busy?: boolean
  submitLabel?: string
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop a-dialog-backdrop" onClick={onClose}>
      <form
        className="a-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <h2 className="a-dialog__title">{title}</h2>
        <div className="a-dialog__body">{children}</div>
        <div className="a-actions">
          <button type="button" className="btn btn--ghost a-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn a-btn" disabled={busy}>
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
