import { useState, type FormEvent } from 'react'
import Header from '../components/Header'
import SecretValue from '../components/SecretValue'
import ShareField from '../components/ShareField'
import { useI18n } from '../i18n'
import type { TranslationKey } from '../i18n/translations'
import { deleteHouseNote, saveHouseNote, useHouseNotes, type HouseNoteInput } from '../lib/household'
import { houseSections, type HouseNote, type HouseSection } from '../lib/types'
import { useViewer } from '../lib/viewer'

const empty = {
  id: null as string | null,
  originalShare: null as boolean | null,
  section: 'wifi' as HouseSection,
  title: '',
  body: '',
  secret: '',
  shareWithCj: false,
}

function sectionLabel(section: string, t: (key: TranslationKey) => string) {
  if ((houseSections as readonly string[]).includes(section)) return t(`house.section.${section}` as TranslationKey)
  return t('house.section.other')
}

export default function House() {
  const { clientId, base, preview } = useViewer()
  const { t, locale } = useI18n()
  const notes = useHouseNotes(clientId, preview)
  const [form, setForm] = useState<typeof empty | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [secretVisible, setSecretVisible] = useState(false)

  const groups = houseSections
    .map((section) => ({
      section,
      items: notes.data
        .filter((n) => n.section === section)
        .sort((a, b) => a.title.localeCompare(b.title, locale, { sensitivity: 'base' })),
    }))
    .filter((g) => g.items.length > 0)

  function openNew() {
    setError(false)
    setConfirmId(null)
    setSecretVisible(false)
    setForm({ ...empty })
  }

  function openEdit(item: HouseNote & { id: string }) {
    setError(false)
    setConfirmId(null)
    setSecretVisible(false)
    setForm({
      id: item.id,
      originalShare: item.shareWithCj,
      section: item.section,
      title: item.title,
      body: item.body,
      secret: item.secret ?? '',
      shareWithCj: item.shareWithCj,
    })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form || !clientId || preview) return
    const title = form.title.trim()
    const body = form.body.trim()
    const secret = form.secret.trim()
    if (!title || (!body && !secret)) {
      setError(true)
      return
    }
    const input: HouseNoteInput = { section: form.section, title, body, secret, shareWithCj: form.shareWithCj }
    setBusy(true)
    setError(false)
    try {
      await saveHouseNote(clientId, form.id ? { id: form.id, shareWithCj: form.originalShare ?? false } : null, input)
      setForm(null)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  async function remove(item: HouseNote & { id: string }) {
    if (!clientId || preview) return
    setBusy(true)
    setError(false)
    try {
      await deleteHouseNote(clientId, item.id, item.shareWithCj)
      setConfirmId(null)
      if (form?.id === item.id) setForm(null)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const canSave = Boolean(form && form.title.trim() && (form.body.trim() || form.secret.trim()))

  return (
    <>
      <Header back={`${base}/`} eyebrow={t('house.eyebrow')} title={t('house.title')} subtitle={t('house.subtitle')} />
      <main className="page">
        {preview && <p className="chat__note">{t('private.previewOnlyShared')}</p>}

        {form && !preview ? (
          <form className="card request-form" onSubmit={submit}>
            <fieldset className="request-form__types">
              <legend className="eyebrow">{t('house.section')}</legend>
              <div className="pills pills--wrap">
                {houseSections.map((section) => (
                  <button
                    key={section}
                    type="button"
                    aria-pressed={form.section === section}
                    className={form.section === section ? 'pill pill--active' : 'pill'}
                    onClick={() => setForm({ ...form, section })}
                  >
                    {t(`house.section.${section}`)}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="request-form__field">
              <span className="eyebrow">{t('house.noteTitle')}</span>
              <input
                className="composer__input"
                required
                maxLength={120}
                placeholder={t('house.titlePlaceholder')}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="request-form__field">
              <span className="eyebrow">{t('house.body')}</span>
              <textarea
                className="composer__input"
                rows={4}
                maxLength={4000}
                placeholder={t('house.bodyPlaceholder')}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </label>
            <label className="request-form__field">
              <span className="eyebrow">{form.section === 'wifi' ? t('house.secretWifi') : t('house.secret')}</span>
              <input
                className="composer__input"
                type={secretVisible ? 'text' : 'password'}
                maxLength={200}
                autoComplete="off"
                spellCheck={false}
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
              />
              <span className="share-field__hint">{t('house.secretOptional')}</span>
              {form.secret && (
                <button type="button" className="link-btn secret__btn" aria-pressed={secretVisible} onClick={() => setSecretVisible((v) => !v)}>
                  {secretVisible ? t('house.hide') : t('house.show')}
                </button>
              )}
            </label>
            <ShareField
              checked={form.shareWithCj}
              onChange={(shareWithCj) => setForm({ ...form, shareWithCj })}
              label={t('house.share')}
              hint={t('house.shareHint')}
            />
            {error && <p className="composer__error">{t('house.error')}</p>}
            <div className="request-form__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setForm(null)}>
                {t('house.cancel')}
              </button>
              <button type="submit" className="btn" disabled={busy || !canSave}>
                {t('house.save')}
              </button>
            </div>
          </form>
        ) : (
          !preview && (
            <button className="btn" type="button" onClick={openNew}>
              {t('house.add')}
            </button>
          )
        )}

        {!form && error && <p className="composer__error">{t('house.error')}</p>}

        {!notes.loading && notes.data.length === 0 && (
          <p className="empty">{preview ? t('house.emptyShared') : t('house.empty')}</p>
        )}

        {groups.map((group) => (
          <section key={group.section} className="section">
            <h2 className="section__title">{sectionLabel(group.section, t)}</h2>
            {group.items.map((item) => (
              <article key={item.id} className="card house-note">
                <div className="request__head">
                  <span className="card__title own-contact__name">{item.title}</span>
                  {item.shareWithCj && <span className="status status--shared">{t('house.shared')}</span>}
                </div>
                {item.body?.trim() && <p className="house-note__body">{item.body}</p>}
                {item.secret?.trim() && (
                  <SecretValue
                    value={item.secret}
                    show={t('house.show')}
                    hide={t('house.hide')}
                    copy={t('house.copy')}
                    copied={t('house.copied')}
                  />
                )}
                {!preview &&
                  (confirmId === item.id ? (
                    <div className="own-manage">
                      <span className="card__text">{t('house.deleteAsk')}</span>
                      <button type="button" className="link-btn" disabled={busy} onClick={() => remove(item)}>
                        {t('house.deleteYes')}
                      </button>
                      <button type="button" className="link-btn link-btn--dark" onClick={() => setConfirmId(null)}>
                        {t('house.cancel')}
                      </button>
                    </div>
                  ) : (
                    <div className="own-manage">
                      <button type="button" className="link-btn" onClick={() => openEdit(item)}>
                        {t('house.edit')}
                      </button>
                      <button type="button" className="link-btn link-btn--dark" onClick={() => setConfirmId(item.id)}>
                        {t('house.delete')}
                      </button>
                    </div>
                  ))}
              </article>
            ))}
          </section>
        ))}
      </main>
    </>
  )
}
