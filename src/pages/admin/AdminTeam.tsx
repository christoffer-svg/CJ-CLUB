import { FirebaseError } from 'firebase/app'
import { httpsCallable } from 'firebase/functions'
import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { PageTitle } from '../../components/admin/AdminLayout'
import Dialog from '../../components/admin/Dialog'
import { Field, Input, Select } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { invitationNotice, languageOptions, sendInvitation, useLiveCollection } from '../../lib/admin'
import { functions } from '../../lib/firebase'
import { hasRole } from '../../lib/roles'
import type { Language, UserProfile } from '../../lib/types'

const languages: [Language, string][] = [['es', 'Español'], ...languageOptions.filter(([code]) => code !== 'es')]
const createTeamMember = httpsCallable<{ name: string; email: string; language: Language }, { uid: string; addedToExisting: boolean }>(
  functions,
  'createTeamMember',
)
const removeTeamMember = httpsCallable<{ uid: string }, { removed: 'role' | 'account' }>(functions, 'removeTeamMember')

function callableMessage(err: unknown, fallback: string) {
  const msg = err instanceof FirebaseError ? err.message.replace(/\s*\[\d+\]$/, '') : ''
  return msg && !msg.startsWith('internal') ? msg : fallback
}

/** Equipo de CJ: empleados con acceso al panel de contenido (sin datos de clientes) */
export default function AdminTeam() {
  const { user } = useAuth()
  const users = useLiveCollection<UserProfile>('users')
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [language, setLanguage] = useState<Language>('es')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const admins = users.data.filter((u) => hasRole(u, 'admin')).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const editors = users.data.filter((u) => hasRole(u, 'editor')).sort((a, b) => a.name.localeCompare(b.name, 'es'))

  async function submit() {
    setError('')
    setBusy(true)
    try {
      const res = await createTeamMember({ name: name.trim(), email: email.trim(), language })
      if (res.data.addedToExisting) {
        toast(`Acceso añadido. ${email.trim()} ya tenía cuenta: entra con su contraseña de siempre y cambia a «Contenido de CJ Club».`)
      } else {
        try {
          toast(invitationNotice(email.trim(), await sendInvitation(email.trim(), language)))
        } catch {
          toast(`Acceso creado, pero no se pudo enviar el correo a ${email.trim()}. Use «Reenviar invitación».`, 'error')
        }
      }
      setOpen(false)
    } catch (err) {
      setError(callableMessage(err, 'No se pudo crear el acceso. Inténtelo de nuevo.'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(u: UserProfile & { id: string }) {
    if (!window.confirm(`¿Quitar el acceso de ${u.name}? Ya no podrá entrar en el panel de contenido.`)) return
    try {
      await removeTeamMember({ uid: u.id })
      toast(`Acceso de ${u.name} retirado.`)
    } catch (err) {
      toast(callableMessage(err, 'No se pudo quitar el acceso.'), 'error')
    }
  }

  return (
    <>
      <PageTitle eyebrow="Día a día" title="Equipo de CJ">
        <button
          className="btn a-btn"
          onClick={() => {
            setName('')
            setEmail('')
            setLanguage('es')
            setError('')
            setOpen(true)
          }}
        >
          Invitar a un empleado
        </button>
      </PageTitle>
      <p className="a-lead">
        Sus empleados entran con su correo en un panel de contenido: pueden añadir y editar lugares, colaboradores, fotos y presentaciones, eventos, descuentos,
        servicios, contactos generales y el consejo de la semana. No ven nada de los clientes (fichas, mensajes, peticiones, reformas, pagos ni Social).
      </p>

      <h2 className="a-subtitle">Empleados de contenido</h2>
      <div className="card a-list">
        {editors.map((u) => (
          <div key={u.id} className="a-row">
            <div className="a-row__body">
              <span className="card__title">{u.name}</span>
              <span className="card__text">{u.email}</span>
            </div>
            <button
              className="a-link"
              onClick={() =>
                sendInvitation(u.email, u.language)
                  .then((via) => toast(invitationNotice(u.email, via)))
                  .catch(() => toast('No se pudo enviar la invitación.', 'error'))
              }
            >
              Reenviar invitación
            </button>
            <button className="a-link a-link--danger" onClick={() => void remove(u)}>
              Quitar acceso
            </button>
          </div>
        ))}
        {!users.loading && editors.length === 0 && <p className="a-empty">Aún no ha invitado a ningún empleado.</p>}
      </div>

      <h2 className="a-subtitle">Acceso completo (administradores)</h2>
      <div className="card a-list">
        {admins.map((u) => (
          <div key={u.id} className="a-row">
            <div className="a-row__body">
              <span className="card__title">
                {u.name}
                {u.id === user?.uid ? ' (usted)' : ''}
              </span>
              <span className="card__text">{u.email}</span>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <Dialog title="Invitar a un empleado" onClose={() => setOpen(false)} busy={busy} submitLabel="Crear e invitar" onSubmit={() => void submit()}>
          <Field label="Nombre">
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Correo electrónico" hint="Recibirá un correo para elegir su contraseña (válido 24 horas).">
            <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Idioma del correo">
            <Select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
              {languages.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
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
