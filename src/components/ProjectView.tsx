import { useState, type FormEvent, type ReactNode } from 'react'
import { useI18n } from '../i18n'
import type { TranslationKey } from '../i18n/translations'
import {
  addProjectPayment,
  answerProjectPayment,
  decideProjectExtra,
  formatMoney,
  postProjectMessage,
  postProjectUpdate,
  projectTotals,
  proposeProjectExtra,
  useProject,
  useProjectExtras,
  useProjectMessages,
  useProjectPayments,
  useProjectUpdates,
  withdrawProjectExtra,
  type Author,
} from '../lib/projects'
import type { ProjectRole } from '../lib/types'
import { parseAmount } from '../lib/amount'
import { messageTime, shortDate } from '../lib/when'

type Tab = 'summary' | 'chat' | 'updates' | 'payments' | 'extras'
const tabs: Tab[] = ['summary', 'chat', 'updates', 'payments', 'extras']

const today = () => new Date().toISOString().slice(0, 10)
function Block({ children }: { children: ReactNode }) {
  return <section className="card pv-block">{children}</section>
}

/**
 * Ficha de una obra (Mi reforma), igual para el cliente, el constructor y CJ.
 * Lo que cada uno puede hacer lo deciden también las reglas de seguridad.
 */
export default function ProjectView({ projectId, author, readOnly }: { projectId: string; author: Author; readOnly?: boolean }) {
  const { t, locale } = useI18n()
  const project = useProject(projectId)
  const messages = useProjectMessages(projectId)
  const updates = useProjectUpdates(projectId)
  const payments = useProjectPayments(projectId)
  const extras = useProjectExtras(projectId)
  const [tab, setTab] = useState<Tab>('summary')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const role: ProjectRole = author.role
  const money = (n: number) => formatMoney(n, locale)
  const roleName = (r: ProjectRole) => t(`project.role.${r}`)
  const p = project.data
  const totals = projectTotals(p, extras.data, payments.data)
  const lastPercent = [...updates.data].reverse().find((u) => typeof u.percent === 'number')?.percent
  const pendingForClient = extras.data.filter((e) => e.status === 'pending').length

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

  // Formularios
  const [msg, setMsg] = useState('')
  const [upd, setUpd] = useState<{ title: string; text: string; percent: string } | null>(null)
  const [pay, setPay] = useState<{ amount: string; date: string; concept: string } | null>(null)
  const [ext, setExt] = useState<{ title: string; description: string; amount: string } | null>(null)
  const [deciding, setDeciding] = useState<{ id: string; note: string } | null>(null)

  if (project.loading) return null
  const accountsReady = !payments.loading && !extras.loading
  if (!p) return <p className="empty">{t('project.list.empty')}</p>

  const canWrite = !readOnly
  const status = (key: TranslationKey, cls: string) => <span className={`status status--${cls}`}>{t(key)}</span>

  return (
    <div className="pv">
      <section className="card pv-head">
        <div className="pv-head__row">
          <h2 className="pv-head__title">{p.title}</h2>
          {status(`project.status.${p.status}`, p.status === 'finished' ? 'done' : p.status === 'in_progress' ? 'in_progress' : 'new')}
        </div>
        <span className="card__text">
          {p.property} · {t('project.builder')}: {p.builderName}
        </span>
        {(p.startDate || p.endDate) && (
          <span className="card__text">
            {t('project.dates')}: {shortDate(p.startDate, locale) || '…'} – {shortDate(p.endDate, locale) || '…'}
          </span>
        )}
      </section>

      <div className="pills pv-tabs" role="tablist" aria-label={t('project.eyebrow')}>
        {tabs.map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            className={tab === k ? 'pill pill--active' : 'pill'}
            onClick={() => {
              setTab(k)
              setError(false)
            }}
          >
            {t(`project.tab.${k}`)}
            {k === 'extras' && role === 'client' && pendingForClient > 0 && <span className="pv-count">{pendingForClient}</span>}
          </button>
        ))}
      </div>

      {error && <p className="composer__error">{t('requests.error')}</p>}

      {tab === 'summary' && (
        <>
          {accountsReady && (
          <Block>
            <dl className="pv-money">
              <dt>{t('project.budget')}</dt>
              <dd>{money(totals.budget)}</dd>
              <dt>{t('project.extrasApproved')}</dt>
              <dd>+ {money(totals.approvedExtras)}</dd>
              <dt className="pv-money__strong">{t('project.total')}</dt>
              <dd className="pv-money__strong">{money(totals.total)}</dd>
              <dt>{t('project.paid')}</dt>
              <dd>− {money(totals.paid)}</dd>
              <dt className="pv-money__strong">{t('project.outstanding')}</dt>
              <dd className="pv-money__strong">{money(totals.outstanding)}</dd>
            </dl>
            {totals.pendingExtras > 0 && <p className="card__text">{t('project.pendingExtrasNote', { amount: money(totals.pendingExtras) })}</p>}
            {totals.unconfirmed > 0 && <p className="card__text">{t('project.unconfirmedNote', { amount: money(totals.unconfirmed) })}</p>}
            {role === 'client' && pendingForClient > 0 && (
              <button className="btn" onClick={() => setTab('extras')}>
                {t('project.waitingClient', { n: pendingForClient })}
              </button>
            )}
          </Block>
          )}
          {typeof lastPercent === 'number' && (
            <Block>
              <span className="eyebrow">{t('project.progress')}</span>
              <div className="pv-progress" role="progressbar" aria-valuenow={lastPercent} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${lastPercent}%` }} />
              </div>
              <span className="card__text">{lastPercent} %</span>
            </Block>
          )}
          {updates.data.length > 0 && (
            <Block>
              <span className="eyebrow">{t('project.tab.updates')}</span>
              {(() => {
                const u = updates.data[updates.data.length - 1]
                return (
                  <>
                    <span className="card__title">{u.title}</span>
                    {u.text && <p className="request__text">{u.text}</p>}
                    <span className="card__text">
                      {u.authorName} ({roleName(u.authorRole)}) · {shortDate(u.createdAt, locale)}
                    </span>
                  </>
                )
              })()}
            </Block>
          )}
        </>
      )}

      {tab === 'chat' && (
        <>
          <div className="chat__list">
            {!messages.loading && messages.data.length === 0 && <p className="empty">{t('project.chat.empty')}</p>}
            {messages.data.map((m) => (
              <div key={m.id} className={m.sender === role ? 'bubble bubble--mine' : 'bubble'}>
                <span className="bubble__author">
                  {m.authorName} · {roleName(m.sender)}
                </span>
                <p className="bubble__text">{m.text}</p>
                <span className="bubble__time">{messageTime(m.createdAt, locale)}</span>
              </div>
            ))}
          </div>
          {canWrite ? (
            <form
              className="composer pv-composer"
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                if (msg.trim()) run(() => postProjectMessage(projectId, author, msg), () => setMsg(''))
              }}
            >
              <textarea
                className="composer__input"
                rows={2}
                maxLength={2000}
                aria-label={t('chat.placeholder')}
                placeholder={t('chat.placeholder')}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
              />
              <button className="btn composer__send" type="submit" disabled={busy || !msg.trim()}>
                {t('chat.send')}
              </button>
            </form>
          ) : (
            <p className="chat__note">{t('preview.readOnly')}</p>
          )}
        </>
      )}

      {tab === 'updates' && (
        <>
          {canWrite && role !== 'client' && !upd && (
            <button className="btn" onClick={() => setUpd({ title: '', text: '', percent: '' })}>
              {t('project.updates.new')}
            </button>
          )}
          {upd && (
            <form
              className="card request-form"
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                const percent = upd.percent.trim() === '' ? undefined : Number(upd.percent)
                if (!upd.title.trim() || (percent !== undefined && !(percent >= 0 && percent <= 100))) return
                run(() => postProjectUpdate(projectId, author, { title: upd.title, text: upd.text, percent }), () => setUpd(null))
              }}
            >
              <label className="request-form__field">
                <span className="eyebrow">{t('project.updates.titleField')}</span>
                <input className="composer__input" required maxLength={200} value={upd.title} onChange={(e) => setUpd({ ...upd, title: e.target.value })} />
              </label>
              <label className="request-form__field">
                <span className="eyebrow">{t('project.updates.textField')}</span>
                <textarea className="composer__input" rows={3} maxLength={4000} value={upd.text} onChange={(e) => setUpd({ ...upd, text: e.target.value })} />
              </label>
              <label className="request-form__field">
                <span className="eyebrow">{t('project.updates.percentField')}</span>
                <input className="composer__input" type="number" min={0} max={100} inputMode="numeric" value={upd.percent} onChange={(e) => setUpd({ ...upd, percent: e.target.value })} />
              </label>
              <div className="request-form__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setUpd(null)}>
                  {t('requests.cancelForm')}
                </button>
                <button type="submit" className="btn" disabled={busy || !upd.title.trim()}>
                  {t('project.save')}
                </button>
              </div>
            </form>
          )}
          {!updates.loading && updates.data.length === 0 && <p className="empty">{t('project.updates.empty')}</p>}
          {[...updates.data].reverse().map((u) => (
            <article key={u.id} className="card request">
              <div className="request__head">
                <span className="card__title">{u.title}</span>
                {typeof u.percent === 'number' && <span className="status">{u.percent} %</span>}
              </div>
              {u.text && <p className="request__text">{u.text}</p>}
              <span className="card__text">
                {u.authorName} ({roleName(u.authorRole)}) · {shortDate(u.createdAt, locale)}
              </span>
            </article>
          ))}
        </>
      )}

      {tab === 'payments' && (
        <>
          {canWrite && !pay && (
            <button className="btn" onClick={() => setPay({ amount: '', date: today(), concept: '' })}>
              {t('project.payments.new')}
            </button>
          )}
          {pay && (
            <form
              className="card request-form"
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                const amount = parseAmount(pay.amount)
                if (!(amount > 0) || !pay.concept.trim() || !pay.date) return
                run(() => addProjectPayment(projectId, author, { amount, date: pay.date, concept: pay.concept }), () => setPay(null))
              }}
            >
              <label className="request-form__field">
                <span className="eyebrow">{t('project.payments.amount')}</span>
                <input className="composer__input" required inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
                {pay.amount.trim() && <span className="pv-parsed">{parseAmount(pay.amount) > 0 ? `= ${money(parseAmount(pay.amount))}` : '?'}</span>}
              </label>
              <label className="request-form__field">
                <span className="eyebrow">{t('project.payments.date')}</span>
                <input className="composer__input" type="date" required value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} />
              </label>
              <label className="request-form__field">
                <span className="eyebrow">{t('project.payments.concept')}</span>
                <input className="composer__input" required maxLength={200} value={pay.concept} onChange={(e) => setPay({ ...pay, concept: e.target.value })} />
              </label>
              <div className="request-form__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setPay(null)}>
                  {t('requests.cancelForm')}
                </button>
                <button type="submit" className="btn" disabled={busy || !(parseAmount(pay.amount) > 0) || !pay.concept.trim()}>
                  {t('project.save')}
                </button>
              </div>
            </form>
          )}
          {!payments.loading && payments.data.length === 0 && <p className="empty">{t('project.payments.empty')}</p>}
          {[...payments.data].reverse().map((pm) => {
            const canAnswer = canWrite && pm.status === 'pending' && (role === 'cj' || role !== pm.recordedByRole)
            return (
              <article key={pm.id} className="card request">
                <div className="request__head">
                  <span className="pv-amount">{money(pm.amount)}</span>
                  {status(`project.payments.status.${pm.status}`, pm.status === 'confirmed' ? 'done' : pm.status === 'disputed' ? 'cancelled' : 'new')}
                </div>
                <p className="request__text">{pm.concept}</p>
                <span className="card__text">
                  {shortDate(pm.date, locale)} · {t('project.payments.recordedBy', { name: pm.recordedByName, role: roleName(pm.recordedByRole) })}
                </span>
                {pm.status !== 'pending' && pm.confirmedByName && (
                  <span className="card__text">
                    {t('project.answeredBy', {
                      status: t(`project.payments.status.${pm.status}`),
                      name: `${pm.confirmedByName} (${roleName(pm.confirmedByRole ?? 'cj')})`,
                      date: shortDate(pm.confirmedAt, locale),
                    })}
                  </span>
                )}
                {pm.status === 'pending' && !canAnswer && <span className="card__text">{t('project.payments.waiting')}</span>}
                {canAnswer && (
                  <div className="request-form__actions">
                    <button className="btn btn--ghost" disabled={busy} onClick={() => run(() => answerProjectPayment(projectId, pm.id, author, 'disputed'))}>
                      {t('project.payments.dispute')}
                    </button>
                    <button className="btn" disabled={busy} onClick={() => run(() => answerProjectPayment(projectId, pm.id, author, 'confirmed'))}>
                      {t('project.payments.confirm')}
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </>
      )}

      {tab === 'extras' && (
        <>
          {canWrite && role !== 'client' && !ext && (
            <button className="btn" onClick={() => setExt({ title: '', description: '', amount: '' })}>
              {t('project.extras.new')}
            </button>
          )}
          {ext && (
            <form
              className="card request-form"
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                const amount = parseAmount(ext.amount)
                if (!ext.title.trim() || !(amount > 0)) return
                run(() => proposeProjectExtra(projectId, author, { title: ext.title, description: ext.description, amount }), () => setExt(null))
              }}
            >
              <label className="request-form__field">
                <span className="eyebrow">{t('project.extras.titleField')}</span>
                <input className="composer__input" required maxLength={200} value={ext.title} onChange={(e) => setExt({ ...ext, title: e.target.value })} />
              </label>
              <label className="request-form__field">
                <span className="eyebrow">{t('project.extras.descField')}</span>
                <textarea className="composer__input" rows={3} maxLength={4000} value={ext.description} onChange={(e) => setExt({ ...ext, description: e.target.value })} />
              </label>
              <label className="request-form__field">
                <span className="eyebrow">{t('project.extras.amount')}</span>
                <input className="composer__input" required inputMode="decimal" value={ext.amount} onChange={(e) => setExt({ ...ext, amount: e.target.value })} />
                {ext.amount.trim() && <span className="pv-parsed">{parseAmount(ext.amount) > 0 ? `= ${money(parseAmount(ext.amount))}` : '?'}</span>}
              </label>
              <div className="request-form__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setExt(null)}>
                  {t('requests.cancelForm')}
                </button>
                <button type="submit" className="btn" disabled={busy || !ext.title.trim() || !(parseAmount(ext.amount) > 0)}>
                  {t('project.save')}
                </button>
              </div>
            </form>
          )}
          {!extras.loading && extras.data.length === 0 && <p className="empty">{t('project.extras.empty')}</p>}
          {[...extras.data].reverse().map((x) => {
            const statusCls = x.status === 'approved' ? 'done' : x.status === 'pending' ? 'new' : 'cancelled'
            return (
              <article key={x.id} className={x.status === 'pending' ? 'card request pv-extra--pending' : 'card request'}>
                <div className="request__head">
                  <span className="card__title">{x.title}</span>
                  {status(`project.extras.status.${x.status}`, statusCls)}
                </div>
                <span className="pv-amount">{money(x.amount)}</span>
                {x.description && <p className="request__text">{x.description}</p>}
                <span className="card__text">
                  {t('project.extras.proposedBy', { name: `${x.proposedByName} (${roleName(x.proposedByRole)})`, date: shortDate(x.createdAt, locale) })}
                </span>
                {(x.status === 'approved' || x.status === 'rejected') && x.decidedByName && (
                  <span className="card__text">
                    {t('project.answeredBy', { status: t(`project.extras.status.${x.status}`), name: x.decidedByName, date: shortDate(x.decidedAt, locale) })}
                    {x.decisionNote ? ` · «${x.decisionNote}»` : ''}
                  </span>
                )}
                {canWrite && x.status === 'pending' && role === 'client' &&
                  (deciding?.id === x.id ? (
                    <div className="request-form">
                      <p className="card__text">{t('project.extras.decideHint')}</p>
                      <label className="request-form__field">
                        <span className="eyebrow">{t('project.extras.note')}</span>
                        <input className="composer__input" maxLength={1000} value={deciding.note} onChange={(e) => setDeciding({ ...deciding, note: e.target.value })} />
                      </label>
                      <div className="request-form__actions">
                        <button className="btn btn--ghost" disabled={busy} onClick={() => run(() => decideProjectExtra(projectId, x.id, author, 'rejected', deciding.note), () => setDeciding(null))}>
                          {t('project.extras.reject')}
                        </button>
                        <button className="btn" disabled={busy} onClick={() => run(() => decideProjectExtra(projectId, x.id, author, 'approved', deciding.note), () => setDeciding(null))}>
                          {t('project.extras.approve')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="request-form__actions">
                      <button className="btn" onClick={() => setDeciding({ id: x.id, note: '' })}>
                        {t('project.extras.approve')} / {t('project.extras.reject')}
                      </button>
                    </div>
                  ))}
                {canWrite && x.status === 'pending' && x.proposedByUid === author.uid && (
                  <button className="link-btn link-btn--dark request__cancel" disabled={busy} onClick={() => run(() => withdrawProjectExtra(projectId, x.id))}>
                    {t('project.extras.withdraw')}
                  </button>
                )}
              </article>
            )
          })}
        </>
      )}
    </div>
  )
}
