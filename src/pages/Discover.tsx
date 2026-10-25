import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import { HeartIcon } from '../components/Icons'
import MapView from '../components/MapView'
import { useI18n } from '../i18n'
import { useActivePlaces, useDoc } from '../lib/data'
import { directionsUrl, distanceKm, formatKm, isGeoPoint } from '../lib/geo'
import { logReservationClick, markReservePending, reservationHref } from '../lib/reservations'
import type { Client, GeoPoint, Place } from '../lib/types'
import { useViewer } from '../lib/viewer'

type Filter = 'all' | Place['category'] | 'saved'
type PlaceItem = Place & { id: string }

const filters: Filter[] = ['all', 'restaurants', 'golf', 'beaches', 'plans', 'saved']
const categoryOrder: Place['category'][] = ['restaurants', 'golf', 'beaches', 'plans']

function PlaceCard({ p, home }: { p: PlaceItem; home: GeoPoint | null }) {
  const { favorites, toggleFavorite, clientId, preview } = useViewer()
  const { t, pick, locale } = useI18n()
  const saved = favorites.includes(p.id)
  const location = isGeoPoint(p.location) ? p.location : null
  const reserveHref = reservationHref(p, t('discover.reserveWhatsapp'))
  return (
    <article className="card place">
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
      {location && (
        <div className="place__where">
          {home && <span className="card__text">{t('discover.distance', { km: formatKm(distanceKm(home, location), locale) })}</span>}
          <a className="place__directions" href={directionsUrl(location)} target="_blank" rel="noreferrer">
            {t('discover.directions')}
          </a>
        </div>
      )}
      {reserveHref && (
        <a
          className="btn place__reserve"
          href={reserveHref}
          {...(p.reservationChannel === 'phone' ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
          onClick={() => {
            // En la vista previa se abre el enlace, pero no se cuenta el pinchazo
            if (preview || !clientId || !p.reservationChannel) return
            logReservationClick(p.id, clientId, p.reservationChannel).catch(() => {})
            markReservePending(p.id, p.name)
          }}
        >
          {t('discover.reserve')}
        </a>
      )}
    </article>
  )
}

export default function Discover() {
  // ?categoria=restaurants abre el filtro indicado (p. ej. desde "Dónde comer" en Inicio); ?vista=mapa abre el mapa
  const [params, setParams] = useSearchParams()
  const param = params.get('categoria') as Filter | null
  const active: Filter = filters.includes(param as Filter) ? param! : 'all'
  const view = params.get('vista') === 'mapa' ? 'map' : 'list'
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const { favorites, clientId } = useViewer()
  const { t } = useI18n()
  const places = useActivePlaces()
  const client = useDoc<Client>(clientId ? `clients/${clientId}` : null)
  const home = isGeoPoint(client.data?.location) ? client.data!.location! : null
  const [selected, setSelected] = useState<string | null>(null)

  const shown = places.data
    .filter((p) => (active === 'all' ? true : active === 'saved' ? favorites.includes(p.id) : p.category === active))
    .sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || a.name.localeCompare(b.name))
  const onMap = shown.filter((p) => isGeoPoint(p.location))
  const selectedPlace = onMap.find((p) => p.id === selected) ?? null

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
              onClick={() => {
                setSelected(null)
                setParam('categoria', key === 'all' ? null : key)
              }}
            >
              {t(`discover.filter.${key}`)}
            </button>
          ))}
        </div>

        <div className="view-switch" role="group" aria-label={t('discover.view')}>
          <button aria-pressed={view === 'list'} className={view === 'list' ? 'view-switch__btn view-switch__btn--on' : 'view-switch__btn'} onClick={() => setParam('vista', null)}>
            {t('discover.view.list')}
          </button>
          <button aria-pressed={view === 'map'} className={view === 'map' ? 'view-switch__btn view-switch__btn--on' : 'view-switch__btn'} onClick={() => setParam('vista', 'mapa')}>
            {t('discover.view.map')}
          </button>
        </div>

        {!places.loading && active === 'saved' && shown.length === 0 && <p className="empty">{t('discover.emptySaved')}</p>}

        {view === 'list' ? (
          <div className="place-list">
            {shown.map((p) => (
              <PlaceCard key={p.id} p={p} home={home} />
            ))}
          </div>
        ) : (
          <div className="place-map">
            <MapView
              label={t('discover.view.map')}
              points={onMap.map((p) => ({ id: p.id, label: p.name, ...p.location! }))}
              home={home}
              homeLabel={t('discover.home')}
              selected={selected}
              onSelect={setSelected}
            />
            {selectedPlace ? (
              <PlaceCard p={selectedPlace} home={home} />
            ) : (
              <p className="empty">{t('discover.mapHint')}</p>
            )}
          </div>
        )}
      </main>
    </>
  )
}
