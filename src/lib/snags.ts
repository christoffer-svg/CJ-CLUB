/** Lista de repasos de Mi reforma */
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { uploadAttachments } from './attachments'
import { db } from './firebase'
import type { Author, WithId } from './projects'
import type { Snag } from './types'

export function useSnags(projectId: string | null) {
  const [state, setState] = useState<{ loading: boolean; data: WithId<Snag>[] }>({ loading: true, data: [] })
  useEffect(() => {
    if (!projectId) return
    return onSnapshot(
      query(collection(db, 'projects', projectId, 'snags'), orderBy('createdAt')),
      (snap) => setState({ loading: false, data: snap.docs.map((d) => ({ ...(d.data({ serverTimestamps: 'estimate' }) as Snag), id: d.id })) }),
      () => setState({ loading: false, data: [] }),
    )
  }, [projectId])
  return state
}

/** El cliente o CJ apuntan un repaso */
export async function addSnag(projectId: string, a: Author, s: { title: string; text: string }, files: File[]) {
  const ref = doc(collection(db, 'projects', projectId, 'snags'))
  const attachments = files.length ? await uploadAttachments(projectId, 'snags', ref.id, files) : []
  await setDoc(ref, {
    title: s.title.trim().slice(0, 200),
    text: s.text.trim().slice(0, 2000),
    ...(attachments.length ? { attachments } : {}),
    status: 'open',
    authorUid: a.uid,
    authorRole: a.role,
    authorName: a.name,
    createdAt: serverTimestamp(),
  })
}

/** El constructor lo marca como arreglado (con fotos del arreglo) */
export async function markSnagFixed(projectId: string, snag: WithId<Snag>, a: Author, note: string, files: File[]) {
  // Números de archivo después de los ya usados en este repaso (los archivos no se reemplazan)
  const used = [...(snag.attachments ?? []), ...(snag.fixAttachments ?? [])].map((x) => Number(x.path.split('/').pop()?.split('-')[0]) || 0)
  const fixAttachments = files.length ? await uploadAttachments(projectId, 'snags', snag.id, files, Math.max(0, ...used) + 1) : []
  await updateDoc(doc(db, 'projects', projectId, 'snags', snag.id), {
    status: 'fixed',
    fixedByUid: a.uid,
    fixedByName: a.name,
    fixedAt: serverTimestamp(),
    fixNote: note.trim().slice(0, 2000),
    ...(fixAttachments.length ? { fixAttachments } : {}),
  })
}

/** El cliente o CJ lo dan por bueno */
export function acceptSnag(projectId: string, id: string, a: Author) {
  return updateDoc(doc(db, 'projects', projectId, 'snags', id), { status: 'ok', okByUid: a.uid, okByName: a.name, okAt: serverTimestamp() })
}

/** El cliente o CJ lo reabren: no está bien */
export function reopenSnag(projectId: string, id: string, note: string) {
  return updateDoc(doc(db, 'projects', projectId, 'snags', id), { status: 'open', reopenNote: note.trim().slice(0, 1000) })
}
