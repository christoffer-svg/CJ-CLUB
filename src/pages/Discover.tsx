import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import { HeartIcon } from '../components/Icons'
import { useI18n } from '../i18n'
import { useActivePlaces } from '../lib/data'
import type { Place } from '../lib/types'
import { useViewer } from '../lib/viewer'

type Filter = 'all' | Place['category'] | 'saved'

const filters: Filter[] = ['all', 'restaurants', 'golf', 'beaches', 'plans', 'saved']
const categoryOrder: Place['category'][] = ['restaurants', 'golf', 'beaches', 'plans']

export default function Discover() {
  // ?categoria=restaurants abre el filtro indicado (p. ej. desde "Dónde comer" en Inicio)
  const [params, setParams] = useSearchParams()
  const param = params.get('categoria') as Filter | null
  const active: Filter = filters.includes(param as Filter) ? param! : 'all'

  const { favorites, toggleFavorite } = useViewer()
  const { t, pick } = useI18n()
  const places = useActivePlaces()

  const shown = places.data
    .filter((p) => (active === 'all' ? true : active === 'saved' ? favorites.includes(p.id) : p.category === active))
    .sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || a.name.localeCompare(b.name))

  return (
    <>
      <Header eyebrow={t('discover.eyebrow')} title={t('discover.title')} subtitle={t('discover.subtitle')} />
      <main className="page">
        <div className="pills" role="tablist" aria-label={t('discover.filters')}>
          {filters.map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={active === key}
              className={active === key ? 'pill pill--active' : 'pill'}
              onClick={() => setParams(key === 'all' ? {} : { categoria: key }, { replace: true })}
            >
              {t(`discover.filter.${key}`)}
            </button>
          ))}
        </div>

        {!places.loading && active === 'saved' && shown.length === 0 && (
          <p className="empty">{t('discover.emptySaved')}</p>
        )}

        <div className="place-list">
          {shown.map((p) => {
            const saved = favorites.includes(p.id)
            return (
              <article key={p.id} className="card place">
                <div className="place__head">
                  <h2 className="place__name">{p.name}</h2>
                  <button
                    className={saved ? 'heart heart--on' : 'heart'}
                    aria-pressed={saved}
                    aria-label={saved ? t('discover.unsave', { name: p.name }) : t('discover.save', { name: p.name })}
                    onClick={() => toggleFavorite(p.id)}
                  >
                    <HeartIcon filled={saved} />
                  </button>
                </div>
                {pick(p, 'meta') && <p className="card__text">{pick(p, 'meta')}</p>}
                {pick(p, 'cjNote') && (
                  <p className="place__note">
                    <span className="place__note-mark">CJ ·</span> {pick(p, 'cjNote')}
                  </p>
                )}
                {p.discountPercent ? <span className="tag">{t('discover.discount', { n: p.discountPercent })}</span> : null}
              </article>
            )
          })}
        </div>
      </main>
    </>
  )
}
