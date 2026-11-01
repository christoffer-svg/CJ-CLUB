import { FirebaseError } from 'firebase/app'
import { useState } from 'react'
import { PageTitle } from '../../components/admin/AdminLayout'
import Dialog from '../../components/admin/Dialog'
import { Field, Input, Select } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { createBuilderAccount, invitationNotice, languageOptions, sendInvitation, useLiveCollection, type NewBuilder } from '../../lib/admin'
import type { Project, UserProfile } from '../../lib/types'
import { hasRole } from '../../lib/roles'

const empty: NewBuilder = { name: '', companyName: '', email: '', language: 'es' }

/** Constructores con acceso a "Mi reforma": solo ven las obras que CJ les asigna */
export default function Builders() {
  const users = useLiveCollection<UserProfile>('users')
  const projects = useLiveCollection<Project>('projects')
  const toast = useToast()
  const [form, setForm] = useState<NewBuilder | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const builders = users.data.filter((u) => hasRole(u, 'builder')).sort((a, b) => (a.companyName ?? '').localeCompare(b.companyName ?? ''))
  const count = (uid: string) => projects.data.filter((p) => p.builderUid === uid).length

  async function create() {
    if (!form) return
    setBusy(true)
    setError('')
    try {
      const res = await createBuilderAccount({ ...form, name: form.name.trim(), companyName: form.companyName.trim(), email: form.email.trim() })
      toast(
        res.via
          ? `${form.companyName} creado. ${invitationNotice(form.email.trim(), res.via)}`
          : `${form.companyName} creado. ${form.email.trim()} ya tenía cuenta: entra con su contraseña de siempre y cambia a «Panel del constructor» desde la app.`,
      )
      setForm(null)
    } catch (err) {
      const msg = err instanceof FirebaseError ? err.message.replace(/\s*\[\d+\]$/, '') : ''
      setError(msg && !msg.startsWith('internal') ? msg : 'No se pudo crear el constructor. Inténtelo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageTitle eyebrow="Mi reforma" title="Constructores">
        <button className="btn a-btn" onClick={() => setForm({ ...empty })}>
          Añadir constructor
        </button>
      </PageTitle>
      <p className="card__text">Cada constructor entra con su propio correo y solo ve las obras en las que lo asigne en «Reformas».</p>
      <div className="card a-list">
        {builders.map((b) => (
          <div key={b.id} className="a-row">
            <div className="a-row__body">
              <span className="card__title">{b.companyName || b.name}</span>
              <span className="card__text">
                {b.name} · {b.email} · {count(b.id)} {count(b.id) === 1 ? 'obra' : 'obras'}
              </span>
            </div>
            <button
              className="a-link"
              onClick={() =>
                sendInvitation(b.email, b.language)
                  .then((via) => toast(invitationNotice(b.email, via)))
                  .catch(() => toast('No se pudo enviar la invitación.', 'error'))
              }
            >
              Reenviar invitación
            </button>
          </div>
        ))}
        {!users.loading && builders.length === 0 && <p className="a-empty">Aún no hay constructores.</p>}
      </div>

      {form && (
        <Dialog title="Nuevo constructor" submitLabel={busy ? 'Creando…' : 'Crear e invitar'} busy={busy} onClose={() => setForm(null)} onSubmit={create}>
          <Field label="Empresa">
            <Input required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </Field>
          <div className="a-grid-2">
            <Field label="Persona de contacto">
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Idioma">
              <Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as NewBuilder['language'] })}>
                {[['es', 'Español'] as const, ...languageOptions.filter(([c]) => c !== 'es')].map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Correo electrónico" hint="Si el correo ya tiene cuenta (por ejemplo, de cliente), se le añade este acceso y entra con su contraseña de siempre. Si no, recibirá un correo para elegir su contraseña.">
            <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          {error && <p className="a-error">{error}</p>}
        </Dialog>
      )}
    </>
  )
}
