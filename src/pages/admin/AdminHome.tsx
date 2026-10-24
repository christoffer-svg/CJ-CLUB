import { Link } from 'react-router-dom'
import { adminSections, PageTitle } from '../../components/admin/AdminLayout'
import { useAuth } from '../../auth/AuthProvider'

export default function AdminHome() {
  const { profile } = useAuth()
  return (
    <>
      <PageTitle eyebrow="Panel CJ Club" title={profile ? `Hola, ${profile.name}` : 'Panel'} />
      <div className="a-menu-grid">
        {adminSections.map((s) => (
          <Link key={s.to} to={s.to} className="card a-menu-card">
            <span className="card__title">{s.label}</span>
            <span className="card__text">{s.text}</span>
          </Link>
        ))}
      </div>
    </>
  )
}
