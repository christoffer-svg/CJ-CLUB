import { FirebaseError } from 'firebase/app'
import { useState } from 'react'
import { PageTitle } from '../../components/admin/AdminLayout'
import Dialog from '../../components/admin/Dialog'
import { Field, Input, Select } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { createBuilderAccount, createDesignerAccount, invitationNotice, languageOptions, sendInvitation, useLiveCollection, type NewBuilder } from '../../lib/admin'
import { professionLabel, tradeLabel } from '../../lib/trades'
import { WORK_TRADES, type Project, type Trade, type UserProfile } from '../../lib/types'
import { hasRole } from '../../lib/roles'

type Kind = Trade | 'architect' | 'designer'
type Form = Omit<NewBuilder, 'trade'> & { trade: Kind }
const empty: Form = { name: '', companyName: '', trade: 'construction', email: '', language: 'es' }
const isDesign = (k: Kind): k is 'architect' | 'designer' => k === 'architect' || k === 'designer'

/** Profesionales de la obra (constructor, electricista, carpintero…) con acceso a "Mi reforma": solo ven los contratos que CJ les asigna */
export default function Builders() {
  const users = useLiveCollection<UserProfile>('users')
  const projects = useLiveCollection<Project>('projects')
  const toast = useToast()
  const [form, setForm] = useState<Form | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const builders = users.data
    .filter((u) => hasRole(u, 'builder'))
    .sort((a, b) => tradeLabel[a.trade ?? 'construction'].localeCompare(tradeLabel[b.trade ?? 'construction']) || (a.companyName ?? '').localeCompare(b.companyName ?? ''))
  const count = (uid: string) => projects.data.filter((p) => p.builderUid === uid).length
  const designers = users.data.filter((u) => hasRole(u, 'designer')).sort((a, b) => (a.companyName || a.name).localeCompare(b.companyName || b.name))
  // Reformas distintas (casa + título) en las que participa
  const reformsOf = (uid: string) => new Set(projects.data.filter((p) => p.designerUids?.includes(uid)).map((p) => `${p.clientId}|${p.title}`)).size

  async function create() {
    if (!form) return
    setBusy(true)
    setError('')
    try {
      const base = { name: form.name.trim(), companyName: form.companyName.trim(), email: form.email.trim(), language: form.language }
      const k = form.trade
      const res = isDesign(k) ? await createDesignerAccount({ ...base, profession: k }) : await createBuilderAccount({ ...base, trade: k })
      const panel = isDesign(form.trade) ? 'Panel de arquitectura y diseño' : 'Panel del constructor'
      toast(
        res.via
          ? `${form.companyName || form.name} creado. ${invitationNotice(form.email.trim(), res.via)}`
          : `${form.companyName || form.name} creado. ${form.email.trim()} ya tenía cuenta: entra con su contraseña de siempre y cambia a «${panel}» desde la app.`,
      )
      setForm(null)
    } catch (err) {
      const msg = err instanceof FirebaseError ? err.message.replace(/\s*\[\d+\]$/, '') : ''
      setError(msg && !msg.startsWith('internal') ? msg : 'No se pudo crear el profesional. Inténtelo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageTitle eyebrow="Mi reforma" title="Profesionales">
        <button className="btn a-btn" onClick={() => setForm({ ...empty })}>
          Añadir profesional
        </button>
      </PageTitle>
      <p className="card__text">Constructores y demás oficios (electricista, carpintero…), y arquitectos y diseñadores. Cada uno entra con su propio correo. Los oficios solo ven los contratos en los que los asigne en «Reformas»; los arquitectos y diseñadores, las reformas a las que los añada (planos, conversación y avances, sin el dinero).</p>
      <h2 className="a-subtitle">Oficios de obra</h2>
      <div className="card a-list">
        {builders.map((b) => (
          <div key={b.id} className="a-row">
            <div className="a-row__body">
              <span className="card__title">{b.companyName || b.name}</span>
              <span className="card__text">
                {tradeLabel[b.trade ?? 'construction']} · {b.name} · {b.email} · {count(b.id)} {count(b.id) === 1 ? 'contrato' : 'contratos'}
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
        {!users.loading && builders.length === 0 && <p className="a-empty">Aún no hay profesionales.</p>}
      </div>

      <h2 className="a-subtitle">Arquitectos y diseñadores</h2>
      <div className="card a-list">
        {designers.map((b) => (
          <div key={b.id} className="a-row">
            <div className="a-row__body">
              <span className="card__title">{b.companyName || b.name}</span>
              <span className="card__text">
                {professionLabel[b.profession ?? 'architect']} · {b.name} · {b.email} · {reformsOf(b.id)} {reformsOf(b.id) === 1 ? 'reforma' : 'reformas'}
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
        {!users.loading && designers.length === 0 && <p className="a-empty">Aún no hay arquitectos ni diseñadores.</p>}
      </div>

      {form && (
        <Dialog title="Nuevo profesional" submitLabel={busy ? 'Creando…' : 'Crear e invitar'} busy={busy} onClose={() => setForm(null)} onSubmit={create}>
          <Field label="Oficio">
            <Select value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value as Kind })}>
              <optgroup label="Oficios de obra">
                {WORK_TRADES.map((tr) => (
                  <option key={tr} value={tr}>
                    {tradeLabel[tr]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Arquitectura y diseño">
                <option value="architect">{professionLabel.architect}</option>
                <option value="designer">{professionLabel.designer}</option>
              </optgroup>
            </Select>
          </Field>
          <Field label={isDesign(form.trade) ? 'Estudio (opcional)' : 'Empresa'}>
            <Input required={!isDesign(form.trade)} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </Field>
          <div className="a-grid-2">
            <Field label="Persona de contacto">
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Idioma">
              <Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as Form['language'] })}>
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
