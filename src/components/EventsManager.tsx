import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import Dialog from './admin/Dialog'
import { Bilingual, Field, Input, Select, Toggle } from './admin/Fields'
import { useToast } from './admin/Toast'
import { parseAmount } from '../lib/amount'
import { todayKey } from '../lib/data'
import { answerBooking, deleteEvent, peopleBooked, saveEvent, setEventHidden, useBookings, usePlaceEvents, type EventDraft, type WithId } from '../lib/events'
import { formatMoney } from '../lib/projects'
import { uploadProfilePhotos } from '../lib/profiles'
import type { BookingStatus, EventBooking, EventKind, PlaceEvent } from '../lib/types'

export const kindLabel: Record<EventKind, string> = { tasting: 'Cata', music: 'Música en vivo', dinner: 'Cena o menú especial', other: 'Otro evento' }
const statusLabel: Record<BookingStatus, string> = { pending: 'Pendiente', confirmed: 'Confirmada', declined: 'Rechazada', cancelled: 'Cancelada por el cliente' }

type Form = Omit<EventDraft, 'price' | 'capacity'> & { id: string | null; price: string; capacity: string }
const blank = (): Form => ({
  id: null,
  kind: 'tasting',
  title: '',
  about_es: '',
  about_en: '',
  date: '',
  time: '20:00',
  endTime: '',
  price: '',
  capacity: '',
  bookable: true,
  active: true,
  photo: null,
})

/** "miércoles 12 nov 2026 · 20:30–23:00" */
export function eventWhen(e: Pick<PlaceEvent, 'date' | 'time' | 'endTime'>, locale = 'es-ES') {
  const [y, m, d] = e.date.split('-').map(Number)
  const day = new Date(y, m - 1, d, 12).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
  return `${day} · ${e.time}${e.endTime ? `–${e.endTime}` : ''}`
}

/**
 * Eventos de un negocio y sus solicitudes de reserva, en el panel.
 * Con placeId: el negocio (o CJ) gestiona los suyos. Sin placeId: CJ ve todos y puede ocultarlos.
 */
