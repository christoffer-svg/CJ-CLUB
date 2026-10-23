import Header from '../../components/Header'
import { useAuth } from '../../auth/AuthProvider'

// Marcador: el panel de administración se construye en el paso 7.
export default function AdminHome() {
  const { profile, logout } = useAuth()
  return (
    <>
      <Header eyebrow="Panel CJ" title="Administración" subtitle={profile ? `Hola, ${profile.name}` : undefined} />
      <main className="page">
        <div className="card">
          <span className="card__title">Panel en preparación</span>
          <p className="card__text" style={{ marginTop: 4 }}>
            Aquí podrá gestionar clientes, contactos, lugares y descuentos.
          </p>
        </div>
        <button className="btn btn--ghost" onClick={logout}>
          Cerrar sesión
        </button>
      </main>
    </>
  )
}
