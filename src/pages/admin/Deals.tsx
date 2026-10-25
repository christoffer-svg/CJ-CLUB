import { useState } from 'react'
import { PageTitle } from '../../components/admin/AdminLayout'
import Dialog from '../../components/admin/Dialog'
import { Bilingual, Field, Input, Toggle } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { useEditor } from '../../components/admin/useEditor'
import { patchDoc, removeDoc, useDealUsesThisMonth, useLiveCollection } from '../../lib/admin'
import type { Deal } from '../../lib/types'

const empty: Deal = { title: '', conditions_es: '', conditions_en: '', discountLabel: '', code: '', active: true, order: 0 }

function status(x: Deal) {
  if (x.source === 'business') {
    if (x.hiddenByAdmin) return 'Oculto por usted'
    if (!x.active) return 'En pausa por el negocio'
    return 'Visible · lo publica el negocio'
  }
  return x.active ? 'Visible · lo creó CJ' : 'Inactivo · lo creó CJ'
}

export default function Deals() {
  const deals = useLiveCollection<Deal>('deals')
  const uses = useDealUsesThisMonth()
  const editor = useEditor('deals', empty)
  const toast = useToast()
  const [removing, setRemoving] = useState<{ id: string; title: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const d = editor.editing?.draft
  const legacy = editor.editing?.id ? deals.data.find((x) => x.id === editor.editing?.id) : undefined
  const sorted = [...deals.data].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'es'))
  const month = new Date().toLocaleDateString('es-ES', { month: 'long' })

  async function hide(x: Deal & { id: string }, hidden: boolean) {
    try {
      await patchDoc(`deals/${x.id}`, { hiddenByAdmin: hidden })
      toast(hidden ? `${x.title}: oculto para los socios` : `${x.title}: visible de nuevo`)
    } catch {
      toast('No se pudo guardar.', 'error')
    }
  }

  async function remove() {
    if (!removing) return
    setBusy(true)
    try {
      await removeDoc(`deals/${removing.id}`)
      toast('Descuento retirado')
      setRemoving(null)
    } catch {
      toast('No se pudo retirar.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageTitle eyebrow="Panel" title="Descuentos" />
      <p className="a-lead">
        Los descuentos nuevos los publica cada negocio desde su acceso. Aquí no se redactan ofertas: puede ocultar o retirar una
        si hay un problema. Los que ya había, creados por CJ, siguen igual y puede corregirlos. Si el negocio ya publica la suya,
        retire la antigua para que no salgan dos.
      </p>

      <div className="card a-list">
        {sorted.map((x) => (
          <div key={x.id} className={!x.active || x.hiddenByAdmin ? 'a-row a-row--off' : 'a-row'}>
            <span className="a-row__value">{x.discountLabel}</span>
            <div className="a-row__body">
              <span className="card__title">{x.title}</span>
              <span className="card__text">
                {x.source === 'business' ? x.businessName || 'Negocio' : 'Creado por CJ'}
                {' · '}Código {x.code}
                {' · '}
                {status(x)}
                {' · '}
                {uses === null ? '…' : `${uses[x.id] ?? 0} ${(uses[x.id] ?? 0) === 1 ? 'uso' : 'usos'} en ${month}`}
              </span>
            </div>
            {x.source === 'business' ? (
              <button className="a-link" onClick={() => void hide(x, !x.hiddenByAdmin)}>
                {x.hiddenByAdmin ? 'Volver a mostrar' : 'Ocultar'}
              </button>
            ) : (
              <>
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
              </>
            )}
            <button className="a-link" onClick={() => setRemoving({ id: x.id, title: x.title })}>
              Retirar
            </button>
          </div>
        ))}
        {!deals.loading && sorted.length === 0 && <p className="a-empty">Aún no hay descuentos.</p>}
      </div>

      {d && legacy?.source !== 'business' && (
        <Dialog
          title="Editar descuento de CJ"
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
          <p className="a-lead">Este descuento lo creó CJ antes de que los negocios publicaran los suyos. Corríjalo solo si hace falta.</p>
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

      {removing && (
        <Dialog title="Retirar descuento" onClose={() => setRemoving(null)} busy={busy} submitLabel="Retirar" danger onSubmit={() => void remove()}>
          <p className="a-lead">
            Los socios dejarán de ver «{removing.title}». El historial de usos de meses anteriores se conserva.
          </p>
        </Dialog>
      )}
    </>
  )
}
