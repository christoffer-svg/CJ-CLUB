/** Eventos de los negocios (catas, música en vivo…) y sus solicitudes de reserva */
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { todayKey } from './data'
import { db } from './firebase'
import type { BookingStatus, EventBooking, PlaceEvent } from './types'

export type WithId<T> = T & { id: string }

const byDate = (a: PlaceEvent, b: PlaceEvent) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)

/** ¿Lo ve el cliente? Activo, no oculto por CJ y de hoy en adelante */
export const isEventShown = (e: PlaceEvent, today = todayKey()) => e.active && !e.hiddenByAdmin && e.date >= today

/** Próximos eventos visibles (todos, o los de un lugar) */
export function useUpcomingEvents(placeId?: string) {
  const [state, setState] = useState<{ loading: boolean; data: WithId<PlaceEvent>[] }>({ loading: true, data: [] })
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'events'), where('active', '==', true)),
        (snap) =>
          setState({
            loading: false,
            data: snap.docs
              .map((d) => ({ ...(d.data() as PlaceEvent), id: d.id }))
              .filter((e) => isEventShown(e) && (!placeId || e.placeId === placeId))
              .sort(byDate),
          }),
        () => setState({ loading: false, data: [] }),
      ),
    [placeId],
  )
  return state
}

/** Eventos de un negocio (para su panel, todos, también los pasados) o todos (CJ) */
export function usePlaceEvents(placeId: string | null) {
  const [state, setState] = useState<{ loading: boolean; data: WithId<PlaceEvent>[] }>({ loading: true, data: [] })
  useEffect(() => {
    const q = placeId ? query(collection(db, 'events'), where('placeId', '==', placeId)) : collection(db, 'events')
    return onSnapshot(
      q,
      (snap) => setState({ loading: false, data: snap.docs.map((d) => ({ ...(d.data() as PlaceEvent), id: d.id })).sort(byDate) }),
      () => setState({ loading: false, data: [] }),
    )
  }, [placeId])
  return state
}

export type EventDraft = Pick<PlaceEvent, 'kind' | 'title' | 'about_es' | 'about_en' | 'date' | 'time' | 'endTime' | 'price' | 'capacity' | 'bookable' | 'active' | 'photo'>

/** Crea o cambia un evento (negocio o CJ) */
export async function saveEvent(id: string | null, placeId: string, businessName: string, uid: string, d: EventDraft, existing?: PlaceEvent) {
  const data = {
    placeId,
    businessName,
    kind: d.kind,
    title: d.title.trim().slice(0, 120),
    about_es: d.about_es.trim().slice(0, 2000),
    about_en: d.about_en.trim().slice(0, 2000),
    date: d.date,
    time: d.time,
    endTime: d.endTime,
    price: Math.round(d.price * 100) / 100,
    capacity: Math.max(0, Math.round(d.capacity)),
    bookable: d.bookable,
    active: d.active,
    hiddenByAdmin: existing?.hiddenByAdmin === true,
    photo: d.photo ?? null,
    createdByUid: existing?.createdByUid || uid,
    createdAt: existing ? existing.createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  if (id) await setDoc(doc(db, 'events', id), data)
  else await addDoc(collection(db, 'events'), data)
}

export const deleteEvent = (id: string) => deleteDoc(doc(db, 'events', id))
export const setEventHidden = (id: string, hidden: boolean) => updateDoc(doc(db, 'events', id), { hiddenByAdmin: hidden })

/** Reservas: las del cliente (clientId), las de un negocio (placeId) o todas (CJ) */
export function useBookings(filter: { clientId?: string | null; placeId?: string | null; all?: boolean }) {
  const [state, setState] = useState<{ loading: boolean; data: WithId<EventBooking>[] }>({ loading: true, data: [] })
  const key = filter.clientId ? `c:${filter.clientId}` : filter.placeId ? `p:${filter.placeId}` : filter.all ? 'all' : ''
  useEffect(() => {
    if (!key) return
    const q = filter.clientId
      ? query(collection(db, 'eventBookings'), where('clientId', '==', filter.clientId))
      : filter.placeId
        ? query(collection(db, 'eventBookings'), where('placeId', '==', filter.placeId))
        : collection(db, 'eventBookings')
    return onSnapshot(
      q,
      (snap) =>
        setState({
          loading: false,
          data: snap.docs
            .map((d) => ({ ...(d.data({ serverTimestamps: 'estimate' }) as EventBooking), id: d.id }))
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
        }),
      () => setState({ loading: false, data: [] }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return key ? state : { loading: false, data: [] }
}

/** El cliente pide reserva para un evento */
export function requestBooking(
  e: WithId<PlaceEvent>,
  who: { clientId: string; uid: string; name: string },
  d: { people: number; phone: string; note: string },
) {
  return addDoc(collection(db, 'eventBookings'), {
    eventId: e.id,
    placeId: e.placeId,
    eventTitle: e.title,
    eventDate: e.date,
    eventTime: e.time,
    clientId: who.clientId,
    uid: who.uid,
    name: who.name.trim().slice(0, 120),
    people: d.people,
    phone: d.phone.trim().slice(0, 40),
    note: d.note.trim().slice(0, 500),
    status: 'pending',
    reply: '',
    createdAt: serverTimestamp(),
    answeredAt: null,
    cancelledAt: null,
  })
}

export const cancelBooking = (id: string) => updateDoc(doc(db, 'eventBookings', id), { status: 'cancelled', cancelledAt: serverTimestamp() })

/** El negocio (o CJ) confirma o rechaza una solicitud */
export const answerBooking = (id: string, status: Extract<BookingStatus, 'confirmed' | 'declined'>, reply: string) =>
  updateDoc(doc(db, 'eventBookings', id), { status, reply: reply.trim().slice(0, 500), answeredAt: serverTimestamp() })

/** Personas en solicitudes vivas (pendientes o confirmadas) */
export const peopleBooked = (list: EventBooking[], eventId: string, statuses: BookingStatus[] = ['pending', 'confirmed']) =>
  list.filter((b) => b.eventId === eventId && statuses.includes(b.status)).reduce((n, b) => n + b.people, 0)
