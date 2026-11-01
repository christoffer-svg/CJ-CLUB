/** Reformas (varios contratos de la misma casa) y sus planos y diseños */
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { uploadReformFiles } from './attachments'
import { db } from './firebase'
import type { Author, WithId } from './projects'
import type { Project, ReformPlan } from './types'

export function useReformPlans(reformId: string | null | undefined) {
  const [state, setState] = useState<{ loading: boolean; data: WithId<ReformPlan>[] }>({ loading: true, data: [] })
  useEffect(() => {
    if (!reformId) return
    return onSnapshot(
      query(collection(db, 'reforms', reformId, 'plans'), orderBy('createdAt')),
      (snap) => setState({ loading: false, data: snap.docs.map((d) => ({ ...(d.data({ serverTimestamps: 'estimate' }) as ReformPlan), id: d.id })) }),
      () => setState({ loading: false, data: [] }),
    )
  }, [reformId])
  return state
}

/** CJ o un arquitecto o diseñador suben un plano o diseño */
export async function addReformPlan(reformId: string, a: Author, p: { title: string; kind: ReformPlan['kind']; note: string }, files: File[]) {
  const ref = doc(collection(db, 'reforms', reformId, 'plans'))
  const attachments = await uploadReformFiles(reformId, ref.id, files)
  await setDoc(ref, {
    title: p.title.trim().slice(0, 200),
    kind: p.kind,
    note: p.note.trim().slice(0, 2000),
    attachments,
    authorUid: a.uid,
    authorRole: a.role === 'cj' ? 'cj' : 'designer',
    authorName: a.name,
    createdAt: serverTimestamp(),
  })
}

/**
 * CJ: mantiene la reforma de un contrato (los de la misma casa con el mismo título) con sus participantes,
 * y pone en todos esos contratos la misma reforma y los mismos arquitectos o diseñadores.
 */
export async function syncReform(projectId: string, project: Pick<Project, 'clientId' | 'title' | 'builderUid' | 'reformId'>, all: WithId<Project>[], designerUids: string[]) {
  const siblings = all.filter((p) => p.id !== projectId && p.clientId === project.clientId && p.title === project.title)
  const reformId = siblings.find((p) => p.reformId)?.reformId ?? project.reformId ?? doc(collection(db, 'reforms')).id
  const builderUids = [...new Set([project.builderUid, ...siblings.map((p) => p.builderUid)])]
  const batch = writeBatch(db)
  batch.set(doc(db, 'reforms', reformId), { clientId: project.clientId, title: project.title, builderUids, designerUids, updatedAt: serverTimestamp() })
  for (const id of [projectId, ...siblings.map((p) => p.id)]) batch.update(doc(db, 'projects', id), { reformId, designerUids })
  await batch.commit()
  return reformId
}
