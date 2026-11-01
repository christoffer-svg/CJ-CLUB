import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { useDoc } from '../lib/data'
import { cancelBooking, requestBooking, type WithId } from '../lib/events'
import { familyName } from '../lib/format'
import { formatMoney } from '../lib/projects'
import type { Client, EventBooking, PlaceEvent } from '../lib/types'
import { useViewer } from '../lib/viewer'

/** "miércoles, 12 de noviembre · 20:30–23:00", en el idioma del cliente */
export function useEventWhen() {
  const { locale } = useI18n()
  return (e: Pick<PlaceEvent, 'date' | 'time' | 'endTime'>) => {
    const [y, m, d] = e.date.split('-').map(Number)
    const day = new Date(y, m - 1, d, 12).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
    return `${day} · ${e.time}${e.endTime ? `–${e.endTime}` : ''}`
  }
}

/** Un evento para el cliente, con su solicitud de reserva (si la tiene) o el formulario para pedirla */
export default function EventCard({ e, bookings, showPlace }: { e: WithId<PlaceEvent>; bookings: WithId<EventBooking>[]; showPlace?: boolean }) {
  const { t, pick, locale } = useI18n()
  const { clientId, base, preview } = useViewer()
  const { user } = useAuth()
  const client = useDoc<Client>(clientId ? `clients/${clientId}` : null)
  const when = useEventWhen()
  const [form, setForm] = useState<{ people: number; phone: string; note: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // La última solicitud viva de esta casa para este evento
  const mine = bookings.find((b) => b.eventId === e.id && b.status !== 'cancelled') ?? null
  const about = pick(e, 'about')

  async function send() {
    if (!form || !clientId || !user) return
    setBusy(true)
    setError('')
    try {
      const name = client.data ? familyName(client.data.familyName, t) : ''
      await requestBooking(e, { clientId, uid: user.uid, name: name || user.email || '—' }, form)
      setForm(null)
    } catch {
      setError(t('events.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="card ev">
      {e.photo && <img className="ev__photo" src={e.photo.url} alt="" loading="lazy" />}
      <span className="eyebrow">{t(`events.kind.${e.kind}`)}</span>
      <h3 className="ev__title">{e.title}</h3>
      {showPlace && (
        <Link className="ev__place" to={`${base}/descubrir/${e.placeId}`}>
          {e.businessName}
        </Link>
      )}
      <p className="ev__when">{when(e)}</p>
      <p className="ev__price">{e.price ? t('events.price', { price: formatMoney(e.price, locale) }) : t('events.free')}</p>
      {about && <p className="pf-text ev__about">{about}</p>}

      {e.bookable && mine && (
        <div className={`ev__mine ev__mine--${mine.status}`}>
          <span className="ev__status">{t(`events.status.${mine.status}`, { n: mine.people })}</span>
          {mine.reply && <span className="card__text">«{mine.reply}»</span>}
          {!preview && mine.status !== 'declined' && (
            <button className="link-btn link-btn--dark" disabled={busy} onClick={() => window.confirm(t('events.cancelConfirm')) && cancelBooking(mine.id).catch(() => setError(t('events.error')))}>
              {t('events.cancel')}
            </button>
          )}
        </div>
      )}

      {e.bookable && !mine && !form && (
        <button className="btn ev__book" disabled={preview} onClick={() => setForm({ people: 2, phone: '', note: '' })}>
          {t('events.book')}
        </button>
      )}
      {form && (
        <form
          className="request-form ev__form"
          onSubmit={(ev) => {
            ev.preventDefault()
            send()
          }}
        >
          <label className="request-form__field">
            <span className="eyebrow">{t('events.people')}</span>
            <select className="composer__input" value={form.people} onChange={(ev) => setForm({ ...form, people: Number(ev.target.value) })}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="request-form__field">
            <span className="eyebrow">{t('events.phone')}</span>
            <input className="composer__input" type="tel" maxLength={40} value={form.phone} onChange={(ev) => setForm({ ...form, phone: ev.target.value })} />
          </label>
          <label className="request-form__field">
            <span className="eyebrow">{t('events.note')}</span>
            <textarea className="composer__input" rows={2} maxLength={500} value={form.note} onChange={(ev) => setForm({ ...form, note: ev.target.value })} />
          </label>
          <p className="card__text">{t('events.howItWorks')}</p>
          {error && <p className="composer__error">{error}</p>}
          <div className="request-form__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setForm(null)}>
              {t('requests.cancelForm')}
            </button>
            <button type="submit" className="btn" disabled={busy}>
              {t('events.send')}
            </button>
          </div>
        </form>
      )}
      {error && !form && <p className="composer__error">{error}</p>}
    </article>
  )
}
