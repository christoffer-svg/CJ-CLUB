import Header from '../components/Header'
import { useI18n } from '../i18n'
import { useAssignedPartners, useDoc, useGeneralContacts } from '../lib/data'
import { telLink } from '../lib/format'
import type { Client, ContactType, GeneralContact } from '../lib/types'
import { useViewer } from '../lib/viewer'

const contactTypes: ContactType[] = ['lawyer', 'gestoria', 'pool', 'maintenance', 'garden', 'communityAdmin']
const groups: GeneralContact['group'][] = ['urgencias', 'salud', 'transporte']

type RowProps = {
  label?: string
  name: string
  description: string
  phone: string
  emergency?: boolean
}

function ContactRow({ label, name, description, phone, emergency }: RowProps) {
  const { t } = useI18n()
  return (
    <div className="contact">
      <div className="contact__body">
        {label && <span className="eyebrow">{label}</span>}
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
  const { t, pick } = useI18n()
  const client = useDoc<Client>(clientId ? `clients/${clientId}` : null)
  const partners = useAssignedPartners(client.data, contactTypes)
  const general = useGeneralContacts()

  return (
    <>
      <Header eyebrow={t('guide.eyebrow')} title={t('guide.title')} subtitle={t('guide.subtitle')} />
      <main className="page">
        {partners.data.length > 0 && (
          <section className="personal">
            <span className="eyebrow personal__title">{t('guide.personal')}</span>
            {partners.data.map((p) => (
              <ContactRow
                key={p.type}
                label={t(`guide.type.${p.type}`)}
                name={p.name}
                description={pick(p, 'description')}
                phone={p.phone}
              />
            ))}
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
