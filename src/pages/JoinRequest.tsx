import { FirebaseError } from 'firebase/app'
import { httpsCallable } from 'firebase/functions'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import LanguagePills from '../components/LanguagePills'
import { useI18n } from '../i18n'
import type { TranslationKey } from '../i18n/translations'
import { functions } from '../lib/firebase'

type JoinData = { name: string; email: string; phone: string; country: string; message: string; consent: boolean; language: string; website: string }
const send = httpsCallable<JoinData, { ok: boolean }>(functions, 'requestMembership')

/** «Quiero formar parte de CJ Club»: para quien aún no es cliente. Le llega un correo a CJ. */
export default function JoinRequest() {
  const { t, lang } = useI18n()
  const [form, setForm] = useState({ name: '', email: '', phone: '', country: '', message: '', consent: false, website: '' })
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<TranslationKey | ''>('')
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (form.name.trim().length < 3) return setError('join.error.name')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('join.error.email')
    if (form.phone.replace(/\D/g, '').length < 6) return setError('join.error.phone')
    if (!form.consent) return setError('join.error.consent')
    setBusy(true)
    try {
      await send({ ...form, language: lang })
      setSent(true)
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : ''
      const field = err instanceof FirebaseError ? err.message : ''
      if (code === 'functions/resource-exhausted') setError('join.error.limit')
      else if (code === 'functions/invalid-argument' && ['name', 'email', 'phone', 'consent'].includes(field)) setError(`join.error.${field}` as TranslationKey)
      else setError('join.error.generic')
    } finally {
      setBusy(false)
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
        <h1 className="login__title">{sent ? t('join.sentTitle', { name: form.name.trim().split(' ')[0] }) : t('join.title')}</h1>
      </div>

      {sent ? (
        <div className="login__form">
          <p className="login__notice">{t('join.sentText')}</p>
          <Link className="btn" to="/acceso">
            {t('login.back')}
          </Link>
        </div>
      ) : (
        <form className="login__form" onSubmit={submit} noValidate>
          <p className="login__intro">{t('join.intro')}</p>
          <label className="field">
            <span className="field__label">{t('join.name')}</span>
            <input className="field__input" autoComplete="name" required maxLength={120} value={form.name} onChange={set('name')} />
          </label>
          <label className="field">
            <span className="field__label">{t('login.email')}</span>
            <input
              className="field__input"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              maxLength={160}
              value={form.email}
              onChange={set('email')}
            />
          </label>
          <label className="field">
            <span className="field__label">{t('join.phone')}</span>
            <input
              className="field__input"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              required
              maxLength={40}
              placeholder="+46 70 123 45 67"
              value={form.phone}
              onChange={set('phone')}
            />
          </label>
          <label className="field">
            <span className="field__label">{t('join.country')}</span>
            <input className="field__input" autoComplete="country-name" maxLength={80} value={form.country} onChange={set('country')} />
          </label>
          <label className="field">
            <span className="field__label">{t('join.message')}</span>
            <textarea className="field__input join__message" rows={3} maxLength={1500} value={form.message} onChange={set('message')} />
          </label>
          {/* Trampa para robots: invisible para las personas */}
          <input className="join__trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={set('website')} />
          <label className="join__consent">
            <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
            <span>
              {t('join.consent')}{' '}
              <Link to="/privacidad" target="_blank">
                {t('join.privacy')}
              </Link>
              .
            </span>
          </label>
          {error && <p className="login__error">{t(error)}</p>}
          <button className="btn" type="submit" disabled={busy} style={{ marginTop: 10 }}>
            {busy ? t('join.sending') : t('join.submit')}
          </button>
          <Link className="link-btn" to="/acceso">
            {t('login.back')}
          </Link>
        </form>
      )}
    </main>
  )
}
