import type { Timestamp } from 'firebase/firestore'

/** "abril 2026" / "April 2026" */
export function monthYear(ts: Timestamp | undefined, locale = 'es-ES') {
  if (!ts) return ''
  return ts.toDate().toLocaleDateString(locale, { month: 'long', year: 'numeric' }).replace(' de ', ' ')
}

/**
 * Nombre de la familia en el idioma de la app. En la base de datos se guarda en español
 * ("Familia Jansen"); el formato de cada idioma está en las traducciones (family.title / family.inSentence),
 * p. ej. "Jansen Family", "Familjen Jansen", "Hola, familia Jansen".
 */
export function familyName(name: string, t: (key: 'family.title' | 'family.inSentence', p: { name: string }) => string, inSentence = false) {
  const m = name.match(/^Familia\s+(.+)$/i)
  if (!m) return name
  return t(inSentence ? 'family.inSentence' : 'family.title', { name: m[1] })
}

/** Enlace de WhatsApp: wa.me solo admite dígitos */
export function whatsappLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}`
}

export function telLink(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
