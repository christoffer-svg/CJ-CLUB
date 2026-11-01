import type { Project, ProjectExtra, ProjectPayment } from './types'

/** Cuentas de una obra (Mi reforma) */
export function projectTotals(project: Project | null, extras: ProjectExtra[], payments: ProjectPayment[]) {
  // Presupuesto y extras van sin IVA; los pagos, con IVA incluido (lo que de verdad se paga)
  const cents = (n: number) => Math.round(n * 100) / 100
  const budget = project?.budget ?? 0
  const vatRate = project?.vatRate ?? 21
  const approvedExtras = extras.filter((e) => e.status === 'approved').reduce((s, e) => s + e.amount, 0)
  const pendingExtras = extras.filter((e) => e.status === 'pending').reduce((s, e) => s + e.amount, 0)
  const base = cents(budget + approvedExtras)
  const vat = cents((base * vatRate) / 100)
  const total = cents(base + vat)
  const paid = payments.filter((p) => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0)
  const unconfirmed = payments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  return { budget, vatRate, approvedExtras, pendingExtras, base, vat, total, paid, unconfirmed, outstanding: Math.max(0, cents(total - paid)) }
}
