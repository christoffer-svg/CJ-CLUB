import { useState, type FormEvent } from 'react'
import { AttachmentList, FilePicker } from './Attachments'
import { useRoleName } from './projectRoles'
import { useI18n } from '../i18n'
import type { Author } from '../lib/projects'
import { addReformPlan, useReformPlans } from '../lib/reforms'
import type { ReformPlan } from '../lib/types'
import { shortDate } from '../lib/when'
import { useTr } from '../lib/reformTranslate'

const KINDS: ReformPlan['kind'][] = ['plan', 'design', 'render', 'other']

/**
 * Planos y diseños de la reforma (compartidos por todos sus contratos). Los suben CJ y los arquitectos o
 * diseñadores; los ven el cliente, los profesionales de la reforma y CJ. No se editan.
 */
export default function ProjectPlans({ reformId, author, canWrite }: { reformId?: string; author: Author; canWrite: boolean }) {
  const { t, locale } = useI18n()
  const tr = useTr()
  const roleName = useRoleName()
  const plans = useReformPlans(reformId)
  const [form, setForm] = useState<{ title: string; kind: ReformPlan['kind']; note: string; files: File[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<ReformPlan['kind'] | 'all'>('all')
  const canUpload = canWrite && Boolean(reformId) && (author.role === 'cj' || author.role === 'designer')

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form || !reformId || !form.title.trim() || !form.files.length) return
    const saving = form
    setBusy(true)
    setError(false)
    try {
      await addReformPlan(reformId, author, { title: form.title, kind: form.kind, note: form.note }, form.files)
      setForm((f) => (f === saving ? null : f))
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const list = [...plans.data].reverse().filter((p) => filter === 'all' || p.kind === filter)
  const kindsUsed = KINDS.filter((k) => plans.data.some((p) => p.kind === k))

  return (
    <>
      <section className="card pv-block">
        <span className="eyebrow">{t('plans.eyebrow')}</span>
        <p className="card__text">{reformId ? t('plans.intro') : t('plans.notReady')}</p>
      </section>

      {canUpload && !form && (
        <button className="btn" onClick={() => setForm({ title: '', kind: 'plan', note: '', files: [] })}>
          {t('plans.add')}
        </button>
      )}

      {form && (
        <form className="card request-form" onSubmit={save}>
          <label className="request-form__field">
            <span className="eyebrow">{t('plans.title')}</span>
            <input className="composer__input" required maxLength={200} placeholder={t('plans.titleExample')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="request-form__field">
            <span className="eyebrow">{t('plans.kind')}</span>
            <select className="composer__input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as ReformPlan['kind'] })}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`plans.kind.${k}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="request-form__field">
            <span className="eyebrow">{t('plans.note')}</span>
            <textarea className="composer__input" rows={2} maxLength={2000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          <FilePicker label={t('plans.files')} files={form.files} onChange={(files) => setForm({ ...form, files })} />
          {error && <p className="composer__error">{t('budget.saveError')}</p>}
          <div className="request-form__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setForm(null)}>
              {t('requests.cancelForm')}
            </button>
            <button type="submit" className="btn" disabled={busy || !form.title.trim() || !form.files.length}>
              {busy ? t('project.files.uploading') : t('budget.saveLine')}
            </button>
          </div>
        </form>
      )}

      {kindsUsed.length > 1 && (
        <div className="pills" role="group" aria-label={t('plans.kind')}>
          {(['all', ...kindsUsed] as const).map((k) => (
            <button key={k} className={filter === k ? 'pill pill--active' : 'pill'} onClick={() => setFilter(k)}>
              {k === 'all' ? t('plans.all') : t(`plans.kind.${k}`)}
            </button>
          ))}
        </div>
      )}

      {reformId && !plans.loading && plans.data.length === 0 && !form && <p className="empty">{t('plans.empty')}</p>}

      {list.map((p) => (
        <article key={p.id} className="card request">
          <div className="request__head">
            <span className="card__title">{tr(p.title)}</span>
            <span className="status">{t(`plans.kind.${p.kind}`)}</span>
          </div>
          {p.note && <p className="request__text">{tr(p.note)}</p>}
          <AttachmentList items={p.attachments} />
          <span className="card__text">{t('plans.by', { name: `${p.authorName} (${roleName(p.authorRole)})`, date: shortDate(p.createdAt, locale) })}</span>
        </article>
      ))}
    </>
  )
}
