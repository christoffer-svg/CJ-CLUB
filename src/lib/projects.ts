/** Mi reforma: obras, conversación, avances, pagos y extras (cliente, constructor y CJ) */
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { uploadAttachments } from './attachments'
import { db } from './firebase'
import type { Project, ProjectExtra, ProjectMessage, ProjectPayment, ProjectRole, ProjectUpdate } from './types'

export type WithId<T> = T & { id: string }
export type Author = { uid: string; name: string; role: ProjectRole }

/** Obras visibles para quien mira: las de su casa (cliente), las suyas (constructor) o todas (CJ) */
export function useProjects(filter: { clientId?: string | null; builderUid?: string | null; all?: boolean }) {
  const key = filter.all ? 'all' : filter.builderUid ? `b:${filter.builderUid}` : filter.clientId ? `c:${filter.clientId}` : ''
  const [state, setState] = useState<{ key: string; loading: boolean; data: WithId<Project>[] }>({ key: '', loading: true, data: [] })
  useEffect(() => {
    if (!key) return
    const col = collection(db, 'projects')
    const q = key === 'all' ? col : key.startsWith('b:') ? query(col, where('builderUid', '==', key.slice(2))) : query(col, where('clientId', '==', key.slice(2)))
    return onSnapshot(
      q,
      (snap) =>
        setState({
          key,
          loading: false,
          data: snap.docs
            .map((d) => ({ ...(d.data() as Project), id: d.id }))
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
        }),
      () => setState({ key, loading: false, data: [] }),
    )
  }, [key])
  return state.key === key ? state : { key, loading: Boolean(key), data: [] }
}

export function useProject(id: string | null) {
  const [state, setState] = useState<{ loading: boolean; data: Project | null }>({ loading: true, data: null })
  useEffect(() => {
    if (!id) return
    return onSnapshot(
      doc(db, 'projects', id),
      (snap) => setState({ loading: false, data: snap.exists() ? (snap.data() as Project) : null }),
      () => setState({ loading: false, data: null }),
    )
  }, [id])
  return state
}

/** Una lista de la obra (messages, updates, payments, extras), en orden de creación */
function useSub<T>(projectId: string | null, sub: 'messages' | 'updates' | 'payments' | 'extras') {
  const [state, setState] = useState<{ loading: boolean; data: WithId<T>[] }>({ loading: true, data: [] })
  useEffect(() => {
    if (!projectId) return
    return onSnapshot(
      query(collection(db, 'projects', projectId, sub), orderBy('createdAt')),
      (snap) => setState({ loading: false, data: snap.docs.map((d) => ({ ...(d.data({ serverTimestamps: 'estimate' }) as T), id: d.id })) }),
      () => setState({ loading: false, data: [] }),
    )
  }, [projectId, sub])
  return state
}

export const useProjectMessages = (id: string | null) => useSub<ProjectMessage>(id, 'messages')
export const useProjectUpdates = (id: string | null) => useSub<ProjectUpdate>(id, 'updates')
export const useProjectPayments = (id: string | null) => useSub<ProjectPayment>(id, 'payments')
export const useProjectExtras = (id: string | null) => useSub<ProjectExtra>(id, 'extras')

export function postProjectMessage(projectId: string, a: Author, text: string) {
  return addDoc(collection(db, 'projects', projectId, 'messages'), {
    text: text.trim().slice(0, 2000),
    sender: a.role,
    authorUid: a.uid,
    authorName: a.name,
    createdAt: serverTimestamp(),
  })
}

/** Publica un avance; las fotos se suben antes y el avance guarda dónde están */
export async function postProjectUpdate(projectId: string, a: Author, u: { title: string; text: string; percent?: number }, files: File[] = []) {
  const entry = doc(collection(db, 'projects', projectId, 'updates'))
  const attachments = files.length ? await uploadAttachments(projectId, 'updates', entry.id, files) : []
  return setDoc(entry, {
    ...(attachments.length ? { attachments } : {}),
    title: u.title.trim().slice(0, 200),
    text: u.text.trim().slice(0, 4000),
    ...(u.percent !== undefined ? { percent: Math.max(0, Math.min(100, Math.round(u.percent))) } : {}),
    authorUid: a.uid,
    authorRole: a.role,
    authorName: a.name,
    createdAt: serverTimestamp(),
  })
}

/** Anota un pago; los justificantes se suben antes y el pago guarda dónde están */
export async function addProjectPayment(projectId: string, a: Author, p: { amount: number; date: string; concept: string }, files: File[] = []) {
  const entry = doc(collection(db, 'projects', projectId, 'payments'))
  const attachments = files.length ? await uploadAttachments(projectId, 'payments', entry.id, files) : []
  return setDoc(entry, {
    ...(attachments.length ? { attachments } : {}),
    amount: Math.round(p.amount * 100) / 100,
    date: p.date,
    concept: p.concept.trim().slice(0, 200),
    recordedByUid: a.uid,
    recordedByRole: a.role,
    recordedByName: a.name,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}

/** La otra parte confirma que el pago es correcto, o lo discute */
export function answerProjectPayment(projectId: string, paymentId: string, a: Author, status: 'confirmed' | 'disputed') {
  return updateDoc(doc(db, 'projects', projectId, 'payments', paymentId), {
    status,
    confirmedByUid: a.uid,
    confirmedByRole: a.role,
    confirmedByName: a.name,
    confirmedAt: serverTimestamp(),
  })
}

export function proposeProjectExtra(projectId: string, a: Author, e: { title: string; description: string; amount: number; selectionId?: string }) {
  return addDoc(collection(db, 'projects', projectId, 'extras'), {
    title: e.title.trim().slice(0, 200),
    description: e.description.trim().slice(0, 4000),
    amount: Math.round(e.amount * 100) / 100,
    ...(e.selectionId ? { selectionId: e.selectionId } : {}),
    proposedByUid: a.uid,
    proposedByRole: a.role,
    proposedByName: a.name,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}

/** Solo el cliente: aprueba o rechaza un extra */
export function decideProjectExtra(projectId: string, extraId: string, a: Author, status: 'approved' | 'rejected', note: string) {
  return updateDoc(doc(db, 'projects', projectId, 'extras', extraId), {
    status,
    decidedByUid: a.uid,
    decidedByName: a.name,
    decidedAt: serverTimestamp(),
    decisionNote: note.trim().slice(0, 1000),
  })
}

export function withdrawProjectExtra(projectId: string, extraId: string) {
  return updateDoc(doc(db, 'projects', projectId, 'extras', extraId), { status: 'withdrawn' })
}

/** Cuentas de la obra: presupuesto y extras sin IVA, IVA, total con IVA, pagado y pendiente */
export { projectTotals } from './projectTotals'

export const formatMoney = (n: number, locale: string) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n)
