import type { Timestamp } from 'firebase/firestore'

/** "14:05" si es de hoy; "3 nov, 14:05" si es de otro día (según el idioma) */
export function messageTime(ts: Timestamp | null | undefined, locale: string) {
  if (!ts) return ''
  const d = ts.toDate()
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === new Date().toDateString()) return time
  return `${d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}, ${time}`
}

/** "3 nov 2026" a partir de "2026-11-03" o de un Timestamp */
export function shortDate(value: string | Timestamp | null | undefined, locale: string) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(`${value}T12:00:00`) : value.toDate()
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}
