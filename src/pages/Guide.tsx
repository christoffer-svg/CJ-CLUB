import Header from '../components/Header'
import { useI18n } from '../i18n'
import { useAssignedPartners, useDoc, useGeneralContacts, usePartnerCategories } from '../lib/data'
import { telLink } from '../lib/format'
import { clientServiceLabel, partnerServiceIds, sortServiceIds } from '../lib/services'
import type { Client, GeneralContact } from '../lib/types'
import { useViewer } from '../lib/viewer'

const groups: GeneralContact['group'][] = ['urgencias', 'salud', 'transporte']

type RowProps = {
  labels?: { id: string; text: string }[]
  name: string
  description: string
  phone: string
  emergency?: boolean
}

function ContactRow({ labels, name, description, phone, emergency }: RowProps) {
  const { t } = useI18n()
  return (
    <div className="contact">
      <div className="contact__body">
        {labels && labels.length > 0 && (
          <span className={labels.length > 1 ? 'contact__services contact__services--many' : 'contact__services'}>
            {labels.map((label) => (
              <span className="eyebrow" key={label.id}>
                {label.text}
              </span>
            ))}
          </span>
        )}
        <span className="card__title">{name}</span>
        {description && <span className="card__text">{description}</span>}
      </div>
      <a className={emergency ? 'call-btn call-btn--emergency' : 'call-btn'} href={telLink(phone)}>
        {emergency ? t('guide.callNumber', { phone }) : t('guide.call')}
      </a>
    </div>
  )
}

export default function Guide() {
  const { clientId } = useViewer()
  const { t, pick, lang } = useI18n()
  const client = useDoc<Client>(clientId ? `clients/${clientId}` : null)
  const partners = useAssignedPartners(client.data)
  const categories = usePartnerCategories()
  const general = useGeneralContacts()
  const order = categories.data.map((cat) => cat.id)
  const rank = (types: string[]) => {
    const ranks = types.map((type) => {
      const index = order.indexOf(type)
      return index === -1 ? order.length + 1 : index
    })
    return ranks.length ? Math.min(...ranks) : order.length + 1
  }
  const personal = [...partners.data].sort((a, b) => rank(a.types) - rank(b.types) || a.name.localeCompare(b.name, 'es'))

  return (
    <>
      <Header eyebrow={t('guide.eyebrow')} title={t('guide.title')} subtitle={t('guide.subtitle')} />
      <main className="page">
        {personal.length > 0 && (
          <section className="personal">
            <span className="eyebrow personal__title">{t('guide.personal')}</span>
            {personal.map((p) => {
              const ids = sortServiceIds(partnerServiceIds(p).length ? partnerServiceIds(p) : p.types, categories.data)
              return (
                <ContactRow
                  key={p.id}
                  labels={ids.map((id) => ({ id, text: clientServiceLabel(id, lang, categories.data) }))}
                  name={p.name}
                  description={pick(p, 'description')}
                  phone={p.phone}
                />
              )
            })}
          </section>
        )}

        {general.data.length > 0 && (
          <section className="section">
            <span className="eyebrow">{t('guide.general')}</span>
            {groups.map((key) => {
              const items = general.data.filter((g) => g.group === key)
              if (items.length === 0) return null
              return (
                <div key={key} className="contact-group">
                  <h2 className="section__title">{t(`guide.group.${key}`)}</h2>
                  <div className="card contact-list">
                    {items.map((g) => (
                      <ContactRow
                        key={g.id}
                        name={pick(g, 'name')}
                        description={pick(g, 'description')}
                        phone={g.phone}
                        emergency={g.isEmergency}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </section>
        )}
      </main>
    </>
  )
}
