import { useState } from 'react'
import CategoryGlyph from '../../components/CategoryGlyph'
import Dialog from '../../components/admin/Dialog'
import { Field, FieldGroup, Input, Toggle } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { removeDoc, saveDoc, useLiveCollection, type WithId } from '../../lib/admin'
import {
  categoryIconChoices,
  categoryInUse,
  categorySlug,
  editableTranslation,
  PARTNER_CATEGORIES,
  storedFromMerged,
  type MergedCategory,
} from '../../lib/services'
import type { Client, Language, Partner, PartnerCategory } from '../../lib/types'

const translationFields: [Exclude<Language, 'es'>, string][] = [
  ['en', 'Inglés'],
  ['nl', 'Neerlandés'],
  ['sv', 'Sueco'],
  ['de', 'Alemán'],
  ['fr', 'Francés'],
]

type Draft = {
  id: string | null
  builtin: boolean
  name_es: string
  name_en: string
  name_nl: string
  name_sv: string
  name_de: string
  name_fr: string
  icon: string
  order: number
  active: boolean
}

function toDraft(cat: MergedCategory): Draft {
  return {
    id: cat.id,
    builtin: cat.builtin,
    name_es: cat.name_es,
    name_en: editableTranslation(cat, 'en'),
    name_nl: editableTranslation(cat, 'nl'),
    name_sv: editableTranslation(cat, 'sv'),
    name_de: editableTranslation(cat, 'de'),
    name_fr: editableTranslation(cat, 'fr'),
    icon: cat.icon,
    order: cat.order,
    active: cat.active,
  }
}

function toStored(draft: Draft): PartnerCategory {
  return {
    name_es: draft.name_es.trim(),
    name_en: draft.name_en.trim(),
    name_nl: draft.name_nl.trim(),
    name_sv: draft.name_sv.trim(),
    name_de: draft.name_de.trim(),
    name_fr: draft.name_fr.trim(),
    icon: draft.icon,
    order: draft.order,
    active: draft.active,
  }
}

/**
 * Lista de servicios que puede ofrecer un colaborador.
 * Se guardan en Firestore: añadir uno no requiere cambiar la app.
 */
