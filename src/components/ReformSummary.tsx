import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useBudgetLines, useBudgetSignatures } from '../lib/budget'
import { formatMoney, useProjectExtras, useProjectPayments, type WithId } from '../lib/projects'
import { budgetBase } from '../lib/projectTotals'
import { TRADES, type Project } from '../lib/types'

type State = 'accepted' | 'pending' | 'estimate' | 'none'
type Row = { state: State; budget: number; extras: number; extrasPending: number; paid: number }

const cents = (n: number) => Math.round(n * 100) / 100

/** Cuentas de un contrato (con IVA): lo informa a la tabla de la reforma */
function ContractRow({ p, href, onRow }: { p: WithId<Project>; href: string; onRow: (id: string, r: Row) => void }) {
  const { t, locale } = useI18n()
  const money = (n: number) => formatMoney(n, locale)
  const lines = useBudgetLines(p.id)
  const sigs = useBudgetSignatures(p.id)
  const extras = useProjectExtras(p.id)
  const payments = useProjectPayments(p.id)
  const vat = 1 + (p.vatRate ?? 21) / 100
  const hasLines = lines.data.length > 0
  const state: State = hasLines ? (sigs.client && sigs.builder ? 'accepted' : 'pending') : p.budget > 0 ? 'estimate' : 'none'
  const row: Row = {
    state,
    budget: cents((hasLines ? budgetBase(lines.data) : p.budget) * vat),
    extras: cents(extras.data.filter((e) => e.status === 'approved').reduce((s, e) => s + e.amount, 0) * vat),
    extrasPending: cents(extras.data.filter((e) => e.status === 'pending').reduce((s, e) => s + e.amount, 0) * vat),
    paid: cents(payments.data.filter((x) => x.status === 'confirmed').reduce((s, x) => s + x.amount, 0)),
  }
  const ready = !lines.loading && !sigs.loading && !extras.loading && !payments.loading
  const key = JSON.stringify(row)
  useEffect(() => {
    if (ready) onRow(p.id, row)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready])

  return (
    <Link to={href} className="rf-row">
      <div className="rf-row__head">
        <span className="card__title">{t(`trade.${p.trade ?? 'construction'}`)}</span>
        <span className={`status status--${state === 'accepted' ? 'done' : state === 'pending' ? 'new' : 'in_progress'}`}>{t(`reform.state.${state}`)}</span>
      </div>
      <span className="card__text">{p.builderName}</span>
      <dl className="rf-row__nums">
        <dt>{t('reform.budget')}</dt>
        <dd>{state === 'none' ? '—' : money(row.budget)}</dd>
        <dt>{t('reform.extras')}</dt>
        <dd>
          {money(row.extras)}
          {row.extrasPending > 0 && <span className="rf-row__pending"> {t('reform.extrasPending', { amount: money(row.extrasPending) })}</span>}
        </dd>
        <dt>{t('reform.paid')}</dt>
        <dd>{money(row.paid)}</dd>
      </dl>
    </Link>
  )
}

/**
 * Resumen de toda una reforma (varios contratos: constructor, electricista, arquitecto…): cada
 * profesional con su presupuesto, sus extras y lo pagado, y el total de la obra. Solo lo ven el
 * cliente y CJ; cada profesional ve solo su contrato.
 */
export default function ReformSummary({ projects, hrefOf }: { projects: WithId<Project>[]; hrefOf: (p: WithId<Project>) => string }) {
  const { t, locale } = useI18n()
  const money = (n: number) => formatMoney(n, locale)
  const [rows, setRows] = useState<Record<string, Row>>({})
  // Siempre en el mismo orden: constructor, oficios, y al final arquitecto y diseñador
  const ordered = [...projects].sort((a, b) => TRADES.indexOf(a.trade ?? 'construction') - TRADES.indexOf(b.trade ?? 'construction'))
  const list = projects.map((p) => rows[p.id]).filter(Boolean)
  const accepted = cents(list.reduce((s, r) => s + (r.state === 'accepted' ? r.budget : 0) + r.extras, 0))
  const toAccept = cents(list.reduce((s, r) => s + (r.state === 'pending' || r.state === 'estimate' ? r.budget : 0) + r.extrasPending, 0))
  const paid = cents(list.reduce((s, r) => s + r.paid, 0))

  return (
    <section className="card rf">
      <span className="eyebrow">{t('reform.summary')}</span>
      <div className="rf-rows">
        {ordered.map((p) => (
          <ContractRow key={p.id} p={p} href={hrefOf(p)} onRow={(id, r) => setRows((x) => ({ ...x, [id]: r }))} />
        ))}
      </div>
      <dl className="pv-money rf-total">
        <dt className="pv-money__strong">{t('reform.totalAccepted')}</dt>
        <dd className="pv-money__strong">{money(accepted)}</dd>
        {toAccept > 0 && (
          <>
            <dt>{t('reform.toAccept')}</dt>
            <dd>{money(toAccept)}</dd>
            <dt className="pv-money__strong">{t('reform.totalPlanned')}</dt>
            <dd className="pv-money__strong">{money(cents(accepted + toAccept))}</dd>
          </>
        )}
        <dt>{t('reform.paidTotal')}</dt>
        <dd>{money(paid)}</dd>
        <dt>{t('reform.outstanding')}</dt>
        <dd>{money(Math.max(0, cents(accepted - paid)))}</dd>
      </dl>
      <p className="card__text rf-note">{t('reform.note')}</p>
    </section>
  )
}
