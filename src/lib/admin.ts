/** Lecturas y escrituras del panel de administración (solo rol "admin") */
import { sendPasswordResetEmail } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useEffect, useState } from 'react'
import { auth, db, functions } from './firebase'
import type { ContactType, Language } from './types'

export type WithId<T> = T & { id: string }

/** Colección completa, actualizada en directo */
export function useLiveCollection<T>(name: string) {
  const [state, setState] = useState<{ loading: boolean; data: WithId<T>[]; error: boolean }>({
    loading: true,
    data: [],
    error: false,
  })
  useEffect(
    () =>
      onSnapshot(
        collection(db, name),
        (snap) => setState({ loading: false, error: false, data: snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })) }),
        () => setState({ loading: false, error: true, data: [] }),
      ),
    [name],
  )
  return state
}

/** Un documento, actualizado en directo */
export function useLiveDoc<T>(path: string | null) {
  const [state, setState] = useState<{ loading: boolean; data: T | null }>({ loading: Boolean(path), data: null })
  useEffect(() => {
    if (!path) return
    return onSnapshot(
      doc(db, path),
      (snap) => setState({ loading: false, data: snap.exists() ? (snap.data() as T) : null }),
      () => setState({ loading: false, data: null }),
    )
  }, [path])
  return state
}

export const saveDoc = (path: string, data: DocumentData) => setDoc(doc(db, path), data, { merge: true })
export const patchDoc = (path: string, data: DocumentData) => updateDoc(doc(db, path), data)
export const addToCollection = (name: string, data: DocumentData) => addDoc(collection(db, name), data)
export const removeDoc = (path: string) => deleteDoc(doc(db, path))

/** Usos de cada descuento desde el día 1 del mes actual */
export function useDealUsesThisMonth() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  useEffect(() => {
    const now = new Date()
    const start = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1))
    return onSnapshot(
      query(collection(db, 'dealUses'), where('date', '>=', start)),
      (snap) => {
        const c: Record<string, number> = {}
        snap.docs.forEach((d) => {
          const id = d.get('dealId') as string
          c[id] = (c[id] ?? 0) + 1
        })
        setCounts(c)
      },
      () => setCounts({}),
    )
  }, [])
  return counts
}

export type NewClient = {
  familyName: string
  email: string
  property: string
  clientSince: string
  agentName: string
  agentPhone: string
  agentWhatsapp: string
  language: Language
}

/** Crea la cuenta y la ficha del cliente en el servidor (función createClient) */
export async function createClient(data: NewClient) {
  const call = httpsCallable<NewClient, { clientId: string; uid: string; memberNumber: string }>(functions, 'createClient')
  const res = await call(data)
  await sendInvitation(data.email, data.language)
  return res.data
}

/** Da de baja a un cliente en el servidor (función deleteClient): borra cuenta, ficha y registros */
export async function deleteClient(clientId: string) {
  const call = httpsCallable<{ clientId: string }, { accounts: number; dealUses: number }>(functions, 'deleteClient')
  return (await call({ clientId })).data
}

/**
 * Envía al cliente el correo de Firebase para elegir contraseña (sirve de invitación).
 * El texto del correo se personaliza en la consola de Firebase > Authentication > Plantillas.
 */
export async function sendInvitation(email: string, language: Language) {
  const previous = auth.languageCode
  auth.languageCode = language
  try {
    await sendPasswordResetEmail(auth, email)
  } finally {
    auth.languageCode = previous
  }
}

export const contactTypeLabels: [ContactType, string][] = [
  ['lawyer', 'Abogado'],
  ['gestoria', 'Gestoría'],
  ['pool', 'Piscina'],
  ['maintenance', 'Mantenimiento'],
  ['garden', 'Jardinería'],
  ['communityAdmin', 'Administrador de fincas'],
]
export const contactTypeLabel = Object.fromEntries(contactTypeLabels) as Record<ContactType, string>

/** Fecha de un Timestamp en formato de campo de fecha: "2026-04-17" */
export function toDateInput(ts: Timestamp | undefined) {
  if (!ts) return ''
  const d = ts.toDate()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function fromDateInput(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return Timestamp.fromDate(new Date(y, m - 1, d, 12))
}
