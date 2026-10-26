import { useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
import ShareField from './ShareField'
import { deleteOwnContact, saveOwnContact, useOwnContacts, validEmail, type OwnContactInput } from '../lib/household'
import { telLink, whatsappLink } from '../lib/format'
import { usePartnerCategories } from '../lib/data'
import { categoryName, type MergedCategory } from '../lib/services'
import { ownServiceOther, type OwnContact } from '../lib/types'
import { useViewer } from '../lib/viewer'
import type { Language } from '../i18n/translations'

const empty = {
  id: null as string | null,
  originalShare: null as boolean | null,
  name: '',
  service: 'garden',
  serviceOther: '',
  phone: '',
  email: '',
  notes: '',
  shareWithCj: false,
}

function serviceName(item: Pick<OwnContact, 'service' | 'serviceOther'>, categories: MergedCategory[], lang: Language, otherLabel: string) {
  if (item.service === ownServiceOther) return item.serviceOther.trim() || otherLabel
  const cat = categories.find((c) => c.id === item.service)
  return categoryName(cat, lang) || item.service
}

export default function OwnContacts() {
  const { clientId, preview } = useViewer()
  const { t, lang, locale } = useI18n()
  const categories = usePartnerCategories()
  const contacts = useOwnContacts(clientId, preview)
  const [form, setForm] = useState<typeof empty | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const active = categories.data.filter((c) => c.active && c.id !== ownServiceOther)
  const sorted = [...contacts.data].sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: 'base' }))

  function preferredService() {
    return active.find((c) => c.id === 'garden')?.id ?? active[0]?.id ?? ownServiceOther
  }

  function choices(service: string) {
    const list = active.map((c) => ({ id: c.id, label: categoryName(c, lang) || c.id }))
    if (service !== ownServiceOther && !list.some((c) => c.id === service)) {
      const retired = categories.data.find((c) => c.id === service)
      list.push({ id: service, label: (retired && categoryName(retired, lang)) || service })
    }
    list.push({ id: ownServiceOther, label: t('mine.service.other') })
    return list
  }

  function openNew() {
    setError(false)
    setConfirmId(null)
    setForm({ ...empty, service: preferredService() })
  }

  function openEdit(item: OwnContact & { id: string }) {
    setError(false)
    setConfirmId(null)
    setForm({
      id: item.id,
      originalShare: item.shareWithCj,
      name: item.name,
      service: item.service,
      serviceOther: item.serviceOther,
      phone: item.phone,
      email: item.email,
      notes: item.notes,
      shareWithCj: item.shareWithCj,
    })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form || !clientId || preview) return
    const name = form.name.trim()
    const serviceOther = form.serviceOther.trim()
    if (!name || (form.service === ownServiceOther && !serviceOther) || !validEmail(form.email)) {
      setError(true)
      return
    }
    const input: OwnContactInput = {
      name,
      service: form.service,
      serviceOther,
      phone: form.phone,
      email: form.email,
      notes: form.notes,
      shareWithCj: form.shareWithCj,
    }
    setBusy(true)
    setError(false)
    try {
      await saveOwnContact(clientId, form.id ? { id: form.id, shareWithCj: form.originalShare ?? false } : null, input)
      setForm(null)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  async function remove(item: OwnContact & { id: string }) {
    if (!clientId || preview) return
    setBusy(true)
    setError(false)
    try {
      await deleteOwnContact(clientId, item.id, item.shareWithCj)
      setConfirmId(null)
      if (form?.id === item.id) setForm(null)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const emailInvalid = Boolean(form && form.email.trim() && !validEmail(form.email))
  const canSave = Boolean(form && form.name.trim() && (form.service !== ownServiceOther || form.serviceOther.trim()) && !emailInvalid)

  return (
    <section className="section own-block">
      <div className="section__head">
        <span className="eyebrow">{t('mine.contacts.title')}</span>
        <p className="card__text">{t('mine.contacts.intro')}</p>
      </div>

      {preview && <p className="chat__note">{t('private.previewOnlyShared')}</p>}

      {form && !preview ? (
        <form className="card request-form" onSubmit={submit}>
          <label className="request-form__field">
            <span className="eyebrow">{t('mine.contacts.name')}</span>
            <input
              className="composer__input"
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <fieldset className="request-form__types">
            <legend className="eyebrow">{t('mine.contacts.service')}</legend>
            <div className="pills pills--wrap">
              {choices(form.service).map((service) => (
                <button
                  key={service.id}
                  type="button"
                  aria-pressed={form.service === service.id}
                  className={form.service === service.id ? 'pill pill--active' : 'pill'}
                  onClick={() => setForm({ ...form, service: service.id })}
                >
                  {service.label}
                </button>
              ))}
            </div>
          </fieldset>
          {form.service === ownServiceOther && (
            <label className="request-form__field">
              <span className="eyebrow">{t('mine.contacts.serviceOther')}</span>
              <input
                className="composer__input"
                required
                maxLength={80}
                placeholder={t('mine.contacts.serviceOtherPlaceholder')}
                value={form.serviceOther}
                onChange={(e) => setForm({ ...form, serviceOther: e.target.value })}
              />
            </label>
          )}
          <label className="request-form__field">
            <span className="eyebrow">{t('mine.contacts.phone')}</span>
            <input
              className="composer__input"
              type="tel"
              maxLength={40}
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label className="request-form__field">
            <span className="eyebrow">{t('mine.contacts.email')}</span>
            <input
              className="composer__input"
              type="email"
              maxLength={120}
              inputMode="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="request-form__field">
            <span className="eyebrow">{t('mine.contacts.notes')}</span>
            <textarea
              className="composer__input"
              rows={3}
              maxLength={2000}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <ShareField
            checked={form.shareWithCj}
            onChange={(shareWithCj) => setForm({ ...form, shareWithCj })}
            label={t('mine.contacts.share')}
            hint={t('mine.contacts.shareHint')}
          />
          {(error || emailInvalid) && (
            <p className="composer__error">{emailInvalid ? t('mine.contacts.invalidEmail') : t('mine.contacts.error')}</p>
          )}
          <div className="request-form__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setForm(null)}>
              {t('mine.contacts.cancel')}
            </button>
            <button type="submit" className="btn" disabled={busy || !canSave}>
              {t('mine.contacts.save')}
            </button>
          </div>
        </form>
      ) : (
        !preview && (
          <button className="btn" type="button" onClick={openNew}>
            {t('mine.contacts.add')}
          </button>
        )
      )}

      {!form && error && <p className="composer__error">{t('mine.contacts.error')}</p>}

      {!contacts.loading && sorted.length === 0 && (
        <p className="empty">{preview ? t('mine.contacts.emptyShared') : t('mine.contacts.empty')}</p>
      )}

      {sorted.length > 0 && (
        <div className="card contact-list">
          {sorted.map((item) => {
            const phone = item.phone?.trim() ?? ''
            const email = item.email?.trim() ?? ''
            const digits = phone.replace(/\D/g, '')
            return (
              <article key={item.id} className="own-contact">
                <div className="own-contact__head">
                  <div className="contact__body">
                    <span className="eyebrow">{t('mine.contacts.added')}</span>
                    <span className="card__title own-contact__name">{item.name}</span>
                    <span className="card__text">{serviceName(item, categories.data, lang, t('mine.service.other'))}</span>
                    {item.notes?.trim() && <span className="own-contact__notes">{item.notes}</span>}
                    {item.shareWithCj && <span className="status status--shared">{t('mine.contacts.shared')}</span>}
                  </div>
                </div>
                {(digits || email) && (
                  <div className="own-actions">
                    {digits && (
                      <a className="call-btn" href={telLink(phone)}>
                        {t('guide.call')}
                      </a>
                    )}
                    {digits && (
                      <a className="call-btn" href={whatsappLink(phone)} target="_blank" rel="noreferrer">
                        {t('mine.contacts.whatsapp')}
                      </a>
                    )}
                    {email && (
                      <a className="call-btn" href={`mailto:${email}`}>
                        {t('mine.contacts.write')}
                      </a>
                    )}
                  </div>
                )}
                {!preview &&
                  (confirmId === item.id ? (
                    <div className="own-manage">
                      <span className="card__text">{t('mine.contacts.deleteAsk')}</span>
                      <button type="button" className="link-btn" disabled={busy} onClick={() => remove(item)}>
                        {t('mine.contacts.deleteYes')}
                      </button>
                      <button type="button" className="link-btn link-btn--dark" onClick={() => setConfirmId(null)}>
                        {t('mine.contacts.cancel')}
                      </button>
                    </div>
                  ) : (
                    <div className="own-manage">
                      <button type="button" className="link-btn" onClick={() => openEdit(item)}>
                        {t('mine.contacts.edit')}
                      </button>
                      <button type="button" className="link-btn link-btn--dark" onClick={() => setConfirmId(item.id)}>
                        {t('mine.contacts.delete')}
                      </button>
                    </div>
                  ))}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
