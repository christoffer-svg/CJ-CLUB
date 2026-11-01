/** Pedidos de comida en la app (para llevar o a domicilio) y la lista de platos de cada restaurante */
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useEffect, useState } from 'react'
import { db, functions } from './firebase'
import type { FoodOrder, OrderItem, OrderMode, OrderStatus } from './types'

export type WithId<T> = T & { id: string }

/** Platos de un restaurante, por apartado y orden */
export function useOrderItems(placeId: string | null) {
  const [state, setState] = useState<{ loading: boolean; data: WithId<OrderItem>[] }>({ loading: true, data: [] })
  useEffect(() => {
    if (!placeId) return
    return onSnapshot(
      collection(db, 'places', placeId, 'orderItems'),
      (snap) => setState({ loading: false, data: snap.docs.map((d) => ({ ...(d.data() as OrderItem), id: d.id })).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)) }),
      () => setState({ loading: false, data: [] }),
    )
  }, [placeId])
  return placeId ? state : { loading: false, data: [] }
}

/** Apartados en el orden en que aparecen sus platos */
export function sections(items: WithId<OrderItem>[]) {
  const out: [string, WithId<OrderItem>[]][] = []
  for (const it of items) {
    const key = it.section.trim()
    const found = out.find(([s]) => s === key)
    if (found) found[1].push(it)
    else out.push([key, [it]])
  }
  return out
}

export function saveOrderItem(placeId: string, id: string | null, item: OrderItem) {
  const data = {
    section: item.section.trim().slice(0, 60),
    name: item.name.trim().slice(0, 120),
    description: item.description.trim().slice(0, 500),
    price: Math.round(item.price * 100) / 100,
    available: item.available,
    order: Math.max(0, Math.min(100000, Math.round(item.order))),
  }
  return id ? setDoc(doc(db, 'places', placeId, 'orderItems', id), data) : addDoc(collection(db, 'places', placeId, 'orderItems'), data)
}

export const setItemAvailable = (placeId: string, id: string, available: boolean) => updateDoc(doc(db, 'places', placeId, 'orderItems', id), { available })
export const deleteOrderItem = (placeId: string, id: string) => deleteDoc(doc(db, 'places', placeId, 'orderItems', id))

/** Pedidos de una casa, de un restaurante o todos (CJ), los más recientes primero */
export function useOrders(filter: { clientId?: string | null; placeId?: string | null; all?: boolean }) {
  const [state, setState] = useState<{ loading: boolean; data: WithId<FoodOrder>[] }>({ loading: true, data: [] })
  const key = filter.clientId ? `c:${filter.clientId}` : filter.placeId ? `p:${filter.placeId}` : filter.all ? 'all' : ''
  useEffect(() => {
    if (!key) return
    const q = filter.clientId
      ? query(collection(db, 'orders'), where('clientId', '==', filter.clientId))
      : filter.placeId
        ? query(collection(db, 'orders'), where('placeId', '==', filter.placeId))
        : collection(db, 'orders')
    return onSnapshot(
      q,
      (snap) =>
        setState({
          loading: false,
          data: snap.docs
            .map((d) => ({ ...(d.data({ serverTimestamps: 'estimate' }) as FoodOrder), id: d.id }))
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
        }),
      () => setState({ loading: false, data: [] }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return key ? state : { loading: false, data: [] }
}

export type NewOrder = {
  placeId: string
  name: string
  phone: string
  mode: OrderMode
  address: string
  wanted: string
  note: string
  lines: { itemId: string; qty: number }[]
}

/** Envía el pedido al servidor, que calcula los precios y lo guarda */
export async function placeOrder(o: NewOrder) {
  const call = httpsCallable<NewOrder, { id: string; total: number }>(functions, 'placeOrder')
  return (await call(o)).data
}

export const cancelOrder = (id: string) => updateDoc(doc(db, 'orders', id), { status: 'cancelled', updatedAt: serverTimestamp() })

/** El restaurante (o CJ) cambia el estado y, si quiere, deja un mensaje al cliente */
export const setOrderStatus = (id: string, status: OrderStatus, reply: string) =>
  updateDoc(doc(db, 'orders', id), { status, reply: reply.trim().slice(0, 500), updatedAt: serverTimestamp() })

/** Pedidos que aún no han terminado */
export const isOrderOpen = (o: FoodOrder) => o.status === 'new' || o.status === 'accepted' || o.status === 'ready' || o.status === 'out'

/** Ajustes de pedidos del restaurante (solo estos campos de su ficha) */
export const saveOrderSettings = (placeId: string, s: { ordersOpen: boolean; deliveryFee: number; minOrder: number }) =>
  updateDoc(doc(db, 'places', placeId), { ordersOpen: s.ordersOpen, deliveryFee: Math.round(s.deliveryFee * 100) / 100, minOrder: Math.round(s.minOrder * 100) / 100 })
