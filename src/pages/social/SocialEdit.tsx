import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FilePicker } from '../../components/Attachments'
import Header from '../../components/Header'
import { useI18n } from '../../i18n'
import { todayKey } from '../../lib/data'
import { newPostId, savePost, uploadSocialPhotos, useSocialPost, type PostDraft } from '../../lib/social'
import { SOCIAL_ACTIVITIES } from '../../lib/types'
import { useViewer } from '../../lib/viewer'
import { useMe } from './common'

const blank: PostDraft = { kind: 'plan', activity: 'golf', title: '', text: '', dateFrom: '', dateTo: '', place: '', photos: [] }

/** Publicar un plan o una recomendación en Social, o corregir uno propio */
export default function SocialEdit() {
  const { postId } = useParams()
  const { base } = useViewer()
  const { t } = useI18n()
  const navigate = useNavigate()
  const me = useMe()
  const existing = useSocialPost(postId ?? '_')
  const [id] = useState(() => postId ?? newPostId())
  const [draft, setDraft] = useState<PostDraft | null>(postId ? null : blank)
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Al corregir: se empieza con lo publicado
  const e = existing.data
  if (postId && !draft && e) setDraft({ kind: e.kind, activity: e.activity, title: e.title, text: e.text, dateFrom: e.dateFrom, dateTo: e.dateTo, place: e.place, photos: e.photos })
  if (!draft) return null
  const d = draft
  const set = (patch: Partial<PostDraft>) => setDraft({ ...d, ...patch })
  const isPlan = d.kind === 'plan'
  const valid = Boolean(d.title.trim() && (!isPlan || (d.dateFrom && (!d.dateTo || d.dateTo >= d.dateFrom))))
  const room = 4 - d.photos.length

  async function save() {
    if (!me || !valid) return
    setBusy(true)
    setError('')
    try {
      const added = files.length ? await uploadSocialPhotos(id, files.slice(0, room)) : []
      await savePost(id, me, { ...d, photos: [...d.photos, ...added] }, Boolean(postId))
      navigate(`${base}/social/${id}`, { replace: true })
    } catch {
      setError(t('social.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Header back={postId ? `${base}/social/${postId}` : `${base}/social`} eyebrow={t('social.eyebrow')} title={postId ? t('social.edit') : t('social.new')} />
      <main className="page">
        <form
          className="card request-form"
          onSubmit={(ev) => {
            ev.preventDefault()
            save()
          }}
        >
          {!postId && (
            <div className="pills" role="radiogroup" aria-label={t('social.kind')}>
              {(['plan', 'tip'] as const).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={d.kind === k} className={d.kind === k ? 'pill pill--active' : 'pill'} onClick={() => set({ kind: k })}>
                  {t(k === 'plan' ? 'social.kind.plan' : 'social.kind.tip')}
                </button>
              ))}
            </div>
          )}
          <p className="card__text">{isPlan ? t('social.planHint') : t('social.tipHint')}</p>
          {isPlan && (
            <div className="request-form__field">
              <span className="eyebrow">{t('social.activity')}</span>
              <div className="pills pills--wrap">
                {SOCIAL_ACTIVITIES.map((a) => (
                  <button key={a} type="button" aria-pressed={d.activity === a} className={d.activity === a ? 'pill pill--active' : 'pill'} onClick={() => set({ activity: a })}>
                    {t(`social.activity.${a}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className="request-form__field">
            <span className="eyebrow">{t('social.titleField')}</span>
            <input
              className="composer__input"
              required
              maxLength={120}
              placeholder={isPlan ? t('social.titlePlanExample') : t('social.titleTipExample')}
              value={d.title}
              onChange={(ev) => set({ title: ev.target.value })}
            />
          </label>
          {isPlan && (
            <div className="budget-form__row">
              <label className="request-form__field">
                <span className="eyebrow">{t('social.from')}</span>
                <input className="composer__input" type="date" required min={postId ? undefined : todayKey()} value={d.dateFrom} onChange={(ev) => set({ dateFrom: ev.target.value })} />
              </label>
              <label className="request-form__field">
                <span className="eyebrow">{t('social.to')}</span>
                <input className="composer__input" type="date" min={d.dateFrom || todayKey()} value={d.dateTo} onChange={(ev) => set({ dateTo: ev.target.value })} />
              </label>
            </div>
          )}
          <label className="request-form__field">
            <span className="eyebrow">{isPlan ? t('social.where') : t('social.placeName')}</span>
            <input className="composer__input" maxLength={120} value={d.place} onChange={(ev) => set({ place: ev.target.value })} />
          </label>
          <label className="request-form__field">
            <span className="eyebrow">{t('social.text')}</span>
            <textarea className="composer__input" rows={4} maxLength={2000} value={d.text} onChange={(ev) => set({ text: ev.target.value })} />
          </label>
          {d.photos.length > 0 && (
            <ul className="att-chosen">
              {d.photos.map((a) => (
                <li key={a.path}>
                  <span>{a.name}</span>
                  <button type="button" className="link-btn link-btn--dark" onClick={() => set({ photos: d.photos.filter((x) => x.path !== a.path) })}>
                    {t('budget.removePhoto')}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {room > 0 && <FilePicker label={t('project.files.photos')} files={files} max={room} onChange={setFiles} />}
          <p className="card__text">{t('social.visibleTo')}</p>
          {error && <p className="composer__error">{error}</p>}
          <div className="request-form__actions">
            <button type="button" className="btn btn--ghost" onClick={() => navigate(-1)}>
              {t('requests.cancelForm')}
            </button>
            <button type="submit" className="btn" disabled={busy || !valid || !me}>
              {busy ? '…' : postId ? t('social.saveChanges') : t('social.publish')}
            </button>
          </div>
        </form>
      </main>
    </>
  )
}
