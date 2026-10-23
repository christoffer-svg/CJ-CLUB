import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { auth, db } from '../lib/firebase'
import type { UserProfile } from '../lib/types'

type AuthState = {
  /** true mientras se comprueba si hay una sesión abierta */
  loading: boolean
  user: User | null
  /** ficha users/{uid}; null si la persona no ha sido invitada por CJ */
  profile: UserProfile | null
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, 'logout'>>({ loading: true, user: null, profile: null })

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ loading: false, user: null, profile: null })
        return
      }
      setState((s) => ({ ...s, loading: true }))
      let profile: UserProfile | null = null
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        profile = snap.exists() ? (snap.data() as UserProfile) : null
      } catch {
        profile = null
      }
      setState({ loading: false, user, profile })
    })
  }, [])

  return <AuthContext.Provider value={{ ...state, logout: () => signOut(auth) }}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
