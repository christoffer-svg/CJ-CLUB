import { NavLink } from 'react-router-dom'
import { CompassIcon, GuideIcon, HomeIcon, StarIcon } from './Icons'

const tabs = [
  { to: '/', label: 'Inicio', Icon: HomeIcon },
  { to: '/guia', label: 'Guía', Icon: GuideIcon },
  { to: '/descubrir', label: 'Descubrir', Icon: CompassIcon },
  { to: '/ventajas', label: 'Ventajas', Icon: StarIcon },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className="bottom-nav__item">
          <Icon size={22} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
