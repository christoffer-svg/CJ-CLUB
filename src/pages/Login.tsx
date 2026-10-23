import { useNavigate } from 'react-router-dom'

// Solo diseño: el acceso real con correo y contraseña se añadirá en un paso posterior.
export default function Login() {
  const navigate = useNavigate()

  return (
    <main className="login">
      <div className="login__brand">
        <img className="login__logo" src="/logo.png" alt="CJ Real Estate & Services" />
        <hr className="gold-rule" />
        <h1 className="login__title">CJ Club</h1>
        <span className="eyebrow">Real Estate &amp; Services · Costa Blanca</span>
      </div>

      <form
        className="login__form"
        onSubmit={(e) => {
          e.preventDefault()
          navigate('/')
        }}
      >
        <label className="field">
          <span className="field__label">Correo electrónico</span>
          <input className="field__input" type="email" autoComplete="email" />
        </label>
        <label className="field">
          <span className="field__label">Contraseña</span>
          <input className="field__input" type="password" autoComplete="current-password" />
        </label>
        <button className="btn" type="submit" style={{ marginTop: 10 }}>
          Entrar
        </button>
        <p className="login__note">Acceso exclusivo para clientes de CJ</p>
      </form>
    </main>
  )
}
