import { FirebaseError } from 'firebase/app'
import { httpsCallable } from 'firebase/functions'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { functions } from '../../lib/firebase'
import { hasRole } from '../../lib/roles'
import { withoutProfile } from '../../lib/profiles'
import { PageTitle } from '../../components/admin/AdminLayout'
import Dialog from '../../components/admin/Dialog'
import { Bilingual, Field, FieldGroup, Input, Select, Toggle } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { useEditor } from '../../components/admin/useEditor'
import { invitationNotice, languageOptions, patchDoc, sendInvitation, useLiveCollection } from '../../lib/admin'
import { usePartnerCategories } from '../../lib/data'
import { partnerOffers, partnerServiceIds, servicesToSave } from '../../lib/services'
import type { Language, Partner, UserProfile } from '../../lib/types'
import ServiceCategories from './ServiceCategories'
import CategoryGlyph from '../../components/CategoryGlyph'

const empty: Partner = {
  name: '',
  category: 'lawyer',
  categories: ['lawyer'],
  phone: '',
  description_es: '',
  description_en: '',
  active: true,
}

export default function Partners() {
  const partners = useLiveCollection<Partner>('partners')
  const { profile } = useAuth()
  // Los accesos de los colaboradores solo los gestiona CJ (un empleado de contenido no ve las cuentas)
  const isAdmin = profile?.role === 'admin'
  const users = useLiveCollection<UserProfile>(isAdmin ? 'users' : null)
  const [access, setAccess] = useState<(Partner & { id: string }) | null>(null)
  const categories = usePartnerCategories()
  const editor = useEditor('partners', empty)
  const toast = useToast()
  const d = editor.editing?.draft
  const order = categories.data.map((cat) => cat.id)

  const known = new Set(order)
  const orphanIds = [...new Set(partners.data.flatMap((partner) => partnerServiceIds(partner)))].filter((id) => !known.has(id))
  const groups = [
    ...categories.data.filter((cat) => cat.active || partners.data.some((partner) => partnerOffers(partner, cat.id))),
    ...orphanIds.map((id) => ({ id, name_es: id, active: true })),
  ]

  function openNew() {
    const first = categories.data.find((cat) => cat.active)?.id ?? 'lawyer'
    editor.openNew({ category: first, categories: [first] })
  }

  return (
    <>
      <PageTitle eyebrow="Panel" title="Colaboradores">
        <button className="btn a-btn" onClick={openNew}>
          Añadir colaborador
        </button>
      </PageTitle>

      <ServiceCategories categories={categories.data} partners={partners.data} />

      {groups.map((group) => {
        const items = partners.data.filter((partner) => partnerOffers(partner, group.id)).sort((a, b) => a.name.localeCompare(b.name, 'es'))
        return (
          <section key={group.id} className="a-group">
            <h2 className="a-section-title">
              {group.name_es}
              {group.active ? null : <span className="a-badge">Oculto</span>}
            </h2>
            <div className="card a-list">
              {items.map((partner) => {
                const services = partnerServiceIds(partner)
                const serviceNames = services.map((id) => categories.data.find((cat) => cat.id === id)?.name_es ?? id).join(' · ')
                return (
                  <div key={partner.id} className={partner.active === false ? 'a-row a-row--off' : 'a-row'}>
                    <div className="a-row__body">
                      <span className="card__title">{partner.name}</span>
                      <span className="card__text">
                        {[services.length > 1 ? serviceNames : '', partner.phone, partner.description_es].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                    <Toggle
                      checked={partner.active !== false}
                      label={partner.active === false ? 'Desactivado' : 'Activo'}
                      onChange={(value) =>
                        patchDoc(`partners/${partner.id}`, { active: value })
                          .then(() => toast(`${partner.name}: ${value ? 'activado' : 'desactivado'}`))
                          .catch(() => toast('No se pudo guardar.', 'error'))
                      }
                    />
                    <Link className="a-link" to={`/admin/colaboradores/${partner.id}/presentacion`}>
                      Presentación
                    </Link>
                    {isAdmin && (
                      <AccessLink accounts={users.data.filter((u) => hasRole(u, 'partner') && u.partnerId === partner.id)} onNew={() => setAccess(partner)} />
                    )}
                    <button
                      className="a-link"
                      onClick={() =>
                        editor.openEdit(partner.id, {
                          ...partner,
                          categories: partnerServiceIds(partner),
                        })
                      }
                    >
                      Editar
                    </button>
                  </div>
                )
              })}
              {items.length === 0 && <p className="a-empty">Sin colaboradores en este servicio.</p>}
            </div>
          </section>
        )
      })}

      {d && (
        <Dialog
          title={editor.editing?.id ? 'Editar colaborador' : 'Nuevo colaborador'}
          onClose={editor.close}
          busy={editor.busy}
          onSubmit={() => {
            const selected = d.categories?.length ? d.categories : partnerServiceIds(d)
            if (!d.name.trim()) return
            if (selected.length === 0) {
              toast('Elija al menos un servicio.', 'error')
              return
            }
            const services = servicesToSave(d.category, selected, order)
            editor.save(
              (draft) =>
                withoutProfile({
                  ...draft,
                  name: draft.name.trim(),
                  phone: draft.phone.trim(),
                  active: draft.active !== false,
                  ...services,
                }),
              `Guardado: ${d.name}`,
            )
          }}
        >
          <Field label="Nombre">
            <Input required value={d.name} onChange={(e) => editor.set('name', e.target.value)} />
          </Field>
          <FieldGroup label="Servicios" hint="Marque todos los que ofrece. Una misma persona puede ser, por ejemplo, mantenimiento, piscina y jardinería.">
            <div className="a-checks">
              {categories.data
                .filter((cat) => cat.active || (d.categories ?? []).includes(cat.id))
                .map((cat) => {
                  const selected = (d.categories ?? partnerServiceIds(d)).includes(cat.id)
                  return (
                    <label key={cat.id} className="a-check">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          const current = d.categories?.length ? [...d.categories] : partnerServiceIds(d)
                          const next = current.includes(cat.id) ? current.filter((id) => id !== cat.id) : [...current, cat.id]
                          editor.set('categories', next)
                        }}
                      />
                      <CategoryGlyph icon={cat.icon} />
                      <span>
                        {cat.name_es}
                        {cat.active ? '' : ' (oculto)'}
                      </span>
                    </label>
                  )
                })}
            </div>
          </FieldGroup>
          <Field label="Teléfono">
            <Input type="tel" value={d.phone} onChange={(e) => editor.set('phone', e.target.value)} />
          </Field>
          <Bilingual
            label="Descripción"
            multiline
            es={d.description_es}
            en={d.description_en}
            onEs={(value) => editor.set('description_es', value)}
            onEn={(value) => editor.set('description_en', value)}
          />
          <Toggle checked={d.active !== false} label="Activo" onChange={(value) => editor.set('active', value)} />
        </Dialog>
      )}
      {access && <AccessDialog partner={access} onClose={() => setAccess(null)} />}
    </>
  )
}

