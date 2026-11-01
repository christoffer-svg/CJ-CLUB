import { useNavigate } from 'react-router-dom'
import { homeFor } from '../auth/guards'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { rolesOf } from '../lib/roles'
import type { Role } from '../lib/types'

/**
 * Si la persona tiene varios accesos con el mismo correo (p. ej. cliente y negocio), botones para pasar
 * de uno a otro. "header": en la cabecera de los paneles; "home": en el inicio del cliente
 * (no se muestra en la vista previa que usa CJ para ver la app como un cliente).
 */
export default function RoleSwitcher({ variant }: { variant: 'header' | 'home' }) {
  const { profile, switchRole } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  if (!profile) return null
  const others = rolesOf(profile).filter((r) => r !== profile.role && (r !== 'client' || profile.clientId))
  if (!others.length) return null
  const go = async (r: Role) => {
    if (await switchRole(r)) navigate(homeFor(r), { replace: true })
  }
  if (variant === 'header')
    return (
      <div className="role-bar" role="group" aria-label={t('role.switch')}>
        <span className="eyebrow">{t('role.switch')}</span>
        {others.map((r) => (
          <button key={r} type="button" className="house-pill" onClick={() => go(r)}>
            {t(`role.${r}`)}
          </button>
        ))}
      </div>
    )
  return (
    <div className="houses" role="group" aria-label={t('role.access')}>
      <span className="eyebrow">{t('role.access')}</span>
      <div className="houses__list">
        <button type="button" className="house-pill house-pill--active" aria-pressed="true">
          {t(`role.${profile.role}`)}
        </button>
        {others.map((r) => (
          <button key={r} type="button" className="house-pill" aria-pressed="false" onClick={() => go(r)}>
            {t(`role.${r}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
