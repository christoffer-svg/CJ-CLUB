import { PageTitle } from '../../components/admin/AdminLayout'
import Dialog from '../../components/admin/Dialog'
import { Bilingual, Field, Input, Toggle } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { useEditor } from '../../components/admin/useEditor'
import { patchDoc, removeDoc, useLiveCollection } from '../../lib/admin'
import { parseAmount } from '../../lib/amount'
import { formatMoney } from '../../lib/projects'
import type { CjService } from '../../lib/types'

type Draft = Omit<CjService, 'price'> & { price: string }
const empty: Draft = { name_es: '', name_en: '', description_es: '', description_en: '', price: '', priceNote_es: '', priceNote_en: '', active: true, order: 0 }
const priceText = (s: CjService) => (s.price == null ? 'Precio a consultar' : `${formatMoney(s.price, 'es-ES')} ${s.priceNote_es}`.trim())

/** Servicios de CJ que los clientes pueden pedir desde Peticiones (key holding, reforma, vigilancia…) */
export default function AdminServices() {
  const services = useLiveCollection<CjService>('services')
  const editor = useEditor<Draft>('services', empty)
  const toast = useToast()
  const d = editor.editing?.draft
  const list = [...services.data].sort((a, b) => a.order - b.order || a.name_es.localeCompare(b.name_es))
  const price = d && d.price.trim() ? parseAmount(d.price) : null

  return (
    <>
      <PageTitle eyebrow="Panel" title="Servicios de CJ">
        <button className="btn a-btn" onClick={() => editor.openNew({ order: (list.at(-1)?.order ?? 0) + 10 })}>
          Añadir servicio
        </button>
      </PageTitle>
      <p className="card__text">
        Los clientes los ven en «Peticiones» y los piden con un toque. Cada petición llega a «Peticiones» de este panel. Puede poner un precio o dejarlo vacío para «Precio a consultar».
      </p>
      <div className="card a-list">
        {list.map((s) => (
          <div key={s.id} className={s.active ? 'a-row' : 'a-row a-row--off'}>
            <div className="a-row__body">
              <span className="card__title">{s.name_es}</span>
              <span className="card__text">{priceText(s)}</span>
            </div>
            <Toggle
              checked={s.active}
              label={s.active ? 'Visible' : 'Oculto'}
              onChange={(v) => patchDoc(`services/${s.id}`, { active: v }).then(() => toast(`${s.name_es}: ${v ? 'visible' : 'oculto'}`)).catch(() => toast('No se pudo guardar.', 'error'))}
            />
            <button className="a-link" onClick={() => editor.openEdit(s.id, { ...s, price: s.price == null ? '' : String(s.price).replace('.', ',') })}>
              Editar
            </button>
            <button
              className="a-link"
              onClick={() =>
                window.confirm(`¿Borrar «${s.name_es}»? Las peticiones ya enviadas se conservan.`) &&
                removeDoc(`services/${s.id}`).then(() => toast('Servicio borrado.')).catch(() => toast('No se pudo borrar.', 'error'))
              }
            >
              Borrar
            </button>
          </div>
        ))}
        {!services.loading && list.length === 0 && <p className="a-empty">Aún no hay servicios. Añada, por ejemplo, Key holding, Reforma o Vigilancia de la casa.</p>}
      </div>

      {d && (
        <Dialog
          title={editor.editing?.id ? 'Editar servicio' : 'Nuevo servicio'}
          busy={editor.busy}
          onClose={editor.close}
          onSubmit={() => {
            if (!d.name_es.trim()) return
            if (price !== null && !(price >= 0)) {
              toast('Precio no válido.', 'error')
              return
            }
            editor.save(
              (x) => ({
                name_es: x.name_es.trim(),
                name_en: x.name_en.trim(),
                description_es: x.description_es.trim(),
                description_en: x.description_en.trim(),
                price: price === null ? null : Math.round(price * 100) / 100,
                priceNote_es: x.priceNote_es.trim(),
                priceNote_en: x.priceNote_en.trim(),
                active: x.active,
                order: Math.max(0, Math.round(Number(x.order)) || 0),
              }),
              `Guardado: ${d.name_es}`,
            )
          }}
        >
          <Bilingual label="Nombre" es={d.name_es} en={d.name_en} onEs={(v) => editor.set('name_es', v)} onEn={(v) => editor.set('name_en', v)} />
          <Bilingual label="Descripción" multiline es={d.description_es} en={d.description_en} onEs={(v) => editor.set('description_es', v)} onEn={(v) => editor.set('description_en', v)} />
          <div className="a-grid-2">
            <Field label="Precio (€, opcional)" hint={d.price.trim() ? (price !== null && price >= 0 ? `= ${formatMoney(price, 'es-ES')}` : 'Importe no válido') : 'Vacío = «Precio a consultar»'}>
              <Input inputMode="decimal" value={d.price} onChange={(e) => editor.set('price', e.target.value)} />
            </Field>
            <Field label="Posición" hint="Número más bajo = sale antes.">
              <Input inputMode="numeric" value={String(d.order)} onChange={(e) => editor.set('order', Number(e.target.value.replace(/\D/g, '')) || 0)} />
            </Field>
          </div>
          <Bilingual label="Junto al precio" es={d.priceNote_es} en={d.priceNote_en} onEs={(v) => editor.set('priceNote_es', v)} onEn={(v) => editor.set('priceNote_en', v)} />
          <span className="a-field__hint">Por ejemplo: «al mes, IVA incluido» / «per month, VAT included», o «desde» / «from».</span>
          <Toggle checked={d.active} onChange={(v) => editor.set('active', v)} label={d.active ? 'Visible para los clientes' : 'Oculto'} />
        </Dialog>
      )}
    </>
  )
}
