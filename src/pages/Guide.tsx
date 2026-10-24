import Header from '../components/Header'
import { useAssignedPartners, useDoc, useGeneralContacts } from '../lib/data'
import { telLink } from '../lib/format'
import type { Client, ContactType, GeneralContact } from '../lib/types'
import { useViewer } from '../lib/viewer'

const contactLabels: [ContactType, string][] = [
  ['lawyer', 'Su abogado'],
  ['gestoria', 'Su gestoría'],
  ['pool', 'Su piscina'],
  ['maintenance', 'Su mantenimiento'],
  ['garden', 'Su jardinero'],
  ['communityAdmin', 'Su administrador de fincas'],
]
const contactTypes = contactLabels.map(([t]) => t)
const labelFor = Object.fromEntries(contactLabels) as Record<ContactType, string>

const groups: [GeneralContact['group'], string][] = [
  ['urgencias', 'Urgencias'],
  ['salud', 'Salud'],
  ['transporte', 'Transporte'],
]

type RowProps = {
  label?: string
  name: string
  description: string
  phone: string
  emergency?: boolean
}

function ContactRow({ label, name, description, phone, emergency }: RowProps) {
  return (
    <div className="contact">
      <div className="contact__body">
        {label && <span className="eyebrow">{label}</span>}
        <span className="card__title">{name}</span>
        {description && <span className="card__text">{description}</span>}
      </div>
      <a className={emergency ? 'call-btn call-btn--emergency' : 'call-btn'} href={telLink(phone)}>
        {emergency ? `Llamar ${phone}` : 'Llamar'}
      </a>
    </div>
  )
}

export default function Guide() {
  const { clientId } = useViewer()
  const client = useDoc<Client>(clientId ? `clients/${clientId}` : null)
  const partners = useAssignedPartners(client.data, contactTypes)
  const general = useGeneralContacts()

  return (
    <>
      <Header eyebrow="Guía" title="Contactos de confianza" subtitle="Profesionales que conocemos y recomendamos." />
      <main className="page">
        {partners.data.length > 0 && (
          <section className="personal">
            <span className="eyebrow personal__title">Sus contactos personales</span>
            {partners.data.map((p) => (
              <ContactRow key={p.type} label={labelFor[p.type]} name={p.name} description={p.description_es} phone={p.phone} />
            ))}
          </section>
        )}

        {general.data.length > 0 && (
          <section className="section">
            <span className="eyebrow">Contactos generales</span>
            {groups.map(([key, title]) => {
              const items = general.data.filter((g) => g.group === key)
              if (items.length === 0) return null
              return (
                <div key={key} className="contact-group">
                  <h2 className="section__title">{title}</h2>
                  <div className="card contact-list">
                    {items.map((g) => (
                      <ContactRow
                        key={g.id}
                        name={g.name_es}
                        description={g.description_es}
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
