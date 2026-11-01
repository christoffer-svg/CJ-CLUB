import { NavLink } from 'react-router-dom'
import { useI18n } from '../i18n'
import type { TranslationKey } from '../i18n/translations'
import { useViewer } from '../lib/viewer'
import { CompassIcon, GuideIcon, HomeIcon, PeopleIcon, StarIcon } from './Icons'
import { isChatUnread, useMyChats } from '../lib/social'

const tabs: { to: string; label: TranslationKey; Icon: typeof HomeIcon }[] = [
  { to: '/', label: 'nav.home', Icon: HomeIcon },
  { to: '/guia', label: 'nav.guide', Icon: GuideIcon },
  { to: '/descubrir', label: 'nav.discover', Icon: CompassIcon },
  { to: '/social', label: 'nav.social', Icon: PeopleIcon },
  { to: '/ventajas', label: 'nav.benefits', Icon: StarIcon },
]

export default function BottomNav() {
  const { base, clientId, preview } = useViewer()
  const { t } = useI18n()
  // Aviso en Social si hay mensajes sin leer en sus chats
  const chats = useMyChats(preview ? null : clientId)
  const unread = clientId ? chats.data.some((c) => isChatUnread(c, clientId)) : false
  return (
    <nav className="bottom-nav" aria-label={t('nav.label')}>
      {tabs.map(({ to, label, Icon }) => (
        <NavLink key={to} to={base + (to === '/' && base ? '' : to)} end={to === '/'} className="bottom-nav__item">
          <span className="bottom-nav__icon">
            <Icon size={22} />
            {to === '/social' && unread && <span className="dot bottom-nav__dot" aria-hidden="true" />}
          </span>
          {t(label)}
        </NavLink>
      ))}
    </nav>
  )
}