export default function ServiceCategories({
  categories,
  partners,
}: {
  categories: MergedCategory[]
  partners: WithId<Partner>[]
}) {
  const clients = useLiveCollection<Client>('clients')
  const toast = useToast()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [moving, setMoving] = useState(false)
  const [deleting, setDeleting] = useState<MergedCategory | null>(null)

  function inUse(id: string) {
    return clients.loading || categoryInUse(id, partners, clients.data)
  }

  async function persist(cat: MergedCategory, patch?: { order?: number; active?: boolean }, ok?: string) {
    try {
      await saveDoc(`${PARTNER_CATEGORIES}/${cat.id}`, storedFromMerged(cat, patch))
      if (ok) toast(ok)
    } catch {
      toast('No se pudo guardar.', 'error')
    }
  }

  async function move(cat: MergedCategory, dir: -1 | 1) {
    const index = categories.findIndex((item) => item.id === cat.id)
    const other = categories[index + dir]
    if (!other || moving) return
    setMoving(true)
    try {
      const orderA = cat.order === other.order ? index + 1 : cat.order
      const orderB = cat.order === other.order ? index + 1 + dir : other.order
      await Promise.all([
        saveDoc(`${PARTNER_CATEGORIES}/${cat.id}`, storedFromMerged(cat, { order: orderB })),
        saveDoc(`${PARTNER_CATEGORIES}/${other.id}`, storedFromMerged(other, { order: orderA })),
      ])
    } catch {
      toast('No se pudo cambiar el orden.', 'error')
    } finally {
      setMoving(false)
    }
  }

  function openNew() {
    const max = categories.reduce((highest, cat) => Math.max(highest, cat.order), 0)
    setDraft({
      id: null,
      builtin: false,
      name_es: '',
      name_en: '',
      name_nl: '',
      name_sv: '',
      name_de: '',
      name_fr: '',
      icon: 'default',
      order: max + 1,
      active: true,
    })
  }

  async function save() {
    if (!draft || !draft.name_es.trim()) return
    setBusy(true)
    try {
      const id = draft.id ?? categorySlug(draft.name_es, new Set(categories.map((cat) => cat.id)))
      await saveDoc(`${PARTNER_CATEGORIES}/${id}`, toStored(draft))
      toast(`Guardado: ${draft.name_es.trim()}`)
      setDraft(null)
    } catch {
      toast('No se pudo guardar. Inténtelo de nuevo.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="a-group">
      <div className="a-title">
        <div>
          <h2 className="a-section-title">Servicios</h2>
          <p className="card__text">
            Oficios que puede hacer un colaborador. Puede añadir uno nuevo, cambiarle el nombre o el icono, y ocultarlo.
            Ocultar no borra nada: quien ya lo tiene, lo conserva.
          </p>
        </div>
        <button type="button" className="btn a-btn" onClick={openNew}>
          Añadir servicio
        </button>
      </div>
      <div className="card a-list">
        {categories.map((cat, index) => (
          <div key={cat.id} className={cat.active ? 'a-row' : 'a-row a-row--off'}>
            <div className="a-order">
              <button
                type="button"
                className="a-icon-btn"
                aria-label={`Subir ${cat.name_es}`}
                disabled={index === 0 || moving}
                onClick={() => move(cat, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="a-icon-btn"
                aria-label={`Bajar ${cat.name_es}`}
                disabled={index === categories.length - 1 || moving}
                onClick={() => move(cat, 1)}
              >
                ↓
              </button>
            </div>
            <CategoryGlyph icon={cat.icon} />
            <div className="a-row__body">
              <span className="card__title">
                {cat.name_es}
                {cat.active ? null : <span className="a-badge">Oculto</span>}
              </span>
            </div>
            <Toggle
              checked={cat.active}
              label={cat.active ? 'Visible' : 'Oculto'}
              onChange={(value) => persist(cat, { active: value }, `${cat.name_es}: ${value ? 'visible' : 'oculto'}`)}
            />
            <button type="button" className="a-link" onClick={() => setDraft(toDraft(cat))}>
              Editar
            </button>
            {!cat.builtin && !inUse(cat.id) && (
              <button type="button" className="a-link a-link--danger" onClick={() => setDeleting(cat)}>
                Borrar
              </button>
            )}
          </div>
        ))}
      </div>

      {draft && (
        <Dialog
          title={draft.id ? 'Editar servicio' : 'Nuevo servicio'}
          onClose={() => !busy && setDraft(null)}
          busy={busy}
          onSubmit={save}
        >
          <Field label="Nombre · Español" hint="Es el nombre que ve el equipo. Si lo cambia, los clientes verán el nuevo texto.">
            <Input required value={draft.name_es} onChange={(e) => setDraft({ ...draft, name_es: e.target.value })} />
          </Field>
          <FieldGroup
            label="Traducciones"
            hint="Opcional. En un servicio nuevo, un idioma vacío se muestra en inglés y, si no hay, en español. En los de siempre, si no escribe nada, el cliente sigue viendo el texto de la guía."
          >
            <div className="a-grid-2">
              {translationFields.map(([code, label]) => (
                <Field key={code} label={label}>
                  <Input
                    value={draft[`name_${code}`]}
                    onChange={(e) => setDraft({ ...draft, [`name_${code}`]: e.target.value })}
                  />
                </Field>
              ))}
            </div>
          </FieldGroup>
          <Field label="Icono" hint="Si no elige uno, se usa el icono por defecto.">
            <div className="a-icon-pick" role="radiogroup" aria-label="Icono">
              {categoryIconChoices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  role="radio"
                  aria-checked={draft.icon === choice.id}
                  aria-label={choice.label}
                  title={choice.label}
                  className="a-icon-pick__btn"
                  onClick={() => setDraft({ ...draft, icon: choice.id })}
                >
                  <CategoryGlyph icon={choice.id} />
                </button>
              ))}
            </div>
          </Field>
          <Toggle checked={draft.active} label="Visible al elegir" onChange={(value) => setDraft({ ...draft, active: value })} />
          {draft.builtin && (
            <p className="card__text">Este servicio forma parte de la guía desde el principio. Puede ocultarlo, no borrarlo.</p>
          )}
          {draft.id && !draft.builtin && inUse(draft.id) && (
            <p className="card__text">Está en uso. Puede ocultarlo para que no salga al elegir, sin perder los datos.</p>
          )}
        </Dialog>
      )}

      {deleting && (
        <Dialog
          title="Borrar servicio"
          submitLabel="Borrar"
          danger
          onClose={() => setDeleting(null)}
          onSubmit={() => {
            if (deleting.builtin || inUse(deleting.id)) {
              toast('No se puede borrar: hay colaboradores o clientes que lo usan.', 'error')
              setDeleting(null)
              return
            }
            removeDoc(`${PARTNER_CATEGORIES}/${deleting.id}`)
              .then(() => toast(`Borrado: ${deleting.name_es}`))
              .catch(() => toast('No se pudo borrar.', 'error'))
              .finally(() => setDeleting(null))
          }}
        >
          <p className="card__text">
            ¿Seguro que quiere borrar «{deleting.name_es}»? No lo usa ningún colaborador. Esta acción no se puede deshacer.
          </p>
        </Dialog>
      )}
    </section>
  )
}
