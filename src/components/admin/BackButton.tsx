import { useLocation, useNavigate } from 'react-router-dom'

/**
 * «‹ Volver» de los paneles (CJ y negocios): vuelve a la pantalla anterior, como la flecha del
 * navegador. Si se entró directamente (enlace o recarga), sube a la sección de arriba.
 * No se muestra en la página de inicio del panel.
 */
export default function BackButton({ home, sections = [] }: { home: string; sections?: string[] }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  if (pathname.replace(/\/+$/, '') === home) return null
  // La sección que contiene esta página (p. ej. /admin/clientes para /admin/clientes/jansen)
  const parent = sections.filter((s) => pathname.startsWith(s + '/')).sort((a, b) => b.length - a.length)[0] ?? home
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(parent)
  }
  return (
    <button type="button" className="a-back" onClick={goBack}>
      ‹ Volver
    </button>
  )
}
