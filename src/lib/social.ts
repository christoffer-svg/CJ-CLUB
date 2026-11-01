/** Social: planes y recomendaciones entre clientes de CJ, con chat privado al apuntarse */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  limitToLast,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useEffect, useState } from 'react'
import { MAX_BYTES, prepare, toBase64 } from './attachments'
import { todayKey } from './data'
import { db, functions } from './firebase'
import type { Attachment, SocialActivity, SocialChat, SocialJoin, SocialMessage, SocialPost } from './types'

export type WithId<T> = T & { id: string }
export type Me = { clientId: string; uid: string; familyName: string }

/** ¿Sigue vigente? Los planes, hasta su último día; las recomendaciones, siempre */
export const isPostCurrent = (p: SocialPost, today = todayKey()) => p.kind === 'tip' || (p.dateTo || p.dateFrom) >= today

/** Publicaciones visibles (los clientes) o todas (CJ), las más recientes primero */
export function useSocialPosts(all = false) {
  const [state, setState] = useState<{ loading: boolean; data: WithId<SocialPost>[] }>({ loading: true, data: [] })
  useEffect(
    () =>
      onSnapshot(
        all ? collection(db, 'socialPosts') : query(collection(db, 'socialPosts'), where('hidden', '==', false)),
        (snap) =>
          setState({
            loading: false,
            data: snap.docs
              .map((d) => ({ ...(d.data({ serverTimestamps: 'estimate' }) as SocialPost), id: d.id }))
              .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
          }),
        () => setState({ loading: false, data: [] }),
      ),
    [all],
  )
  return state
}

export function useSocialPost(id: string) {
  const [state, setState] = useState<{ loading: boolean; data: WithId<SocialPost> | null }>({ loading: true, data: null })
  useEffect(
    () =>
      onSnapshot(
        doc(db, 'socialPosts', id),
        (snap) => setState({ loading: false, data: snap.exists() ? { ...(snap.data({ serverTimestamps: 'estimate' }) as SocialPost), id } : null }),
        () => setState({ loading: false, data: null }),
      ),
    [id],
  )
  return state
}

export function useJoins(postId: string) {
  const [state, setState] = useState<WithId<SocialJoin>[]>([])
  useEffect(
    () =>
      onSnapshot(
        collection(db, 'socialPosts', postId, 'joins'),
        (snap) => setState(snap.docs.map((d) => ({ ...(d.data() as SocialJoin), id: d.id }))),
        () => setState([]),
      ),
    [postId],
  )
  return state
}

/** Id para una publicación nueva (hace falta antes de subir sus fotos) */
export const newPostId = () => doc(collection(db, 'socialPosts')).id

export async function uploadSocialPhotos(postId: string, files: File[]): Promise<Attachment[]> {
  const call = httpsCallable<{ postId: string; name: string; contentType: string; data: string }, Attachment>(functions, 'uploadSocialPhoto', { timeout: 120_000 })
  const out: Attachment[] = []
  for (const file of files) {
    const { blob, name, type } = await prepare(file)
    if (blob.size > MAX_BYTES) throw new Error('too-big')
    out.push((await call({ postId, name, contentType: type, data: await toBase64(blob) })).data)
  }
  return out
}

export type PostDraft = { kind: 'plan' | 'tip'; activity: SocialActivity; title: string; text: string; dateFrom: string; dateTo: string; place: string; photos: Attachment[] }

/** Crea (exists = false) o corrige una publicación */
export function savePost(id: string, me: Me, d: PostDraft, exists: boolean) {
  const data = {
    activity: d.kind === 'plan' ? d.activity : 'other',
    title: d.title.trim().slice(0, 120),
    text: d.text.trim().slice(0, 2000),
    dateFrom: d.kind === 'plan' ? d.dateFrom : '',
    dateTo: d.kind === 'plan' && d.dateTo && d.dateTo !== d.dateFrom ? d.dateTo : '',
    place: d.place.trim().slice(0, 120),
    photos: d.photos.slice(0, 4),
  }
  if (exists) return updateDoc(doc(db, 'socialPosts', id), data)
  return setDoc(doc(db, 'socialPosts', id), { ...data, kind: d.kind, clientId: me.clientId, uid: me.uid, familyName: me.familyName, hidden: false, createdAt: serverTimestamp() })
}

export const deletePost = (id: string) => deleteDoc(doc(db, 'socialPosts', id))
export const setPostHidden = (id: string, hidden: boolean) => updateDoc(doc(db, 'socialPosts', id), { hidden })

export const chatIdOf = (postId: string, joinerClientId: string) => `${postId}_${joinerClientId}`

