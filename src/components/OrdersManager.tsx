import { useState } from 'react'
import { Input } from './admin/Fields'
import { useToast } from './admin/Toast'
import { isOrderOpen, setOrderStatus, useOrders, type WithId } from '../lib/orders'
import { formatMoney } from '../lib/projects'
import type { FoodOrder, OrderStatus } from '../lib/types'

export const orderStatusLabel: Record<OrderStatus, string> = {
  new: 'Nuevo',
  accepted: 'Aceptado · en preparación',
  ready: 'Listo para recoger',
  out: 'En camino',
  done: 'Entregado',
  declined: 'Rechazado',
  cancelled: 'Cancelado por el cliente',
}

const money = (n: number) => formatMoney(n, 'es-ES')
const hour = (o: FoodOrder) => o.createdAt?.toDate().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) ?? ''
const dayLabel = (o: FoodOrder) => o.createdAt?.toDate().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) ?? ''

/** Pedidos de un restaurante (o de todos, para CJ): los abiertos arriba, los terminados debajo */
export default function OrdersManager({ placeId, admin }: { placeId: string | null; admin?: boolean }) {
  const orders = useOrders(placeId ? { placeId } : { all: true })
  const [showDone, setShowDone] = useState(false)
  const open = orders.data.filter(isOrderOpen).reverse()
  const closed = orders.data.filter((o) => !isOrderOpen(o))
  return (
    <>
      <h2 className="a-subtitle">En curso</h2>
      {!orders.loading && open.length === 0 && <p className="a-empty">No hay pedidos en curso. Los nuevos aparecen aquí al momento, con un aviso en el menú.</p>}
      <div className="ev-list">
        {open.map((o) => (
          <OrderCard key={o.id} o={o} admin={admin} />
        ))}
      </div>
      {closed.length > 0 && (
        <>
          <button className="a-link ev-past" onClick={() => setShowDone(!showDone)}>
            {showDone ? 'Ocultar pedidos anteriores' : `Ver pedidos anteriores (${closed.length})`}
          </button>
          {showDone && (
            <div className="ev-list">
              {closed.map((o) => (
                <OrderCard key={o.id} o={o} admin={admin} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}

function OrderCard({ o, admin }: { o: WithId<FoodOrder>; admin?: boolean }) {
  const toast = useToast()
  const [reply, setReply] = useState(o.reply)
  const [busy, setBusy] = useState(false)
  const go = (status: OrderStatus, confirm?: string) => {
    if (confirm && !window.confirm(confirm)) return
    setBusy(true)
    setOrderStatus(o.id, status, reply)
      .then(() => toast(`Pedido de ${o.name}: ${orderStatusLabel[status].toLowerCase()}.`))
      .catch(() => toast('No se pudo guardar.', 'error'))
      .finally(() => setBusy(false))
  }
  const live = isOrderOpen(o)
  return (
    <article className={`card ev-admin order order--${o.status}`}>
      <div className="ev-admin__head">
        <div className="a-row__body">
          <span className="eyebrow">
            {o.mode === 'delivery' ? 'A domicilio' : 'Para recoger'} · {dayLabel(o)} {hour(o)}
            {admin ? ` · ${o.placeName}` : ''}
          </span>
          <span className="card__title">
            {o.name} · {money(o.total)}
          </span>
          <span className="card__text">
            {o.wanted === 'asap' ? 'Lo antes posible' : `Para las ${o.wanted}`} · Tel. {o.phone}
          </span>
          {o.mode === 'delivery' && <span className="card__text">Dirección: {o.address}</span>}
        </div>
        <span className={`status status--${o.status === 'new' ? 'new' : o.status === 'done' ? 'done' : 'in_progress'}`}>{orderStatusLabel[o.status]}</span>
      </div>
      <ul className="order__lines">
        {o.lines.map((l) => (
          <li key={l.itemId}>
            <span>
              {l.qty} × {l.name}
            </span>
            <span>{money(l.price * l.qty)}</span>
          </li>
        ))}
        {o.deliveryFee > 0 && (
          <li className="order__fee">
            <span>Envío</span>
            <span>{money(o.deliveryFee)}</span>
          </li>
        )}
        <li className="order__total">
          <span>Total (se paga {o.mode === 'delivery' ? 'al repartidor' : 'al recoger'})</span>
          <span>{money(o.total)}</span>
        </li>
      </ul>
      {o.note && <p className="card__text">Comentario: «{o.note}»</p>}
      {o.reply && !live && <p className="card__text">Su mensaje: «{o.reply}»</p>}
      {live && (
        <div className="ev-booking__answer order__answer">
          <Input maxLength={500} placeholder="Mensaje para el cliente (p. ej. «Listo en 30 minutos»)" value={reply} onChange={(e) => setReply(e.target.value)} />
          <div className="ev-booking__buttons">
            {o.status === 'new' && (
              <>
                <button className="btn a-btn" disabled={busy} onClick={() => go('accepted')}>
                  Aceptar
                </button>
                <button className="btn btn--ghost a-btn" disabled={busy} onClick={() => go('declined', '¿Rechazar este pedido? El cliente lo verá al momento.')}>
                  Rechazar
                </button>
              </>
            )}
            {o.status === 'accepted' && (
              <>
                <button className="btn a-btn" disabled={busy} onClick={() => go(o.mode === 'delivery' ? 'out' : 'ready')}>
                  {o.mode === 'delivery' ? 'Sale el repartidor' : 'Listo para recoger'}
                </button>
                {reply !== o.reply && (
                  <button className="btn btn--ghost a-btn" disabled={busy} onClick={() => go('accepted')}>
                    Enviar mensaje
                  </button>
                )}
                <button className="btn btn--ghost a-btn" disabled={busy} onClick={() => go('declined', '¿Anular este pedido aceptado? El cliente lo verá al momento.')}>
                  Anular
                </button>
              </>
            )}
            {(o.status === 'ready' || o.status === 'out') && (
              <button className="btn a-btn" disabled={busy} onClick={() => go('done')}>
                Entregado
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  )
}
