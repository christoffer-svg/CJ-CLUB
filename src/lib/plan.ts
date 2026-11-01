/** Plan de pagos de Mi reforma: hitos que suman el 90 % y el 10 % final retenido hasta terminar los repasos */
import { deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from './firebase'
import type { Author } from './projects'
import type { Milestone, ProjectPayment, RetentionRelease } from './types'

export const RETENTION = 10
export const PLAN_PERCENT = 100 - RETENTION

export function usePlan(projectId: string | null) {
  const [state, setState] = useState<{ loading: boolean; milestones: Milestone[]; release: RetentionRelease | null }>({ loading: true, milestones: [], release: null })
  useEffect(() => {
    if (!projectId) return
    const offPlan = onSnapshot(
      doc(db, 'projects', projectId, 'plan', 'main'),
      (snap) => setState((s) => ({ ...s, loading: false, milestones: snap.exists() ? ((snap.data().milestones as Milestone[]) ?? []) : [] })),
      () => setState((s) => ({ ...s, loading: false })),
    )
    const offRelease = onSnapshot(
      doc(db, 'projects', projectId, 'plan', 'release'),
      (snap) => setState((s) => ({ ...s, release: snap.exists() ? (snap.data({ serverTimestamps: 'estimate' }) as RetentionRelease) : null })),
      () => undefined,
    )
    return () => {
      offPlan()
      offRelease()
    }
  }, [projectId])
  return state
}

export const planSum = (m: Milestone[]) => m.reduce((s, x) => s + x.percent, 0)
export const planReady = (m: Milestone[]) => m.length > 0 && planSum(m) === PLAN_PERCENT

export function savePlan(projectId: string, a: Author, milestones: Milestone[]) {
  return setDoc(doc(db, 'projects', projectId, 'plan', 'main'), {
    milestones: milestones.map((m) => ({ id: m.id, title: m.title.trim().slice(0, 120), percent: Math.round(m.percent) })),
    authorUid: a.uid,
    authorRole: a.role,
    authorName: a.name,
    updatedAt: serverTimestamp(),
  })
}

export const deletePlan = (projectId: string) => deleteDoc(doc(db, 'projects', projectId, 'plan', 'main'))

/** El cliente da por buenos los repasos y libera el 10 % final */
export function releaseRetention(projectId: string, a: Author) {
  return setDoc(doc(db, 'projects', projectId, 'plan', 'release'), { uid: a.uid, name: a.name.trim().slice(0, 120), releasedAt: serverTimestamp() })
}

const cents = (n: number) => Math.round(n * 100) / 100

/** Importe de cada pago del plan (sobre el total con IVA del presupuesto firmado) y lo pagado de cada uno */
export function planRows(totalWithVat: number, milestones: Milestone[], payments: ProjectPayment[]) {
  const paidFor = (id: string) => cents(payments.filter((p) => p.milestoneId === id && p.status === 'confirmed').reduce((s, p) => s + p.amount, 0))
  const rows = milestones.map((m) => ({ id: m.id, title: m.title, percent: m.percent, amount: cents((totalWithVat * m.percent) / 100), paid: paidFor(m.id), final: false }))
  rows.push({ id: 'final', title: '', percent: RETENTION, amount: cents((totalWithVat * RETENTION) / 100), paid: paidFor('final'), final: true })
  return rows
}

export const newMilestoneId = () => Math.random().toString(36).slice(2, 10)
