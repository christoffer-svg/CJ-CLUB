import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import { HeartIcon } from '../components/Icons'
import { useActivePlaces } from '../lib/data'
import type { Place } from '../lib/types'
import { useViewer } from '../lib/viewer'

type Filter = 'all' | Place['category'] | 'saved'

const filters: [Filter, string][] = [
  ['all', 'Todo'],
  ['restaurants', 'Restaurantes'],
  ['golf', 'Golf'],
  ['beaches', 'Playas'],
  ['plans', 'Planes'],
  ['saved', 'Guardados'],
]
const categoryOrder: Place['category'][] = ['restaurants', 'golf', 'beaches', 'plans']

export default function Discover() {
  // ?categoria=restaurants abre el filtro indicado (p. ej. desde "Dónde comer" en Inicio)
  const [params, setParams] = useSearchParams()
  const param = params.get('categoria') as Filter | null
  const active: Filter = filters.some(([f]) => f === param) ? param! : 'all'

  const { favorites, toggleFavorite } = useViewer()
  const places = useActivePlaces()

  const shown = places.data
    .filter((p) => (active === 'all' ? true : active === 'saved' ? favorites.includes(p.id) : p.category === active))
    .sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || a.name.localeCompare(b.name))

  return (
    <>
      <Header eyebrow="Descubrir" title="Lo que nos gusta" subtitle="Seleccionado por el equipo CJ" />
      <main className="page">
        <div className="pills" role="tablist" aria-label="Filtrar lugares">
          {filters.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={active === key}
              className={active === key ? 'pill pill--active' : 'pill'}
              onClick={() => setParams(key === 'all' ? {} : { categoria: key }, { replace: true })}
            >
              {label}
            </button>
          ))}
        </div>

        {!places.loading && active === 'saved' && shown.length === 0 && (
          <p className="empty">Aún no ha guardado nada. Toque el corazón de un sitio para tenerlo aquí.</p>
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
                    aria-label={saved ? `Quitar ${p.name} de guardados` : `Guardar ${p.name}`}
                    onClick={() => toggleFavorite(p.id)}
                  >
                    <HeartIcon filled={saved} />
                  </button>
                </div>
                {p.meta_es && <p className="card__text">{p.meta_es}</p>}
                {p.cjNote_es && (
                  <p className="place__note">
                    <span className="place__note-mark">CJ ·</span> {p.cjNote_es}
                  </p>
                )}
                {p.discountPercent ? <span className="tag">CJ Club · {p.discountPercent}% descuento</span> : null}
              </article>
            )
          })}
        </div>
      </main>
    </>
  )
}
