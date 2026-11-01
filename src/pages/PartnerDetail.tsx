import { useParams } from 'react-router-dom'
import Header from '../components/Header'
import { ProfileDetails, ProfileGallery } from '../components/ProfileView'
import { useI18n } from '../i18n'
import { useAssignedPartners, useDoc, usePartnerCategories } from '../lib/data'
import { telLink } from '../lib/format'
import { profileOf } from '../lib/profiles'
import { clientServiceLabel, partnerServiceIds, sortServiceIds } from '../lib/services'
import type { Client } from '../lib/types'
import { useViewer } from '../lib/viewer'

/** Ficha de un colaborador de servicios asignado al cliente (abogado, gestoría, piscina…) */
export default function PartnerDetail() {
  const { partnerId = '' } = useParams()
  const { base, clientId } = useViewer()
  const { t, pick, lang } = useI18n()
  const client = useDoc<Client>(clientId ? `clients/${clientId}` : null)
  const partners = useAssignedPartners(client.data)
  const categories = usePartnerCategories()
  const p = partners.data.find((x) => x.id === partnerId) ?? null
  const ids = p ? sortServiceIds(partnerServiceIds(p).length ? partnerServiceIds(p) : p.types, categories.data) : []

  return (
    <>
      <Header
        back={`${base}/guia`}
        eyebrow={ids.map((id) => clientServiceLabel(id, lang, categories.data)).join(' · ') || t('guide.eyebrow')}
        title={p?.name ?? (partners.loading ? '' : t('profile.notFound'))}
        subtitle={p ? pick(p, 'description') : undefined}
      />
      <main className="page">
        {p && (
          <>
            {p.logo && (
              <div className="pf-logo">
                <img className="brand-logo brand-logo--lg" src={p.logo.url} alt={p.name} />
              </div>
            )}
            <ProfileGallery photos={p.photos} name={p.name} />
            {p.phone && (
              <div className="pf-actions">
                <a className="btn" href={telLink(p.phone)}>
                  {t('guide.call')}
                </a>
              </div>
            )}
            <ProfileDetails profile={profileOf(p)} phone={p.phone} />
          </>
        )}
      </main>
    </>
  )
}
