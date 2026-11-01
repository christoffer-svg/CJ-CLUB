import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import LanguagePills from '../../components/LanguagePills'
import RoleSwitcher from '../../components/RoleSwitcher'
import { useI18n } from '../../i18n'

/** Panel del arquitecto o diseñador: las reformas en las que participa (planos, conversación y avances) */
export default function DesignerLayout() {
  const { profile, logout } = useAuth()
  const { t } = useI18n()
  return (
    <>
      <header className="header a-header">
        <div className="a-header__row">
          <NavLink to="/estudio" end className="header__brand a-header__brand">
            <img className="header__logo" src="/logo.png" alt="CJ" />
            <span className="eyebrow header__tagline">
              {t('designer.panel')}
              <br />
              {profile?.companyName || profile?.name}
            </span>
          </NavLink>
          <div className="a-header__tools">
            <LanguagePills />
            <button className="link-btn a-header__logout" onClick={logout}>
              {t('home.logout')}
            </button>
          </div>
        </div>
        <RoleSwitcher variant="header" />
      </header>
      <main className="a-page builder-page">
        <Outlet />
      </main>
    </>
  )
}