const createPartnerAccount = httpsCallable<
  { partnerId: string; contactName: string; email: string; language: Language },
  { uid: string; addedToExisting: boolean }
>(functions, 'createPartnerAccount')
const accessLanguages: [Language, string][] = [['es', 'Español'], ...languageOptions.filter(([code]) => code !== 'es')]

/** Acceso propio del colaborador a su anuncio: crearlo o reenviar la invitación */
function AccessLink({ accounts, onNew }: { accounts: (UserProfile & { id: string })[]; onNew: () => void }) {
  const toast = useToast()
  if (!accounts.length)
    return (
      <button className="a-link" onClick={onNew}>
        Dar acceso
      </button>
    )
  const u = accounts[0]
  return (
    <button
      className="a-link"
      title={`Acceso de ${u.name} (${u.email})`}
      onClick={() =>
        sendInvitation(u.email, u.language)
          .then((via) => toast(invitationNotice(u.email, via)))
          .catch(() => toast('No se pudo enviar la invitación.', 'error'))
      }
    >
      Reenviar acceso
    </button>
  )
}

function AccessDialog({ partner, onClose }: { partner: Partner & { id: string }; onClose: () => void }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState(partner.email ?? '')
  const [language, setLanguage] = useState<Language>('es')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    setBusy(true)
    try {
      const res = await createPartnerAccount({ partnerId: partner.id, contactName: name.trim(), email: email.trim(), language })
      if (res.data.addedToExisting)
        toast(`Acceso creado. ${email.trim()} ya tenía cuenta: entra con su contraseña de siempre y cambia a «Panel del colaborador».`)
      else {
        try {
          toast(invitationNotice(email.trim(), await sendInvitation(email.trim(), language)))
        } catch {
          toast(`Acceso creado, pero no se pudo enviar el correo a ${email.trim()}. Use «Reenviar acceso».`, 'error')
        }
      }
      onClose()
    } catch (err) {
      const msg = err instanceof FirebaseError ? err.message.replace(/\s*\[\d+\]$/, '') : ''
      setError(msg && !msg.startsWith('internal') ? msg : 'No se pudo crear el acceso. Inténtelo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog title={`Acceso para ${partner.name}`} onClose={onClose} busy={busy} submitLabel="Crear e invitar" onSubmit={() => void submit()}>
      <p className="card__text">
        El colaborador podrá escribir su anuncio (presentación, fotos, logo, contacto) y una ventaja para los socios de CJ Club. Lo ven los clientes que lo
        tienen en su Guía. El nombre, el teléfono y los servicios los sigue llevando CJ, y puede desactivarlo cuando quiera.
      </p>
      <Field label="Nombre de la persona">
        <Input required value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Correo electrónico" hint="Recibirá un correo para elegir su contraseña (válido 24 horas).">
        <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Idioma del correo">
        <Select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
          {accessLanguages.map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      {error && <p className="a-error">{error}</p>}
    </Dialog>
  )
}
