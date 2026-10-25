import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import LanguagePills from './LanguagePills'

type Props = {
  eyebrow?: string
  title: string
  subtitle?: string
  /** deja espacio abajo para una tarjeta superpuesta */
  overlap?: boolean
  /** enlace "Volver" en páginas secundarias */
  back?: string
}

export default function Header({ eyebrow, title, subtitle, overlap, back }: Props) {
  const { t } = useI18n()
  return (
    <header className={overlap ? 'header header--overlap' : 'header'}>
      <div className="header__top">
        <div className="header__brand">
          <img className="header__logo" src="/logo.png" alt="CJ" />
          <span className="eyebrow header__tagline">
            {t('brand.line1')}
            <br />
            {t('brand.line2')}
          </span>
        </div>
        <LanguagePills />
      </div>
      {back && (
        <Link to={back} className="header__back">
          ‹ {t('common.back')}
        </Link>
      )}
      {eyebrow && (
        <p className="eyebrow" style={{ marginTop: 26 }}>
          {eyebrow}
        </p>
      )}
      <h1 className="header__title" style={eyebrow ? { marginTop: 8 } : undefined}>
        {title}
      </h1>
      {subtitle && <p className="header__subtitle">{subtitle}</p>}
    </header>
  )
}
