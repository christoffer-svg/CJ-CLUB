import { NavLink } from 'react-router-dom'
import { useI18n } from '../i18n'
import type { TranslationKey } from '../i18n/translations'
import { useViewer } from '../lib/viewer'
import { CompassIcon, GuideIcon, HomeIcon, StarIcon } from './Icons'

const tabs: { to: string; label: TranslationKey; Icon: typeof HomeIcon }[] = [
  { to: '/', label: 'nav.home', Icon: HomeIcon },
  { to: '/guia', label: 'nav.guide', Icon: GuideIcon },
  { to: '/descubrir', label: 'nav.discover', Icon: CompassIcon },
  { to: '/ventajas', label: 'nav.benefits', Icon: StarIcon },
]

export default function BottomNav() {
  const { base } = useViewer()
  const { t } = useI18n()
  return (
    <nav className="bottom-nav" aria-label={t('nav.label')}>
      {tabs.map(({ to, label, Icon }) => (
        <NavLink key={to} to={base + (to === '/' && base ? '' : to)} end={to === '/'} className="bottom-nav__item">
          <Icon size={22} />
          {t(label)}
        </NavLink>
      ))}
    </nav>
  )
}
