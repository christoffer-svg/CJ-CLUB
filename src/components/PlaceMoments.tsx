import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { useDoc } from '../lib/data'
import { useSocialProfiles } from '../lib/familyPhoto'
import { categoryLabel, usePlaceCategories, type CategoryItem } from '../lib/placeCategories'
import { deletePlacePost, reportPlacePost, useClientPlacePosts, type WithId } from '../lib/placePosts'
import type { Me } from '../lib/social'
import type { Client, PlacePost } from '../lib/types'
import { useViewer } from '../lib/viewer'
import { shortDate } from '../lib/when'
import { FamilyAvatar } from './FamilyAvatar'
import { StarIcon } from './Icons'
import { ProfileGallery } from './ProfileView'

function useAuthor(): Me | null {
  const { clientId } = useViewer()
  const { user } = useAuth()
  const client = useDoc<Client>(clientId ? `clients/${clientId}` : null)
  return clientId && user && client.data ? { clientId, uid: user.uid, familyName: client.data.familyName } : null
}

/** Cinco estrellas de línea. n de 1 a 5; sin n, no se pinta nada */
export function SpotStars({ rating, size = 14 }: { rating: number | null; size?: number }) {
  const { t } = useI18n()
  if (!rating) return null
  return (
    <span className="spots-stars" aria-label={t('spots.ratingOf', { n: rating })}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? 'spots-star spots-star--on' : 'spots-star'}>
          <StarIcon size={size} />
        </span>
      ))}
    </span>
  )
}

function placeLabelOf(post: PlacePost, cats: CategoryItem[], t: ReturnType<typeof useI18n>['t'], pick: ReturnType<typeof useI18n>['pick']) {
  if (post.placeName) return post.placeName
  const name = categoryLabel(post.category, cats, t, pick)
  return name ? t('spots.categoryLabel', { name }) : post.category
}

/** Avisar a CJ, con un motivo opcional */
function ReportBox({ post, author }: { post: WithId<PlacePost>; author: Me | null }) {
  const { t } = useI18n()
  const me = author
  const [reporting, setReporting] = useState<string | null>(null)
  const [reported, setReported] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  if (!me) return null
  if (reported) return <p className="card__text">{t('social.reported')}</p>
  if (reporting === null)
    return (
      <button type="button" className="link-btn link-btn--dark" onClick={() => setReporting('')}>
        {t('social.report')}
      </button>
    )
  return (
    <form
      className="request-form"
      onSubmit={(e) => {
        e.preventDefault()
        setBusy(true)
        setError(false)
        reportPlacePost(post, me, reporting)
          .then(() => {
            setReporting(null)
            setReported(true)
          })
          .catch(() => setError(true))
          .finally(() => setBusy(false))
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
      {error && <p className="composer__error">{t('spots.error')}</p>}
    </form>
  )
}

/** Una publicación: autor, fecha, fotos, comentario y, si es suya, borrarla */
export function PlacePostCard({
  post,
  showPlace = false,
  cats,
  avatars,
  author,
}: {
  post: WithId<PlacePost>
  showPlace?: boolean
  cats: CategoryItem[]
  avatars: Record<string, string>
  author: Me | null
}) {
  const { base, preview, clientId } = useViewer()
  const { t, pick, locale } = useI18n()
  const mine = Boolean(clientId && post.clientId === clientId)
  const label = placeLabelOf(post, cats, t, pick)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  return (
    <article className="card spots-card">
      {post.hidden && <p className="chat__note">{t('spots.hidden')}</p>}
      {post.photos.length > 0 && <ProfileGallery photos={post.photos} name={label} />}
      {showPlace && (
        <span className="eyebrow">{post.placeId ? categoryLabel(post.category, cats, t, pick) : t('spots.tab')}</span>
      )}
      {showPlace &&
        (post.placeId ? (
          <Link className="spots-card__title" to={`${base}/descubrir/${post.placeId}`}>
            {label}
          </Link>
        ) : (
          <span className="spots-card__title">{label}</span>
        ))}
      <div className="sp-who">
        <FamilyAvatar url={avatars[post.clientId]} name={post.familyName} size={28} />
        <span>
          {post.familyName}
          {post.createdAt ? ` · ${shortDate(post.createdAt, locale)}` : ''}
        </span>
      </div>
      <SpotStars rating={post.rating} />
      {post.text && <p className="spots-card__text">{post.text}</p>}
      {!preview && (
        <div className="spots-actions">
          {mine ? (
            <button
              type="button"
              className="link-btn link-btn--dark"
              disabled={busy}
              onClick={() => {
                if (!window.confirm(t('spots.deleteConfirm'))) return
                setBusy(true)
                setError(false)
                deletePlacePost(post.id)
                  .catch(() => setError(true))
                  .finally(() => setBusy(false))
              }}
            >
              {t('spots.delete')}
            </button>
          ) : (
            <ReportBox post={post} author={author} />
          )}
        </div>
      )}
      {error && <p className="composer__error">{t('spots.error')}</p>}
    </article>
  )
}

function MomentList({ posts, empty, showPlace }: { posts: WithId<PlacePost>[]; empty: string; showPlace?: boolean }) {
  const cats = usePlaceCategories()
  const avatars = useSocialProfiles()
  const author = useAuthor()
  if (posts.length === 0) return <p className="empty">{empty}</p>
  return (
    <div className="place-list spots-list">
      {posts.map((post) => (
        <PlacePostCard key={post.id} post={post} showPlace={showPlace} cats={cats} avatars={avatars} author={author} />
      ))}
    </div>
  )
}

/** En la ficha de un sitio: lo que han contado otros clientes, y el botón para compartir */
export function PlaceMoments({ placeId }: { placeId: string }) {
  const { base, clientId, preview } = useViewer()
  const { t } = useI18n()
  const posts = useClientPlacePosts(clientId)
  const mine = posts.data.filter((p) => p.placeId === placeId)
  return (
    <section className="spots-section">
      <span className="eyebrow">{t('spots.section')}</span>
      {!preview && (
        <Link to={`${base}/social/sitio/nuevo?lugar=${placeId}`} className="btn spots-new">
          {t('spots.new')}
        </Link>
      )}
      {!posts.loading && <MomentList posts={mine} empty={t('spots.emptyPlace')} />}
    </section>
  )
}

/** Comentarios de toda una categoría (sin un sitio concreto), al pie de Descubrir */
export function CategoryMoments({ category }: { category: string }) {
  const { base, clientId, preview } = useViewer()
  const { t } = useI18n()
  const posts = useClientPlacePosts(clientId)
  const mine = posts.data.filter((p) => p.placeId === '' && p.category === category)
  if (posts.loading || (mine.length === 0 && preview)) return null
  return (
    <section className="spots-section">
      <span className="eyebrow">{t('spots.section')}</span>
      {!preview && (
        <Link to={`${base}/social/sitio/nuevo?categoria=${category}`} className="btn spots-new">
          {t('spots.new')}
        </Link>
      )}
      {mine.length > 0 && <MomentList posts={mine} empty="" />}
    </section>
  )
}

/** Listado reciente, en Social */
export function PlaceFeed() {
  const { base, clientId, preview } = useViewer()
  const { t } = useI18n()
  const posts = useClientPlacePosts(clientId)
  return (
    <>
      <p className="card__text spots-hint">{t('spots.feedHint')}</p>
      {!preview && (
        <Link to={`${base}/social/sitio/nuevo`} className="btn spots-new">
          {t('spots.new')}
        </Link>
      )}
      {!posts.loading && <MomentList posts={posts.data} empty={t('spots.empty')} showPlace />}
    </>
  )
}
