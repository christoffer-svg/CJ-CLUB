import type { Timestamp } from 'firebase/firestore'
import type { Language } from './types'

/** "abril 2026" / "April 2026" */
export function monthYear(ts: Timestamp | undefined, locale = 'es-ES') {
  if (!ts) return ''
  return ts.toDate().toLocaleDateString(locale, { month: 'long', year: 'numeric' }).replace(' de ', ' ')
}

/**
 * Nombre de la familia según el idioma. En la base de datos se guarda en español
 * ("Familia Jansen"); en inglés se muestra "Jansen Family" (o "Jansen family" en mitad de frase).
 * En español, en mitad de frase "familia" va en minúscula: "Hola, familia Jansen".
 */
export function familyName(name: string, lang: Language, inSentence = false) {
  const m = name.match(/^Familia\s+(.+)$/i)
  if (lang === 'en') return m ? `${m[1]} ${inSentence ? 'family' : 'Family'}` : name
  return inSentence ? name.replace(/^Familia\b/, 'familia') : name
}

/** Enlace de WhatsApp: wa.me solo admite dígitos */
export function whatsappLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}`
}

export function telLink(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
