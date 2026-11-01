/** Totales de Mi reforma con IVA: presupuesto y extras sin IVA, pagos con IVA incluido */
import assert from 'node:assert/strict'
import { projectTotals } from '../src/lib/projectTotals'
import type { Project, ProjectExtra, ProjectPayment } from '../src/lib/types'

const project = (vatRate?: 10 | 21) => ({ budget: 18500, ...(vatRate ? { vatRate } : {}) }) as Project
const extras = [
  { amount: 200, status: 'approved' },
  { amount: 420, status: 'pending' },
  { amount: 300, status: 'rejected' },
] as ProjectExtra[]
const payments = [
  { amount: 5550, status: 'confirmed' },
  { amount: 1000, status: 'pending' },
  { amount: 900, status: 'disputed' },
] as ProjectPayment[]

let t = projectTotals(project(), extras, payments)
assert.equal(t.vatRate, 21, 'sin tipo guardado: 21 %')
assert.equal(t.base, 18700)
assert.equal(t.vat, 3927)
assert.equal(t.total, 22627)
assert.equal(t.paid, 5550)
assert.equal(t.outstanding, 17077)
assert.equal(t.pendingExtras, 420)
assert.equal(t.unconfirmed, 1000)

t = projectTotals(project(10), extras, payments)
assert.equal(t.vat, 1870)
assert.equal(t.total, 20570)
assert.equal(t.outstanding, 15020)

// Céntimos
t = projectTotals({ budget: 1234.56, vatRate: 21 } as Project, [], [])
assert.equal(t.vat, 259.26)
assert.equal(t.total, 1493.82)

// Pagado de más: no queda pendiente negativo
t = projectTotals({ budget: 100, vatRate: 21 } as Project, [], [{ amount: 200, status: 'confirmed' }] as ProjectPayment[])
assert.equal(t.outstanding, 0)

// Presupuesto por partidas: la partida no tiene precio propio; cuentan solo los elementos
t = projectTotals({ budget: 99999, vatRate: 21 } as Project, [], [], [
  { kind: 'group', quantity: 1, unitPrice: 0 },
  { kind: 'item', quantity: 2, unitPrice: 189.9 },
  { kind: 'item', quantity: 1, unitPrice: 310 },
  { quantity: 1, unitPrice: 100 },
])
assert.equal(t.budget, 789.8, 'con líneas, el presupuesto es su suma')
assert.equal(t.total, 955.66)

console.log('IVA: OK')
