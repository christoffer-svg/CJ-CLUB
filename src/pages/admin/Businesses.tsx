import { FirebaseError } from 'firebase/app'
import { useState } from 'react'
import { PageTitle } from '../../components/admin/AdminLayout'
import Dialog from '../../components/admin/Dialog'
import { Field, Input, Select } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { createBusinessAccount, languageOptions, sendInvitation, useLiveCollection } from '../../lib/admin'
import type { Language, Place, UserProfile } from '../../lib/types'

const languages: [Language, string][] = [['es', 'Español'], ...languageOptions.filter(([code]) => code !== 'es')]

function callableMessage(err: unknown, fallback: string) {
  const msg = err instanceof FirebaseError ? err.message.replace(/\s*\[\d+\]$/, '') : ''
  return msg && !msg.startsWith('internal') ? msg : fallback
}

export default function Businesses() {
  const places = useLiveCollection<Place>('places')
  const users = useLiveCollection<UserProfile>('users')
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [placeId, setPlaceId] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [language, setLanguage] = useState<Language>('es')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const placeName = Object.fromEntries(places.data.map((p) => [p.id, p.name]))
  const accounts = users.data
    .filter((u) => u.role === 'business')
    .sort((a, b) => (placeName[a.placeId ?? ''] ?? '').localeCompare(placeName[b.placeId ?? ''] ?? '', 'es') || a.email.localeCompare(b.email))
  const sortedPlaces = [...places.data].sort((a, b) => a.name.localeCompare(b.name, 'es'))

  function start() {
    setPlaceId(sortedPlaces[0]?.id ?? '')
    setContactName('')
    setEmail('')
    setLanguage('es')
    setError('')
    setOpen(true)
  }

  async function submit() {
    setError('')
    setBusy(true)
    try {
      await createBusinessAccount({ placeId, contactName: contactName.trim(), email: email.trim(), language })
      try {
        await sendInvitation(email.trim(), language)
        toast(`Invitación enviada a ${email.trim()}`)
      } catch {
        toast(`Cuenta creada, pero no se pudo enviar el correo a ${email.trim()}. Use «Reenviar invitación».`, 'error')
      }
      setOpen(false)
    } catch (err) {
      setError(callableMessage(err, 'No se pudo crear la cuenta. Inténtelo de nuevo.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageTitle eyebrow="Panel" title="Negocios">
        <button className="btn a-btn" onClick={start} disabled={sortedPlaces.length === 0}>
          Invitar a un negocio
        </button>
      </PageTitle>
      <p className="a-lead">
        Cada negocio entra con su correo y publica sus propios descuentos. Usted no redacta las ofertas: así las condiciones las
        fija el negocio. Primero tiene que existir el lugar en Lugares. Puede invitar a más de una persona del mismo negocio;
        todas verán las mismas ofertas.
      </p>

      <div className="card a-list">
        {accounts.map((u) => (
          <div key={u.id} className="a-row">
            <div className="a-row__body">
              <span className="card__title">{placeName[u.placeId ?? ''] || 'Lugar no encontrado'}</span>
              <span className="card__text">
                {u.name} · {u.email}
              </span>
            </div>
            <button
              className="a-link"
              onClick={() =>
                sendInvitation(u.email, u.language)
                  .then(() => toast(`Invitación enviada a ${u.email}`))
                  .catch(() => toast('No se pudo enviar la invitación.', 'error'))
              }
            >
              Reenviar invitación
            </button>
          </div>
        ))}
        {!users.loading && accounts.length === 0 && <p className="a-empty">Aún no hay cuentas de negocio.</p>}
      </div>

      {open && (
        <Dialog title="Invitar a un negocio" onClose={() => setOpen(false)} busy={busy} submitLabel="Crear e invitar" onSubmit={() => void submit()}>
          <Field label="Lugar">
            <Select required value={placeId} onChange={(e) => setPlaceId(e.target.value)}>
              {sortedPlaces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nombre de la persona">
            <Input required value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </Field>
          <Field label="Correo electrónico" hint="Recibirá un correo para elegir su contraseña.">
            <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Idioma del correo">
            <Select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
              {languages.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
          {error && <p className="a-error">{error}</p>}
        </Dialog>
      )}
    </>
  )
}
