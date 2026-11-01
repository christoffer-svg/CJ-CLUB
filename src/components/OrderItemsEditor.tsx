import { useState } from 'react'
import Dialog from './admin/Dialog'
import { Field, Input, Textarea, Toggle } from './admin/Fields'
import { useToast } from './admin/Toast'
import { parseAmount } from '../lib/amount'
import { deleteOrderItem, saveOrderItem, saveOrderSettings, sections, setItemAvailable, useOrderItems } from '../lib/orders'
import { formatMoney } from '../lib/projects'
import type { Place } from '../lib/types'

type Form = { id: string | null; section: string; name: string; description: string; price: string; available: boolean; order: number }
const money = (n: number) => formatMoney(n, 'es-ES')
const num = (s: string) => (s.trim() === '' || s.trim() === '0' ? 0 : parseAmount(s))

/** Platos que se pueden pedir en la app y ajustes de pedidos de un restaurante */
export default function OrderItemsEditor({ placeId, place }: { placeId: string; place: Place }) {
  const toast = useToast()
  const items = useOrderItems(placeId)
  const [form, setForm] = useState<Form | null>(null)
  const [busy, setBusy] = useState(false)
  const [settings, setSettings] = useState({
    ordersOpen: place.ordersOpen === true,
    deliveryFee: place.deliveryFee ? String(place.deliveryFee).replace('.', ',') : '',
    minOrder: place.minOrder ? String(place.minOrder).replace('.', ',') : '',
  })
  const fee = num(settings.deliveryFee)
  const min = num(settings.minOrder)
  const settingsValid = fee >= 0 && fee <= 100 && min >= 0 && min <= 1000
  const grouped = sections(items.data)
  const sectionNames = grouped.map(([s]) => s).filter(Boolean)
  const price = form ? num(form.price) : 0
  const noMode = !place.takeaway && !place.delivery

  async function saveSettings() {
    if (!settingsValid) return
    if (settings.ordersOpen && items.data.filter((i) => i.available).length === 0) {
      toast('Añada primero algún plato disponible.', 'error')
      return
    }
    setBusy(true)
    try {
      await saveOrderSettings(placeId, { ordersOpen: settings.ordersOpen, deliveryFee: fee, minOrder: min })
      toast(settings.ordersOpen ? 'Pedidos en la app activados. Los clientes ya pueden pedir.' : 'Pedidos en la app desactivados.')
    } catch {
      toast('No se pudo guardar.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function saveItem() {
    if (!form || !form.name.trim() || !(price >= 0)) return
    setBusy(true)
    try {
      await saveOrderItem(placeId, form.id, { section: form.section, name: form.name, description: form.description, price, available: form.available, order: form.order })
      toast(`Guardado: ${form.name.trim()}`)
      setForm(null)
    } catch {
      toast('No se pudo guardar el plato.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="card a-form profile-editor">
        <span className="a-field__label">Ajustes de pedidos</span>
        {noMode && <p className="a-error">Primero indique en «Presentación» si hace comida para llevar o entrega a domicilio.</p>}
        <Toggle checked={settings.ordersOpen} onChange={(v) => setSettings({ ...settings, ordersOpen: v })} label={settings.ordersOpen ? 'Aceptamos pedidos en la app' : 'No aceptamos pedidos en la app ahora'} />
        <p className="a-field__hint">Desactívelo cuando la cocina esté cerrada o no pueda atender pedidos: los clientes verán la lista de platos, pero no podrán pedir.</p>
        {place.delivery && (
          <div className="a-grid-2">
            <Field label="Gastos de envío, IVA incluido (€)" hint={settings.deliveryFee.trim() ? (fee >= 0 ? (fee ? `= ${money(fee)}` : 'Gratis') : 'Importe no válido') : 'Vacío = envío gratis'}>
              <Input inputMode="decimal" value={settings.deliveryFee} onChange={(e) => setSettings({ ...settings, deliveryFee: e.target.value })} />
            </Field>
            <Field label="Pedido mínimo a domicilio (€)" hint={settings.minOrder.trim() ? (min >= 0 ? (min ? `= ${money(min)}` : 'Sin mínimo') : 'Importe no válido') : 'Vacío = sin mínimo'}>
              <Input inputMode="decimal" value={settings.minOrder} onChange={(e) => setSettings({ ...settings, minOrder: e.target.value })} />
            </Field>
          </div>
        )}
        <div className="profile-editor__actions">
          <button className="btn a-btn" disabled={busy || !settingsValid || (noMode && settings.ordersOpen)} onClick={saveSettings}>
            Guardar ajustes
          </button>
        </div>
      </div>

      <div className="a-title ord-items__title">
        <h2 className="a-subtitle">Platos para pedir</h2>
        <button className="btn a-btn" onClick={() => setForm({ id: null, section: sectionNames.at(-1) ?? '', name: '', description: '', price: '', available: true, order: (items.data.at(-1)?.order ?? 0) + 10 })}>
          Añadir plato
        </button>
      </div>
      <p className="card__text">Escriba aquí los platos que se pueden pedir, con su precio con IVA. Si un plato se agota, desactívelo: se sigue viendo, pero no se puede pedir.</p>
      {!items.loading && items.data.length === 0 && <p className="a-empty">Aún no hay platos.</p>}
      {grouped.map(([section, list]) => (
        <section key={section} className="a-group">
          {section && <h3 className="a-section-title">{section}</h3>}
          <div className="card a-list">
            {list.map((it) => (
              <div key={it.id} className={it.available ? 'a-row' : 'a-row a-row--off'}>
                <div className="a-row__body">
                  <span className="card__title">
                    {it.name} · {money(it.price)}
                  </span>
                  {it.description && <span className="card__text">{it.description}</span>}
                </div>
                <Toggle
                  checked={it.available}
                  label={it.available ? 'Disponible' : 'Agotado'}
                  onChange={(v) => setItemAvailable(placeId, it.id, v).catch(() => toast('No se pudo guardar.', 'error'))}
                />
                <button className="a-link" onClick={() => setForm({ ...it, price: String(it.price).replace('.', ',') })}>
                  Editar
                </button>
                <button className="a-link" onClick={() => window.confirm(`¿Borrar «${it.name}»?`) && deleteOrderItem(placeId, it.id).catch(() => toast('No se pudo borrar.', 'error'))}>
                  Borrar
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {form && (
        <Dialog title={form.id ? 'Editar plato' : 'Nuevo plato'} busy={busy} onClose={() => setForm(null)} onSubmit={saveItem}>
          <Field label="Apartado" hint="Por ejemplo: Entrantes, Arroces, Postres. Los platos del mismo apartado salen juntos.">
            <Input list="ord-sections" maxLength={60} value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
            <datalist id="ord-sections">
              {sectionNames.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <div className="a-grid-2">
            <Field label="Plato">
              <Input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Precio con IVA (€)" hint={form.price.trim() ? (price >= 0 ? `= ${money(price)}` : 'Importe no válido') : undefined}>
              <Input required inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </Field>
          </div>
          <Field label="Descripción (opcional)" hint="Ingredientes, raciones o alérgenos.">
            <Textarea maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Posición" hint="Número más bajo = sale antes.">
            <Input inputMode="numeric" value={String(form.order)} onChange={(e) => setForm({ ...form, order: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
          </Field>
          <Toggle checked={form.available} onChange={(v) => setForm({ ...form, available: v })} label={form.available ? 'Disponible' : 'Agotado'} />
        </Dialog>
      )}
    </>
  )
}
