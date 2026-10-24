import { addDoc, collection, doc, getCountFromServer, getDoc, getDocs, orderBy, query, serverTimestamp, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from './firebase'
import type { Client, ContactType, Deal, GeneralContact, Partner, Place } from './types'

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

export type AssignedPartner = Partner & { id: string; type: ContactType }

/** Colaboradores asignados al cliente, en el orden de los tipos indicado */
export function useAssignedPartners(client: Client | null, types: ContactType[]) {
  const [state, setState] = useState<{ loading: boolean; data: AssignedPartner[] }>({ loading: true, data: [] })
  useEffect(() => {
    if (!client) return
    let cancelled = false
    const wanted = types.filter((t) => client.contacts?.[t])
    Promise.all(
      wanted.map(async (type) => {
        const id = client.contacts[type]!
        try {
          const snap = await getDoc(doc(db, 'partners', id))
          return snap.exists() ? { ...(snap.data() as Partner), id, type } : null
        } catch {
          return null
        }
      }),
    ).then((list) => !cancelled && setState({ loading: false, data: list.filter((p): p is AssignedPartner => p !== null) }))
    return () => {
      cancelled = true
    }
    // types es una constante del módulo que lo llama
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [client])
  return state
}

/** Contactos generales ordenados por "order" */
export function useGeneralContacts() {
  const [state, setState] = useState<{ loading: boolean; data: (GeneralContact & { id: string })[] }>({ loading: true, data: [] })
  useEffect(() => {
    getDocs(query(collection(db, 'generalContacts'), orderBy('order')))
      .then((snap) => setState({ loading: false, data: snap.docs.map((d) => ({ ...(d.data() as GeneralContact), id: d.id })) }))
      .catch(() => setState({ loading: false, data: [] }))
  }, [])
  return state
}

/** Lugares activos */
export function useActivePlaces() {
  const [state, setState] = useState<{ loading: boolean; data: (Place & { id: string })[] }>({ loading: true, data: [] })
  useEffect(() => {
    getDocs(query(collection(db, 'places'), where('active', '==', true)))
      .then((snap) => setState({ loading: false, data: snap.docs.map((d) => ({ ...(d.data() as Place), id: d.id })) }))
      .catch(() => setState({ loading: false, data: [] }))
  }, [])
  return state
}

/** Descuentos activos ordenados por "order" */
export function useActiveDeals() {
  const [state, setState] = useState<{ loading: boolean; data: (Deal & { id: string })[] }>({ loading: true, data: [] })
  useEffect(() => {
    getDocs(query(collection(db, 'deals'), where('active', '==', true)))
      .then((snap) =>
        setState({
          loading: false,
          data: snap.docs.map((d) => ({ ...(d.data() as Deal), id: d.id })).sort((a, b) => a.order - b.order),
        }),
      )
      .catch(() => setState({ loading: false, data: [] }))
  }, [])
  return state
}

/** Registra que un cliente ha pulsado "Usar" en un descuento */
export function logDealUse(dealId: string, clientId: string) {
  return addDoc(collection(db, 'dealUses'), { dealId, clientId, date: serverTimestamp() })
}
