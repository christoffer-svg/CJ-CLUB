import { useEffect, useState, type FormEvent } from 'react'
import { AttachmentList, FilePicker } from './Attachments'
import SignaturePad from './SignaturePad'
import { useI18n } from '../i18n'
import { parseAmount } from '../lib/amount'
import { budgetHash, deleteBudgetGroup, deleteBudgetLine, lineTotal, linesBase, saveBudgetLine, signBudget, snapshotLines, withdrawSignature } from '../lib/budget'
import { formatMoney, type Author, type WithId } from '../lib/projects'
import type { Attachment, BudgetLine, BudgetSignature } from '../lib/types'
import { shortDate } from '../lib/when'

type Draft = {
  id: string | null
  kind: 'group' | 'item'
  parentId?: string
  title: string
  description: string
  quantity: string
  unit: string
  unitPrice: string
  keep: Attachment[]
  files: File[]
}
type Sigs = { client?: BudgetSignature; builder?: BudgetSignature }

/**
 * Presupuesto de una obra: partidas (p. ej. "Baño completo") con lo que incluye cada una (grifo, plato
 * de ducha, mueble…), cada cosa con su precio sin IVA y fotos. Lo escriben el constructor o CJ y lo
 * firman el cliente y el constructor. Con una firma queda congelado; con las dos, cerrado.
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
  const groups = lines.filter((l) => l.kind === 'group')
  const itemsOf = (id: string) => lines.filter((l) => l.kind !== 'group' && l.parentId === id)
  // Elementos sueltos (fuera de una partida, o de una partida que ya no existe)
  const loose = lines.filter((l) => l.kind !== 'group' && !(l.parentId && groups.some((g) => g.id === l.parentId)))
  const partidas = groups.length + loose.length

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

  const newDraft = (kind: 'group' | 'item', parentId?: string): Draft => ({
    id: null,
    kind,
    parentId,
    title: '',
    description: '',
    quantity: '1',
    unit: 'ud',
    unitPrice: '',
    keep: [],
    files: [],
  })
  const draftOf = (l: WithId<BudgetLine>): Draft => ({
    id: l.id,
    kind: l.kind === 'group' ? 'group' : 'item',
    parentId: l.parentId,
    title: l.title,
    description: l.description,
    quantity: String(l.quantity).replace('.', ','),
    unit: l.unit,
    unitPrice: String(l.unitPrice).replace('.', ','),
    keep: l.attachments ?? [],
    files: [],
  })

  const quantity = form ? parseAmount(form.quantity) : NaN
  const unitPrice = form ? (form.unitPrice.trim() === '0' ? 0 : parseAmount(form.unitPrice)) : NaN
  const formValid = Boolean(form && form.title.trim() && (form.kind === 'group' || (quantity > 0 && unitPrice >= 0)))

  function save(e: FormEvent) {
    e.preventDefault()
    if (!form || !formValid) return
    const existing = form.id ? (lines.find((l) => l.id === form.id) ?? null) : null
    const siblings = form.kind === 'group' || !form.parentId ? [...groups, ...loose] : itemsOf(form.parentId)
    const order = existing ? existing.order : Math.max(0, ...siblings.map((l) => l.order)) + 1
    const draft = {
      kind: form.kind,
      parentId: form.parentId,
      title: form.title,
      description: form.description,
      quantity: form.kind === 'group' ? 1 : quantity,
      unit: form.unit,
      unitPrice: form.kind === 'group' ? 0 : unitPrice,
    }
    const saving = form
    run(
      () => saveBudgetLine(projectId, author, existing, draft, form.kind === 'group' ? [] : form.keep, form.kind === 'group' ? [] : form.files, order),
      // Cierra solo este formulario: si mientras tanto se ha abierto otro, se queda abierto
      () => setForm((f) => (f === saving ? null : f)),
    )
  }

  /** Formulario de una partida o de un elemento incluido */
  function renderForm() {
    if (!form) return null
    const isGroup = form.kind === 'group'
    return (
      <form className={isGroup ? 'card request-form' : 'request-form budget-item-form'} onSubmit={save}>
        <label className="request-form__field">
          <span className="eyebrow">{isGroup ? t('budget.concept') : t('budget.item')}</span>
          <input
            className="composer__input"
            required
            maxLength={200}
            placeholder={isGroup ? t('budget.conceptExample') : t('budget.itemExample')}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label className="request-form__field">
          <span className="eyebrow">{t('budget.description')}</span>
          <textarea className="composer__input" rows={2} maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        {!isGroup && (
          <>
            <label className="request-form__field">
              <span className="eyebrow">{t('budget.unitPrice')}</span>
              <input className="composer__input" required inputMode="decimal" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
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
            {form.unitPrice.trim() && (
              <span className="pv-parsed">
                {quantity > 0 && unitPrice >= 0
                  ? `${quantity === 1 ? '' : `${form.quantity} × ${money(unitPrice)} = `}${money(lineTotal({ quantity, unitPrice }))} ${t('project.plusVat')}`
                  : '?'}
              </span>
            )}
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
          </>
        )}
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
    )
  }

  /** Un elemento con precio (dentro de una partida o suelto) */
  function renderItem(l: WithId<BudgetLine>) {
    if (form?.id === l.id) return <div key={l.id}>{renderForm()}</div>
    return (
      <div key={l.id} className="budget-item">
        <div className="request__head">
          <span className="budget-item__title">{l.title}</span>
          <span className="budget-item__price">
            {money(lineTotal(l))} <span className="pv-vat">{t('project.plusVat')}</span>
          </span>
        </div>
        {l.quantity !== 1 && (
          <span className="card__text">
            {l.quantity.toLocaleString(locale)} {l.unit} × {money(l.unitPrice)}
          </span>
        )}
        {l.description && <p className="request__text">{l.description}</p>}
        <AttachmentList items={l.attachments} />
        {canEdit && (
          <div className="budget-line__actions">
            <button className="link-btn link-btn--dark" onClick={() => setForm(draftOf(l))}>
              {t('budget.edit')}
            </button>
            <button className="link-btn link-btn--dark" disabled={busy} onClick={() => window.confirm(t('budget.deleteConfirm')) && run(() => deleteBudgetLine(projectId, l.id))}>
              {t('budget.delete')}
            </button>
          </div>
        )}
      </div>
    )
  }

  const signer = author.role === 'client' || author.role === 'builder' ? author.role : null
  const status = bothSigned ? 'signed' : anySigned ? 'partial' : 'draft'
  const addingGroup = form && form.kind === 'group' && !form.id

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

      {groups.map((g) => {
        const items = itemsOf(g.id)
        const addingHere = form && form.kind === 'item' && !form.id && form.parentId === g.id
        return (
          <article key={g.id} className="card request budget-group">
            {form?.id === g.id ? (
              renderForm()
            ) : (
              <>
                <div className="request__head">
                  <span className="card__title budget-group__title">{g.title}</span>
                  <span className="pv-amount">
                    {money(linesBase(items))} <span className="pv-vat">{t('project.plusVat')}</span>
                  </span>
                </div>
                {g.description && <p className="request__text">{g.description}</p>}
                {canEdit && (
                  <div className="budget-line__actions">
                    <button className="link-btn link-btn--dark" onClick={() => setForm(draftOf(g))}>
                      {t('budget.edit')}
                    </button>
                    <button
                      className="link-btn link-btn--dark"
                      disabled={busy}
                      onClick={() => window.confirm(t('budget.deleteGroupConfirm')) && run(() => deleteBudgetGroup(projectId, g.id, items.map((x) => x.id)))}
                    >
                      {t('budget.delete')}
                    </button>
                  </div>
                )}
              </>
            )}
            {(items.length > 0 || canEdit) && <span className="eyebrow budget-group__includes">{t('budget.includes')}</span>}
            {items.length === 0 && canEdit && !addingHere && <p className="card__text">{t('budget.groupEmpty')}</p>}
            {items.map((l) => renderItem(l))}
            {addingHere && renderForm()}
            {canEdit && !addingHere && (
              <button className="btn btn--ghost budget-group__add" onClick={() => setForm(newDraft('item', g.id))}>
                + {t('budget.addItem')}
              </button>
            )}
          </article>
        )
      })}

      {loose.map((l) => (
        <article key={l.id} className="card request budget-group">
          {renderItem(l)}
        </article>
      ))}

      {addingGroup && renderForm()}
      {canEdit && !addingGroup && (
        <button className="btn" onClick={() => setForm(newDraft('group'))}>
          {t('budget.addGroup')}
        </button>
      )}

      {base > 0 && (
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

      {base > 0 && (
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
                    {canWrite && signer === r && !signing && !form && (
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
            const image = signing.image
            run(() => signBudget(projectId, { ...author, role: signer }, signing.name, image, lines, vatRate), () => setSigning(null), t('budget.signError'))
          }}
        >
          <span className="card__title">{t('budget.sign')}</span>
          <label className="budget-accept">
            <input type="checkbox" checked={signing.accepted} onChange={(e) => setSigning({ ...signing, accepted: e.target.checked })} />
            <span>{t('budget.accept', { n: partidas, total: money(total) })}</span>
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
