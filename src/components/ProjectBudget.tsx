import { useEffect, useState, type FormEvent } from 'react'
import { AttachmentList, FilePicker } from './Attachments'
import SignaturePad from './SignaturePad'
import { useI18n } from '../i18n'
import { parseAmount } from '../lib/amount'
import { budgetHash, deleteBudgetLine, lineTotal, linesBase, saveBudgetLine, signBudget, snapshotLines, withdrawSignature } from '../lib/budget'
import { formatMoney, type Author, type WithId } from '../lib/projects'
import type { Attachment, BudgetLine, BudgetSignature } from '../lib/types'
import { shortDate } from '../lib/when'

type Draft = { id: string | null; title: string; description: string; quantity: string; unit: string; unitPrice: string; keep: Attachment[]; files: File[] }
type Sigs = { client?: BudgetSignature; builder?: BudgetSignature }

/**
 * Presupuesto por líneas de una obra: lo escriben el constructor o CJ (sin IVA, con fotos), y lo firman
 * el cliente y el constructor. Con una firma las líneas quedan congeladas; con las dos, cerrado.
 */
export default function ProjectBudget({
  projectId,
  vatRate,
  author,
  canWrite,
  lines,
  sigs,
}: {
  projectId: string
  vatRate: 10 | 21
  author: Author
  canWrite: boolean
  lines: WithId<BudgetLine>[]
  sigs: Sigs
}) {
  const { t, locale } = useI18n()
  const money = (n: number) => formatMoney(n, locale)
  const [form, setForm] = useState<Draft | null>(null)
  const [signing, setSigning] = useState<{ name: string; accepted: boolean; image: string | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [hash, setHash] = useState('')

  const anySigned = Boolean(sigs.client || sigs.builder)
  const bothSigned = Boolean(sigs.client && sigs.builder)
  const canEdit = canWrite && (author.role === 'builder' || author.role === 'cj') && !anySigned
  const base = linesBase(lines)
  const vat = Math.round(base * vatRate) / 100
  const total = Math.round((base + vat) * 100) / 100

  // Huella de lo que se ve ahora, para comprobar que cada firma corresponde a este presupuesto
  const key = JSON.stringify(snapshotLines(lines)) + vatRate
  useEffect(() => {
    let alive = true
    budgetHash(snapshotLines(lines), vatRate).then((h) => alive && setHash(h))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  async function run(action: () => Promise<unknown>, after?: () => void, message = t('budget.saveError')) {
    setBusy(true)
    setError('')
    try {
      await action()
      after?.()
    } catch {
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  const quantity = form ? parseAmount(form.quantity) : NaN
  const unitPrice = form ? (form.unitPrice.trim() === '0' ? 0 : parseAmount(form.unitPrice)) : NaN
  const formValid = form && form.title.trim() && quantity > 0 && unitPrice >= 0

  function save(e: FormEvent) {
    e.preventDefault()
    if (!form || !formValid) return
    const existing = form.id ? (lines.find((l) => l.id === form.id) ?? null) : null
    const order = existing ? existing.order : Math.max(0, ...lines.map((l) => l.order)) + 1
    run(
      () => saveBudgetLine(projectId, author, existing, { title: form.title, description: form.description, quantity, unit: form.unit, unitPrice }, form.keep, form.files, order),
      () => setForm(null),
    )
  }

  const signer = author.role === 'client' || author.role === 'builder' ? author.role : null
  const status = bothSigned ? 'signed' : anySigned ? 'partial' : 'draft'

  return (
    <>
      <section className="card pv-block">
        <div className="request__head">
          <span className="eyebrow">{t('budget.eyebrow')}</span>
          <span className={`status status--${bothSigned ? 'done' : anySigned ? 'new' : 'in_progress'}`}>{t(`budget.status.${status}`)}</span>
        </div>
        <p className="card__text">
          {bothSigned ? t('budget.locked') : anySigned ? t('budget.frozen') : canEdit ? t('budget.intro') : lines.length ? t('budget.introRead') : t('budget.notYet')}
        </p>
      </section>

      {canEdit && !form && (
        <button className="btn" onClick={() => setForm({ id: null, title: '', description: '', quantity: '1', unit: 'ud', unitPrice: '', keep: [], files: [] })}>
          {t('budget.add')}
        </button>
      )}

      {form && (
        <form className="card request-form" onSubmit={save}>
          <label className="request-form__field">
            <span className="eyebrow">{t('budget.concept')}</span>
            <input className="composer__input" required maxLength={200} placeholder={t('budget.conceptExample')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="request-form__field">
            <span className="eyebrow">{t('budget.description')}</span>
            <textarea className="composer__input" rows={2} maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <div className="budget-form__row">
            <label className="request-form__field">
              <span className="eyebrow">{t('budget.quantity')}</span>
              <input className="composer__input" required inputMode="decimal" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </label>
            <label className="request-form__field">
              <span className="eyebrow">{t('budget.unit')}</span>
              <input className="composer__input" maxLength={20} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </label>
          </div>
          <label className="request-form__field">
            <span className="eyebrow">{t('budget.unitPrice')}</span>
            <input className="composer__input" required inputMode="decimal" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
            {form.unitPrice.trim() && (
              <span className="pv-parsed">
                {quantity > 0 && unitPrice >= 0 ? `${form.quantity} × ${money(unitPrice)} = ${money(lineTotal({ quantity, unitPrice }))} ${t('project.plusVat')}` : '?'}
              </span>
            )}
          </label>
          {form.keep.length > 0 && (
            <ul className="att-chosen">
              {form.keep.map((a) => (
                <li key={a.path}>
                  <span>{a.name}</span>
                  <button type="button" className="link-btn link-btn--dark" onClick={() => setForm({ ...form, keep: form.keep.filter((x) => x.path !== a.path) })}>
                    {t('budget.removePhoto')}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {form.keep.length < 6 && <FilePicker label={t('project.files.photos')} files={form.files} max={6 - form.keep.length} onChange={(files) => setForm({ ...form, files })} />}
          {error && <p className="composer__error">{error}</p>}
          <div className="request-form__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setForm(null)}>
              {t('requests.cancelForm')}
            </button>
            <button type="submit" className="btn" disabled={busy || !formValid}>
              {busy && form.files.length ? t('project.files.uploading') : t('budget.saveLine')}
            </button>
          </div>
        </form>
      )}

      {lines.map((l) => (
        <article key={l.id} className="card request budget-line">
          <div className="request__head">
            <span className="card__title">{l.title}</span>
            <span className="pv-amount">
              {money(lineTotal(l))} <span className="pv-vat">{t('project.plusVat')}</span>
            </span>
          </div>
          <span className="card__text">
            {l.quantity.toLocaleString(locale)} {l.unit} × {money(l.unitPrice)}
          </span>
          {l.description && <p className="request__text">{l.description}</p>}
          <AttachmentList items={l.attachments} />
          {canEdit && form?.id !== l.id && (
            <div className="budget-line__actions">
              <button
                className="link-btn link-btn--dark"
                onClick={() =>
                  setForm({
                    id: l.id,
                    title: l.title,
                    description: l.description,
                    quantity: String(l.quantity).replace('.', ','),
                    unit: l.unit,
                    unitPrice: String(l.unitPrice).replace('.', ','),
                    keep: l.attachments ?? [],
                    files: [],
                  })
                }
              >
                {t('budget.edit')}
              </button>
              <button className="link-btn link-btn--dark" disabled={busy} onClick={() => window.confirm(t('budget.deleteConfirm')) && run(() => deleteBudgetLine(projectId, l.id))}>
                {t('budget.delete')}
              </button>
            </div>
          )}
        </article>
      ))}

      {lines.length > 0 && (
        <section className="card pv-block">
          <dl className="pv-money">
            <dt>{t('project.base')}</dt>
            <dd>{money(base)}</dd>
            <dt>{t('project.vat', { rate: vatRate })}</dt>
            <dd>+ {money(vat)}</dd>
            <dt className="pv-money__strong">{t('project.total')}</dt>
            <dd className="pv-money__strong">{money(total)}</dd>
          </dl>
        </section>
      )}

      {lines.length > 0 && (
        <section className="card pv-block">
          <span className="eyebrow">{t('budget.signatures')}</span>
          {(['client', 'builder'] as const).map((r) => {
            const s = sigs[r]
            return (
              <div key={r} className="budget-sig">
                <span className="card__title">{t(`project.role.${r}`)}</span>
                {s ? (
                  <>
                    <img className="budget-sig__img" src={s.image} alt={t('budget.signatureOf', { name: s.name })} />
                    <span className="card__text">
                      {s.name} · {t('budget.signedOn', { date: shortDate(s.signedAt, locale) })}
                    </span>
                    {hash && s.hash !== hash && <p className="composer__error">{t('budget.mismatch')}</p>}
                    {canWrite && !bothSigned && (author.role === r || author.role === 'cj') && (
                      <button className="link-btn link-btn--dark" disabled={busy} onClick={() => run(() => withdrawSignature(projectId, r))}>
                        {t('budget.withdraw')}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <span className="card__text">{t('budget.pending')}</span>
                    {canWrite && signer === r && !signing && (
                      <button className="btn" onClick={() => setSigning({ name: author.name, accepted: false, image: null })}>
                        {t('budget.sign')}
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </section>
      )}

      {signing && signer && (
        <form
          className="card request-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!signing.accepted || !signing.name.trim() || !signing.image) return
            run(() => signBudget(projectId, { ...author, role: signer }, signing.name, signing.image!, lines, vatRate), () => setSigning(null), t('budget.signError'))
          }}
        >
          <span className="card__title">{t('budget.sign')}</span>
          <label className="budget-accept">
            <input type="checkbox" checked={signing.accepted} onChange={(e) => setSigning({ ...signing, accepted: e.target.checked })} />
            <span>{t('budget.accept', { n: lines.length, total: money(total) })}</span>
          </label>
          <label className="request-form__field">
            <span className="eyebrow">{t('budget.signName')}</span>
            <input className="composer__input" required maxLength={120} value={signing.name} onChange={(e) => setSigning({ ...signing, name: e.target.value })} />
          </label>
          <SignaturePad label={t('budget.signHere')} clearLabel={t('budget.clear')} onChange={(image) => setSigning((s) => s && { ...s, image })} />
          {error && <p className="composer__error">{error}</p>}
          <div className="request-form__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setSigning(null)}>
              {t('requests.cancelForm')}
            </button>
            <button type="submit" className="btn" disabled={busy || !signing.accepted || !signing.name.trim() || !signing.image}>
              {t('budget.confirmSign')}
            </button>
          </div>
        </form>
      )}
      {error && !form && !signing && <p className="composer__error">{error}</p>}
    </>
  )
}
