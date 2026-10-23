import type { Timestamp } from 'firebase/firestore'

/** "abril 2026" */
export function monthYear(ts: Timestamp | undefined) {
  if (!ts) return ''
  return ts.toDate().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(' de ', ' ')
}

/** "Hola, familia Jansen": en mitad de la frase "familia" va en minúscula */
export function greetingName(familyName: string) {
  return familyName.replace(/^Familia\b/, 'familia')
}

/** Enlace de WhatsApp: wa.me solo admite dígitos */
export function whatsappLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}`
}

export function telLink(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
