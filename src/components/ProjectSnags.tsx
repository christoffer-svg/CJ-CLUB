import { useState, type FormEvent } from 'react'
import { AttachmentList, FilePicker } from './Attachments'
import { useI18n } from '../i18n'
import { useRoleName } from './projectRoles'
import { releaseRetention } from '../lib/plan'
import type { Author, WithId } from '../lib/projects'
import { acceptSnag, addSnag, markSnagFixed, reopenSnag } from '../lib/snags'
import type { RetentionRelease, Snag } from '../lib/types'
import { shortDate } from '../lib/when'
import { useTr } from '../lib/reformTranslate'

/**
 * Lista de repasos: lo que el constructor tiene que mejorar antes del pago final. El cliente o CJ lo apuntan
 * (con fotos), el constructor lo marca como arreglado (con fotos) y el cliente o CJ lo dan por bueno o lo
 * reabren. Con todo revisado, el cliente libera el 10 % final.
 */
export default function ProjectSnags({
  projectId,
  author,
  canWrite,
  snags,
  release,
  budgetSigned,
  retention,
}: {
  projectId: string
  author: Author
  canWrite: boolean
  snags: WithId<Snag>[]
  release: RetentionRelease | null
  budgetSigned: boolean
  /** importe del 10 % final, ya formateado */
  retention: string
}) {
  const { t, locale } = useI18n()
  const tr = useTr()
  const roleName = useRoleName()
  const [form, setForm] = useState<{ title: string; text: string; files: File[] } | null>(null)
  const [fixing, setFixing] = useState<{ id: string; note: string; files: File[] } | null>(null)
  const [reopening, setReopening] = useState<{ id: string; note: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const role = author.role
  const canReport = canWrite && (role === 'client' || role === 'cj')
  const done = snags.filter((s) => s.status === 'ok').length
  const allOk = snags.every((s) => s.status === 'ok')

  async function run(action: () => Promise<unknown>, after?: () => void) {
    setBusy(true)
    setError(false)
    try {
      await action()
      after?.()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  function save(e: FormEvent) {
    e.preventDefault()
    if (!form || !form.title.trim()) return
    const saving = form
    run(
      () => addSnag(projectId, author, { title: form.title, text: form.text }, form.files),
      () => setForm((f) => (f === saving ? null : f)),
    )
  }

  const status = (s: Snag['status']) => (
    <span className={`status status--${s === 'ok' ? 'done' : s === 'fixed' ? 'in_progress' : 'new'}`}>{t(`snag.status.${s}`)}</span>
  )

  return (
    <>
      <section className="card pv-block">
        <span className="eyebrow">{t('snag.eyebrow')}</span>
        <p className="card__text">{t('snag.intro')}</p>
        {snags.length > 0 && <span className="card__title">{t('snag.progress', { done, total: snags.length })}</span>}
        {release ? (
          <p className="card__text snag-release">{t('snag.releasedNote', { date: shortDate(release.releasedAt, locale), name: release.name })}</p>
        ) : budgetSigned && allOk && role === 'client' && canWrite ? (
          <button className="btn" disabled={busy} onClick={() => window.confirm(t('snag.releaseConfirm', { amount: retention })) && run(() => releaseRetention(projectId, author))}>
            {t('snag.release', { amount: retention })}
          </button>
        ) : (
          <p className="card__text">{budgetSigned ? t('snag.releasePending', { amount: retention }) : t('snag.afterSigning')}</p>
        )}
      </section>

      {canReport && !form && !release && (
        <button className="btn" onClick={() => setForm({ title: '', text: '', files: [] })}>
          {t('snag.add')}
        </button>
      )}

      {form && (
        <form className="card request-form" onSubmit={save}>
          <label className="request-form__field">
            <span className="eyebrow">{t('snag.title')}</span>
            <input className="composer__input" required maxLength={200} placeholder={t('snag.titleExample')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="request-form__field">
            <span className="eyebrow">{t('snag.text')}</span>
            <textarea className="composer__input" rows={2} maxLength={2000} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
          </label>
          <FilePicker label={t('project.files.photos')} files={form.files} onChange={(files) => setForm({ ...form, files })} />
          {error && <p className="composer__error">{t('budget.saveError')}</p>}
          <div className="request-form__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setForm(null)}>
              {t('requests.cancelForm')}
            </button>
            <button type="submit" className="btn" disabled={busy || !form.title.trim()}>
              {busy && form.files.length ? t('project.files.uploading') : t('budget.saveLine')}
            </button>
          </div>
        </form>
      )}

      {snags.length === 0 && !form && <p className="empty">{t('snag.empty')}</p>}

      {snags.map((s) => (
        <article key={s.id} className={s.status === 'open' && role === 'builder' ? 'card request pv-extra--pending' : 'card request'}>
          <div className="request__head">
            <span className="card__title">{tr(s.title)}</span>
            {status(s.status)}
          </div>
          {s.text && <p className="request__text">{tr(s.text)}</p>}
          <AttachmentList items={s.attachments} />
          <span className="card__text">{t('snag.by', { name: `${s.authorName} (${roleName(s.authorRole)})`, date: shortDate(s.createdAt, locale) })}</span>
          {s.status === 'open' && s.reopenNote && <p className="composer__error">{t('snag.reopenedNote', { note: s.reopenNote })}</p>}
          {s.fixedByName && (
            <div className="snag-fix">
              <span className="eyebrow">{t('snag.fix')}</span>
              {s.fixNote && <p className="request__text">{tr(s.fixNote)}</p>}
              <AttachmentList items={s.fixAttachments} />
              <span className="card__text">{t('snag.fixedBy', { name: s.fixedByName, date: shortDate(s.fixedAt, locale) })}</span>
            </div>
          )}
          {s.status === 'ok' && s.okByName && <span className="card__text">{t('snag.okBy', { name: s.okByName, date: shortDate(s.okAt, locale) })}</span>}

          {canWrite && role === 'builder' && s.status === 'open' && fixing?.id !== s.id && (
            <button className="btn" onClick={() => setFixing({ id: s.id, note: '', files: [] })}>
              {t('snag.markFixed')}
            </button>
          )}
          {fixing?.id === s.id && (
            <div className="request-form">
              <label className="request-form__field">
                <span className="eyebrow">{t('snag.fixNote')}</span>
                <textarea className="composer__input" rows={2} maxLength={2000} value={fixing.note} onChange={(e) => setFixing({ ...fixing, note: e.target.value })} />
              </label>
              <FilePicker label={t('snag.fixPhotos')} files={fixing.files} max={Math.max(1, 6 - (s.fixAttachments?.length ?? 0))} onChange={(files) => setFixing({ ...fixing, files })} />
              <div className="request-form__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setFixing(null)}>
                  {t('requests.cancelForm')}
                </button>
                <button className="btn" disabled={busy} onClick={() => run(() => markSnagFixed(projectId, s, author, fixing.note, fixing.files), () => setFixing(null))}>
                  {busy && fixing.files.length ? t('project.files.uploading') : t('snag.markFixed')}
                </button>
              </div>
            </div>
          )}

          {canWrite && (role === 'client' || role === 'cj') && s.status === 'fixed' && reopening?.id !== s.id && (
            <div className="request-form__actions">
              <button className="btn btn--ghost" disabled={busy} onClick={() => setReopening({ id: s.id, note: '' })}>
                {t('snag.reopen')}
              </button>
              <button className="btn" disabled={busy} onClick={() => run(() => acceptSnag(projectId, s.id, author))}>
                {t('snag.accept')}
              </button>
            </div>
          )}
          {reopening?.id === s.id && (
            <div className="request-form">
              <label className="request-form__field">
                <span className="eyebrow">{t('snag.reopenNote')}</span>
                <input className="composer__input" maxLength={1000} value={reopening.note} onChange={(e) => setReopening({ ...reopening, note: e.target.value })} />
              </label>
              <div className="request-form__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setReopening(null)}>
                  {t('requests.cancelForm')}
                </button>
                <button className="btn" disabled={busy} onClick={() => run(() => reopenSnag(projectId, s.id, reopening.note), () => setReopening(null))}>
                  {t('snag.reopen')}
                </button>
              </div>
            </div>
          )}
        </article>
      ))}
      {error && !form && <p className="composer__error">{t('budget.saveError')}</p>}
    </>
  )
}
