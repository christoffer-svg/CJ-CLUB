import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../../components/Header'
import { StarIcon } from '../../components/Icons'
import { useI18n } from '../../i18n'
import { useActivePlaces, useDoc } from '../../lib/data'
import { categoryLabel, usePlaceCategories } from '../../lib/placeCategories'
import { checkSpotPhotos, newPlacePostId, savePlacePost, uploadSpotPhotos, type SpotPhotoProblem } from '../../lib/placePosts'
import type { Place } from '../../lib/types'
import { useViewer } from '../../lib/viewer'
import { useMe } from './common'

function PhotoThumb({ file, removeLabel, onRemove }: { file: File; removeLabel: string; onRemove: () => void }) {
  const img = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    if (img.current) img.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])
  return (
    <figure className="spots-chosen__item">
      <img ref={img} alt="" />
      <button type="button" className="a-link" onClick={onRemove}>
        {removeLabel}
      </button>
    </figure>
  )
}

/** Compartir fotos y un comentario de un sitio, o de una categoría de Descubrir */
export default function SpotEdit() {
  const { base, preview } = useViewer()
  const { t, pick } = useI18n()
  const navigate = useNavigate()
  const me = useMe()
  const [params] = useSearchParams()
  const lugar = params.get('lugar')
  const askedCategory = params.get('categoria')
  const place = useDoc<Place>(lugar ? `places/${lugar}` : null)
  const places = useActivePlaces()
  const cats = usePlaceCategories()
  const [id] = useState(newPlacePostId)
  const [category, setCategory] = useState(askedCategory ?? '')
  const [placeId, setPlaceId] = useState(lugar ?? '')
  const [customName, setCustomName] = useState('')
  const [text, setText] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [problem, setProblem] = useState<SpotPhotoProblem | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const locked = lugar && place.data && place.data.active !== false ? { ...place.data, id: lugar } : null
  const currentCategory = locked?.category ?? (category || (!lugar ? (cats[0]?.id ?? '') : ''))
  const choices = places.data.filter((p) => p.category === currentCategory).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const chosen = locked ?? choices.find((p) => p.id === placeId) ?? null
  const valid = Boolean((text.trim() || files.length) && (chosen || currentCategory) && me)

  function addFiles(list: File[]) {
    const next = [...files, ...list]
    const found = checkSpotPhotos(next)
    setProblem(found)
    if (!found) setFiles(next)
  }

  async function publish() {
    if (!me || !valid || !currentCategory) return
    setBusy(true)
    setError('')
    try {
      const photos = files.length ? await uploadSpotPhotos(id, files) : []
      await savePlacePost(
        id,
        me,
        {
          placeId: chosen?.id ?? '',
          category: chosen?.category ?? currentCategory,
          placeName: chosen?.name ?? customName.trim(),
          text,
          rating,
          photos,
        },
        false,
      )
      navigate(chosen ? `${base}/descubrir/${chosen.id}` : `${base}/social?ver=sitios`, { replace: true })
    } catch (err) {
      setError(err instanceof Error && err.message === 'too-big' ? t('spots.photoSize') : t('spots.error'))
    } finally {
      setBusy(false)
    }
  }

  const back = lugar ? `${base}/descubrir/${lugar}` : `${base}/social?ver=sitios`
  const waitingPlace = Boolean(lugar && place.loading)

  if (preview) {
    return (
      <>
        <Header back={back} eyebrow={t('social.eyebrow')} title={t('spots.pageTitle')} />
        <main className="page">
          <p className="chat__note">{t('preview.readOnly')}</p>
        </main>
      </>
    )
  }

  return (
    <>
      <Header back={back} eyebrow={t('social.eyebrow')} title={t('spots.pageTitle')} subtitle={t('spots.pageSubtitle')} />
      <main className="page">
        {waitingPlace ? null : (
        <form
          className="card request-form"
          onSubmit={(e) => {
            e.preventDefault()
            publish()
          }}
        >
          {locked ? (
            <p className="sp-place">
              <span className="eyebrow">{t('spots.which')}</span> {locked.name}
            </p>
          ) : (
            <>
              <div className="request-form__field">
                <span className="eyebrow">{t('spots.which')}</span>
                <div className="pills pills--wrap" role="radiogroup" aria-label={t('spots.which')}>
                  {cats.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={currentCategory === c.id}
                      className={currentCategory === c.id ? 'pill pill--active' : 'pill'}
                      onClick={() => {
                        setCategory(c.id)
                        setPlaceId('')
                      }}
                    >
                      {categoryLabel(c.id, cats, t, pick)}
                    </button>
                  ))}
                </div>
              </div>
              <label className="request-form__field">
                <span className="eyebrow">{t('spots.which')}</span>
                <select className="composer__input" value={chosen?.id ?? ''} onChange={(e) => setPlaceId(e.target.value)}>
                  <option value="">{t('spots.whichCategory')}</option>
                  {choices.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              {!chosen && (
                <label className="request-form__field">
                  <span className="eyebrow">{t('spots.placeOptional')}</span>
                  <input className="composer__input" maxLength={120} value={customName} onChange={(e) => setCustomName(e.target.value)} />
                </label>
              )}
            </>
          )}

          <label className="request-form__field">
            <span className="eyebrow">{t('spots.comment')}</span>
            <textarea className="composer__input" rows={4} maxLength={2000} placeholder={t('spots.commentPlaceholder')} value={text} onChange={(e) => setText(e.target.value)} />
            <span className="card__text">{t('spots.need')}</span>
          </label>

          <div className="request-form__field">
            <span className="eyebrow">{t('spots.rating')}</span>
            <div className="spots-rate" role="radiogroup" aria-label={t('spots.rating')}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={t('spots.ratingOf', { n })}
                  className={rating !== null && n <= rating ? 'spots-star spots-star--on spots-star--btn' : 'spots-star spots-star--btn'}
                  onClick={() => setRating(rating === n ? null : n)}
                >
                  <StarIcon size={22} />
                </button>
              ))}
              {rating !== null && (
                <button type="button" className="link-btn link-btn--dark" onClick={() => setRating(null)}>
                  {t('spots.ratingClear')}
                </button>
              )}
            </div>
          </div>

          <div className="request-form__field">
            <span className="eyebrow">{t('spots.photos')}</span>
            <label className="btn btn--ghost att-pick">
              {t('spots.addPhotos')}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                multiple
                hidden
                onChange={(e) => {
                  addFiles([...(e.target.files ?? [])])
                  e.target.value = ''
                }}
              />
            </label>
            <span className="card__text">{t('spots.photosHint')}</span>
            {problem && (
              <span className="composer__error">
                {problem === 'type' ? t('spots.photoType') : problem === 'size' ? t('spots.photoSize') : t('spots.photoCount')}
              </span>
            )}
            {files.length > 0 && (
              <div className="spots-chosen">
                {files.map((file, i) => (
                  <PhotoThumb key={`${file.name}-${file.lastModified}-${i}`} file={file} removeLabel={t('photo.remove')} onRemove={() => setFiles(files.filter((_, j) => j !== i))} />
                ))}
              </div>
            )}
          </div>

          <p className="card__text sp-hint">{t('spots.visibleTo')}</p>
          {error && <p className="composer__error">{error}</p>}
          <div className="request-form__actions">
            <Link className="btn btn--ghost" to={back}>
              {t('requests.cancelForm')}
            </Link>
            <button type="submit" className="btn" disabled={busy || !valid}>
              {busy ? t('spots.publishing') : t('spots.publish')}
            </button>
          </div>
        </form>
        )}
      </main>
    </>
  )
}
