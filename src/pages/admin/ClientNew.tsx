import { FirebaseError } from 'firebase/app'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageTitle } from '../../components/admin/AdminLayout'
import { Field, Input, Select } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { createClient, invitationNotice, languageOptions, type NewClient } from '../../lib/admin'

const today = () => new Date().toISOString().slice(0, 10)

export default function ClientNew() {
  const navigate = useNavigate()
  const toast = useToast()
  // "Añadir otra casa" desde una ficha: llega con el correo, la familia y el idioma rellenos
  const [params] = useSearchParams()
  const otherHouse = Boolean(params.get('email')) && params.get('origen') !== 'solicitud'
  const [form, setForm] = useState<NewClient>({
    familyName: params.get('familia') || 'Familia ',
    email: params.get('email') || '',
    property: '',
    clientSince: today(),
    agentName: '',
    agentPhone: '',
    agentWhatsapp: '',
    language: (params.get('idioma') as NewClient['language']) || 'en',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof NewClient) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await createClient(form)
      toast(
        res.via
          ? `${form.familyName} creada. ${invitationNotice(form.email, res.via)}`
          : `Casa añadida a la cuenta de ${form.email}. Ya puede verla en la app (en «Mi CJ Club»), sin nueva invitación.`,
      )
      navigate(`/admin/clientes/${res.clientId}`, { replace: true })
    } catch (err) {
      // Los mensajes de la función de servidor ya vienen en español
      const msg = err instanceof FirebaseError ? err.message.replace(/\s*\[\d+\]$/, '') : ''
      setError(msg && !msg.startsWith('internal') ? msg : 'No se pudo crear el cliente. Inténtelo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageTitle eyebrow="Clientes" title={otherHouse ? 'Otra casa para este cliente' : 'Nuevo cliente'} />
      <form className="card a-form" onSubmit={submit}>
        <Field label="Nombre de la familia">
          <Input required value={form.familyName} onChange={set('familyName')} />
        </Field>
        <Field
          label="Correo electrónico"
          hint="Si el correo ya tiene cuenta (de cliente, negocio, constructor o del equipo), esta casa se añade a esa cuenta y no se envía otra invitación. Si no, recibirá un correo para elegir su contraseña."
        >
          <Input required type="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Propiedad">
          <Input placeholder="Villa en Jávea" value={form.property} onChange={set('property')} />
        </Field>
        <div className="a-grid-2">
          <Field label="Fecha de alta">
            <Input required type="date" value={form.clientSince} onChange={set('clientSince')} />
          </Field>
          <Field label="Idioma preferido">
            <Select value={form.language} onChange={set('language')}>
              {languageOptions.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Agente">
          <Input value={form.agentName} onChange={set('agentName')} />
        </Field>
        <div className="a-grid-2">
          <Field label="Teléfono del agente">
            <Input type="tel" value={form.agentPhone} onChange={set('agentPhone')} />
          </Field>
          <Field label="WhatsApp del agente">
            <Input type="tel" value={form.agentWhatsapp} onChange={set('agentWhatsapp')} />
          </Field>
        </div>
        {error && <p className="a-error">{error}</p>}
        <div className="a-actions">
          <Link to="/admin/clientes" className="btn btn--ghost a-btn">
            Cancelar
          </Link>
          <button className="btn a-btn" type="submit" disabled={busy}>
            {busy ? 'Creando…' : 'Crear e invitar'}
          </button>
        </div>
      </form>
    </>
  )
}
