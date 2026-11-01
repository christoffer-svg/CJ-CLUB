import { Link, useParams } from 'react-router-dom'
import Header from '../components/Header'
import { HeartIcon } from '../components/Icons'
import { ProfileDetails, ProfileGallery } from '../components/ProfileView'
import ReserveButton from '../components/ReserveButton'
import EventCard from '../components/EventCard'
import { AttachmentList } from '../components/Attachments'
import { telLink } from '../lib/format'
import { isOrderOpen, useOrders } from '../lib/orders'
import { useBookings, useUpcomingEvents } from '../lib/events'
import { useI18n } from '../i18n'
import { useActiveDeals, useDoc } from '../lib/data'
import { directionsUrl, distanceKm, formatKm, isGeoPoint } from '../lib/geo'
import { profileOf } from '../lib/profiles'
import { categoryLabel, usePlaceCategories } from '../lib/placeCategories'
import type { Client, Place } from '../lib/types'
import { useViewer } from '../lib/viewer'

/** Ficha de un lugar de Descubrir: fotos, presentación del negocio, nota de CJ, ventajas y contacto */
export default function PlaceDetail() {
  const { placeId = '' } = useParams()
  const { base, favorites, toggleFavorite, clientId } = useViewer()
  const { t, pick, locale } = useI18n()
  const place = useDoc<Place>(`places/${placeId}`)
  const cats = usePlaceCategories(true)
  const client = useDoc<Client>(clientId ? `clients/${clientId}` : null)
  const deals = useActiveDeals()
  const p = place.data && place.data.active !== false ? place.data : null
  const saved = favorites.includes(placeId)
  const location = p && isGeoPoint(p.location) ? p.location : null
  const home = isGeoPoint(client.data?.location) ? client.data!.location! : null
  const myDeals = deals.data.filter((d) => d.placeId === placeId)
  const events = useUpcomingEvents(placeId)
  const bookings = useBookings({ clientId })
  const myOrders = useOrders({ clientId }).data.filter((o) => o.placeId === placeId && isOrderOpen(o)).length

  return (
    <>
      <Header back={`${base}/descubrir`} eyebrow={p ? categoryLabel(p.category, cats, t, pick) || t('discover.eyebrow') : t('discover.eyebrow')} title={p?.name ?? (place.loading ? '' : t('profile.notFound'))} subtitle={p ? pick(p, 'meta') : undefined} />
      <main className="page">
        {p && (
          <>
            {p.logo && (
              <div className="pf-logo">
                <img className="brand-logo brand-logo--lg" src={p.logo.url} alt={p.name} />
              </div>
            )}
            <ProfileGallery photos={p.photos} name={p.name} />
            <div className="pf-actions">
              <ReserveButton place={p} id={placeId} />
              <button
                className={saved ? 'heart heart--on' : 'heart'}
                aria-pressed={saved}
                aria-label={saved ? t('discover.unsave', { name: p.name }) : t('discover.save', { name: p.name })}
                onClick={() => toggleFavorite(placeId)}
              >
                <HeartIcon filled={saved} />
              </button>
            </div>
            {pick(p, 'cjNote') && (
              <p className="place__note">
                <span className="place__note-mark">CJ ·</span> {pick(p, 'cjNote')}
              </p>
            )}
            <ProfileDetails profile={profileOf(p)} directions={location ? directionsUrl(location) : null}>
              {p.menu && p.menu.length > 0 && (
                <section className="card pf-block">
                  <span className="eyebrow">{t('profile.menu')}</span>
                  <AttachmentList items={p.menu} />
                </section>
              )}
              {(p.takeaway || p.delivery) && (
                <section className="card pf-block">
                  <span className="eyebrow">{t('profile.ordering')}</span>
                  <div className="pf-tags">
                    {p.takeaway && <span className="tag">{t('profile.takeaway')}</span>}
                    {p.delivery && <span className="tag">{t('profile.delivery')}</span>}
                  </div>
                  {pick(p, 'orderInfo') && <p className="pf-text">{pick(p, 'orderInfo')}</p>}
                  {p.ordersOpen && (
                    <Link className="btn pf-order" to={`${base}/descubrir/${placeId}/pedido`}>
                      {t('orders.open')}
                    </Link>
                  )}
                  {myOrders > 0 && (
                    <Link className="place__more" to={`${base}/descubrir/${placeId}/pedido`}>
                      {t('orders.seeYours', { n: myOrders })}
                    </Link>
                  )}
                  {p.phone && (
                    <a className="btn btn--ghost pf-order" href={telLink(p.phone)}>
                      {t('profile.orderCall')}
                    </a>
                  )}
                </section>
              )}
              {(p.discountPercent || myDeals.length > 0) && (
                <section className="card pf-block">
                  <span className="eyebrow">{t('profile.deals')}</span>
                  {p.discountPercent ? <span className="tag">{t('discover.discount', { n: p.discountPercent })}</span> : null}
                  {myDeals.map((d) => (
                    <Link key={d.id} to={`${base}/ventajas`} className="pf-deal">
                      <span className="card__title">{d.title}</span>
                      <span className="pf-deal__label">{d.discountLabel}</span>
                    </Link>
                  ))}
                </section>
              )}
            </ProfileDetails>
            {events.data.length > 0 && (
              <section className="pf-events">
                <span className="eyebrow">{t('events.upcoming')}</span>
                {events.data.map((e) => (
                  <EventCard key={e.id} e={e} bookings={bookings.data} />
                ))}
              </section>
            )}
            {location && home && <p className="card__text pf-distance">{t('discover.distance', { km: formatKm(distanceKm(home, location), locale) })}</p>}
          </>
        )}
      </main>
    </>
  )
}
