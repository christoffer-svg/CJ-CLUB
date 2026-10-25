import { PageTitle } from '../../components/admin/AdminLayout'
import Dialog from '../../components/admin/Dialog'
import { Bilingual, Field, FieldGroup, Input, Select, Toggle } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import LocationPicker from '../../components/admin/LocationPicker'
import { useEditor } from '../../components/admin/useEditor'
import { patchDoc, useLiveCollection } from '../../lib/admin'
import { reservationError } from '../../lib/reservations'
import type { GeoPoint, Place, ReservationChannel } from '../../lib/types'

const categories: [Place['category'], string][] = [
  ['restaurants', 'Restaurantes'],
  ['golf', 'Golf'],
  ['beaches', 'Playas'],
  ['plans', 'Planes'],
]

const reservationOptions: ['' | ReservationChannel, string][] = [
  ['', 'Sin botón de reserva'],
  ['link', 'Enlace (TheFork, CoverManager, OpenTable, web…)'],
  ['phone', 'Teléfono'],
  ['whatsapp', 'WhatsApp'],
]

const reservationLabel: Record<ReservationChannel, string> = {
  link: 'enlace',
  phone: 'teléfono',
  whatsapp: 'WhatsApp',
}

type Draft = Omit<Place, 'discountPercent' | 'location' | 'reservationChannel' | 'reservationTarget'> & {
  discountPercent: string
  location: GeoPoint | null
  reservationChannel: '' | ReservationChannel
  reservationTarget: string
}
const empty: Draft = {
  category: 'restaurants',
  name: '',
  meta_es: '',
  meta_en: '',
  cjNote_es: '',
  cjNote_en: '',
  discountPercent: '',
  active: true,
  location: null,
  reservationChannel: '',
  reservationTarget: '',
}

function reservationHint(channel: Draft['reservationChannel']) {
  if (channel === 'link') return 'Pegue el enlace de reserva del restaurante. El cliente verá el botón Reservar. Para cambiarlo, basta con guardar otro enlace.'
  if (channel === 'phone') return 'El botón Reservar llamará a este número. Un móvil de España puede ir sin prefijo.'
  if (channel === 'whatsapp') return 'El botón Reservar abrirá WhatsApp con un mensaje de CJ Club. Un móvil de España puede ir sin prefijo.'
  return 'Sin enlace, el restaurante sigue en la app pero no tiene botón de reserva.'
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
                    <span className="card__text">
                      {[
                        p.meta_es,
                        p.location ? null : 'sin ubicación en el mapa',
                        p.category === 'restaurants' ? (p.reservationChannel ? `reserva por ${reservationLabel[p.reservationChannel]}` : 'sin botón de reserva') : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
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
                    onClick={() =>
                      editor.openEdit(p.id, {
                        ...p,
                        discountPercent: p.discountPercent ? String(p.discountPercent) : '',
                        location: p.location ?? null,
                        reservationChannel: p.reservationChannel ?? '',
                        reservationTarget: p.reservationTarget ?? '',
                      })
                    }
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
          onSubmit={() => {
            if (!d.name.trim()) return
            const problem = reservationError(d.category, d.reservationChannel, d.reservationTarget)
            if (problem) {
              toast(problem, 'error')
              return
            }
            editor.save(({ discountPercent, reservationChannel, reservationTarget, ...x }) => {
              const pct = Math.round(Number(discountPercent))
              const allowed = reservationChannel === 'link' || reservationChannel === 'phone' || reservationChannel === 'whatsapp'
              const channel = x.category === 'restaurants' && allowed ? reservationChannel : null
              // sin descuento o sin reserva: se guarda null para borrar uno anterior
              return {
                ...x,
                name: x.name.trim(),
                discountPercent: pct > 0 && pct <= 100 ? pct : null,
                reservationChannel: channel,
                reservationTarget: channel ? reservationTarget.trim() : null,
              }
            }, `Guardado: ${d.name}`)
          }}
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
          {d.category === 'restaurants' && (
            <FieldGroup label="Reserva" hint={reservationHint(d.reservationChannel)}>
              <Select value={d.reservationChannel} onChange={(e) => editor.set('reservationChannel', e.target.value as Draft['reservationChannel'])}>
                {reservationOptions.map(([value, label]) => (
                  <option key={value || 'none'} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              {d.reservationChannel === 'link' && (
                <Input
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  value={d.reservationTarget}
                  onChange={(e) => editor.set('reservationTarget', e.target.value)}
                  aria-label="Enlace de reserva"
                />
              )}
              {(d.reservationChannel === 'phone' || d.reservationChannel === 'whatsapp') && (
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder={d.reservationChannel === 'whatsapp' ? '34600111222' : '+34 600 111 222'}
                  value={d.reservationTarget}
                  onChange={(e) => editor.set('reservationTarget', e.target.value)}
                  aria-label={d.reservationChannel === 'whatsapp' ? 'WhatsApp de reserva' : 'Teléfono de reserva'}
                />
              )}
            </FieldGroup>
          )}
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
          <FieldGroup label="Ubicación en el mapa">
            <LocationPicker label={`Ubicación de ${d.name || 'el lugar'}`} value={d.location} onChange={(v) => editor.set('location', v)} />
          </FieldGroup>
          <Toggle checked={d.active} label="Visible para los clientes" onChange={(v) => editor.set('active', v)} />
        </Dialog>
      )}
    </>
  )
}
