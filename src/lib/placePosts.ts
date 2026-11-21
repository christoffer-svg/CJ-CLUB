/** Fotos y comentarios de los clientes sobre un sitio de Descubrir, o sobre una categoría */
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from './firebase'
import { uploadSocialPhotos, type Me, type WithId } from './social'
import type { Attachment, PlacePost, PlaceReport } from './types'

export type { WithId }
export const MAX_SPOT_PHOTOS = 4
/** Antes de reducirla: un móvil puede hacer fotos grandes; tras reducirlas, el tope es 10 MB */
const MAX_RAW_BYTES = 30 * 1024 * 1024

export type SpotPhotoProblem = 'type' | 'size' | 'count'

/** Solo imágenes (no SVG), como máximo 4, y no enormes antes de reducirlas */
export function checkSpotPhotos(files: File[], already = 0): SpotPhotoProblem | null {
  if (already + files.length > MAX_SPOT_PHOTOS) return 'count'
  for (const file of files) {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return 'type'
    if (file.size > MAX_RAW_BYTES) return 'size'
  }
  return null
}

/** Reduce las fotos y las sube con la misma función que Social (carpeta de la casa) */
export function uploadSpotPhotos(postId: string, files: File[]) {
  const problem = checkSpotPhotos(files)
  if (problem) throw new Error(problem)
  return uploadSocialPhotos(postId, files)
}

export const newPlacePostId = () => doc(collection(db, 'placePosts')).id

function listen(all: boolean, set: (s: { loading: boolean; data: WithId<PlacePost>[] }) => void) {
  return onSnapshot(
    all ? collection(db, 'placePosts') : query(collection(db, 'placePosts'), where('hidden', '==', false)),
    (snap) =>
      set({
        loading: false,
        data: snap.docs
          .map((d) => ({ ...(d.data({ serverTimestamps: 'estimate' }) as PlacePost), id: d.id }))
          .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
      }),
    () => set({ loading: false, data: [] }),
  )
}

/** Publicaciones visibles (los clientes) o todas (CJ), las más recientes primero */
export function usePlacePosts(all = false) {
  const [state, set] = useState<{ loading: boolean; data: WithId<PlacePost>[] }>({ loading: true, data: [] })
  useEffect(() => listen(all, set), [all])
  return state
}

/** Las de una casa, también las que CJ haya ocultado (para que el autor las vea) */
function useOwnedPlacePosts(clientId: string | null) {
  const [state, set] = useState<{ loading: boolean; data: WithId<PlacePost>[] }>({ loading: Boolean(clientId), data: [] })
  useEffect(() => {
    if (!clientId) return
    return onSnapshot(
      query(collection(db, 'placePosts'), where('clientId', '==', clientId)),
      (snap) =>
        set({
          loading: false,
          data: snap.docs.map((d) => ({ ...(d.data({ serverTimestamps: 'estimate' }) as PlacePost), id: d.id })),
        }),
      () => set({ loading: false, data: [] }),
    )
  }, [clientId])
  return clientId ? state : { loading: false, data: [] }
}

/** Lo que ve un cliente: las visibles de todos y, además, las suyas aunque CJ las haya ocultado */
export function useClientPlacePosts(clientId: string | null) {
  const visible = usePlacePosts(false)
  const mine = useOwnedPlacePosts(clientId)
  const map = new Map<string, WithId<PlacePost>>()
  for (const post of visible.data) map.set(post.id, post)
  for (const post of mine.data) map.set(post.id, post)
  return {
    loading: visible.loading || mine.loading,
    data: [...map.values()].sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
  }
}

export function usePlacePost(id: string) {
  const [state, setState] = useState<{ loading: boolean; data: WithId<PlacePost> | null }>({ loading: true, data: null })
  useEffect(
    () =>
      onSnapshot(
        doc(db, 'placePosts', id),
        (snap) => setState({ loading: false, data: snap.exists() ? { ...(snap.data({ serverTimestamps: 'estimate' }) as PlacePost), id } : null }),
        () => setState({ loading: false, data: null }),
      ),
    [id],
  )
  return state
}

export type PlacePostDraft = {
  placeId: string
  category: string
  placeName: string
  text: string
  rating: number | null
  photos: Attachment[]
}

/** Publica (o corrige el texto, la valoración y las fotos de) un comentario */
export function savePlacePost(id: string, me: Me, draft: PlacePostDraft, exists: boolean) {
  const rating = draft.rating && draft.rating >= 1 && draft.rating <= 5 ? Math.round(draft.rating) : null
  const photos = draft.photos.slice(0, MAX_SPOT_PHOTOS)
  const text = draft.text.trim().slice(0, 2000)
  if (exists) return updateDoc(doc(db, 'placePosts', id), { text, rating, photos })
  return setDoc(doc(db, 'placePosts', id), {
    placeId: draft.placeId,
    category: draft.category,
    placeName: draft.placeName.trim().slice(0, 200),
    text,
    rating,
    photos,
    clientId: me.clientId,
    uid: me.uid,
    familyName: me.familyName,
    hidden: false,
    createdAt: serverTimestamp(),
  })
}

export const deletePlacePost = (id: string) => deleteDoc(doc(db, 'placePosts', id))
export const setPlacePostHidden = (id: string, hidden: boolean) => updateDoc(doc(db, 'placePosts', id), { hidden })

/** Avisa a CJ de una foto o un comentario inadecuado */
export const reportPlacePost = (post: WithId<PlacePost>, me: Me, reason: string) =>
  addDoc(collection(db, 'placeReports'), {
    postId: post.id,
    placeName: (post.placeName || post.category).slice(0, 120),
    clientId: me.clientId,
    familyName: me.familyName,
    reason: reason.trim().slice(0, 500),
    createdAt: serverTimestamp(),
  })

export function usePlaceReports() {
  const [reports, setReports] = useState<(PlaceReport & { id: string })[]>([])
  useEffect(
    () =>
      onSnapshot(
        collection(db, 'placeReports'),
        (snap) => setReports(snap.docs.map((d) => ({ ...(d.data() as PlaceReport), id: d.id }))),
        () => setReports([]),
      ),
    [],
  )
  return reports
}
