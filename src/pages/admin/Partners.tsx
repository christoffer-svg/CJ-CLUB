import { PageTitle } from '../../components/admin/AdminLayout'
import Dialog from '../../components/admin/Dialog'
import { Bilingual, Field, FieldGroup, Input, Toggle } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { useEditor } from '../../components/admin/useEditor'
import { patchDoc, useLiveCollection } from '../../lib/admin'
import { usePartnerCategories } from '../../lib/data'
import { partnerOffers, partnerServiceIds, servicesToSave } from '../../lib/services'
import type { Partner } from '../../lib/types'
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
        const items = partners.data
          .filter((partner) => partnerOffers(partner, group.id))
          .sort((a, b) => a.name.localeCompare(b.name, 'es'))
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
              (draft) => ({
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
          <FieldGroup
            label="Servicios"
            hint="Marque todos los que ofrece. Una misma persona puede ser, por ejemplo, mantenimiento, piscina y jardinería."
          >
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
    </>
  )
}
