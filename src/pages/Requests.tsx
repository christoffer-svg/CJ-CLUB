import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import Header from '../components/Header'
import { useI18n } from '../i18n'
import { useDoc, useServices } from '../lib/data'
import { formatMoney } from '../lib/projects'
import { cancelRequest, createRequest, useClientRequests } from '../lib/messaging'
import { requestTypes, type Client, type RequestType } from '../lib/types'
import { useViewer } from '../lib/viewer'
import { shortDate } from '../lib/when'

const today = () => new Date().toISOString().slice(0, 10)

/** Peticiones del cliente a CJ: nueva petición y seguimiento */
export default function Requests() {
  const { clientId, base, preview } = useViewer()
  const { user } = useAuth()
  const { t, locale, pick } = useI18n()
  const services = useServices()
  const client = useDoc<Client>(clientId ? `clients/${clientId}` : null)
  const requests = useClientRequests(clientId)
  const [form, setForm] = useState<{ type: RequestType; serviceId?: string; description: string; preferredDate: string } | null>(null)
  const chosen = form?.serviceId ? (services.data.find((s) => s.id === form.serviceId) ?? null) : null
  const priceOf = (s: { price: number | null }) =>
    s.price == null ? t('requests.priceOnRequest') : `${formatMoney(s.price, locale)} ${pick(s, 'priceNote')}`.trim()
  // Nombre de lo pedido: el servicio en el idioma del cliente, o el tipo de petición
  const labelOf = (r: { type: RequestType; serviceId?: string; serviceName?: string }) => {
    if (r.type !== 'service') return t(`requests.type.${r.type}`)
    const s = services.data.find((x) => x.id === r.serviceId)
    return s ? pick(s, 'name') : (r.serviceName ?? '')
  }
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<'sent' | 'error' | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form || !clientId || !user || !client.data || (!chosen && !form.description.trim())) return
    setBusy(true)
    setNotice(null)
    try {
      await createRequest({
        clientId,
        familyName: client.data.familyName,
        uid: user.uid,
        type: chosen ? 'service' : form.type,
        service: chosen ? { id: chosen.id, name: chosen.name_es } : undefined,
        description: form.description,
        preferredDate: form.preferredDate || undefined,
      })
      setForm(null)
      setNotice('sent')
    } catch {
      setNotice('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Header back={`${base}/`} eyebrow={t('requests.eyebrow')} title={t('requests.title')} subtitle={t('requests.subtitle')} />
      <main className="page">
        {preview && <p className="chat__note">{t('preview.readOnly')}</p>}
        {notice === 'sent' && (
          <p className="chat__note chat__note--ok" role="status">
            {t('requests.sent')}
          </p>
        )}

        {form ? (
          <form className="card request-form" onSubmit={submit}>
            {chosen ? (
              <div className="request-form__service">
                <span className="eyebrow">{t('requests.services')}</span>
                <span className="card__title">{pick(chosen, 'name')}</span>
                <span className="card__text">{priceOf(chosen)}</span>
              </div>
            ) : (
              <fieldset className="request-form__types">
                <legend className="eyebrow">{t('requests.type')}</legend>
                <div className="pills pills--wrap">
                  {requestTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={form.type === type}
                      className={form.type === type ? 'pill pill--active' : 'pill'}
                      onClick={() => setForm({ ...form, type })}
                    >
                      {t(`requests.type.${type}`)}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <label className="request-form__field">
              <span className="eyebrow">{chosen ? t('requests.detailsOptional') : t('requests.description')}</span>
              <textarea
                className="composer__input"
                rows={4}
                maxLength={2000}
                required={!chosen}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="request-form__field">
              <span className="eyebrow">{t('requests.date')}</span>
              <input
                className="composer__input"
                type="date"
                min={today()}
                value={form.preferredDate}
                onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
              />
            </label>
            {notice === 'error' && <p className="composer__error">{t('requests.error')}</p>}
            <div className="request-form__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setForm(null)}>
                {t('requests.cancelForm')}
              </button>
              <button type="submit" className="btn" disabled={busy || (!chosen && !form.description.trim())}>
                {t('requests.submit')}
              </button>
            </div>
          </form>
        ) : (
          <>
            {services.data.length > 0 && (
              <section className="svc-list">
                <span className="eyebrow">{t('requests.services')}</span>
                {services.data.map((s) => (
                  <article key={s.id} className="card svc">
                    <div className="request__head">
                      <h2 className="svc__name">{pick(s, 'name')}</h2>
                      <span className="svc__price">{priceOf(s)}</span>
                    </div>
                    {pick(s, 'description') && <p className="pf-text svc__text">{pick(s, 'description')}</p>}
                    {!preview && (
                      <button
                        className="btn svc__btn"
                        onClick={() => {
                          setNotice(null)
                          setForm({ type: 'service', serviceId: s.id, description: '', preferredDate: '' })
                        }}
                      >
                        {t('requests.request')}
                      </button>
                    )}
                  </article>
                ))}
              </section>
            )}
            {!preview && (
              <button
                className={services.data.length ? 'btn btn--ghost' : 'btn'}
                onClick={() => {
                  setNotice(null)
                  setForm({ type: 'repair', description: '', preferredDate: '' })
                }}
              >
                {services.data.length ? t('requests.other') : t('requests.new')}
              </button>
            )}
          </>
        )}

        <section className="section">
          {requests.data.length > 0 && <span className="eyebrow">{t('requests.mine')}</span>}
          {!requests.loading && requests.data.length === 0 && <p className="empty">{t('requests.empty')}</p>}
          {requests.data.map((r) => (
            <article key={r.id} className="card request">
              <div className="request__head">
                <span className="eyebrow">{labelOf(r)}</span>
                <span className={`status status--${r.status}`}>{t(`requests.status.${r.status}`)}</span>
              </div>
              {r.description && <p className="request__text">{r.description}</p>}
              <span className="card__text">
                {[shortDate(r.createdAt, locale), r.preferredDate && t('requests.preferred', { date: shortDate(r.preferredDate, locale) })]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {r.cjNote && (
                <p className="place__note">
                  <span className="place__note-mark">{t('requests.cjNote')} ·</span> {r.cjNote}
                </p>
              )}
              {r.status === 'new' && !preview && (
                <button className="link-btn link-btn--dark request__cancel" onClick={() => cancelRequest(r.id).catch(() => {})}>
                  {t('requests.cancel')}
                </button>
              )}
            </article>
          ))}
        </section>
      </main>
    </>
  )
}
