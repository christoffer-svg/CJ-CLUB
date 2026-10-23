import { Navigate, Outlet } from 'react-router-dom'
import type { Role } from '../lib/types'
import { useAuth } from './AuthProvider'

export function Splash() {
  return (
    <main className="splash">
      <img className="login__logo" src="/logo.png" alt="CJ" />
    </main>
  )
}

/** Deja pasar solo a usuarios con sesión, ficha en Firestore y el rol indicado. */
export function RequireRole({ role }: { role: Role }) {
  const { loading, user, profile } = useAuth()
  if (loading) return <Splash />
  if (!user || !profile) return <Navigate to="/acceso" replace />
  if (profile.role !== role) return <Navigate to={homeFor(profile.role)} replace />
  return <Outlet />
}

export function homeFor(role: Role) {
  return role === 'admin' ? '/admin' : '/'
}
