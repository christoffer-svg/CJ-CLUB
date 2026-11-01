import { FirebaseError } from 'firebase/app'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import Header from '../components/Header'
import { useI18n } from '../i18n'
import { useDoc } from '../lib/data'
import { familyName, telLink } from '../lib/format'
import { cancelOrder, isOrderOpen, placeOrder, sections, useOrderItems, useOrders, type WithId } from '../lib/orders'
import { formatMoney } from '../lib/projects'
import type { Client, FoodOrder, OrderMode, Place } from '../lib/types'
import { useViewer } from '../lib/viewer'

/** Horas de hoy, cada 15 minutos, desde dentro de 30 minutos */
function slots(now = new Date()) {
  const out: string[] = []
  const t = new Date(now.getTime() + 30 * 60_000)
  t.setMinutes(Math.ceil(t.getMinutes() / 15) * 15, 0, 0)
  while (t.getDate() === now.getDate()) {
    out.push(`${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`)
    t.setMinutes(t.getMinutes() + 15)
  }
  return out
}

/** El cliente pide comida al restaurante: elige platos, cómo y cuándo, y sigue el estado del pedido */
export default function OrderPage() {
  const { placeId = '' } = useParams()
  const { base, clientId, preview } = useViewer()
  const { user } = useAuth()
  const { t, pick, locale } = useI18n()
  const money = (n: number) => formatMoney(n, locale)
  const place = useDoc<Place>(`places/${placeId}`)
  const client = useDoc<Client>(clientId ? `clients/${clientId}` : null)
  const items = useOrderItems(placeId)
  const orders = useOrders({ clientId })
  const p = place.data
  const [cart, setCart] = useState<Record<string, number>>({})
  const [step, setStep] = useState<'pick' | 'details'>('pick')
  const [details, setDetails] = useState<{ mode: OrderMode | null; wanted: string; name: string; phone: string; address: string; note: string }>({
    mode: null,
    wanted: 'asap',
    name: '',
    phone: '',
    address: '',
    note: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const mine = orders.data.filter((o) => o.placeId === placeId)
  const open = p?.ordersOpen === true && (p.takeaway || p.delivery)
  const modes: OrderMode[] = p ? ([p.takeaway && 'pickup', p.delivery && 'delivery'].filter(Boolean) as OrderMode[]) : []
  const mode = details.mode ?? modes[0] ?? 'pickup'
  const lines = items.data.filter((it) => cart[it.id] > 0 && it.available).map((it) => ({ it, qty: cart[it.id] }))
  const count = lines.reduce((n, l) => n + l.qty, 0)
  const subtotal = lines.reduce((n, l) => n + Math.round(l.it.price * 100) * l.qty, 0) / 100
  const fee = mode === 'delivery' ? (p?.deliveryFee ?? 0) : 0
  const total = Math.round((subtotal + fee) * 100) / 100
  const belowMin = mode === 'delivery' && (p?.minOrder ?? 0) > subtotal
  const name = details.name || (client.data ? familyName(client.data.familyName, t) : '')
  const ready = count > 0 && !belowMin && name.trim() && (details.phone.match(/\d/g) ?? []).length >= 6 && (mode === 'pickup' || details.address.trim())
  const add = (id: string, d: number) => setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(50, (c[id] ?? 0) + d)) }))

  async function send() {
    if (!ready || !p) return
    setBusy(true)
    setError('')
    try {
      await placeOrder({
        placeId,
        name: name.trim(),
        phone: details.phone.trim(),
        mode,
        address: mode === 'delivery' ? details.address.trim() : '',
        wanted: details.wanted,
        note: details.note.trim(),
        lines: lines.map((l) => ({ itemId: l.it.id, qty: l.qty })),
      })
      setCart({})
      setStep('pick')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof FirebaseError && err.code === 'functions/failed-precondition' ? t('orders.changed') : t('orders.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Header back={`${base}/descubrir/${placeId}`} eyebrow={t('orders.title')} title={p?.name ?? ''} subtitle={p ? pick(p, 'orderInfo') || undefined : undefined} />
      <main className={count > 0 && step === 'pick' ? 'page ord-page ord-page--cart' : 'page ord-page'}>
        {mine.filter(isOrderOpen).length > 0 && (
          <section className="ord-mine">
            <span className="eyebrow">{t('orders.yours')}</span>
            {mine.filter(isOrderOpen).map((o) => (
              <OrderStatus key={o.id} o={o} />
            ))}
          </section>
        )}

        {p && !open && (
          <div className="card pf-block">
            <p className="card__text">{t('orders.closed', { name: p.name })}</p>
            {p.phone && (
              <a className="btn btn--ghost pf-order" href={telLink(p.phone)}>
                {t('profile.orderCall')}
              </a>
            )}
          </div>
        )}

        {step === 'pick' && (
          <>
            {!items.loading && items.data.length === 0 && <p className="empty">{t('orders.empty')}</p>}
            {sections(items.data).map(([section, list]) => (
              <section key={section} className="ord-section">
                {section && <h2 className="section__title">{section}</h2>}
                <div className="card ord-list">
                  {list.map((it) => (
                    <div key={it.id} className={it.available ? 'ord-item' : 'ord-item ord-item--off'}>
                      <div className="ord-item__body">
                        <span className="card__title">{it.name}</span>
                        {it.description && <span className="card__text">{it.description}</span>}
                        <span className="ord-item__price">{it.available ? money(it.price) : `${money(it.price)} · ${t('orders.soldOut')}`}</span>
                      </div>
                      {open && it.available && !preview && (
                        <div className="ord-qty">
                          {(cart[it.id] ?? 0) > 0 && (
                            <>
                              <button className="ord-qty__btn" aria-label={t('orders.less', { name: it.name })} onClick={() => add(it.id, -1)}>
                                −
                              </button>
                              <span className="ord-qty__n">{cart[it.id]}</span>
                            </>
                          )}
                          <button className="ord-qty__btn ord-qty__btn--add" aria-label={t('orders.more', { name: it.name })} onClick={() => add(it.id, 1)}>
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {count > 0 && (
              <div className="ord-bar">
                <button className="btn ord-bar__btn" onClick={() => setStep('details')}>
                  {t('orders.continue', { n: count, total: money(subtotal) })}
                </button>
              </div>
            )}
          </>
        )}

        {step === 'details' && p && (
          <form
            className="card request-form ord-form"
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
          >
            <ul className="order__lines">
              {lines.map((l) => (
                <li key={l.it.id}>
                  <span>
                    {l.qty} × {l.it.name}
                  </span>
                  <span>{money(l.it.price * l.qty)}</span>
                </li>
              ))}
              {fee > 0 && (
                <li className="order__fee">
                  <span>{t('orders.fee')}</span>
                  <span>{money(fee)}</span>
                </li>
              )}
              <li className="order__total">
                <span>{t('orders.total')}</span>
                <span>{money(total)}</span>
              </li>
            </ul>
            <button type="button" className="link-btn link-btn--dark" onClick={() => setStep('pick')}>
              {t('orders.back')}
            </button>

            {modes.length > 1 ? (
              <div className="request-form__field" role="radiogroup" aria-label={t('orders.mode')}>
                <span className="eyebrow">{t('orders.mode')}</span>
                <div className="pills">
                  {modes.map((m) => (
                    <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? 'pill pill--active' : 'pill'} onClick={() => setDetails({ ...details, mode: m })}>
                      {t(`orders.${m}`)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="card__text">
                <span className="eyebrow">{t('orders.mode')}</span> {t(`orders.${mode}`)}
              </p>
            )}
            {belowMin && <p className="composer__error">{t('orders.minOrder', { amount: money(p.minOrder ?? 0) })}</p>}
            <label className="request-form__field">
              <span className="eyebrow">{t('orders.when')}</span>
              <select className="composer__input" value={details.wanted} onChange={(e) => setDetails({ ...details, wanted: e.target.value })}>
                <option value="asap">{t('orders.asap')}</option>
                {slots().map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="request-form__field">
              <span className="eyebrow">{t('orders.name')}</span>
              <input className="composer__input" required maxLength={120} value={name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
            </label>
            <label className="request-form__field">
              <span className="eyebrow">{t('orders.phone')}</span>
              <input className="composer__input" required type="tel" maxLength={40} value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} />
            </label>
            {mode === 'delivery' && (
              <label className="request-form__field">
                <span className="eyebrow">{t('orders.address')}</span>
                <textarea className="composer__input" required rows={2} maxLength={300} value={details.address} onChange={(e) => setDetails({ ...details, address: e.target.value })} />
              </label>
            )}
            <label className="request-form__field">
              <span className="eyebrow">{t('orders.note')}</span>
              <textarea className="composer__input" rows={2} maxLength={500} value={details.note} onChange={(e) => setDetails({ ...details, note: e.target.value })} />
            </label>
            <p className="card__text">{mode === 'delivery' ? t('orders.payDelivery') : t('orders.payPickup')}</p>
            {error && <p className="composer__error">{error}</p>}
            <button type="submit" className="btn" disabled={busy || !ready || !user || preview}>
              {busy ? '…' : t('orders.send', { total: money(total) })}
            </button>
          </form>
        )}

        {mine.filter((o) => !isOrderOpen(o)).length > 0 && step === 'pick' && (
          <section className="ord-mine ord-mine--past">
            <span className="eyebrow">{t('orders.past')}</span>
            {mine
              .filter((o) => !isOrderOpen(o))
              .slice(0, 5)
              .map((o) => (
                <OrderStatus key={o.id} o={o} />
              ))}
          </section>
        )}
      </main>
    </>
  )
}

/** Estado de un pedido para el cliente */
function OrderStatus({ o }: { o: WithId<FoodOrder> }) {
  const { t, locale } = useI18n()
  const { preview } = useViewer()
  const [busy, setBusy] = useState(false)
  const when = o.createdAt?.toDate().toLocaleString(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) ?? ''
  return (
    <article className={`card ord-status ord-status--${o.status}`}>
      <span className="ev__status">{t(`orders.status.${o.status}`)}</span>
      {o.reply && <span className="card__text">«{o.reply}»</span>}
      <span className="card__text">
        {when} · {t(`orders.${o.mode}`)} · {o.wanted === 'asap' ? t('orders.asap') : t('orders.forTime', { time: o.wanted })}
      </span>
      <span className="card__text">
        {o.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')} · {formatMoney(o.total, locale)}
      </span>
      {o.status === 'new' && !preview && (
        <button
          className="link-btn link-btn--dark"
          disabled={busy}
          onClick={() => {
            if (!window.confirm(t('orders.cancelConfirm'))) return
            setBusy(true)
            cancelOrder(o.id).finally(() => setBusy(false))
          }}
        >
          {t('orders.cancel')}
        </button>
      )}
    </article>
  )
}
