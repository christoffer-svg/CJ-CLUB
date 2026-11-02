import { useState } from 'react'
import { useI18n } from '../i18n'
import { PLAN_PERCENT, RETENTION, deletePlan, newMilestoneId, planSum, savePlan } from '../lib/plan'
import { formatMoney, type Author } from '../lib/projects'
import type { Milestone } from '../lib/types'
import { useTr } from '../lib/reformTranslate'

type Row = { id: string; title: string; percent: string }

/**
 * Plan de pagos dentro del presupuesto: los pagos reparten el 90 % del total con IVA y el 10 % final queda
 * siempre retenido hasta que el cliente dé por buenos los repasos. Se firma junto con el presupuesto.
 */
export default function PaymentPlan({
  projectId,
  author,
  canEdit,
  milestones,
  totalWithVat,
}: {
  projectId: string
  author: Author
  canEdit: boolean
  milestones: Milestone[]
  totalWithVat: number
}) {
  const { t, locale } = useI18n()
  const tr = useTr()
  const money = (n: number) => formatMoney(n, locale)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const amount = (p: number) => money(Math.round(totalWithVat * p) / 100)

  const editing = rows !== null
  const parsed = (rows ?? []).map((r) => ({ id: r.id, title: r.title, percent: Number(r.percent.replace(',', '.')) }))
  const sum = parsed.reduce((s, r) => s + (Number.isFinite(r.percent) ? r.percent : 0), 0)
  const valid = editing && parsed.length > 0 && parsed.every((r) => r.title.trim() && Number.isInteger(r.percent) && r.percent >= 1) && sum === PLAN_PERCENT

  function start() {
    setError(false)
    setRows(
      milestones.length
        ? milestones.map((m) => ({ id: m.id, title: m.title, percent: String(m.percent) }))
        : [
            { id: newMilestoneId(), title: t('plan.def1'), percent: '30' },
            { id: newMilestoneId(), title: t('plan.def2'), percent: '30' },
            { id: newMilestoneId(), title: t('plan.def3'), percent: '30' },
          ],
    )
  }

  async function save() {
    if (!valid) return
    setBusy(true)
    setError(false)
    try {
      await savePlan(projectId, author, parsed)
      setRows(null)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card pv-block plan">
      <div className="request__head">
        <span className="eyebrow">{t('plan.title')}</span>
        {!editing && milestones.length > 0 && planSum(milestones) !== PLAN_PERCENT && <span className="status status--new">{t('plan.incomplete')}</span>}
      </div>
      <p className="card__text">{canEdit ? t('plan.intro') : t('plan.introRead')}</p>

      {!editing && (
        <>
          {milestones.length === 0 && <p className="card__text">{canEdit ? t('plan.none') : t('plan.noneRead')}</p>}
          {milestones.length > 0 && (
            <dl className="pv-money plan__list">
              {milestones.map((m) => (
                <div key={m.id} className="plan__row">
                  <dt>
                    {tr(m.title)} <span className="pv-vat">{m.percent} %</span>
                  </dt>
                  <dd>{amount(m.percent)}</dd>
                </div>
              ))}
              <div className="plan__row plan__row--final">
                <dt>
                  {t('plan.final')} <span className="pv-vat">{RETENTION} %</span>
                </dt>
                <dd>{amount(RETENTION)}</dd>
              </div>
            </dl>
          )}
          {canEdit && (
            <button className="btn btn--ghost" onClick={start}>
              {milestones.length ? t('plan.edit') : t('plan.create')}
            </button>
          )}
        </>
      )}

      {editing && rows && (
        <div className="plan__edit">
          {rows.map((r, i) => (
            <div key={r.id} className="plan__edit-row">
              <input
                className="composer__input"
                aria-label={t('plan.milestone')}
                placeholder={t('plan.milestoneExample')}
                maxLength={120}
                value={r.title}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
              />
              <input
                className="composer__input plan__pct"
                aria-label="%"
                inputMode="numeric"
                value={r.percent}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, percent: e.target.value } : x)))}
              />
              <span className="plan__pct-sign">%</span>
              <button type="button" className="link-btn link-btn--dark" disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                {t('budget.delete')}
              </button>
            </div>
          ))}
          <div className="plan__edit-row plan__edit-row--final">
            <span>{t('plan.final')}</span>
            <span className="plan__pct">{RETENTION}</span>
            <span className="plan__pct-sign">%</span>
          </div>
          {rows.length < 8 && (
            <button type="button" className="link-btn link-btn--dark plan__add" onClick={() => setRows([...rows, { id: newMilestoneId(), title: '', percent: '' }])}>
              + {t('plan.addMilestone')}
            </button>
          )}
          <p className={sum === PLAN_PERCENT ? 'card__text' : 'composer__error'}>{sum === PLAN_PERCENT ? t('plan.sumOk') : t('plan.sum', { n: sum })}</p>
          {error && <p className="composer__error">{t('budget.saveError')}</p>}
          <div className="request-form__actions">
            {milestones.length > 0 && (
              <button
                type="button"
                className="btn btn--ghost"
                disabled={busy}
                onClick={() => window.confirm(t('plan.deleteConfirm')) && deletePlan(projectId).then(() => setRows(null))}
              >
                {t('budget.delete')}
              </button>
            )}
            <button type="button" className="btn btn--ghost" onClick={() => setRows(null)}>
              {t('requests.cancelForm')}
            </button>
            <button type="button" className="btn" disabled={busy || !valid} onClick={save}>
              {t('budget.saveLine')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
