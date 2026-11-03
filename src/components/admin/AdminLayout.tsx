import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import RoleSwitcher from '../../components/RoleSwitcher'
import { useLiveCollection } from '../../lib/admin'
import { isUnread } from '../../lib/messaging'
import type { ClientRequest, Conversation } from '../../lib/types'
import BackButton from './BackButton'
import { ToastProvider } from './Toast'

const S = (to: string, label: string, text: string) => ({ to, label, text })

/** Secciones del panel, agrupadas */
export const adminGroups = [
  {
    title: 'Día a día',
    items: [
      S('/admin/resumen', 'Resumen del mes', 'Clientes, descuentos usados y lugares guardados'),
      S('/admin/mensajes', 'Mensajes', 'Conversaciones con los clientes'),
      S('/admin/peticiones', 'Peticiones', 'Servicios, presupuestos, llaves, reparaciones y más'),
      S('/admin/reservas', 'Reservas', 'Pinchazos y reservas de los restaurantes'),
      S('/admin/pedidos', 'Pedidos de comida', 'Pedidos para llevar y a domicilio de los restaurantes'),
    ],
  },
  {
    title: 'Clientes',
    items: [
      S('/admin/clientes', 'Clientes', 'Fichas, contactos asignados e invitaciones'),
      S('/admin/solicitudes', 'Solicitudes para unirse', 'Personas que aún no son clientes y quieren formar parte'),
      S('/admin/reformas', 'Reformas', 'Obras: presupuestos, pagos, extras y repasos'),
      S('/admin/constructores', 'Profesionales', 'Constructores, oficios, arquitectos y diseñadores'),
      S('/admin/servicios', 'Servicios de CJ', 'Key holding, reformas, vigilancia… con o sin precio'),
      S('/admin/social', 'Social', 'Planes y recomendaciones de los clientes; avisos'),
    ],
  },
  {
    title: 'Guía y Descubrir',
    items: [
      S('/admin/colaboradores', 'Colaboradores', 'Abogados, gestorías, piscinas y más'),
      S('/admin/contactos', 'Contactos generales', 'Urgencias, salud y transporte'),
      S('/admin/lugares', 'Lugares', 'Restaurantes, golf, playas y planes'),
      S('/admin/negocios', 'Negocios', 'Acceso para que cada negocio publique en la app'),
      S('/admin/eventos', 'Eventos', 'Catas, música en vivo y reservas de los negocios'),
      S('/admin/descuentos', 'Descuentos', 'Ocultar o retirar ofertas. Las publica el negocio'),
      S('/admin/consejo', 'Consejo de la semana', 'Texto en español e inglés'),
    ],
  },
]

export const adminSections = adminGroups.flatMap((g) => g.items)

export default function AdminLayout() {
  const { profile, logout } = useAuth()
  const badges = useBadges()
  const { pathname } = useLocation()
  // Grupo desplegado (Día a día, Clientes, Guía y Descubrir); se cierra al cambiar de página
  const [open, setOpen] = useState<string | null>(null)
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => setOpen(null), [pathname])
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !bar.current?.contains(e.target as Node) && setOpen(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  const currentGroup = adminGroups.find((g) => g.items.some((s) => pathname.startsWith(s.to)))?.title
  const pendingIn = (g: (typeof adminGroups)[number]) => g.items.reduce((n, s) => n + (badges[s.to] || 0), 0)
  const shown = adminGroups.find((g) => g.title === open)

  return (
    <ToastProvider>
      <div className="a-shell">
        <header className="header a-header">
          <div className="a-header__row">
            <NavLink to="/admin" end className="header__brand a-header__brand">
              <img className="header__logo" src="/logo.png" alt="CJ" />
              <span className="eyebrow header__tagline">
                Panel CJ Club
                <br />
                {profile?.name}
              </span>
            </NavLink>
            <div className="a-header__tools">
              <button className="link-btn a-header__logout" onClick={logout}>
                Cerrar sesión
              </button>
            </div>
          </div>
          <RoleSwitcher variant="header" />
          {/* Menú: tres grupos; al pulsar uno se despliegan sus secciones */}
          <div className="a-topnav" ref={bar}>
            <nav className="a-topnav__bar" aria-label="Secciones del panel">
              {adminGroups.map((g) => {
                const pending = pendingIn(g)
                const cls = ['a-topnav__group', g.title === currentGroup ? 'a-topnav__group--current' : '', g.title === open ? 'a-topnav__group--open' : '']
                return (
                  <button
                    key={g.title}
                    type="button"
                    className={cls.filter(Boolean).join(' ')}
                    aria-expanded={g.title === open}
                    onClick={() => setOpen(g.title === open ? null : g.title)}
                  >
                    <span>{g.title}</span>
                    {pending > 0 && <span className="a-badge-count">{pending}</span>}
                    <span className="a-topnav__caret" aria-hidden="true">
                      ▾
                    </span>
                  </button>
                )
              })}
            </nav>
            {shown && (
              <div className="a-topnav__panel">
                {shown.items.map((s) => (
                  <NavLink key={s.to} to={s.to} className="a-topnav__item">
                    <span className="a-topnav__label">
                      {s.label}
                      {badges[s.to] ? <span className="a-badge-count">{badges[s.to]}</span> : null}
                    </span>
                    <span className="a-topnav__text">{s.text}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </header>
        <main className="a-page">
          <BackButton home="/admin" sections={adminSections.map((s) => s.to)} />
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  )
}

export function useBadges(): Record<string, number> {
  const convs = useLiveCollection<Conversation>('conversations')
  const requests = useLiveCollection<ClientRequest>('requests')
  const reports = useLiveCollection<{ postId: string }>('socialReports')
  const joins = useLiveCollection<{ status: string }>('membershipRequests')
  return {
    '/admin/mensajes': convs.data.filter((c) => isUnread(c, 'cj')).length,
    '/admin/peticiones': requests.data.filter((r) => r.status === 'new').length,
    '/admin/social': reports.data.length,
    '/admin/solicitudes': joins.data.filter((r) => r.status === 'new').length,
  }
}

export function PageTitle({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: React.ReactNode }) {
  return (
    <div className="a-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="a-title__h">{title}</h1>
      </div>
      {children && <div className="a-title__actions">{children}</div>}
    </div>
  )
}
