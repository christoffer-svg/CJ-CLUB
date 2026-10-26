/** Contactos propios y notas de la casa. Privados salvo que el cliente los comparta con CJ. */
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from './firebase'
import type { HouseNote, HouseSection, OwnContact } from './types'

type WithId<T> = T & { id: string }

export type OwnContactInput = {
  name: string
  service: string
  serviceOther: string
  phone: string
  email: string
  notes: string
  shareWithCj: boolean
}

export type HouseNoteInput = {
  section: HouseSection
  title: string
  body: string
  secret: string
  shareWithCj: boolean
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validEmail(email: string) {
  const value = email.trim()
  return value.length === 0 || EMAIL.test(value)
}

function useSubcollection<T>(path: string | null) {
  const [state, setState] = useState<{ path: string | null; loading: boolean; data: WithId<T>[]; error: boolean }>({
    path,
    loading: Boolean(path),
    data: [],
    error: false,
  })
  if (state.path !== path) {
    setState({ path, loading: Boolean(path), data: [], error: false })
  }
  useEffect(() => {
    if (!path) return
    return onSnapshot(
      collection(db, path),
      (snap) =>
        setState({
          path,
          loading: false,
          error: false,
          data: snap.docs.map((d) => ({ ...(d.data({ serverTimestamps: 'estimate' }) as T), id: d.id })),
        }),
      () => setState({ path, loading: false, error: true, data: [] }),
    )
  }, [path])
  if (!path || state.path !== path) return { loading: Boolean(path), data: [], error: false }
  return { loading: state.loading, data: state.data, error: state.error }
}

function mergePrivateAndShared<T extends { shareWithCj: boolean }>(
  privateItems: WithId<T>[],
  sharedItems: WithId<T>[],
  loading: boolean,
  error: boolean,
) {
  const byId = new Map<string, WithId<T>>()
  for (const item of privateItems) byId.set(item.id, item)
  for (const item of sharedItems) byId.set(item.id, item)
  return { loading, error, data: [...byId.values()] }
}

/** sharedOnly: vista del equipo de CJ. No pide la colección privada (las reglas la niegan). */
export function useOwnContacts(clientId: string | null, sharedOnly: boolean) {
  const priv = useSubcollection<OwnContact>(clientId && !sharedOnly ? `clients/${clientId}/ownContacts` : null)
  const shared = useSubcollection<OwnContact>(clientId ? `clients/${clientId}/sharedContacts` : null)
  return mergePrivateAndShared(priv.data, shared.data, priv.loading || shared.loading, priv.error || shared.error)
}

export function useHouseNotes(clientId: string | null, sharedOnly: boolean) {
  const priv = useSubcollection<HouseNote>(clientId && !sharedOnly ? `clients/${clientId}/houseNotes` : null)
  const shared = useSubcollection<HouseNote>(clientId ? `clients/${clientId}/sharedHouseNotes` : null)
  return mergePrivateAndShared(priv.data, shared.data, priv.loading || shared.loading, priv.error || shared.error)
}

function contactFields(input: OwnContactInput) {
  const serviceOther = input.service === 'other' ? input.serviceOther.trim().slice(0, 80) : ''
  return {
    name: input.name.trim().slice(0, 120),
    service: input.service,
    serviceOther,
    phone: input.phone.trim().slice(0, 40),
    email: input.email.trim().slice(0, 120),
    notes: input.notes.trim().slice(0, 2000),
    shareWithCj: input.shareWithCj,
  }
}

function noteFields(input: HouseNoteInput) {
  return {
    section: input.section,
    title: input.title.trim().slice(0, 120),
    body: input.body.trim().slice(0, 4000),
    secret: input.secret.trim().slice(0, 200),
    shareWithCj: input.shareWithCj,
  }
}

type Existing = { id: string; shareWithCj: boolean; createdAt?: Timestamp | null }

/** Crea, edita o mueve entre la colección privada y la compartida. */
async function saveItem(
  clientId: string,
  privateCol: string,
  sharedCol: string,
  current: Existing | null,
  fields: Record<string, unknown>,
  shareWithCj: boolean,
) {
  const id = current?.id ?? doc(collection(db, 'clients', clientId, privateCol)).id
  const col = shareWithCj ? sharedCol : privateCol
  const ref = doc(db, 'clients', clientId, col, id)
  if (current && current.shareWithCj === shareWithCj) {
    await updateDoc(ref, { ...fields, updatedAt: serverTimestamp() })
    return id
  }
  const batch = writeBatch(db)
  batch.set(ref, { ...fields, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  if (current) {
    const oldCol = current.shareWithCj ? sharedCol : privateCol
    batch.delete(doc(db, 'clients', clientId, oldCol, id))
  }
  await batch.commit()
  return id
}

export function saveOwnContact(clientId: string, current: Existing | null, input: OwnContactInput) {
  return saveItem(clientId, 'ownContacts', 'sharedContacts', current, contactFields(input), input.shareWithCj)
}

export function deleteOwnContact(clientId: string, id: string, shareWithCj: boolean) {
  const col = shareWithCj ? 'sharedContacts' : 'ownContacts'
  return deleteDoc(doc(db, 'clients', clientId, col, id))
}

export function saveHouseNote(clientId: string, current: Existing | null, input: HouseNoteInput) {
  return saveItem(clientId, 'houseNotes', 'sharedHouseNotes', current, noteFields(input), input.shareWithCj)
}

export function deleteHouseNote(clientId: string, id: string, shareWithCj: boolean) {
  const col = shareWithCj ? 'sharedHouseNotes' : 'houseNotes'
  return deleteDoc(doc(db, 'clients', clientId, col, id))
}
