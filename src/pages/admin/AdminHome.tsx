import { Link } from 'react-router-dom'
import { adminSections, PageTitle, useBadges } from '../../components/admin/AdminLayout'
import { useAuth } from '../../auth/AuthProvider'

export default function AdminHome() {
  const { profile } = useAuth()
  const badges = useBadges()
  return (
    <>
      <PageTitle eyebrow="Panel CJ Club" title={profile ? `Hola, ${profile.name}` : 'Panel'} />
      <div className="a-menu-grid">
        {adminSections.map((s) => (
          <Link key={s.to} to={s.to} className="card a-menu-card">
            <span className="card__title">
              {s.label}
              {badges[s.to] ? <span className="a-badge-count">{badges[s.to]}</span> : null}
            </span>
            <span className="card__text">{s.text}</span>
          </Link>
        ))}
      </div>
    </>
  )
}
