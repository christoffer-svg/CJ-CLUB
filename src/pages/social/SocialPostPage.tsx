import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Header from '../../components/Header'
import { ProfileGallery } from '../../components/ProfileView'
import { useI18n } from '../../i18n'
import { chatIdOf, deletePost, joinPlan, leavePlan, reportPost, useJoins, useMyChats, useSocialPost } from '../../lib/social'
import { useViewer } from '../../lib/viewer'
import { useMe, usePlanDates } from './common'
import { FamilyAvatar } from '../../components/FamilyAvatar'
import { useSocialProfiles } from '../../lib/familyPhoto'

/** Una publicación de Social: apuntarse a un plan (y chatear con quien lo publica), o avisar a CJ */
export default function SocialPostPage() {
  const { postId = '' } = useParams()
  const { base, preview } = useViewer()
  const { t } = useI18n()
  const navigate = useNavigate()
  const me = useMe()
  const post = useSocialPost(postId)
  const joins = useJoins(postId)
  const chats = useMyChats(me?.clientId ?? null)
  const dates = usePlanDates()
  const avatars = useSocialProfiles()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reporting, setReporting] = useState<string | null>(null)
  const [reported, setReported] = useState(false)
  const p = post.data
  const mine = Boolean(p && me && p.clientId === me.clientId)
  const joined = Boolean(me && joins.some((j) => j.clientId === me.clientId))
  const myChats = chats.data.filter((c) => c.postId === postId)

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch {
      setError(t('social.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Header
        back={`${base}/social`}
        eyebrow={p ? (p.kind === 'plan' ? t(`social.activity.${p.activity}`) : t('social.tip')) : t('social.eyebrow')}
        title={p?.title ?? (post.loading ? '' : t('profile.notFound'))}
        subtitle={p ? `${p.familyName}${p.kind === 'plan' ? ` · ${dates(p)}` : ''}` : undefined}
      />
      <main className="page">
        {p && (
          <>
            {p.hidden && <p className="chat__note">{t('social.hiddenByCj')}</p>}
            <div className="sp-author">
              <FamilyAvatar url={avatars[p.clientId]} name={p.familyName} size={44} />
              <span className="card__title">{p.familyName}</span>
            </div>
            <ProfileGallery photos={p.photos} name={p.title} />
            <section className="card pf-block">
              {p.place && (
                <p className="sp-place">
                  <span className="eyebrow">{p.kind === 'plan' ? t('social.where') : t('social.placeName')}</span> {p.place}
                </p>
              )}
              {p.text && <p className="pf-text">{p.text}</p>}
            </section>

            {p.kind === 'plan' && (
              <section className="card pf-block">
                <span className="eyebrow">{t('social.joined')}</span>
                {joins.length === 0 ? (
                  <p className="card__text">{t('social.nobodyYet')}</p>
                ) : (
                  <ul className="sp-joined">
                    {joins.map((j) => (
                      <li key={j.id}>
                        <FamilyAvatar url={avatars[j.clientId]} name={j.familyName} size={28} />
                        {j.familyName}
                      </li>
                    ))}
                  </ul>
                )}
                {!mine && !preview && me && !joined && (
                  <button className="btn" disabled={busy} onClick={() => run(async () => navigate(`${base}/social/chat/${await joinPlan(p, me)}`))}>
                    {t('social.join')}
                  </button>
                )}
                {!mine && joined && me && (
                  <div className="sp-actions">
                    <Link className="btn" to={`${base}/social/chat/${chatIdOf(p.id, me.clientId)}`}>
                      {t('social.openChat', { name: p.familyName })}
                    </Link>
                    {!preview && (
                      <button className="link-btn link-btn--dark" disabled={busy} onClick={() => run(() => leavePlan(p.id, me.clientId))}>
                        {t('social.leave')}
                      </button>
                    )}
                  </div>
                )}
                {!mine && !joined && <p className="card__text">{t('social.joinHint')}</p>}
              </section>
            )}

            {mine && (
              <section className="card pf-block">
                {p.kind === 'plan' && <span className="eyebrow">{t('social.yourChats')}</span>}
                {p.kind === 'plan' && myChats.length === 0 && <p className="card__text">{t('social.noJoinersYet')}</p>}
                {myChats.map((c) => {
                  const other = c.members.find((m) => m !== me?.clientId) ?? ''
                  return (
                    <Link key={c.id} to={`${base}/social/chat/${c.id}`} className="pf-deal">
                      <span className="card__title">{c.names[other]}</span>
                      <span className="pf-deal__label">{t('social.chat')}</span>
                    </Link>
                  )
                })}
                {!preview && (
                  <div className="sp-actions">
                    <Link className="btn btn--ghost" to={`${base}/social/${p.id}/editar`}>
                      {t('social.edit')}
                    </Link>
                    <button
                      className="link-btn link-btn--dark"
                      disabled={busy}
                      onClick={() => window.confirm(t('social.deleteConfirm')) && run(async () => (await deletePost(p.id), navigate(`${base}/social`)))}
                    >
                      {t('social.delete')}
                    </button>
                  </div>
                )}
              </section>
            )}

            {!mine && !preview && me && (
              <div className="sp-report">
                {reported ? (
                  <p className="card__text">{t('social.reported')}</p>
                ) : reporting === null ? (
                  <button className="link-btn link-btn--dark" onClick={() => setReporting('')}>
                    {t('social.report')}
                  </button>
                ) : (
                  <form
                    className="request-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      run(async () => {
                        await reportPost(p, me, reporting)
                        setReporting(null)
                        setReported(true)
                      })
                    }}
                  >
                    <label className="request-form__field">
                      <span className="eyebrow">{t('social.reportWhy')}</span>
                      <textarea className="composer__input" rows={2} maxLength={500} value={reporting} onChange={(e) => setReporting(e.target.value)} />
                    </label>
                    <div className="request-form__actions">
                      <button type="button" className="btn btn--ghost" onClick={() => setReporting(null)}>
                        {t('requests.cancelForm')}
                      </button>
                      <button type="submit" className="btn" disabled={busy}>
                        {t('social.reportSend')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
            {error && <p className="composer__error">{error}</p>}
          </>
        )}
      </main>
    </>
  )
}