export default function EventsManager({ placeId, placeName, admin }: { placeId: string | null; placeName: string; admin?: boolean }) {
  const { user } = useAuth()
  const toast = useToast()
  const events = usePlaceEvents(placeId)
  const bookings = useBookings(placeId ? { placeId } : { all: true })
  const [form, setForm] = useState<Form | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showPast, setShowPast] = useState(false)
  const today = todayKey()
  const upcoming = events.data.filter((e) => e.date >= today)
  const past = events.data.filter((e) => e.date < today).reverse()

  const price = form ? (form.price.trim() === '' || form.price.trim() === '0' ? 0 : parseAmount(form.price)) : 0
  const capacity = form ? (form.capacity.trim() === '' ? 0 : Number(form.capacity)) : 0
  const valid = Boolean(form && form.title.trim() && form.date && form.time && price >= 0 && Number.isInteger(capacity) && capacity >= 0)

  async function save() {
    if (!form || !valid || !placeId || !user) return
    if (form.date < today && !window.confirm('La fecha ya ha pasado. ¿Guardar igualmente?')) return
    setBusy(true)
    try {
      const existing = form.id ? events.data.find((e) => e.id === form.id) : undefined
      await saveEvent(form.id, placeId, placeName, user.uid, { ...form, price, capacity }, existing)
      toast(form.id ? 'Evento guardado.' : 'Evento publicado. Los clientes de CJ ya lo ven.')
      setForm(null)
    } catch {
      toast('No se pudo guardar el evento. Revise los datos e inténtelo de nuevo.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function addPhoto(file: File | undefined) {
    if (!file || !form || !placeId) return
    setUploading(true)
    try {
      const [photo] = await uploadProfilePhotos('places', placeId, [file])
      setForm((f) => f && { ...f, photo })
    } catch {
      toast('No se pudo subir la foto.', 'error')
    } finally {
      setUploading(false)
    }
  }

  function renderEvent(e: WithId<PlaceEvent>) {
    const list = bookings.data.filter((b) => b.eventId === e.id)
    const confirmed = peopleBooked(list, e.id, ['confirmed'])
    const pending = peopleBooked(list, e.id, ['pending'])
    const visible = e.active && !e.hiddenByAdmin
    return (
      <article key={e.id} className={visible ? 'card ev-admin' : 'card ev-admin a-row--off'}>
        <div className="ev-admin__head">
          {e.photo && <img className="ev-admin__photo" src={e.photo.url} alt="" />}
          <div className="a-row__body">
            <span className="eyebrow">
              {kindLabel[e.kind]}
              {admin ? ` · ${e.businessName}` : ''}
            </span>
            <span className="card__title">{e.title}</span>
            <span className="card__text">
              {eventWhen(e)} · {e.price ? `${formatMoney(e.price, 'es-ES')} por persona` : 'Gratis'}
              {e.capacity ? ` · ${e.capacity} plazas` : ''}
            </span>
            <span className="card__text">
              {e.bookable ? `Reservas: ${confirmed} confirmadas${pending ? `, ${pending} pendientes` : ''}${e.capacity ? ` de ${e.capacity}` : ''}` : 'Sin reserva en la app'}
              {e.hiddenByAdmin ? ' · Oculto por CJ' : !e.active ? ' · No visible' : ''}
            </span>
          </div>
          <div className="ev-admin__tools">
            {admin ? (
              <Toggle
                checked={!e.hiddenByAdmin}
                label={e.hiddenByAdmin ? 'Oculto por CJ' : 'Permitido'}
                onChange={(v) => setEventHidden(e.id, !v).then(() => toast(v ? 'Evento permitido.' : 'Evento oculto para los clientes.')).catch(() => toast('No se pudo guardar.', 'error'))}
              />
            ) : (
              <>
                <button className="a-link" onClick={() => setForm({ ...e, id: e.id, price: e.price ? String(e.price).replace('.', ',') : '', capacity: e.capacity ? String(e.capacity) : '' })}>
                  Editar
                </button>
                <button
                  className="a-link"
                  onClick={() =>
                    window.confirm(list.length ? 'Este evento tiene solicitudes de reserva. ¿Borrarlo de todos modos? Los clientes dejarán de verlo.' : '¿Borrar este evento?') &&
                    deleteEvent(e.id).then(() => toast('Evento borrado.')).catch(() => toast('No se pudo borrar.', 'error'))
                  }
                >
                  Borrar
                </button>
              </>
            )}
          </div>
        </div>
        {list.length > 0 && (
          <ul className="ev-bookings">
            {list.map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </ul>
        )}
      </article>
    )
  }

  return (
    <>
      {!admin && (
        <button className="btn a-btn ev-new" onClick={() => setForm(blank())}>
          Nuevo evento
        </button>
      )}
      <h2 className="a-subtitle">Próximos</h2>
      {!events.loading && upcoming.length === 0 && <p className="a-empty">{admin ? 'No hay eventos próximos.' : 'Aún no ha publicado eventos. Pulse «Nuevo evento» para añadir una cata, música en vivo o una cena especial.'}</p>}
      <div className="ev-list">{upcoming.map(renderEvent)}</div>
      {past.length > 0 && (
        <>
          <button className="a-link ev-past" onClick={() => setShowPast(!showPast)}>
            {showPast ? 'Ocultar eventos pasados' : `Ver eventos pasados (${past.length})`}
          </button>
          {showPast && <div className="ev-list">{past.map(renderEvent)}</div>}
        </>
      )}

      {form && (
        <Dialog title={form.id ? 'Editar evento' : 'Nuevo evento'} busy={busy || uploading} onClose={() => setForm(null)} onSubmit={save} submitLabel={busy ? 'Guardando…' : 'Guardar'}>
          <div className="a-grid-2">
            <Field label="Tipo">
              <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as EventKind })}>
                {(Object.keys(kindLabel) as EventKind[]).map((k) => (
                  <option key={k} value={k}>
                    {kindLabel[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Título">
              <Input required maxLength={120} placeholder="Cata de vinos de la Marina Alta" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
          </div>
          <div className="a-grid-3">
            <Field label="Fecha">
              <Input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Hora">
              <Input required type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </Field>
            <Field label="Hasta (opcional)">
              <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </Field>
          </div>
          <div className="a-grid-2">
            <Field label="Precio por persona, IVA incluido (€)" hint={form.price.trim() ? (price >= 0 ? (price ? `= ${formatMoney(price, 'es-ES')}` : 'Gratis') : 'Importe no válido') : 'Vacío = gratis'}>
              <Input inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </Field>
            <Field label="Plazas (opcional)" hint="Vacío = sin límite. Usted confirma cada reserva.">
              <Input inputMode="numeric" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value.replace(/\D/g, '') })} />
            </Field>
          </div>
          <Bilingual label="Descripción" multiline es={form.about_es} en={form.about_en} onEs={(v) => setForm({ ...form, about_es: v })} onEn={(v) => setForm({ ...form, about_en: v })} />
          <div className="a-field">
            <span className="a-field__label">Foto (opcional)</span>
            {form.photo && (
              <div className="ev-admin__formphoto">
                <img src={form.photo.url} alt="" />
                <button type="button" className="a-link" onClick={() => setForm({ ...form, photo: null })}>
                  Quitar
                </button>
              </div>
            )}
            <label className="btn btn--ghost a-btn profile-editor__add">
              {uploading ? 'Subiendo…' : form.photo ? 'Cambiar foto' : 'Añadir foto'}
              <input type="file" accept="image/*" hidden disabled={uploading} onChange={(e) => addPhoto(e.target.files?.[0])} />
            </label>
          </div>
          <Toggle checked={form.bookable} onChange={(v) => setForm({ ...form, bookable: v })} label="Los clientes pueden pedir reserva en la app (usted la confirma)" />
          <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label={form.active ? 'Visible para los clientes' : 'No visible (borrador)'} />
        </Dialog>
      )}
    </>
  )
}

/** Una solicitud de reserva, con Confirmar y Rechazar */
function BookingRow({ b }: { b: WithId<EventBooking> }) {
  const toast = useToast()
  const [reply, setReply] = useState(b.reply ?? '')
  const [busy, setBusy] = useState(false)
  const answer = (status: 'confirmed' | 'declined') => {
    setBusy(true)
    answerBooking(b.id, status, reply)
      .then(() => toast(status === 'confirmed' ? `Reserva de ${b.name} confirmada.` : `Reserva de ${b.name} rechazada.`))
      .catch(() => toast('No se pudo guardar.', 'error'))
      .finally(() => setBusy(false))
  }
  return (
    <li className={`ev-booking ev-booking--${b.status}`}>
      <div className="ev-booking__body">
        <span className="card__title">
          {b.name} · {b.people} {b.people === 1 ? 'persona' : 'personas'}
        </span>
        <span className="card__text">
          {b.phone ? `Tel. ${b.phone}` : 'Sin teléfono'}
          {b.note ? ` · «${b.note}»` : ''}
        </span>
        <span className={`status status--${b.status === 'confirmed' ? 'done' : b.status === 'pending' ? 'new' : 'in_progress'}`}>{statusLabel[b.status]}</span>
      </div>
      {b.status !== 'cancelled' && (
        <div className="ev-booking__answer">
          <Input maxLength={500} placeholder="Mensaje para el cliente (opcional)" value={reply} onChange={(e) => setReply(e.target.value)} />
          <div className="ev-booking__buttons">
            {b.status !== 'confirmed' && (
              <button className="btn a-btn" disabled={busy} onClick={() => answer('confirmed')}>
                Confirmar
              </button>
            )}
            {b.status !== 'declined' && (
              <button className="btn btn--ghost a-btn" disabled={busy} onClick={() => answer('declined')}>
                {b.status === 'confirmed' ? 'Anular' : 'Rechazar'}
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}
