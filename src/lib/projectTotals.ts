import type { BudgetLine, Project, ProjectExtra, ProjectPayment } from './types'

type Priced = Pick<BudgetLine, 'kind' | 'parentId' | 'quantity' | 'unitPrice'> & { id?: string }
const cents = (n: number) => Math.round(n * 100) / 100

/**
 * Suma sin IVA del presupuesto. Cuenta el precio de cada partida (precio cerrado) y los elementos
 * sueltos. Lo que incluye una partida (grifo, plato de ducha…) es orientativo y no se suma: si el
 * cliente elige algo más caro, la diferencia va como extra.
 */
export function budgetBase(lines: Priced[]) {
  const groups = new Set(lines.filter((l) => l.kind === 'group').map((l) => l.id))
  return cents(lines.filter((l) => l.kind === 'group' || !(l.parentId && groups.has(l.parentId))).reduce((s, l) => s + cents(l.quantity * l.unitPrice), 0))
}

/** Cuentas de una obra (Mi reforma) */
export function projectTotals(
  project: Project | null,
  extras: ProjectExtra[],
  payments: ProjectPayment[],
  lines: Priced[] = [],
) {
  // Presupuesto y extras van sin IVA; los pagos, con IVA incluido (lo que de verdad se paga)
  // Con presupuesto detallado, el presupuesto es el de las partidas; si no, la cifra de la obra
  const budget = lines.length ? budgetBase(lines) : (project?.budget ?? 0)
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
