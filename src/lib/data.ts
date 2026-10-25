import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from './firebase'
import { mergeCategories, PARTNER_CATEGORIES, type MergedCategory } from './services'
import type { Client, Deal, GeneralContact, Partner, PartnerCategory, Place } from './types'

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

/** "2026-10-25" en el calendario de quien usa la app */
export function todayKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Visible para los socios: activo, no oculto por CJ y dentro de las fechas */
export function isDealCurrent(
  d: Pick<Deal, 'active' | 'hiddenByAdmin' | 'validFrom' | 'validUntil'>,
  today = todayKey(),
) {
  if (!d.active || d.hiddenByAdmin) return false
  if (d.validFrom && d.validFrom > today) return false
  if (d.validUntil && d.validUntil < today) return false
  return true
}

/** Número de descuentos que los socios ven ahora mismo */
export function useActiveDealsCount() {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    getDocs(query(collection(db, 'deals'), where('active', '==', true)))
      .then((snap) => setCount(snap.docs.filter((d) => isDealCurrent(d.data() as Deal)).length))
      .catch(() => setCount(null))
  }, [])
  return count
}

export type AssignedPartner = Partner & { id: string; types: string[] }

/**
 * Colaboradores asignados al cliente, uno por persona.
 * Si el mismo colaborador está en varios servicios, sale una sola vez, con todos ellos.
 */
export function useAssignedPartners(client: Client | null) {
  const [state, setState] = useState<{ loading: boolean; data: AssignedPartner[] }>({ loading: true, data: [] })
  useEffect(() => {
    if (!client) return
    let cancelled = false
    const byId = new Map<string, string[]>()
    for (const [type, id] of Object.entries(client.contacts ?? {})) {
      if (typeof id !== 'string' || !id) continue
      const types = byId.get(id)
      if (types) types.push(type)
      else byId.set(id, [type])
    }
    Promise.all(
      [...byId].map(async ([id, types]) => {
        try {
          const snap = await getDoc(doc(db, 'partners', id))
          // Los colaboradores desactivados por CJ no se muestran
          return snap.exists() && snap.get('active') !== false ? { ...(snap.data() as Partner), id, types } : null
        } catch {
          return null
        }
      }),
    ).then((list) => !cancelled && setState({ loading: false, data: list.filter((p): p is AssignedPartner => p !== null) }))
    return () => {
      cancelled = true
    }
  }, [client])
  return state
}

/** Servicios de colaboradores: los de Firestore y, si faltan, los seis de siempre. */
export function usePartnerCategories(): { loading: boolean; data: MergedCategory[] } {
  const [stored, setStored] = useState<(PartnerCategory & { id: string })[] | null>(null)
  useEffect(
    () =>
      onSnapshot(
        collection(db, PARTNER_CATEGORIES),
        (snap) => setStored(snap.docs.map((d) => ({ ...(d.data() as PartnerCategory), id: d.id }))),
        () => setStored([]),
      ),
    [],
  )
  return { loading: stored === null, data: mergeCategories(stored ?? []) }
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
          data: snap.docs
            .map((d) => ({ ...(d.data() as Deal), id: d.id }))
            .filter((d) => isDealCurrent(d))
            .sort((a, b) => a.order - b.order),
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
