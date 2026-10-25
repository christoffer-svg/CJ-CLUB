import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { useLiveCollection } from '../../lib/admin'
import { isUnread } from '../../lib/messaging'
import type { ClientRequest, Conversation } from '../../lib/types'
import { ToastProvider } from './Toast'

export const adminSections = [
  { to: '/admin/resumen', label: 'Resumen del mes', text: 'Clientes, descuentos usados y lugares guardados' },
  { to: '/admin/reservas', label: 'Reservas', text: 'Pinchazos y reservas de los restaurantes' },
  { to: '/admin/mensajes', label: 'Mensajes', text: 'Conversaciones con los clientes' },
  { to: '/admin/peticiones', label: 'Peticiones', text: 'Presupuestos, llaves, reparaciones y más' },
  { to: '/admin/clientes', label: 'Clientes', text: 'Fichas, contactos asignados e invitaciones' },
  { to: '/admin/colaboradores', label: 'Colaboradores', text: 'Abogados, gestorías, piscinas y más' },
  { to: '/admin/contactos', label: 'Contactos generales', text: 'Urgencias, salud y transporte' },
  { to: '/admin/lugares', label: 'Lugares', text: 'Restaurantes, golf, playas y planes' },
  { to: '/admin/negocios', label: 'Negocios', text: 'Acceso para que cada negocio publique sus descuentos' },
  { to: '/admin/descuentos', label: 'Descuentos', text: 'Ocultar o retirar ofertas. Las publica el negocio' },
  { to: '/admin/consejo', label: 'Consejo de la semana', text: 'Texto en español e inglés' },
]

export default function AdminLayout() {
  const { profile, logout } = useAuth()
  const badges = useBadges()
  return (
    <ToastProvider>
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
          <button className="link-btn a-header__logout" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
        <nav className="a-menu" aria-label="Secciones del panel">
          {adminSections.map((s) => (
            <NavLink key={s.to} to={s.to} className="pill a-menu__item">
              {s.label}
              {badges[s.to] ? <span className="a-badge-count">{badges[s.to]}</span> : null}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="a-page">
        <Outlet />
      </main>
    </ToastProvider>
  )
}

/** Avisos del menú: conversaciones sin leer y peticiones nuevas */
// oxlint-disable-next-line react/only-export-components
export function useBadges(): Record<string, number> {
  const convs = useLiveCollection<Conversation>('conversations')
  const requests = useLiveCollection<ClientRequest>('requests')
  return {
    '/admin/mensajes': convs.data.filter((c) => isUnread(c, 'cj')).length,
    '/admin/peticiones': requests.data.filter((r) => r.status === 'new').length,
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
