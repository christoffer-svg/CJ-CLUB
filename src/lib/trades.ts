import type { Trade } from './types'
/** Oficios en el panel (en español) */
/** Arquitecto o diseñador, en el panel */
export const professionLabel = { architect: 'Arquitecto', designer: 'Diseñador de interiores' } as const

export const tradeLabel: Record<Trade, string> = {
  construction: 'Constructor',
  electrician: 'Electricista',
  plumber: 'Fontanero',
  carpenter: 'Carpintero',
  painter: 'Pintor',
  glazier: 'Cristalero',
  other: 'Otro oficio',
}
