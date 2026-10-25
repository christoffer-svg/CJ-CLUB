import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import Header from '../components/Header'
import { useI18n } from '../i18n'
import { useDoc } from '../lib/data'
import { cancelRequest, createRequest, useClientRequests } from '../lib/messaging'
import { requestTypes, type Client, type RequestType } from '../lib/types'
import { useViewer } from '../lib/viewer'
import { shortDate } from '../lib/when'

const today = () => new Date().toISOString().slice(0, 10)

/** Peticiones del cliente a CJ: nueva petición y seguimiento */
export default function Requests() {
  const { clientId, base, preview } = useViewer()
  const { user } = useAuth()
  const { t, locale } = useI18n()
  const client = useDoc<Client>(clientId ? `clients/${clientId}` : null)
  const requests = useClientRequests(clientId)
  const [form, setForm] = useState<{ type: RequestType; description: string; preferredDate: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<'sent' | 'error' | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form || !clientId || !user || !client.data || !form.description.trim()) return
    setBusy(true)
    setNotice(null)
    try {
      await createRequest({
        clientId,
        familyName: client.data.familyName,
        uid: user.uid,
        type: form.type,
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

        {form ? (
          <form className="card request-form" onSubmit={submit}>
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
            <label className="request-form__field">
              <span className="eyebrow">{t('requests.description')}</span>
              <textarea
                className="composer__input"
                rows={4}
                maxLength={2000}
                required
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
              <button type="submit" className="btn" disabled={busy || !form.description.trim()}>
                {t('requests.submit')}
              </button>
            </div>
          </form>
        ) : (
          !preview && (
            <button className="btn" onClick={() => setForm({ type: 'repair', description: '', preferredDate: '' })}>
              {t('requests.new')}
            </button>
          )
        )}

        {notice === 'sent' && (
          <p className="chat__note chat__note--ok" role="status">
            {t('requests.sent')}
          </p>
        )}

        <section className="section">
          {!requests.loading && requests.data.length === 0 && <p className="empty">{t('requests.empty')}</p>}
          {requests.data.map((r) => (
            <article key={r.id} className="card request">
              <div className="request__head">
                <span className="eyebrow">{t(`requests.type.${r.type}`)}</span>
                <span className={`status status--${r.status}`}>{t(`requests.status.${r.status}`)}</span>
              </div>
              <p className="request__text">{r.description}</p>
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
