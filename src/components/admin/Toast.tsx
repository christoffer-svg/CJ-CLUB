import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type ToastApi = (message: string, tone?: 'ok' | 'error') => void
const ToastContext = createContext<ToastApi>(() => {})

/** Aviso breve abajo de la pantalla, p. ej. "Guardado para Familia Jansen" */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const show = useCallback<ToastApi>((message, tone = 'ok') => {
    window.clearTimeout(timer.current)
    setToast({ message, tone })
    timer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-area" role="status" aria-live="polite">
        {toast && <div className={toast.tone === 'error' ? 'toast toast--error' : 'toast'}>{toast.message}</div>}
      </div>
    </ToastContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export const useToast = () => useContext(ToastContext)
