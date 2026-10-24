import { deleteField } from 'firebase/firestore'
import { Link, useParams } from 'react-router-dom'
import { PageTitle } from '../../components/admin/AdminLayout'
import AutoInput from '../../components/admin/AutoInput'
import { Field, Input, Select } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import {
  contactTypeLabels,
  fromDateInput,
  patchDoc,
  sendInvitation,
  toDateInput,
  useLiveCollection,
  useLiveDoc,
} from '../../lib/admin'
import type { Client, ContactType, Language, Partner, UserProfile } from '../../lib/types'

export default function ClientDetail() {
  const { id = '' } = useParams()
  const toast = useToast()
  const client = useLiveDoc<Client>(`clients/${id}`)
  const users = useLiveCollection<UserProfile>('users')
  const partners = useLiveCollection<Partner>('partners')
  const c = client.data
  const user = users.data.find((u) => u.clientId === id)

  async function save(path: string, data: Record<string, unknown>, name = c?.familyName) {
    try {
      await patchDoc(path, data)
      toast(`Guardado para ${name}`)
    } catch {
      toast('No se pudo guardar. Inténtelo de nuevo.', 'error')
    }
  }
  const saveClient = (data: Record<string, unknown>) => save(`clients/${id}`, data, (data.familyName as string) || c?.familyName)

  if (client.loading) return null
  if (!c) return <p className="a-empty">Este cliente no existe.</p>

  return (
    <>
      <PageTitle eyebrow={`Cliente · ${c.memberNumber}`} title={c.familyName}>
        <Link to={`/admin/clientes/${id}/vista`} className="btn btn--ghost a-btn">
          Ver como cliente
        </Link>
      </PageTitle>

      <section className="card a-form">
        <h2 className="a-section-title">Datos</h2>
        <Field label="Nombre de la familia">
          <AutoInput value={c.familyName} onCommit={(v) => v && saveClient({ familyName: v })} />
        </Field>
        <Field label="Propiedad">
          <AutoInput value={c.property} onCommit={(v) => saveClient({ property: v })} />
        </Field>
        <div className="a-grid-2">
          <Field label="Fecha de alta">
            <Input
              type="date"
              value={toDateInput(c.clientSince)}
              onChange={(e) => e.target.value && saveClient({ clientSince: fromDateInput(e.target.value) })}
            />
          </Field>
          <Field label="Idioma preferido">
            <Select
              value={user?.language ?? 'en'}
              disabled={!user}
              onChange={(e) => user && save(`users/${user.id}`, { language: e.target.value as Language })}
            >
              <option value="en">Inglés</option>
              <option value="es">Español</option>
            </Select>
          </Field>
        </div>
        <Field label="Agente">
          <AutoInput value={c.agentName} onCommit={(v) => saveClient({ agentName: v })} />
        </Field>
        <div className="a-grid-2">
          <Field label="Teléfono del agente">
            <AutoInput type="tel" value={c.agentPhone} onCommit={(v) => saveClient({ agentPhone: v })} />
          </Field>
          <Field label="WhatsApp del agente">
            <AutoInput type="tel" value={c.agentWhatsapp} onCommit={(v) => saveClient({ agentWhatsapp: v })} />
          </Field>
        </div>
        <Field label="Correo de acceso" hint="El correo de acceso no se puede cambiar desde aquí.">
          <div className="a-inline">
            <Input value={user?.email ?? ''} readOnly />
            {user && (
              <button
                type="button"
                className="btn btn--ghost a-btn"
                onClick={() =>
                  sendInvitation(user.email, user.language)
                    .then(() => toast(`Invitación enviada a ${user.email}`))
                    .catch(() => toast('No se pudo enviar la invitación.', 'error'))
                }
              >
                Reenviar invitación
              </button>
            )}
          </div>
        </Field>
      </section>

      <section className="card a-form">
        <h2 className="a-section-title">Contactos personales</h2>
        {contactTypeLabels.map(([type, label]) => {
          const current = c.contacts?.[type] ?? ''
          const options = partners.data
            .filter((p) => p.category === type && (p.active !== false || p.id === current))
            .sort((a, b) => a.name.localeCompare(b.name))
          return (
            <Field key={type} label={label}>
              <Select
                value={current}
                onChange={(e) =>
                  saveClient({ [`contacts.${type}`]: e.target.value ? e.target.value : deleteField() } as Record<
                    `contacts.${ContactType}`,
                    unknown
                  >)
                }
              >
                <option value="">Sin asignar</option>
                {options.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.active === false ? ' (desactivado)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
          )
        })}
      </section>
    </>
  )
}
