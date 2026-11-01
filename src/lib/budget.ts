/** Presupuesto por líneas de Mi reforma y sus firmas (cliente y constructor) */
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { uploadAttachments } from './attachments'
import { db } from './firebase'
import type { Author, WithId } from './projects'
import type { Attachment, BudgetLine, BudgetSignature, Milestone, SignedLine } from './types'

export function useBudgetLines(projectId: string | null) {
  const [state, setState] = useState<{ loading: boolean; data: WithId<BudgetLine>[] }>({ loading: true, data: [] })
  useEffect(() => {
    if (!projectId) return
    return onSnapshot(
      query(collection(db, 'projects', projectId, 'budgetLines'), orderBy('order')),
      (snap) => setState({ loading: false, data: snap.docs.map((d) => ({ ...(d.data({ serverTimestamps: 'estimate' }) as BudgetLine), id: d.id })) }),
      () => setState({ loading: false, data: [] }),
    )
  }, [projectId])
  return state
}

export function useBudgetSignatures(projectId: string | null) {
  const [state, setState] = useState<{ loading: boolean; client?: BudgetSignature; builder?: BudgetSignature }>({ loading: true })
  useEffect(() => {
    if (!projectId) return
    return onSnapshot(
      collection(db, 'projects', projectId, 'signatures'),
      (snap) => {
        const by = Object.fromEntries(snap.docs.map((d) => [d.id, d.data({ serverTimestamps: 'estimate' }) as BudgetSignature]))
        setState({ loading: false, client: by.client, builder: by.builder })
      },
      () => setState({ loading: false }),
    )
  }, [projectId])
  return state
}

export const lineTotal = (l: Pick<BudgetLine, 'quantity' | 'unitPrice'>) => Math.round(l.quantity * l.unitPrice * 100) / 100
/** Suma sin IVA: precio de las partidas y elementos sueltos (lo incluido en una partida es orientativo) */
import { budgetBase } from './projectTotals'
export const linesBase = budgetBase

export type LineDraft = { kind: 'group' | 'item'; parentId?: string; title: string; description: string; quantity: number; unit: string; unitPrice: number }

/** Crea o cambia una línea; sube antes sus fotos nuevas */
export async function saveBudgetLine(
  projectId: string,
  a: Author,
  existing: WithId<BudgetLine> | null,
  draft: LineDraft,
  keep: Attachment[],
  files: File[],
  order: number,
) {
  const ref = existing ? doc(db, 'projects', projectId, 'budgetLines', existing.id) : doc(collection(db, 'projects', projectId, 'budgetLines'))
  // Número del siguiente archivo: después del más alto que ya tuvo la línea (los archivos no se reemplazan)
  const used = (existing?.attachments ?? []).map((x) => Number(x.path.split('/').pop()?.split('-')[0]) || 0)
  const added = files.length ? await uploadAttachments(projectId, 'budget', ref.id, files, Math.max(0, ...used) + 1) : []
  const attachments = [...keep, ...added]
  await setDoc(ref, {
    kind: draft.kind,
    ...(draft.kind === 'item' && draft.parentId ? { parentId: draft.parentId } : {}),
    title: draft.title.trim().slice(0, 200),
    description: draft.description.trim().slice(0, 2000),
    quantity: draft.kind === 'group' ? 1 : draft.quantity,
    unit: draft.unit.trim().slice(0, 20) || 'ud',
    unitPrice: Math.round(draft.unitPrice * 100) / 100,
    order,
    ...(attachments.length ? { attachments } : {}),
    authorUid: a.uid,
    authorRole: a.role,
    authorName: a.name,
    createdAt: existing ? existing.createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export const deleteBudgetLine = (projectId: string, lineId: string) => deleteDoc(doc(db, 'projects', projectId, 'budgetLines', lineId))

/** Quita una partida con todo lo que incluye */
export async function deleteBudgetGroup(projectId: string, groupId: string, itemIds: string[]) {
  const batch = writeBatch(db)
  for (const id of [...itemIds, groupId]) batch.delete(doc(db, 'projects', projectId, 'budgetLines', id))
  await batch.commit()
}

/** Copia de las líneas tal como se ven ahora (lo que se firma) */
export const snapshotLines = (lines: WithId<BudgetLine>[]): SignedLine[] =>
  lines.map((l) => ({
    id: l.id,
    kind: l.kind ?? 'item',
    parentId: l.parentId ?? '',
    title: l.title,
    description: l.description,
    quantity: l.quantity,
    unit: l.unit,
    unitPrice: l.unitPrice,
    photos: l.attachments?.length ?? 0,
  }))

/** Huella SHA-256 de las líneas, el plan de pagos y el IVA: si cambia cualquier dato, cambia la huella */
export async function budgetHash(lines: SignedLine[], vatRate: number, plan: Milestone[] = []) {
  const canonical = JSON.stringify({
    vatRate,
    plan: plan.map((m) => [m.id, m.title, m.percent]),
    lines: lines.map((l) => [l.id, l.kind, l.parentId, l.title, l.description, l.quantity, l.unit, l.unitPrice, l.photos]),
  })
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Firma el presupuesto tal como se ve ahora */
export async function signBudget(
  projectId: string,
  a: Author & { role: 'client' | 'builder' },
  name: string,
  image: string,
  lines: WithId<BudgetLine>[],
  vatRate: 10 | 21,
  plan: Milestone[],
) {
  const snapshot = snapshotLines(lines)
  await setDoc(doc(db, 'projects', projectId, 'signatures', a.role), {
    role: a.role,
    uid: a.uid,
    name: name.trim().slice(0, 120),
    accepted: true,
    image,
    hash: await budgetHash(snapshot, vatRate, plan),
    lines: snapshot,
    plan: plan.map((m) => ({ id: m.id, title: m.title, percent: m.percent })),
    base: linesBase(lines),
    vatRate,
    signedAt: serverTimestamp(),
  })
}

export const withdrawSignature = (projectId: string, role: 'client' | 'builder') => deleteDoc(doc(db, 'projects', projectId, 'signatures', role))
