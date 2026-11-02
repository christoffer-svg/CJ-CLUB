import { useEffect, useState } from 'react'
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
  const [open, setOpen] = useState(false)
  // Al cambiar de sección, el menú del móvil se cierra
  useEffect(() => setOpen(false), [pathname])
  const current = adminSections.find((s) => pathname.startsWith(s.to))
  const pending = Object.values(badges).reduce((n, b) => n + (b || 0), 0)

  const menu = (
    <nav className="a-nav" aria-label="Secciones del panel">
      <NavLink to="/admin" end className="a-nav__item a-nav__home">
        Inicio del panel
      </NavLink>
      {adminGroups.map((g) => (
        <div key={g.title} className="a-nav__group">
          <span className="a-nav__title">{g.title}</span>
          {g.items.map((s) => (
            <NavLink key={s.to} to={s.to} className="a-nav__item">
              <span>{s.label}</span>
              {badges[s.to] ? <span className="a-badge-count">{badges[s.to]}</span> : null}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )

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
          {/* Móvil: botón que abre el menú completo */}
          <button type="button" className="a-menu-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span className="a-menu-toggle__icon" aria-hidden="true">
              {open ? '×' : '☰'}
            </span>
            <span>{open ? 'Cerrar menú' : current ? current.label : 'Menú'}</span>
            {!open && pending > 0 && <span className="a-badge-count">{pending}</span>}
          </button>
          {open && <div className="a-nav-drawer">{menu}</div>}
        </header>
        <aside className="a-sidebar">{menu}</aside>
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
  return {
    '/admin/mensajes': convs.data.filter((c) => isUnread(c, 'cj')).length,
    '/admin/peticiones': requests.data.filter((r) => r.status === 'new').length,
    '/admin/social': reports.data.length,
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
