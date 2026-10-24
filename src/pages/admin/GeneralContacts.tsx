import { useState } from 'react'
import { PageTitle } from '../../components/admin/AdminLayout'
import Dialog from '../../components/admin/Dialog'
import { Bilingual, Field, Input, Select, Toggle } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { useEditor } from '../../components/admin/useEditor'
import { patchDoc, removeDoc, useLiveCollection, type WithId } from '../../lib/admin'
import type { GeneralContact } from '../../lib/types'

const groups: [GeneralContact['group'], string][] = [
  ['urgencias', 'Urgencias'],
  ['salud', 'Salud'],
  ['transporte', 'Transporte'],
]

const empty: GeneralContact = {
  group: 'urgencias',
  name_es: '',
  name_en: '',
  description_es: '',
  description_en: '',
  phone: '',
  isEmergency: false,
  order: 0,
}

export default function GeneralContacts() {
  const contacts = useLiveCollection<GeneralContact>('generalContacts')
  const editor = useEditor('generalContacts', empty)
  const toast = useToast()
  const [deleting, setDeleting] = useState<WithId<GeneralContact> | null>(null)
  const d = editor.editing?.draft
  const sorted = [...contacts.data].sort((a, b) => a.order - b.order)
  const maxOrder = sorted.reduce((m, c) => Math.max(m, c.order), 0)

  /** Intercambia el orden con el contacto anterior o siguiente del mismo grupo */
  async function move(item: WithId<GeneralContact>, dir: -1 | 1) {
    const inGroup = sorted.filter((c) => c.group === item.group)
    const other = inGroup[inGroup.findIndex((c) => c.id === item.id) + dir]
    if (!other) return
    try {
      await Promise.all([
        patchDoc(`generalContacts/${item.id}`, { order: other.order }),
        patchDoc(`generalContacts/${other.id}`, { order: item.order }),
      ])
    } catch {
      toast('No se pudo cambiar el orden.', 'error')
    }
  }

  return (
    <>
      <PageTitle eyebrow="Panel" title="Contactos generales">
        <button
          className="btn a-btn"
          onClick={() => {
            editor.openNew()
            editor.set('order', maxOrder + 1)
          }}
        >
          Añadir contacto
        </button>
      </PageTitle>

      {groups.map(([group, label]) => {
        const items = sorted.filter((c) => c.group === group)
        return (
          <section key={group} className="a-group">
            <h2 className="a-section-title">{label}</h2>
            <div className="card a-list">
              {items.map((c, i) => (
                <div key={c.id} className="a-row">
                  <div className="a-order">
                    <button className="a-icon-btn" aria-label={`Subir ${c.name_es}`} disabled={i === 0} onClick={() => move(c, -1)}>
                      ↑
                    </button>
                    <button
                      className="a-icon-btn"
                      aria-label={`Bajar ${c.name_es}`}
                      disabled={i === items.length - 1}
                      onClick={() => move(c, 1)}
                    >
                      ↓
                    </button>
                  </div>
                  <div className="a-row__body">
                    <span className="card__title">
                      {c.name_es}
                      {c.isEmergency && <span className="a-badge">Emergencia</span>}
                    </span>
                    <span className="card__text">{c.phone}</span>
                  </div>
                  <button className="a-link" onClick={() => editor.openEdit(c.id, c)}>
                    Editar
                  </button>
                  <button className="a-link a-link--danger" onClick={() => setDeleting(c)}>
                    Borrar
                  </button>
                </div>
              ))}
              {items.length === 0 && <p className="a-empty">Sin contactos en este grupo.</p>}
            </div>
          </section>
        )
      })}

      {d && (
        <Dialog
          title={editor.editing?.id ? 'Editar contacto' : 'Nuevo contacto'}
          onClose={editor.close}
          busy={editor.busy}
          onSubmit={() =>
            d.name_es.trim() &&
            d.phone.trim() &&
            editor.save((x) => ({ ...x, phone: x.phone.trim(), order: Number(x.order) || 0 }), `Guardado: ${d.name_es}`)
          }
        >
          <div className="a-grid-2">
            <Field label="Grupo">
              <Select value={d.group} onChange={(e) => editor.set('group', e.target.value as GeneralContact['group'])}>
                {groups.map(([g, l]) => (
                  <option key={g} value={g}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Teléfono">
              <Input required type="tel" value={d.phone} onChange={(e) => editor.set('phone', e.target.value)} />
            </Field>
          </div>
          <Bilingual
            label="Nombre"
            es={d.name_es}
            en={d.name_en}
            onEs={(v) => editor.set('name_es', v)}
            onEn={(v) => editor.set('name_en', v)}
          />
          <Bilingual
            label="Descripción"
            multiline
            es={d.description_es}
            en={d.description_en}
            onEs={(v) => editor.set('description_es', v)}
            onEn={(v) => editor.set('description_en', v)}
          />
          <Toggle
            checked={d.isEmergency}
            label="Emergencia (botón rojo con el número)"
            onChange={(v) => editor.set('isEmergency', v)}
          />
        </Dialog>
      )}

      {deleting && (
        <Dialog
          title="Borrar contacto"
          submitLabel="Borrar"
          danger
          onClose={() => setDeleting(null)}
          onSubmit={() =>
            removeDoc(`generalContacts/${deleting.id}`)
              .then(() => toast(`Borrado: ${deleting.name_es}`))
              .catch(() => toast('No se pudo borrar.', 'error'))
              .finally(() => setDeleting(null))
          }
        >
          <p className="card__text">
            ¿Seguro que quiere borrar «{deleting.name_es}»? Los clientes dejarán de verlo. Esta acción no se puede deshacer.
          </p>
        </Dialog>
      )}
    </>
  )
}
