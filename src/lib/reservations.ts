import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import type { Place, ReservationChannel } from './types'

const UTM = {
  utm_source: 'cjclub',
  utm_medium: 'app',
  utm_campaign: 'reserva',
} as const

/** Dígitos del teléfono, con 34 delante si es un móvil español de 9 cifras */
export function phoneDigits(raw: string) {
  const digits = raw.replace(/\D/g, '').replace(/^00/, '')
  if (digits.length === 9) return `34${digits}`
  return digits
}

/**
 * Dirección que abre el botón Reservar.
 * En los enlaces web añade utm_source=cjclub para que el restaurante lo vea en su sistema.
 * Devuelve null si no hay reserva configurada o el dato no es válido.
 */
export function reservationHref(place: Pick<Place, 'category' | 'reservationChannel' | 'reservationTarget'>, whatsappText: string) {
  if (place.category !== 'restaurants') return null
  const channel = place.reservationChannel
  const target = place.reservationTarget?.trim() ?? ''
  if (!channel || !target) return null

  if (channel === 'link') {
    try {
      const url = new URL(target)
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
      for (const [key, value] of Object.entries(UTM)) url.searchParams.set(key, value)
      return url.toString()
    } catch {
      return null
    }
  }

  const digits = phoneDigits(target)
  if (digits.length < 9 || digits.length > 15) return null
  if (channel === 'phone') return `tel:+${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(whatsappText)}`
}

/** Texto de error para el panel, o null si se puede guardar */
export function reservationError(category: Place['category'], channel: '' | ReservationChannel, target: string) {
  if (category !== 'restaurants' || !channel) return null
  const value = target.trim()
  if (!value) return 'Escriba el enlace o el teléfono de reserva.'
  if (value.length > 2000) return 'Es demasiado largo.'
  if (channel === 'link') {
    try {
      const url = new URL(value)
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'El enlace debe empezar por https://'
    } catch {
      return 'El enlace no es válido. Copie la dirección completa, por ejemplo https://www.thefork.es/…'
    }
    return null
  }
  const digits = phoneDigits(value)
  if (digits.length < 9 || digits.length > 15) return 'El teléfono parece incompleto. Puede escribirlo con prefijo, por ejemplo 34600111222.'
  return null
}

/** Registra el pinchazo. Si falla, el cliente puede reservar igualmente. */
export function logReservationClick(placeId: string, clientId: string, channel: ReservationChannel) {
  const uid = auth.currentUser?.uid
  if (!uid) return Promise.resolve()
  return addDoc(collection(db, 'reservationClicks'), {
    placeId,
    clientId,
    uid,
    channel,
    createdAt: serverTimestamp(),
  })
}

/** El cliente dice que consiguió mesa, al volver a la app. */
export function logReservationConfirm(placeId: string, clientId: string) {
  const uid = auth.currentUser?.uid
  if (!uid) return Promise.resolve()
  return addDoc(collection(db, 'reservationConfirms'), {
    placeId,
    clientId,
    uid,
    createdAt: serverTimestamp(),
  })
}

const PENDING_KEY = 'cjclub.reservePending'
const PENDING_MAX_MS = 6 * 60 * 60 * 1000

export type ReservePending = { placeId: string; name: string; at: number }

export function markReservePending(placeId: string, name: string) {
  const pending: ReservePending = { placeId, name, at: Date.now() }
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
  } catch {
    // sin almacenamiento: no preguntamos después
  }
}

export function readReservePending(): ReservePending | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const pending = JSON.parse(raw) as ReservePending
    if (!pending || typeof pending.placeId !== 'string' || typeof pending.name !== 'string' || typeof pending.at !== 'number') return null
    if (Date.now() - pending.at > PENDING_MAX_MS) {
      sessionStorage.removeItem(PENDING_KEY)
      return null
    }
    return pending
  } catch {
    return null
  }
}

export function clearReservePending() {
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    // no es imprescindible
  }
}
