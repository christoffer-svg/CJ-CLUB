/** Elecciones de productos de Mi reforma: foto, precio, tienda y referencia, confirmadas por cliente y constructor */
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { uploadAttachments } from './attachments'
import { db } from './firebase'
import type { Author, WithId } from './projects'
import type { ProductSelection } from './types'

export function useSelections(projectId: string | null) {
  const [state, setState] = useState<{ loading: boolean; data: WithId<ProductSelection>[] }>({ loading: true, data: [] })
  useEffect(() => {
    if (!projectId) return
    return onSnapshot(
      query(collection(db, 'projects', projectId, 'selections'), orderBy('createdAt')),
      (snap) => setState({ loading: false, data: snap.docs.map((d) => ({ ...(d.data({ serverTimestamps: 'estimate' }) as ProductSelection), id: d.id })) }),
      () => setState({ loading: false, data: [] }),
    )
  }, [projectId])
  return state
}

export type SelectionDraft = { title: string; store: string; price: number; reference: string; note: string; lineId: string }

/** Anota una elección (CJ o constructor); si la anota el constructor, queda conforme por su parte */
export async function addSelection(projectId: string, a: Author, s: SelectionDraft, files: File[]) {
  const ref = doc(collection(db, 'projects', projectId, 'selections'))
  const attachments = files.length ? await uploadAttachments(projectId, 'selections', ref.id, files) : []
  await setDoc(ref, {
    title: s.title.trim().slice(0, 200),
    store: s.store.trim().slice(0, 200),
    price: Math.round(s.price * 100) / 100,
    reference: s.reference.trim().slice(0, 200),
    note: s.note.trim().slice(0, 2000),
    ...(s.lineId ? { lineId: s.lineId } : {}),
    ...(attachments.length ? { attachments } : {}),
    authorUid: a.uid,
    authorRole: a.role,
    authorName: a.name,
    createdAt: serverTimestamp(),
    ...(a.role === 'builder' ? { builderOkUid: a.uid, builderOkName: a.name, builderOkAt: serverTimestamp() } : {}),
  })
}

/** El cliente o el constructor dejan constancia de que están conformes */
export function confirmSelection(projectId: string, id: string, a: Author & { role: 'client' | 'builder' }) {
  const p = a.role === 'client' ? 'client' : 'builder'
  return updateDoc(doc(db, 'projects', projectId, 'selections', id), {
    [`${p}OkUid`]: a.uid,
    [`${p}OkName`]: a.name,
    [`${p}OkAt`]: serverTimestamp(),
  })
}
