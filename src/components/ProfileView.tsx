import { useState, type ReactNode } from 'react'
import { useI18n } from '../i18n'
import { telLink } from '../lib/format'
import { instagramUrl, websiteLabel } from '../lib/profiles'
import type { PublicProfile } from '../lib/types'

/** Fotos de la presentación: se pasan con el dedo y se amplían al tocarlas */
export function ProfileGallery({ photos, name }: { photos: PublicProfile['photos']; name: string }) {
  const { t } = useI18n()
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState<string | null>(null)
  if (!photos?.length) return null
  return (
    <div className="pf-gallery">
      <div
        className="pf-gallery__track"
        onScroll={(e) => {
          const el = e.currentTarget
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))
        }}
      >
        {photos.map((p, i) => (
          <button key={p.path} type="button" className="pf-gallery__slide" onClick={() => setOpen(p.url)} aria-label={t('profile.photo', { n: i + 1, total: photos.length })}>
            <img src={p.url} alt={i === 0 ? name : ''} loading={i === 0 ? 'eager' : 'lazy'} />
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <span className="pf-gallery__count">
          {index + 1} / {photos.length}
        </span>
      )}
      {open && (
        <div className="sheet-backdrop att-zoom" onClick={() => setOpen(null)} role="dialog" aria-modal="true">
          <img src={open} alt="" />
          <button type="button" className="btn att-zoom__close" onClick={() => setOpen(null)}>
            {t('benefits.close')}
          </button>
        </div>
      )}
    </div>
  )
}

/** Presentación, horario y contacto de un colaborador (lo que ha escrito el negocio o CJ) */
export function ProfileDetails({ profile, phone, directions, children }: { profile: PublicProfile; phone?: string; directions?: string | null; children?: ReactNode }) {
  const { t, pick } = useI18n()
  const about = pick(profile, 'about')
  const hours = pick(profile, 'hours')
  const tel = phone || profile.phone
  const mapHref = directions ?? (profile.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.address)}` : null)
  const contact = Boolean(tel || profile.email || profile.website || profile.instagram || profile.address)
  return (
    <>
      {about && (
        <section className="card pf-block">
          <span className="eyebrow">{t('profile.about')}</span>
          <p className="pf-text">{about}</p>
        </section>
      )}
      {children}
      {hours && (
        <section className="card pf-block">
          <span className="eyebrow">{t('profile.hours')}</span>
          <p className="pf-text">{hours}</p>
        </section>
      )}
      {contact && (
        <section className="card pf-block">
          <span className="eyebrow">{t('profile.contact')}</span>
          <ul className="pf-contact">
            {tel && (
              <li>
                <span className="pf-contact__label">{t('profile.phone')}</span>
                <a href={telLink(tel)}>{tel}</a>
              </li>
            )}
            {profile.email && (
              <li>
                <span className="pf-contact__label">{t('profile.email')}</span>
                <a href={`mailto:${profile.email}`}>{profile.email}</a>
              </li>
            )}
            {profile.website && (
              <li>
                <span className="pf-contact__label">{t('profile.website')}</span>
                <a href={profile.website} target="_blank" rel="noopener noreferrer">
                  {websiteLabel(profile.website)}
                </a>
              </li>
            )}
            {profile.instagram && (
              <li>
                <span className="pf-contact__label">Instagram</span>
                <a href={instagramUrl(profile.instagram)} target="_blank" rel="noopener noreferrer">
                  @{profile.instagram}
                </a>
              </li>
            )}
            {profile.address && (
              <li>
                <span className="pf-contact__label">{t('profile.address')}</span>
                <span>{profile.address}</span>
              </li>
            )}
          </ul>
          {mapHref && (
            <a className="place__directions" href={mapHref} target="_blank" rel="noreferrer">
              {t('discover.directions')}
            </a>
          )}
        </section>
      )}
    </>
  )
}
