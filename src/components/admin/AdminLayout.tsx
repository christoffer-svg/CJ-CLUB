import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { ToastProvider } from './Toast'

export const adminSections = [
  { to: '/admin/clientes', label: 'Clientes', text: 'Fichas, contactos asignados e invitaciones' },
  { to: '/admin/colaboradores', label: 'Colaboradores', text: 'Abogados, gestorías, piscinas y más' },
  { to: '/admin/contactos', label: 'Contactos generales', text: 'Urgencias, salud y transporte' },
  { to: '/admin/lugares', label: 'Lugares', text: 'Restaurantes, golf, playas y planes' },
  { to: '/admin/descuentos', label: 'Descuentos', text: 'Ventajas y usos de este mes' },
  { to: '/admin/consejo', label: 'Consejo de la semana', text: 'Texto en español e inglés' },
]

export default function AdminLayout() {
  const { profile, logout } = useAuth()
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
