import { deleteField } from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageTitle } from '../../components/admin/AdminLayout'
import SharedHousehold from '../../components/admin/SharedHousehold'
import AutoInput from '../../components/admin/AutoInput'
import Dialog from '../../components/admin/Dialog'
import LocationPicker from '../../components/admin/LocationPicker'
import { Field, FieldGroup, Input, Select } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import {
  deleteClient,
  fromDateInput,
  languageOptions,
  patchDoc,
  sendInvitation,
  toDateInput,
  useLiveCollection,
  useLiveDoc,
} from '../../lib/admin'
import { usePartnerCategories } from '../../lib/data'
import { partnerOffers } from '../../lib/services'
import type { Client, Language, Partner, UserProfile } from '../../lib/types'

export default function ClientDetail() {
  const { id = '' } = useParams()
  const toast = useToast()
  const navigate = useNavigate()
  const [removing, setRemoving] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [busy, setBusy] = useState(false)
  const [removeError, setRemoveError] = useState('')
  const client = useLiveDoc<Client>(`clients/${id}`)
  const users = useLiveCollection<UserProfile>('users')
  const partners = useLiveCollection<Partner>('partners')
  const categories = usePartnerCategories()
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

  async function remove() {
    if (!c || confirmName.trim() !== c.familyName) return
    setBusy(true)
    setRemoveError('')
    try {
      const name = c.familyName
      await deleteClient(id)
      toast(`${name} dada de baja. Sus datos se han borrado.`)
      navigate('/admin/clientes')
    } catch (err) {
      const msg = err instanceof FirebaseError ? err.message.replace(/\s*\[\d+\]$/, '') : ''
      setRemoveError(msg && !msg.startsWith('internal') ? msg : 'No se pudo dar de baja. Inténtelo de nuevo.')
      setBusy(false)
    }
  }

  if (client.loading) return null
  if (!c) return <p className="a-empty">Este cliente no existe.</p>

  return (
    <>
      <PageTitle eyebrow={`Cliente · ${c.memberNumber}`} title={c.familyName}>
        <Link to={`/admin/mensajes/${id}`} className="btn btn--ghost a-btn">
          Mensajes
        </Link>
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
              {languageOptions.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
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
        <FieldGroup label="Ubicación de la vivienda" hint="Sirve para mostrar al cliente a qué distancia está cada lugar.">
          <LocationPicker
            label={`Vivienda de ${c.familyName}`}
            value={c.location}
            onChange={(v) => saveClient({ location: v ?? deleteField() })}
          />
        </FieldGroup>
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
        <p className="card__text">
          Un colaborador con varios servicios aparece en cada uno de ellos. Puede asignarle el mismo a más de un servicio.
        </p>
        {categories.data
          .filter((cat) => cat.active || Boolean(c.contacts?.[cat.id]))
          .map((cat) => {
            const current = c.contacts?.[cat.id] ?? ''
            const options = partners.data
              .filter((p) => (partnerOffers(p, cat.id) || p.id === current) && (p.active !== false || p.id === current))
              .sort((a, b) => a.name.localeCompare(b.name, 'es'))
            return (
              <Field key={cat.id} label={cat.active ? cat.name_es : `${cat.name_es} (oculto)`}>
                <Select
                  value={current}
                  onChange={(e) => saveClient({ [`contacts.${cat.id}`]: e.target.value ? e.target.value : deleteField() })}
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

      <SharedHousehold clientId={id} />

      <section className="card a-form a-danger">
        <h2 className="a-section-title">Dar de baja</h2>
        <p className="card__text">
          Borra su acceso a la app, su ficha, sus contactos asignados, los contactos que haya guardado, las notas de su casa,
          sus favoritos y sus registros de uso de descuentos. Úselo cuando el cliente pida que se borren sus datos. No se puede
          deshacer.
        </p>
        <div className="a-actions">
          <button
            type="button"
            className="btn a-btn a-btn--danger"
            onClick={() => {
              setConfirmName('')
              setRemoveError('')
              setRemoving(true)
            }}
          >
            Dar de baja a {c.familyName}
          </button>
        </div>
      </section>

      {removing && (
        <Dialog
          title={`Dar de baja a ${c.familyName}`}
          submitLabel={busy ? 'Borrando…' : 'Borrar todos sus datos'}
          busy={busy || confirmName.trim() !== c.familyName}
          danger
          onClose={() => !busy && setRemoving(false)}
          onSubmit={remove}
        >
          <p className="card__text">
            Se borrarán para siempre la cuenta de acceso y todos los datos de {c.familyName}. Para confirmar, escriba su nombre
            exactamente: <strong>{c.familyName}</strong>
          </p>
          <Field label="Nombre de la familia">
            <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" />
          </Field>
          {removeError && <p className="a-error">{removeError}</p>}
        </Dialog>
      )}
    </>
  )
}
