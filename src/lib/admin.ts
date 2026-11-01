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
import type { Trade, Language } from './types'

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
  const call = httpsCallable<NewClient, { clientId: string; uid: string; memberNumber: string; addedToExisting?: boolean }>(
    functions,
    'createClient',
  )
  const res = await call(data)
  // Si el correo ya era de un cliente, la casa se añade a su cuenta: ya tiene acceso, no hace falta invitación
  if (res.data.addedToExisting) return { ...res.data, via: null }
  const via = await sendInvitation(data.email, data.language)
  return { ...res.data, via }
}

/** ¿Esta persona tiene acceso a esta casa? (como casa activa o entre sus casas) */
export const hasHouse = (u: { clientId?: string; clientIds?: string[] }, clientId: string) =>
  u.clientId === clientId || Boolean(u.clientIds?.includes(clientId))

export type NewBusiness = {
  placeId: string
  contactName: string
  email: string
  language: Language
}

/** Crea la cuenta del negocio en el servidor (función createBusiness). El correo de invitación lo envía la pantalla. */
export async function createBusinessAccount(data: NewBusiness) {
  const call = httpsCallable<NewBusiness, { uid: string; placeId: string; businessName: string; addedToExisting?: boolean }>(functions, 'createBusiness')
  return (await call(data)).data
}

export type NewBuilder = { name: string; companyName: string; trade: Trade; email: string; language: Language }

/** Crea la cuenta de un constructor en el servidor (función createBuilder) y le envía la invitación */
export async function createBuilderAccount(data: NewBuilder) {
  const call = httpsCallable<NewBuilder, { uid: string; addedToExisting?: boolean }>(functions, 'createBuilder')
  const res = await call(data)
  // Si el correo ya tenía cuenta, se le añade este acceso: entra con su contraseña de siempre
  if (res.data.addedToExisting) return { ...res.data, via: null }
  const via = await sendInvitation(data.email, data.language)
  return { ...res.data, via }
}

/** Da de baja a un cliente en el servidor (función deleteClient): borra cuenta, ficha y registros */
export async function deleteClient(clientId: string) {
  const call = httpsCallable<
    { clientId: string },
    {
      accounts: number
      dealUses: number
      requests: number
      reservationClicks: number
      reservationConfirms: number
      ownContacts: number
      houseNotes: number
    }
  >(functions, 'deleteClient')
  return (await call({ clientId })).data
}

/**
 * Invitación para elegir contraseña (clientes, negocios y equipo).
 * Primero intenta el correo propio de CJ (función sendInvitationEmail, con la marca y en el idioma
 * de la persona). Si esa función aún no está publicada o configurada, o falla, envía el correo
 * estándar de Firebase, para que la invitación llegue siempre.
 * Devuelve qué correo se ha enviado: "cj" o "firebase".
 */
export async function sendInvitation(email: string, language: Language): Promise<'cj' | 'firebase'> {
  try {
    const call = httpsCallable<{ email: string }, { sent: boolean; reason?: string }>(functions, 'sendInvitationEmail')
    const res = await call({ email })
    if (res.data.sent) return 'cj'
  } catch {
    // función no publicada o error: se usa el correo de Firebase
  }
  const previous = auth.languageCode
  auth.languageCode = language
  try {
    await sendPasswordResetEmail(auth, email)
  } finally {
    auth.languageCode = previous
  }
  return 'firebase'
}

/** Texto del aviso tras enviar una invitación */
export const invitationNotice = (email: string, via: 'cj' | 'firebase') =>
  via === 'cj' ? `Invitación de CJ Club enviada a ${email}` : `Invitación enviada a ${email} (correo estándar de Firebase)`

export type MailLogEntry = {
  kind: 'invitation'
  to: string
  uid: string
  status: 'sent' | 'failed' | 'not_configured'
  provider?: 'resend' | 'simulated'
  error?: string
  createdAt: Timestamp | null
}

/** Idiomas de la app de clientes, para el selector "Idioma preferido" del panel */
export const languageOptions: [Language, string][] = [
  ['en', 'Inglés'],
  ['es', 'Español'],
  ['nl', 'Neerlandés'],
  ['sv', 'Sueco'],
  ['de', 'Alemán'],
  ['fr', 'Francés'],
]

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
