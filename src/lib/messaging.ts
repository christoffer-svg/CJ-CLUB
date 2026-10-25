/** Chat con CJ y peticiones: lecturas en directo y escrituras (cliente y equipo de CJ) */
import {
  addDoc,
  collection,
  doc,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from './firebase'
import type { ClientRequest, Conversation, Message, RequestType } from './types'

export type Side = 'client' | 'cj'
type WithId<T> = T & { id: string }

export function useConversation(clientId: string | null) {
  const [conv, setConv] = useState<Conversation | null>(null)
  useEffect(() => {
    if (!clientId) return
    return onSnapshot(
      doc(db, 'conversations', clientId),
      (snap) => setConv(snap.exists() ? (snap.data() as Conversation) : null),
      () => setConv(null),
    )
  }, [clientId])
  return conv
}

/** Últimos 200 mensajes, en orden */
export function useMessages(clientId: string | null) {
  const [state, setState] = useState<{ loading: boolean; data: WithId<Message>[] }>({ loading: true, data: [] })
  useEffect(() => {
    if (!clientId) return
    return onSnapshot(
      query(collection(db, 'conversations', clientId, 'messages'), orderBy('createdAt'), limitToLast(200)),
      { includeMetadataChanges: true },
      (snap) =>
        setState({
          loading: false,
          data: snap.docs.map((d) => ({ ...(d.data({ serverTimestamps: 'none' }) as Message), id: d.id })),
        }),
      () => setState({ loading: false, data: [] }),
    )
  }, [clientId])
  return state
}

/** ¿Hay mensajes sin leer para esta parte? */
export function isUnread(conv: Conversation | null | undefined, side: Side) {
  if (!conv || conv.lastSender === side || !conv.lastMessageAt) return false
  const readAt = side === 'client' ? conv.clientReadAt : conv.cjReadAt
  return !readAt || conv.lastMessageAt.toMillis() > readAt.toMillis()
}

/** Envía un mensaje y actualiza el resumen de la conversación en una sola operación */
export async function sendMessage(opts: {
  clientId: string
  familyName: string
  text: string
  side: Side
  authorUid: string
  authorName: string
}) {
  const text = opts.text.trim()
  if (!text) return
  const batch = writeBatch(db)
  batch.set(doc(collection(db, 'conversations', opts.clientId, 'messages')), {
    text: text.slice(0, 2000),
    sender: opts.side,
    authorUid: opts.authorUid,
    authorName: opts.authorName,
    createdAt: serverTimestamp(),
  })
  batch.set(
    doc(db, 'conversations', opts.clientId),
    {
      clientId: opts.clientId,
      familyName: opts.familyName,
      lastMessageAt: serverTimestamp(),
      lastMessageText: text.slice(0, 200),
      lastSender: opts.side,
      // quien escribe ya ha leído la conversación
      [opts.side === 'client' ? 'clientReadAt' : 'cjReadAt']: serverTimestamp(),
    },
    { merge: true },
  )
  await batch.commit()
}

/** Marca la conversación como leída por esta parte (si existe y hay algo sin leer) */
export function markRead(clientId: string, conv: Conversation | null, side: Side) {
  if (!conv || !isUnread(conv, side)) return
  updateDoc(doc(db, 'conversations', clientId), { [side === 'client' ? 'clientReadAt' : 'cjReadAt']: serverTimestamp() }).catch(
    () => {},
  )
}

/** Peticiones de un cliente, de la más reciente a la más antigua */
export function useClientRequests(clientId: string | null) {
  const [state, setState] = useState<{ loading: boolean; data: WithId<ClientRequest>[] }>({ loading: true, data: [] })
  useEffect(() => {
    if (!clientId) return
    return onSnapshot(
      query(collection(db, 'requests'), where('clientId', '==', clientId)),
      (snap) =>
        setState({
          loading: false,
          data: snap.docs
            .map((d) => ({ ...(d.data({ serverTimestamps: 'estimate' }) as ClientRequest), id: d.id }))
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
        }),
      () => setState({ loading: false, data: [] }),
    )
  }, [clientId])
  return state
}

export async function createRequest(opts: {
  clientId: string
  familyName: string
  uid: string
  type: RequestType
  description: string
  preferredDate?: string
}) {
  await addDoc(collection(db, 'requests'), {
    clientId: opts.clientId,
    familyName: opts.familyName,
    type: opts.type,
    description: opts.description.trim().slice(0, 2000),
    ...(opts.preferredDate ? { preferredDate: opts.preferredDate } : {}),
    status: 'new',
    createdByUid: opts.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function cancelRequest(id: string) {
  return updateDoc(doc(db, 'requests', id), { status: 'cancelled', updatedAt: serverTimestamp() })
}

/** Equipo de CJ: cambia el estado o la nota de una petición */
export function updateRequest(id: string, data: Partial<Pick<ClientRequest, 'status' | 'cjNote'>>) {
  return setDoc(doc(db, 'requests', id), { ...data, updatedAt: serverTimestamp() }, { merge: true })
}
