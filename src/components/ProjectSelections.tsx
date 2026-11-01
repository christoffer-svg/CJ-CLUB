import { useState, type FormEvent } from 'react'
import { AttachmentList, FilePicker } from './Attachments'
import { useI18n } from '../i18n'
import { useRoleName } from './projectRoles'
import { parseAmount } from '../lib/amount'
import { lineTotal } from '../lib/budget'
import { formatMoney, proposeProjectExtra, type Author, type WithId } from '../lib/projects'
import { addSelection, confirmSelection } from '../lib/selections'
import type { BudgetLine, ProductSelection, ProjectExtra } from '../lib/types'
import { shortDate } from '../lib/when'

type Draft = { title: string; store: string; price: string; reference: string; note: string; lineId: string; files: File[] }

/**
 * Elecciones de productos: cuando el presupuesto ya está firmado, CJ o el constructor anotan lo que se
 * elige en tienda con el cliente (foto, precio, tienda y referencia). El cliente y el constructor dejan
 * constancia de que están conformes, para que después no haya dudas.
 */
export default function ProjectSelections({
  projectId,
  author,
  canWrite,
  budgetSigned,
  vatRate,
  lines,
  selections,
  extras,
}: {
  projectId: string
  author: Author
  canWrite: boolean
  budgetSigned: boolean
  vatRate: 10 | 21
  lines: WithId<BudgetLine>[]
  selections: WithId<ProductSelection>[]
  extras: WithId<ProjectExtra>[]
}) {
  const { t, locale } = useI18n()
  const roleName = useRoleName()
  const money = (n: number) => formatMoney(n, locale)
  const [form, setForm] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const canAdd = canWrite && budgetSigned && (author.role === 'cj' || author.role === 'builder')
  const confirmer = author.role === 'client' || author.role === 'builder' ? author.role : null

  // Opciones para "a qué corresponde": partidas y lo que incluye cada una
  const groups = lines.filter((l) => l.kind === 'group')
  const options: { id: string; label: string }[] = []
  for (const g of groups) {
    options.push({ id: g.id, label: g.title })
    for (const i of lines.filter((l) => l.parentId === g.id)) options.push({ id: i.id, label: `${g.title} · ${i.title}` })
  }
  for (const l of lines.filter((l) => l.kind !== 'group' && !(l.parentId && groups.some((g) => g.id === l.parentId)))) options.push({ id: l.id, label: l.title })
  const lineById = (id?: string) => (id ? lines.find((l) => l.id === id) : undefined)
  const labelOf = (id?: string) => options.find((o) => o.id === id)?.label

  const price = form ? parseAmount(form.price) : NaN
  const valid = Boolean(form && form.title.trim() && form.store.trim() && price > 0)

  async function run(action: () => Promise<unknown>, after?: () => void) {
    setBusy(true)
    setError('')
    try {
      await action()
      after?.()
    } catch {
      setError(t('budget.saveError'))
    } finally {
      setBusy(false)
    }
  }

  function save(e: FormEvent) {
    e.preventDefault()
    if (!form || !valid) return
    const saving = form
    run(
      () => addSelection(projectId, author, { title: form.title, store: form.store, price, reference: form.reference, note: form.note, lineId: form.lineId }, form.files),
      () => setForm((f) => (f === saving ? null : f)),
    )
  }

  /**
   * Diferencia sin IVA entre lo elegido y la referencia del presupuesto (null si no hay con qué comparar).
   * El precio de la tienda lleva IVA: se le quita el IVA de la obra antes de restar.
   */
  function differenceOf(id: string | undefined, gross: number) {
    const l = lineById(id)
    if (!l || l.kind === 'group' || !(gross > 0)) return null
    return Math.round((gross / (1 + vatRate / 100) - lineTotal(l)) * 100) / 100
  }

  /** Precio de referencia del presupuesto, con y sin IVA, para comparar */
  function referenceOf(id?: string) {
    const l = lineById(id)
    if (!l || l.kind === 'group') return null
    const net = lineTotal(l)
    return t('sel.budgetReference', { net: money(net), gross: money(Math.round(net * (100 + vatRate)) / 100) })
  }

  return (
    <>
      <section className="card pv-block">
        <span className="eyebrow">{t('sel.eyebrow')}</span>
        <p className="card__text">{budgetSigned ? t('sel.intro') : t('sel.afterSigning')}</p>
      </section>

      {canAdd && !form && (
        <button className="btn" onClick={() => setForm({ title: '', store: '', price: '', reference: '', note: '', lineId: '', files: [] })}>
          {t('sel.add')}
        </button>
      )}

      {form && (
        <form className="card request-form" onSubmit={save}>
          <label className="request-form__field">
            <span className="eyebrow">{t('sel.product')}</span>
            <input className="composer__input" required maxLength={200} placeholder={t('sel.productExample')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          {options.length > 0 && (
            <label className="request-form__field">
              <span className="eyebrow">{t('sel.for')}</span>
              <select className="composer__input" value={form.lineId} onChange={(e) => setForm({ ...form, lineId: e.target.value })}>
                <option value="">{t('sel.forNone')}</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              {referenceOf(form.lineId) && <span className="card__text">{referenceOf(form.lineId)}</span>}
            </label>
          )}
          <label className="request-form__field">
            <span className="eyebrow">{t('sel.store')}</span>
            <input className="composer__input" required maxLength={200} placeholder={t('sel.storeExample')} value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })} />
          </label>
          <div className="budget-form__row">
            <label className="request-form__field">
              <span className="eyebrow">{t('sel.price')}</span>
              <input className="composer__input" required inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              {form.price.trim() && <span className="pv-parsed">{price > 0 ? `= ${money(price)}` : '?'}</span>}
              <span className="card__text">{t('sel.priceHint')}</span>
            </label>
            <label className="request-form__field">
              <span className="eyebrow">{t('sel.reference')}</span>
              <input className="composer__input" maxLength={200} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </label>
          </div>
          <label className="request-form__field">
            <span className="eyebrow">{t('sel.note')}</span>
            <textarea className="composer__input" rows={2} maxLength={2000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          {(() => {
            const d = differenceOf(form.lineId, price)
            if (d === null) return null
            return <p className="card__text sel-diff">{d > 0 ? t('sel.diffMore', { amount: money(d) }) : t('sel.diffWithin')}</p>
          })()}
          <FilePicker label={t('sel.photos')} files={form.files} onChange={(files) => setForm({ ...form, files })} />
          {error && <p className="composer__error">{error}</p>}
          <div className="request-form__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setForm(null)}>
              {t('requests.cancelForm')}
            </button>
            <button type="submit" className="btn" disabled={busy || !valid}>
              {busy && form.files.length ? t('project.files.uploading') : t('budget.saveLine')}
            </button>
          </div>
        </form>
      )}

      {budgetSigned && selections.length === 0 && !form && <p className="empty">{t('sel.empty')}</p>}

      {[...selections].reverse().map((s) => {
        const both = s.clientOkUid && s.builderOkUid
        const mine = confirmer && !s[`${confirmer}OkUid`]
        return (
          <article key={s.id} className={mine && canWrite ? 'card request pv-extra--pending' : 'card request'}>
            <div className="request__head">
              <span className="card__title">{s.title}</span>
              <span className={`status status--${both ? 'done' : 'new'}`}>{t(both ? 'sel.agreed' : 'sel.waiting')}</span>
            </div>
            <span className="pv-amount">
              {money(s.price)} <span className="pv-vat">{t('sel.vatIncluded')}</span>
            </span>
            <dl className="sel-facts">
              <dt>{t('sel.store')}</dt>
              <dd>{s.store}</dd>
              {s.reference && (
                <>
                  <dt>{t('sel.referenceShort')}</dt>
                  <dd>{s.reference}</dd>
                </>
              )}
              {labelOf(s.lineId) && (
                <>
                  <dt>{t('sel.for')}</dt>
                  <dd>{labelOf(s.lineId)}</dd>
                </>
              )}
            </dl>
            {referenceOf(s.lineId) && <span className="card__text">{referenceOf(s.lineId)}</span>}
            {(() => {
              const d = differenceOf(s.lineId, s.price)
              const extra = extras.find((x) => x.selectionId === s.id && x.status !== 'withdrawn')
              if (extra)
                return (
                  <p className="card__text sel-diff">
                    {t('sel.extraStatus', { amount: money(extra.amount), status: t(`project.extras.status.${extra.status}`) })}
                  </p>
                )
              if (d === null) return null
              if (d <= 0) return <p className="card__text sel-diff">{t('sel.diffWithinShort')}</p>
              return (
                <>
                  <p className="card__text sel-diff">{t('sel.diffMoreShort', { amount: money(d) })}</p>
                  {canWrite && (author.role === 'cj' || author.role === 'builder') && (
                    <button
                      className="btn btn--ghost"
                      disabled={busy}
                      onClick={() =>
                        run(() =>
                          proposeProjectExtra(projectId, author, {
                            title: t('sel.extraTitle', { product: s.title }),
                            description: t('sel.extraText', { store: s.store, price: money(s.price), reference: money(lineTotal(lineById(s.lineId)!)), amount: money(d) }),
                            amount: d,
                            selectionId: s.id,
                          }),
                        )
                      }
                    >
                      {t('sel.proposeExtra', { amount: money(d) })}
                    </button>
                  )}
                </>
              )
            })()}
            {s.note && <p className="request__text">{s.note}</p>}
            <AttachmentList items={s.attachments} />
            <span className="card__text">{t('sel.addedBy', { name: `${s.authorName} (${roleName(s.authorRole)})`, date: shortDate(s.createdAt, locale) })}</span>
            <ul className="sel-oks">
              {(['client', 'builder'] as const).map((r) => {
                const uid = s[`${r}OkUid`]
                return (
                  <li key={r}>
                    <span className="card__title sel-oks__who">{roleName(r)}</span>
                    <span className="card__text">
                      {uid ? t('sel.okOn', { name: s[`${r}OkName`] ?? '', date: shortDate(s[`${r}OkAt`], locale) }) : t('sel.okPending')}
                    </span>
                  </li>
                )
              })}
            </ul>
            {canWrite && confirmer && mine && (
              <button className="btn" disabled={busy} onClick={() => run(() => confirmSelection(projectId, s.id, { ...author, role: confirmer }))}>
                {t('sel.confirm')}
              </button>
            )}
          </article>
        )
      })}
      {error && !form && <p className="composer__error">{error}</p>}
    </>
  )
}
