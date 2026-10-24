import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { db } from './firebase'

/**
 * Qué cliente se está viendo en las pestañas de la app.
 * Normalmente es el propio cliente; en "Ver como cliente" es el equipo de CJ viendo
 * la app de otro, en modo de solo lectura (no guarda favoritos ni usos de descuentos).
 */
type Viewer = {
  clientId: string | null
  favorites: string[]
  toggleFavorite: (placeId: string) => void
  /** prefijo de las rutas de las pestañas: "" o "/admin/clientes/:id/vista" */
  base: string
  preview: boolean
}

const ViewerContext = createContext<Viewer | null>(null)

export function ClientViewer({ children }: { children: ReactNode }) {
  const { profile, toggleFavorite } = useAuth()
  return (
    <ViewerContext.Provider
      value={{
        clientId: profile?.clientId ?? null,
        favorites: profile?.favorites ?? [],
        toggleFavorite,
        base: '',
        preview: false,
      }}
    >
      {children}
    </ViewerContext.Provider>
  )
}

export function PreviewViewer({ clientId, children }: { clientId: string; children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([])
  useEffect(() => {
    // Favoritos reales del cliente, para que la vista previa sea fiel
    getDocs(query(collection(db, 'users'), where('clientId', '==', clientId), limit(1)))
      .then((snap) => setFavorites((snap.docs[0]?.get('favorites') as string[] | undefined) ?? []))
      .catch(() => setFavorites([]))
  }, [clientId])
  return (
    <ViewerContext.Provider
      value={{ clientId, favorites, toggleFavorite: () => {}, base: `/admin/clientes/${clientId}/vista`, preview: true }}
    >
      {children}
    </ViewerContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useViewer() {
  const ctx = useContext(ViewerContext)
  if (!ctx) throw new Error('useViewer debe usarse dentro de ClientViewer o PreviewViewer')
  return ctx
}
