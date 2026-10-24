import { useEffect, useRef, type ReactNode } from 'react'

/** Hoja que sube desde abajo, con fondo oscurecido. Se cierra con el botón, tocando fuera o con Escape. */
export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <span className="sheet__handle" aria-hidden="true" />
        {children}
        <button ref={closeRef} className="btn btn--ghost sheet__close" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  )
}
