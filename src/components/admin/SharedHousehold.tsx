import SecretValue from '../SecretValue'
import { useHouseNotes, useOwnContacts } from '../../lib/household'
import { usePartnerCategories } from '../../lib/data'
import { houseSections, type HouseSection, type OwnContact } from '../../lib/types'

const sectionLabel: Record<HouseSection, string> = {
  wifi: 'Wifi',
  alarm: 'Alarma',
  meters: 'Contadores',
  keys: 'Llaves',
  rubbish: 'Basura',
  other: 'Otros',
}

/** Lo que el cliente ha marcado como compartido. Lo privado no se pide: las reglas lo niegan. */
export default function SharedHousehold({ clientId }: { clientId: string }) {
  const categories = usePartnerCategories()
  const contacts = useOwnContacts(clientId, true)

  function serviceLabel(item: OwnContact) {
    if (item.service === 'other') return item.serviceOther.trim() || 'Otro'
    return categories.data.find((c) => c.id === item.service)?.name_es || item.service
  }
  const notes = useHouseNotes(clientId, true)
  const loading = contacts.loading || notes.loading
  const empty = !loading && contacts.data.length === 0 && notes.data.length === 0

  return (
    <section className="card a-form">
      <h2 className="a-section-title">Compartido por el cliente</h2>
      <p className="card__text">
        Contactos y notas de la casa que esta familia ha elegido mostrar al equipo de CJ. El resto es privado y no se puede
        ver desde aquí, ni siquiera en «Ver como cliente».
      </p>
      {loading && <p className="card__text">Cargando…</p>}
      {empty && <p className="a-empty">No ha compartido ningún contacto ni ninguna nota.</p>}

      {contacts.data.length > 0 && (
        <div className="shared-block">
          <h3 className="eyebrow">Contactos</h3>
          {contacts.data
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, 'es'))
            .map((item) => (
              <article key={item.id} className="shared-item">
                <span className="card__title">{item.name}</span>
                <span className="card__text">{serviceLabel(item)}</span>
                {item.phone && <span className="card__text">{item.phone}</span>}
                {item.email && <span className="card__text">{item.email}</span>}
                {item.notes && <p className="house-note__body">{item.notes}</p>}
              </article>
            ))}
        </div>
      )}

      {notes.data.length > 0 && (
        <div className="shared-block">
          <h3 className="eyebrow">Notas de la casa</h3>
          {houseSections.map((section) => {
            const items = notes.data.filter((n) => n.section === section).sort((a, b) => a.title.localeCompare(b.title, 'es'))
            if (items.length === 0) return null
            return (
              <div key={section} className="shared-group">
                <span className="card__text">{sectionLabel[section]}</span>
                {items.map((item) => (
                  <article key={item.id} className="shared-item">
                    <span className="card__title">{item.title}</span>
                    {item.body && <p className="house-note__body">{item.body}</p>}
                    {item.secret && (
                      <SecretValue value={item.secret} show="Mostrar" hide="Ocultar" copy="Copiar" copied="Copiado" />
                    )}
                  </article>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
