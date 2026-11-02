import { confirmPasswordReset, signInWithEmailAndPassword, verifyPasswordResetCode } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { homeFor } from '../auth/guards'
import LanguagePills from '../components/LanguagePills'
import { languages, useI18n } from '../i18n'
import type { TranslationKey } from '../i18n/translations'
import { auth } from '../lib/firebase'

/**
 * Elegir contraseña desde el correo de invitación de CJ (enlace /contrasena?code=…&lang=…).
 * Al guardarla, la persona entra directamente en CJ Club (su app o su panel).
 */
export default function SetPassword() {
  const [params] = useSearchParams()
  const code = params.get('code') ?? ''
  const { user, profile } = useAuth()
  const { t, lang, setLang } = useI18n()
  const [email, setEmail] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<TranslationKey | ''>('')

  // El correo llega en el idioma de la persona: la pantalla también
  useEffect(() => {
    const l = params.get('lang')
    const found = languages.find((x) => x.code === l)
    if (found && found.code !== lang) setLang(found.code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!code) {
      setInvalid(true)
      return
    }
    verifyPasswordResetCode(auth, code)
      .then(setEmail)
      .catch(() => setInvalid(true))
  }, [code])

  // Contraseña guardada y sesión abierta: a su página de inicio
  if (done && user && profile) return <Navigate to={homeFor(profile.role)} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('setpw.short')
    if (password !== repeat) return setError('setpw.mismatch')
    setBusy(true)
    try {
      await confirmPasswordReset(auth, code, password)
    } catch (err) {
      const c = err instanceof FirebaseError ? err.code : ''
      if (c === 'auth/weak-password') setError('setpw.weak')
      else if (c === 'auth/expired-action-code' || c === 'auth/invalid-action-code') setInvalid(true)
      else if (c === 'auth/network-request-failed') setError('login.error.network')
      else setError('setpw.error')
      setBusy(false)
      return
    }
    try {
      await signInWithEmailAndPassword(auth, email ?? '', password)
      setDone(true)
    } catch {
      // La contraseña ya está guardada: si no entra solo, entra desde la pantalla de acceso
      window.location.assign('/acceso')
    }
  }

  return (
    <main className="login">
      <div className="login__lang">
        <LanguagePills />
      </div>
      <div className="login__brand">
        <img className="login__logo" src="/logo.png" alt="CJ Real Estate & Services" />
        <span className="eyebrow login__tagline">
          {t('brand.line1')}
          <br />
          {t('brand.line2')}
        </span>
        <hr className="gold-rule" />
        <h1 className="login__title">{t('setpw.title')}</h1>
      </div>

      {invalid ? (
        <div className="login__form">
          <p className="login__error">{t('setpw.expired')}</p>
          <Link className="btn" to="/acceso">
            {t('setpw.toLogin')}
          </Link>
        </div>
      ) : email === null ? (
        <div className="login__form">
          <p className="login__intro">{t('setpw.checking')}</p>
        </div>
      ) : (
        <form className="login__form" onSubmit={submit} noValidate>
          <p className="login__intro">{t('setpw.intro', { email })}</p>
          {/* Para que el móvil ofrezca guardar la contraseña con el correo correcto */}
          <input type="email" autoComplete="username" value={email} readOnly hidden />
          <label className="field">
            <span className="field__label">{t('setpw.password')}</span>
            <input
              className="field__input"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">{t('setpw.repeat')}</span>
            <input
              className="field__input"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </label>
          <p className="login__note">{t('setpw.hint')}</p>
          {error && <p className="login__error">{t(error)}</p>}
          <button className="btn" type="submit" disabled={busy || !password || !repeat} style={{ marginTop: 10 }}>
            {t('setpw.submit')}
          </button>
        </form>
      )}
    </main>
  )
}
