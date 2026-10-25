/** Lecturas del acceso del negocio (rol "business"): solo su lugar */
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useEffect, useState } from 'react'
import { db, functions } from './firebase'
import type { Deal } from './types'

export function useOwnDeals(placeId: string | undefined) {
  const [state, setState] = useState<{ loading: boolean; data: (Deal & { id: string })[]; error: boolean }>({
    loading: Boolean(placeId),
    data: [],
    error: false,
  })
  useEffect(() => {
    if (!placeId) return
    return onSnapshot(
      query(collection(db, 'deals'), where('placeId', '==', placeId)),
      (snap) =>
        setState({
          loading: false,
          error: false,
          data: snap.docs.map((d) => ({ ...(d.data() as Deal), id: d.id })),
        }),
      () => setState({ loading: false, error: true, data: [] }),
    )
  }, [placeId])
  return state
}

export type ReservationSummary = {
  restaurant: boolean
  businessName: string
  month: string
  clicks: number
}

/** Número de pulsaciones en Reservar. La función no devuelve datos de clientes. */
export async function fetchReservationSummary(month: string) {
  const call = httpsCallable<{ month: string }, ReservationSummary>(functions, 'businessReservationSummary')
  return (await call({ month })).data
}

/** "2026-10" en España, para coincidir con el resumen del servidor */
export function monthKeyMadrid(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
  }).format(date)
}

export function lastMonthKeys(now = new Date()) {
  const current = monthKeyMadrid(now)
  const [year, month] = current.split('-').map(Number)
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, month - 1 - i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

export function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number)
  const label = new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return label.replace(' de ', ' ')
}
