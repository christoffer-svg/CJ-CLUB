import { PageTitle } from '../../components/admin/AdminLayout'
import Dialog from '../../components/admin/Dialog'
import { Bilingual, Field, Input, Select, Toggle } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { useEditor } from '../../components/admin/useEditor'
import { contactTypeLabels, patchDoc, useLiveCollection } from '../../lib/admin'
import type { ContactType, Partner } from '../../lib/types'

const empty: Partner = { name: '', category: 'lawyer', phone: '', description_es: '', description_en: '', active: true }

export default function Partners() {
  const partners = useLiveCollection<Partner>('partners')
  const editor = useEditor('partners', empty)
  const toast = useToast()
  const d = editor.editing?.draft

  return (
    <>
      <PageTitle eyebrow="Panel" title="Colaboradores">
        <button className="btn a-btn" onClick={editor.openNew}>
          Añadir colaborador
        </button>
      </PageTitle>

      {contactTypeLabels.map(([type, label]) => {
        const items = partners.data.filter((p) => p.category === type).sort((a, b) => a.name.localeCompare(b.name))
        return (
          <section key={type} className="a-group">
            <h2 className="a-section-title">{label}</h2>
            <div className="card a-list">
              {items.map((p) => (
                <div key={p.id} className={p.active === false ? 'a-row a-row--off' : 'a-row'}>
                  <div className="a-row__body">
                    <span className="card__title">{p.name}</span>
                    <span className="card__text">{[p.phone, p.description_es].filter(Boolean).join(' · ')}</span>
                  </div>
                  <Toggle
                    checked={p.active !== false}
                    label={p.active === false ? 'Desactivado' : 'Activo'}
                    onChange={(v) =>
                      patchDoc(`partners/${p.id}`, { active: v })
                        .then(() => toast(`${p.name}: ${v ? 'activado' : 'desactivado'}`))
                        .catch(() => toast('No se pudo guardar.', 'error'))
                    }
                  />
                  <button className="a-link" onClick={() => editor.openEdit(p.id, p)}>
                    Editar
                  </button>
                </div>
              ))}
              {items.length === 0 && <p className="a-empty">Sin colaboradores en esta categoría.</p>}
            </div>
          </section>
        )
      })}

      {d && (
        <Dialog
          title={editor.editing?.id ? 'Editar colaborador' : 'Nuevo colaborador'}
          onClose={editor.close}
          busy={editor.busy}
          onSubmit={() =>
            d.name.trim() &&
            editor.save(
              (x) => ({ ...x, name: x.name.trim(), phone: x.phone.trim(), active: x.active !== false }),
              `Guardado: ${d.name}`,
            )
          }
        >
          <Field label="Nombre">
            <Input required value={d.name} onChange={(e) => editor.set('name', e.target.value)} />
          </Field>
          <div className="a-grid-2">
            <Field label="Categoría">
              <Select value={d.category} onChange={(e) => editor.set('category', e.target.value as ContactType)}>
                {contactTypeLabels.map(([t, l]) => (
                  <option key={t} value={t}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Teléfono">
              <Input type="tel" value={d.phone} onChange={(e) => editor.set('phone', e.target.value)} />
            </Field>
          </div>
          <Bilingual
            label="Descripción"
            multiline
            es={d.description_es}
            en={d.description_en}
            onEs={(v) => editor.set('description_es', v)}
            onEn={(v) => editor.set('description_en', v)}
          />
          <Toggle checked={d.active !== false} label="Activo" onChange={(v) => editor.set('active', v)} />
        </Dialog>
      )}
    </>
  )
}
