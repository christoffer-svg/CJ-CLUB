import { PageTitle } from '../../components/admin/AdminLayout'
import Dialog from '../../components/admin/Dialog'
import { Bilingual, Field, Input, Toggle } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { useEditor } from '../../components/admin/useEditor'
import { patchDoc, useDealUsesThisMonth, useLiveCollection } from '../../lib/admin'
import type { Deal } from '../../lib/types'

const empty: Deal = { title: '', conditions_es: '', conditions_en: '', discountLabel: '', code: '', active: true, order: 0 }

export default function Deals() {
  const deals = useLiveCollection<Deal>('deals')
  const uses = useDealUsesThisMonth()
  const editor = useEditor('deals', empty)
  const toast = useToast()
  const d = editor.editing?.draft
  const sorted = [...deals.data].sort((a, b) => a.order - b.order)
  const month = new Date().toLocaleDateString('es-ES', { month: 'long' })

  return (
    <>
      <PageTitle eyebrow="Panel" title="Descuentos">
        <button
          className="btn a-btn"
          onClick={() => {
            editor.openNew()
            editor.set('order', sorted.reduce((m, x) => Math.max(m, x.order), 0) + 1)
          }}
        >
          Añadir descuento
        </button>
      </PageTitle>

      <div className="card a-list">
        {sorted.map((x) => (
          <div key={x.id} className={x.active ? 'a-row' : 'a-row a-row--off'}>
            <span className="a-row__value">{x.discountLabel}</span>
            <div className="a-row__body">
              <span className="card__title">{x.title}</span>
              <span className="card__text">
                Código {x.code} · {uses === null ? '…' : `${uses[x.id] ?? 0} ${(uses[x.id] ?? 0) === 1 ? 'uso' : 'usos'} en ${month}`}
              </span>
            </div>
            <Toggle
              checked={x.active}
              label={x.active ? 'Activo' : 'Inactivo'}
              onChange={(v) =>
                patchDoc(`deals/${x.id}`, { active: v })
                  .then(() => toast(`${x.title}: ${v ? 'activado' : 'desactivado'}`))
                  .catch(() => toast('No se pudo guardar.', 'error'))
              }
            />
            <button className="a-link" onClick={() => editor.openEdit(x.id, x)}>
              Editar
            </button>
          </div>
        ))}
        {!deals.loading && sorted.length === 0 && <p className="a-empty">Aún no hay descuentos.</p>}
      </div>

      {d && (
        <Dialog
          title={editor.editing?.id ? 'Editar descuento' : 'Nuevo descuento'}
          onClose={editor.close}
          busy={editor.busy}
          onSubmit={() =>
            d.title.trim() &&
            d.code.trim() &&
            editor.save(
              (x) => ({ ...x, title: x.title.trim(), code: x.code.trim().toUpperCase(), order: Number(x.order) || 0 }),
              `Guardado: ${d.title}`,
            )
          }
        >
          <Field label="Negocio">
            <Input required value={d.title} onChange={(e) => editor.set('title', e.target.value)} />
          </Field>
          <div className="a-grid-3">
            <Field label="Descuento" hint='Ej. "20%" o "Gratis"'>
              <Input required value={d.discountLabel} onChange={(e) => editor.set('discountLabel', e.target.value)} />
            </Field>
            <Field label="Código">
              <Input required value={d.code} onChange={(e) => editor.set('code', e.target.value)} />
            </Field>
            <Field label="Orden">
              <Input type="number" value={d.order} onChange={(e) => editor.set('order', Number(e.target.value))} />
            </Field>
          </div>
          <Bilingual
            label="Condiciones"
            multiline
            es={d.conditions_es}
            en={d.conditions_en}
            onEs={(v) => editor.set('conditions_es', v)}
            onEn={(v) => editor.set('conditions_en', v)}
          />
          <Toggle checked={d.active} label="Activo" onChange={(v) => editor.set('active', v)} />
        </Dialog>
      )}
    </>
  )
}
