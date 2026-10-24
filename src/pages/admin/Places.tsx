import { PageTitle } from '../../components/admin/AdminLayout'
import Dialog from '../../components/admin/Dialog'
import { Bilingual, Field, Input, Select, Toggle } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { useEditor } from '../../components/admin/useEditor'
import { patchDoc, useLiveCollection } from '../../lib/admin'
import type { Place } from '../../lib/types'

const categories: [Place['category'], string][] = [
  ['restaurants', 'Restaurantes'],
  ['golf', 'Golf'],
  ['beaches', 'Playas'],
  ['plans', 'Planes'],
]

type Draft = Omit<Place, 'discountPercent'> & { discountPercent: string }
const empty: Draft = {
  category: 'restaurants',
  name: '',
  meta_es: '',
  meta_en: '',
  cjNote_es: '',
  cjNote_en: '',
  discountPercent: '',
  active: true,
}

export default function Places() {
  const places = useLiveCollection<Place>('places')
  const editor = useEditor('places', empty)
  const toast = useToast()
  const d = editor.editing?.draft

  return (
    <>
      <PageTitle eyebrow="Panel" title="Lugares">
        <button className="btn a-btn" onClick={editor.openNew}>
          Añadir lugar
        </button>
      </PageTitle>

      {categories.map(([cat, label]) => {
        const items = places.data.filter((p) => p.category === cat).sort((a, b) => a.name.localeCompare(b.name))
        return (
          <section key={cat} className="a-group">
            <h2 className="a-section-title">{label}</h2>
            <div className="card a-list">
              {items.map((p) => (
                <div key={p.id} className={p.active ? 'a-row' : 'a-row a-row--off'}>
                  <div className="a-row__body">
                    <span className="card__title">
                      {p.name}
                      {p.discountPercent ? <span className="a-badge">{p.discountPercent}%</span> : null}
                    </span>
                    <span className="card__text">{p.meta_es}</span>
                  </div>
                  <Toggle
                    checked={p.active}
                    label={p.active ? 'Visible' : 'Oculto'}
                    onChange={(v) =>
                      patchDoc(`places/${p.id}`, { active: v })
                        .then(() => toast(`${p.name}: ${v ? 'visible' : 'oculto'} para los clientes`))
                        .catch(() => toast('No se pudo guardar.', 'error'))
                    }
                  />
                  <button
                    className="a-link"
                    onClick={() => editor.openEdit(p.id, { ...p, discountPercent: p.discountPercent ? String(p.discountPercent) : '' })}
                  >
                    Editar
                  </button>
                </div>
              ))}
              {items.length === 0 && <p className="a-empty">Sin lugares en esta categoría.</p>}
            </div>
          </section>
        )
      })}

      {d && (
        <Dialog
          title={editor.editing?.id ? 'Editar lugar' : 'Nuevo lugar'}
          onClose={editor.close}
          busy={editor.busy}
          onSubmit={() =>
            d.name.trim() &&
            editor.save(({ discountPercent, ...x }) => {
              const pct = Math.round(Number(discountPercent))
              // sin descuento: se guarda null para borrar uno anterior
              return { ...x, name: x.name.trim(), discountPercent: pct > 0 && pct <= 100 ? pct : null }
            }, `Guardado: ${d.name}`)
          }
        >
          <div className="a-grid-2">
            <Field label="Nombre">
              <Input required value={d.name} onChange={(e) => editor.set('name', e.target.value)} />
            </Field>
            <Field label="Categoría">
              <Select value={d.category} onChange={(e) => editor.set('category', e.target.value as Place['category'])}>
                {categories.map(([c, l]) => (
                  <option key={c} value={c}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Bilingual
            label="Línea secundaria"
            es={d.meta_es}
            en={d.meta_en}
            onEs={(v) => editor.set('meta_es', v)}
            onEn={(v) => editor.set('meta_en', v)}
          />
          <Bilingual
            label="Nota de CJ"
            multiline
            es={d.cjNote_es}
            en={d.cjNote_en}
            onEs={(v) => editor.set('cjNote_es', v)}
            onEn={(v) => editor.set('cjNote_en', v)}
          />
          <Field label="Descuento CJ Club (%)" hint="Déjelo vacío si no tiene descuento.">
            <Input
              type="number"
              min={1}
              max={100}
              inputMode="numeric"
              value={d.discountPercent}
              onChange={(e) => editor.set('discountPercent', e.target.value)}
            />
          </Field>
          <Toggle checked={d.active} label="Visible para los clientes" onChange={(v) => editor.set('active', v)} />
        </Dialog>
      )}
    </>
  )
}
