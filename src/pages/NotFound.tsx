import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'

/** Dirección que no existe en la app */
export default function NotFound() {
  const { t } = useI18n()
  return (
    <main className="login">
      <div className="login__brand">
        <img className="login__logo" src="/logo.png" alt="CJ Real Estate & Services" />
        <span className="eyebrow login__tagline">
          {t('brand.line1')}
          <br />
          {t('brand.line2')}
        </span>
        <hr className="gold-rule" />
        <h1 className="login__title">{t('notfound.title')}</h1>
        <p className="login__intro">{t('notfound.text')}</p>
      </div>
      <div className="login__form">
        <Link className="btn" to="/">
          {t('notfound.home')}
        </Link>
      </div>
    </main>
  )
}
