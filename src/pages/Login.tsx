import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { homeFor, Splash } from '../auth/guards'
import LanguagePills from '../components/LanguagePills'
import { CompassIcon, KeyIcon, StarIcon } from '../components/Icons'
import Sheet from '../components/Sheet'
import { useI18n } from '../i18n'
import type { TranslationKey } from '../i18n/translations'
import { auth } from '../lib/firebase'

type Mode = 'login' | 'reset'

function loginError(e: unknown): TranslationKey {
  const code = e instanceof FirebaseError ? e.code : ''
  if (code === 'auth/too-many-requests') return 'login.error.tooMany'
  if (code === 'auth/network-request-failed') return 'login.error.network'
  if (code === 'auth/user-disabled') return 'login.error.disabled'
  return 'login.error.credentials'
}

export default function Login() {
  const { loading, user, profile, logout } = useAuth()
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<TranslationKey | ''>('')
  const [notice, setNotice] = useState<TranslationKey | ''>('')
  const [install, setInstall] = useState(false)

  if (loading && !busy) return <Splash />
  if (user && profile) return <Navigate to={homeFor(profile.role)} replace />

  // Tiene cuenta pero CJ no le ha dado acceso (sin ficha en Firestore)
  const notInvited = !loading && user && !profile

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      } else {
        // Tras elegir la nueva contraseña, la página de Firebase ofrece volver a CJ Club
        await sendPasswordResetEmail(auth, email.trim(), { url: `${window.location.origin}/acceso` })
        setNotice('login.resetSent')
      }
    } catch (err) {
      if (mode === 'login') setError(loginError(err))
      // En modo recuperar mostramos siempre el mismo aviso, para no revelar qué correos existen
      else setNotice('login.resetSent')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <div className="login__lang">
        <LanguagePills showName />
      </div>
      <div className="login__brand">
        <img className="login__logo" src="/logo.png" alt="CJ Real Estate & Services" />
        <span className="eyebrow login__tagline">
          {t('brand.line1')}
          <br />
          {t('brand.line2')}
        </span>
        <hr className="gold-rule" />
        <h1 className="login__title">{t('login.title')}</h1>
        {/* Qué ofrece CJ Club, para quien llega por primera vez */}
        <ul className="login__benefits">
          <li>
            <KeyIcon size={20} />
            <span>
              <b>{t('login.b1t')}</b>
              {t('login.b1x')}
            </span>
          </li>
          <li>
            <CompassIcon size={20} />
            <span>
              <b>{t('login.b2t')}</b>
              {t('login.b2x')}
            </span>
          </li>
          <li>
            <StarIcon size={20} />
            <span>
              <b>{t('login.b3t')}</b>
              {t('login.b3x')}
            </span>
          </li>
        </ul>
      </div>

      <form className="login__form" onSubmit={submit} noValidate>
        {mode === 'reset' && <p className="login__intro">{t('login.resetIntro')}</p>}
        <label className="field">
          <span className="field__label">{t('login.email')}</span>
          <input
            className="field__input"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {mode === 'login' && (
          <label className="field">
            <span className="field__label">{t('login.password')}</span>
            <input
              className="field__input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}

        {notInvited && <p className="login__error">{t('login.notInvited')}</p>}
        {error && <p className="login__error">{t(error)}</p>}
        {notice && <p className="login__notice">{t(notice)}</p>}

        <button className="btn" type="submit" disabled={busy || !email} style={{ marginTop: 10 }}>
          {mode === 'login' ? t('login.submit') : t('login.sendLink')}
        </button>

        <button
          type="button"
          className="link-btn"
          onClick={() => {
            if (notInvited) logout()
            setMode(mode === 'login' ? 'reset' : 'login')
            setError('')
            setNotice('')
          }}
        >
          {mode === 'login' ? t('login.forgot') : t('login.back')}
        </button>
        <p className="login__note">{t('login.note')}</p>
        {mode === 'login' && (
          <Link className="btn btn--ghost login__join" to="/unirse">
            {t('join.cta')}
          </Link>
        )}
      </form>
      <footer className="login__footer">
        <p>
          {t('login.contact')} <a href="mailto:info@cjclub.eu">info@cjclub.eu</a>
        </p>
        <button type="button" className="link-btn login__install" onClick={() => setInstall(true)}>
          {t('install.link')}
        </button>
        <nav className="login__legal" aria-label={t('legal.links')}>
          <Link to="/privacidad">{t('legal.privacy')}</Link>
          <span aria-hidden="true">·</span>
          <Link to="/aviso-legal">{t('legal.notice')}</Link>
        </nav>
        <p className="login__cookies">{t('login.cookies')}</p>
      </footer>
      {install && (
        <Sheet title={t('install.title')} closeLabel={t('install.close')} onClose={() => setInstall(false)}>
          <h2 className="sheet__title">{t('install.title')}</h2>
          <p className="sheet__text">{t('install.ios')}</p>
          <p className="sheet__text">{t('install.android')}</p>
          <p className="sheet__text">{t('install.after')}</p>
        </Sheet>
      )}
    </main>
  )
}
