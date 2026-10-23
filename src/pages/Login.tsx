import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { homeFor, Splash } from '../auth/guards'
import { auth } from '../lib/firebase'

type Mode = 'login' | 'reset'

function loginError(e: unknown) {
  const code = e instanceof FirebaseError ? e.code : ''
  if (code === 'auth/too-many-requests') return 'Demasiados intentos. Espere unos minutos y vuelva a probar.'
  if (code === 'auth/network-request-failed') return 'Sin conexión. Compruebe su internet.'
  if (code === 'auth/user-disabled') return 'Este acceso está desactivado. Contacte con CJ.'
  return 'Correo o contraseña incorrectos.'
}

export default function Login() {
  const { loading, user, profile, logout } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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
        await sendPasswordResetEmail(auth, email.trim())
        setNotice('Si el correo está registrado en CJ Club, recibirá un enlace para crear una nueva contraseña.')
      }
    } catch (err) {
      if (mode === 'login') setError(loginError(err))
      // En modo recuperar mostramos siempre el mismo aviso, para no revelar qué correos existen
      else setNotice('Si el correo está registrado en CJ Club, recibirá un enlace para crear una nueva contraseña.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <div className="login__brand">
        <img className="login__logo" src="/logo.png" alt="CJ Real Estate & Services" />
        <span className="eyebrow login__tagline">
          Real Estate &amp; Services
          <br />
          Costa Blanca
        </span>
        <hr className="gold-rule" />
        <h1 className="login__title">Su vida en la Costa Blanca, más fácil.</h1>
      </div>

      <form className="login__form" onSubmit={submit} noValidate>
        {mode === 'reset' && (
          <p className="login__intro">Escriba su correo y le enviaremos un enlace para crear una nueva contraseña.</p>
        )}
        <label className="field">
          <span className="field__label">Correo electrónico</span>
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
            <span className="field__label">Contraseña</span>
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

        {notInvited && <p className="login__error">Esta cuenta no tiene acceso a CJ Club. Contacte con CJ.</p>}
        {error && <p className="login__error">{error}</p>}
        {notice && <p className="login__notice">{notice}</p>}

        <button className="btn" type="submit" disabled={busy || !email} style={{ marginTop: 10 }}>
          {mode === 'login' ? 'Entrar' : 'Enviar enlace'}
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
          {mode === 'login' ? 'He olvidado mi contraseña' : 'Volver al inicio de sesión'}
        </button>
        <p className="login__note">Acceso exclusivo para clientes de CJ</p>
      </form>
    </main>
  )
}
