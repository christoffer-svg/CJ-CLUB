import { Link, useParams } from 'react-router-dom'
import Header from '../components/Header'
import { HeartIcon } from '../components/Icons'
import { ProfileDetails, ProfileGallery } from '../components/ProfileView'
import ReserveButton from '../components/ReserveButton'
import { useI18n } from '../i18n'
import { useActiveDeals, useDoc } from '../lib/data'
import { directionsUrl, distanceKm, formatKm, isGeoPoint } from '../lib/geo'
import { profileOf } from '../lib/profiles'
import type { Client, Place } from '../lib/types'
import { useViewer } from '../lib/viewer'

/** Ficha de un lugar de Descubrir: fotos, presentación del negocio, nota de CJ, ventajas y contacto */
export default function PlaceDetail() {
  const { placeId = '' } = useParams()
  const { base, favorites, toggleFavorite, clientId } = useViewer()
  const { t, pick, locale } = useI18n()
  const place = useDoc<Place>(`places/${placeId}`)
  const client = useDoc<Client>(clientId ? `clients/${clientId}` : null)
  const deals = useActiveDeals()
  const p = place.data && place.data.active !== false ? place.data : null
  const saved = favorites.includes(placeId)
  const location = p && isGeoPoint(p.location) ? p.location : null
  const home = isGeoPoint(client.data?.location) ? client.data!.location! : null
  const myDeals = deals.data.filter((d) => d.placeId === placeId)

  return (
    <>
      <Header back={`${base}/descubrir`} eyebrow={p ? t(`discover.filter.${p.category}`) : t('discover.eyebrow')} title={p?.name ?? (place.loading ? '' : t('profile.notFound'))} subtitle={p ? pick(p, 'meta') : undefined} />
      <main className="page">
        {p && (
          <>
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
            {location && home && <p className="card__text pf-distance">{t('discover.distance', { km: formatKm(distanceKm(home, location), locale) })}</p>}
          </>
        )}
      </main>
    </>
  )
}
