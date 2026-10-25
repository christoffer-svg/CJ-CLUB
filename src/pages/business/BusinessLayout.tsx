import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { ToastProvider } from '../../components/admin/Toast'
import { useLiveDoc } from '../../lib/admin'
import type { Place } from '../../lib/types'

const sections = [
  { to: '/negocio', label: 'Descuentos', end: true },
  { to: '/negocio/reservas', label: 'Reservas', end: false },
]

export default function BusinessLayout() {
  const { profile, logout } = useAuth()
  const place = useLiveDoc<Place>(profile?.placeId ? `places/${profile.placeId}` : null)
  const placeName = place.data?.name || profile?.businessName || 'Su negocio'

  return (
    <ToastProvider>
      <header className="header a-header">
        <div className="a-header__row">
          <NavLink to="/negocio" end className="header__brand a-header__brand">
            <img className="header__logo" src="/logo.png" alt="CJ" />
            <span className="eyebrow header__tagline">
              Panel del negocio
              <br />
              {profile?.name}
            </span>
          </NavLink>
          <button className="link-btn a-header__logout" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
        <nav className="a-menu" aria-label="Secciones del negocio">
          {sections.map((s) => (
            <NavLink key={s.to} to={s.to} end={s.end} className="pill a-menu__item">
              {s.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="a-page">
        <Outlet context={{ placeName, place: place.data, placeId: profile?.placeId ?? '' }} />
      </main>
    </ToastProvider>
  )
}

export type BusinessOutlet = { placeName: string; place: Place | null; placeId: string }
