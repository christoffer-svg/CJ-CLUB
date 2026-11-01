import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import RoleSwitcher from '../../components/RoleSwitcher'
import { ToastProvider } from '../../components/admin/Toast'
import { useLiveDoc } from '../../lib/admin'
import type { Place } from '../../lib/types'
import { useBookings } from '../../lib/events'
import { useOrders } from '../../lib/orders'

const sections = [
  { to: '/negocio/presentacion', label: 'Presentación', end: false },
  { to: '/negocio', label: 'Descuentos', end: true },
  { to: '/negocio/pedidos', label: 'Pedidos', end: false },
  { to: '/negocio/eventos', label: 'Eventos', end: false },
  { to: '/negocio/reservas', label: 'Reservas', end: false },
]

export default function BusinessLayout() {
  const { profile, logout } = useAuth()
  const place = useLiveDoc<Place>(profile?.placeId ? `places/${profile.placeId}` : null)
  const placeName = place.data?.name || profile?.businessName || 'Su negocio'
  // Solicitudes de reserva de eventos sin responder
  const newOrders = useOrders({ placeId: profile?.placeId ?? null }).data.filter((o) => o.status === 'new').length
  const pending = useBookings({ placeId: profile?.placeId ?? null }).data.filter((b) => b.status === 'pending').length

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
          <div className="a-header__tools">
            <button className="link-btn a-header__logout" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </div>
        <RoleSwitcher variant="header" />
        <nav className="a-menu" aria-label="Secciones del negocio">
          {sections.filter((s) => s.to !== '/negocio/pedidos' || place.data?.category === 'restaurants').map((s) => (
            <NavLink key={s.to} to={s.to} end={s.end} className="pill a-menu__item">
              {s.label}
              {s.to === '/negocio/eventos' && pending > 0 && <span className="a-badge-count">{pending}</span>}
              {s.to === '/negocio/pedidos' && newOrders > 0 && <span className="a-badge-count">{newOrders}</span>}
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