/** Se apunta a un plan y abre (o crea) el chat privado con quien lo publica. Devuelve el id del chat. */
export async function joinPlan(post: WithId<SocialPost>, me: Me) {
  const chatId = chatIdOf(post.id, me.clientId)
  const chatRef = doc(db, 'socialChats', chatId)
  const exists = await getDoc(chatRef)
    .then((s) => s.exists())
    .catch(() => false)
  const batch = writeBatch(db)
  batch.set(doc(db, 'socialPosts', post.id, 'joins', me.clientId), { clientId: me.clientId, uid: me.uid, familyName: me.familyName, createdAt: serverTimestamp() })
  if (!exists)
    batch.set(chatRef, {
      postId: post.id,
      postTitle: post.title,
      members: [post.clientId, me.clientId],
      names: { [post.clientId]: post.familyName, [me.clientId]: me.familyName },
      lastText: '',
      lastClientId: '',
      lastAt: serverTimestamp(),
      readAt: {},
    })
  await batch.commit()
  return chatId
}

export const leavePlan = (postId: string, clientId: string) => deleteDoc(doc(db, 'socialPosts', postId, 'joins', clientId))

/** Mis conversaciones de Social, la más reciente primero */
export function useMyChats(clientId: string | null) {
  const [state, setState] = useState<{ loading: boolean; data: WithId<SocialChat>[] }>({ loading: true, data: [] })
  useEffect(() => {
    if (!clientId) return
    return onSnapshot(
      query(collection(db, 'socialChats'), where('members', 'array-contains', clientId)),
      (snap) =>
        setState({
          loading: false,
          data: snap.docs
            .map((d) => ({ ...(d.data({ serverTimestamps: 'estimate' }) as SocialChat), id: d.id }))
            .sort((a, b) => (b.lastAt?.toMillis() ?? 0) - (a.lastAt?.toMillis() ?? 0)),
        }),
      () => setState({ loading: false, data: [] }),
    )
  }, [clientId])
  return clientId ? state : { loading: false, data: [] }
}

/** ¿Hay mensajes de la otra casa sin leer? */
export const isChatUnread = (c: SocialChat, clientId: string) =>
  Boolean(c.lastClientId && c.lastClientId !== clientId && (!c.readAt?.[clientId] || (c.lastAt?.toMillis() ?? 0) > (c.readAt[clientId]?.toMillis() ?? 0)))

export function useSocialChat(chatId: string) {
  const [chat, setChat] = useState<{ loading: boolean; data: WithId<SocialChat> | null }>({ loading: true, data: null })
  const [messages, setMessages] = useState<WithId<SocialMessage>[]>([])
  useEffect(() => {
    const a = onSnapshot(
      doc(db, 'socialChats', chatId),
      (snap) => setChat({ loading: false, data: snap.exists() ? { ...(snap.data({ serverTimestamps: 'estimate' }) as SocialChat), id: chatId } : null }),
      () => setChat({ loading: false, data: null }),
    )
    const b = onSnapshot(
      query(collection(db, 'socialChats', chatId, 'messages'), orderBy('createdAt'), limitToLast(300)),
      (snap) => setMessages(snap.docs.map((d) => ({ ...(d.data({ serverTimestamps: 'estimate' }) as SocialMessage), id: d.id }))),
      () => setMessages([]),
    )
    return () => {
      a()
      b()
    }
  }, [chatId])
  return { chat, messages }
}

export async function sendSocialMessage(chatId: string, me: Me, text: string) {
  const clean = text.trim().slice(0, 2000)
  const batch = writeBatch(db)
  batch.set(doc(collection(db, 'socialChats', chatId, 'messages')), { clientId: me.clientId, uid: me.uid, familyName: me.familyName, text: clean, createdAt: serverTimestamp() })
  batch.update(doc(db, 'socialChats', chatId), { lastText: clean.slice(0, 300), lastClientId: me.clientId, lastAt: serverTimestamp(), [`readAt.${me.clientId}`]: serverTimestamp() })
  await batch.commit()
}

export const markSocialRead = (chatId: string, clientId: string) => updateDoc(doc(db, 'socialChats', chatId), { [`readAt.${clientId}`]: serverTimestamp() })

/** Avisa a CJ de una publicación inadecuada */
export const reportPost = (post: WithId<SocialPost>, me: Me, reason: string) =>
  addDoc(collection(db, 'socialReports'), {
    postId: post.id,
    postTitle: post.title.slice(0, 120),
    clientId: me.clientId,
    familyName: me.familyName,
    reason: reason.trim().slice(0, 500),
    createdAt: serverTimestamp(),
  })
