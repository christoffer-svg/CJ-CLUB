import { collection, doc, getCountFromServer, getDoc, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from './firebase'

type Result<T> = { loading: boolean; data: T | null; error: boolean }

/** Carga un documento de Firestore una vez. Devuelve data = null si no existe. */
export function useDoc<T>(path: string | null): Result<T> {
  const [state, setState] = useState<Result<T>>({ loading: Boolean(path), data: null, error: false })
  useEffect(() => {
    if (!path) return
    let cancelled = false
    getDoc(doc(db, path))
      .then((snap) => !cancelled && setState({ loading: false, data: snap.exists() ? (snap.data() as T) : null, error: false }))
      .catch(() => !cancelled && setState({ loading: false, data: null, error: true }))
    return () => {
      cancelled = true
    }
  }, [path])
  return state
}

/** Número de descuentos activos */
export function useActiveDealsCount() {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    getCountFromServer(query(collection(db, 'deals'), where('active', '==', true)))
      .then((snap) => setCount(snap.data().count))
      .catch(() => setCount(null))
  }, [])
  return count
}
