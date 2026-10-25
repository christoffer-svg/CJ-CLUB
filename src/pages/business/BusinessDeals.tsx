import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { PageTitle } from '../../components/admin/AdminLayout'
import Dialog from '../../components/admin/Dialog'
import { Bilingual, Field, Input, Toggle } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { addToCollection, patchDoc, removeDoc } from '../../lib/admin'
import { useOwnDeals } from '../../lib/business'
import type { Deal } from '../../lib/types'
import type { BusinessOutlet } from './BusinessLayout'

type Draft = {
  title: string
  discountLabel: string
  code: string
  description_es: string
  description_en: string
  conditions_es: string
  conditions_en: string
  validFrom: string
  validUntil: string
  active: boolean
  order: number
}

const blank = (order: number): Draft => ({
  title: '',
  discountLabel: '',
  code: '',
  description_es: '',
  description_en: '',
  conditions_es: '',
  conditions_en: '',
  validFrom: '',
  validUntil: '',
  active: true,
  order,
})

function fromDeal(d: Deal): Draft {
  return {
    title: d.title,
    discountLabel: d.discountLabel,
    code: d.code,
    description_es: d.description_es ?? '',
    description_en: d.description_en ?? '',
    conditions_es: d.conditions_es,
    conditions_en: d.conditions_en,
    validFrom: d.validFrom ?? '',
    validUntil: d.validUntil ?? '',
    active: d.active,
    order: d.order,
  }
}

function payload(draft: Draft, placeId: string, businessName: string, uid: string, existing?: Deal) {
  return {
    title: draft.title.trim(),
    discountLabel: draft.discountLabel.trim(),
    code: draft.code.trim().toUpperCase(),
    description_es: draft.description_es.trim(),
    description_en: draft.description_en.trim(),
    conditions_es: draft.conditions_es.trim(),
    conditions_en: draft.conditions_en.trim(),
    validFrom: draft.validFrom,
    validUntil: draft.validUntil,
    active: draft.active,
    order: Math.max(0, Math.min(9999, Math.round(Number(draft.order)) || 0)),
    placeId,
    businessName,
    source: 'business' as const,
    createdByUid: existing?.createdByUid || uid,
    hiddenByAdmin: existing?.hiddenByAdmin === true,
  }
}

export default function BusinessDeals() {
  const { placeName, placeId } = useOutletContext<BusinessOutlet>()
  const { user } = useAuth()
  const deals = useOwnDeals(placeId || undefined)
  const toast = useToast()
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null)
  const [removing, setRemoving] = useState<{ id: string; title: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const draft = editing?.draft
  const sorted = [...deals.data].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'es'))
  const current = editing?.id ? deals.data.find((d) => d.id === editing.id) : undefined

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, [key]: value } } : e))
  }

  async function save() {
    if (!draft || !user || !placeId || !placeName) return
    if (!draft.title.trim() || !draft.discountLabel.trim() || !draft.code.trim()) {
      toast('Escriba el título, el descuento y el código.', 'error')
      return
    }
    if (draft.validFrom && draft.validUntil && draft.validFrom > draft.validUntil) {
      toast('La fecha de fin es anterior a la de inicio.', 'error')
      return
    }
    const texts = [draft.title, draft.discountLabel, draft.code, draft.description_es, draft.description_en, draft.conditions_es, draft.conditions_en]
    if (texts.some((t) => t.trim().length > 2000) || draft.title.trim().length > 120 || draft.code.trim().length > 40) {
      toast('Hay un texto demasiado largo.', 'error')
      return
    }
    setBusy(true)
    try {
      const data = payload(draft, placeId, placeName, user.uid, current)
      if (editing.id) await patchDoc(`deals/${editing.id}`, data)
      else await addToCollection('deals', data)
      toast(editing.id ? 'Descuento guardado' : 'Descuento publicado')
      setEditing(null)
    } catch {
      toast('No se pudo guardar. Inténtelo de nuevo.', 'error')
    } finally {
      setBusy(false)
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
      <PageTitle eyebrow="Su negocio" title={placeName || 'Descuentos'}>
        <button
          className="btn a-btn"
          disabled={!placeId || !placeName}
          onClick={() => setEditing({ id: null, draft: blank(sorted.reduce((m, x) => Math.max(m, x.order), 0) + 1) })}
        >
          Añadir descuento
        </button>
      </PageTitle>
      <p className="a-lead">
        Publique las ofertas de {placeName || 'su negocio'}. Los socios de CJ Club las verán en la app, con la frase «Descuento
        ofrecido por {placeName || 'su negocio'}» y «Condiciones fijadas por el negocio». Usted fija las condiciones.
      </p>

      {!placeId && <p className="a-empty">Su cuenta no está vinculada a un negocio. Contacte con CJ.</p>}

      <div className="card a-list">
        {sorted.map((x) => (
          <div key={x.id} className={x.active && !x.hiddenByAdmin ? 'a-row' : 'a-row a-row--off'}>
            <span className="a-row__value">{x.discountLabel}</span>
            <div className="a-row__body">
              <span className="card__title">{x.title}</span>
              <span className="card__text">
                Código {x.code}
                {x.hiddenByAdmin ? ' · Oculto por CJ' : x.active ? ' · Visible para los socios' : ' · En pausa'}
                {x.validUntil ? ` · Hasta ${x.validUntil}` : ''}
              </span>
            </div>
            <button className="a-link" onClick={() => setEditing({ id: x.id, draft: fromDeal(x) })}>
              Editar
            </button>
            <button className="a-link" onClick={() => setRemoving({ id: x.id, title: x.title })}>
              Retirar
            </button>
          </div>
        ))}
        {placeId && !deals.loading && sorted.length === 0 && <p className="a-empty">Aún no ha publicado ningún descuento.</p>}
        {deals.error && <p className="a-empty">No se pudieron cargar sus descuentos.</p>}
      </div>

      {draft && (
        <Dialog
          title={editing?.id ? 'Editar descuento' : 'Nuevo descuento'}
          onClose={() => setEditing(null)}
          busy={busy}
          onSubmit={() => void save()}
        >
          {current?.hiddenByAdmin && (
            <p className="a-lead">
              CJ ha ocultado esta oferta. Los socios no la ven. Puede corregirla, pero solo CJ puede volver a mostrarla.
            </p>
          )}
          <Field label="Título" hint="Lo que verá el socio. Por ejemplo, «10% entre semana».">
            <Input required maxLength={120} value={draft.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <div className="a-grid-2">
            <Field label="Descuento" hint='Ej. "20%" o "Gratis"'>
              <Input required maxLength={40} value={draft.discountLabel} onChange={(e) => set('discountLabel', e.target.value)} />
            </Field>
            <Field label="Código" hint="El socio lo enseña al pagar.">
              <Input required maxLength={40} value={draft.code} onChange={(e) => set('code', e.target.value)} />
            </Field>
          </div>
          <Bilingual
            label="Descripción"
            multiline
            es={draft.description_es}
            en={draft.description_en}
            onEs={(v) => set('description_es', v)}
            onEn={(v) => set('description_en', v)}
          />
          <Bilingual
            label="Condiciones"
            multiline
            es={draft.conditions_es}
            en={draft.conditions_en}
            onEs={(v) => set('conditions_es', v)}
            onEn={(v) => set('conditions_en', v)}
          />
          <div className="a-grid-2">
            <Field label="Válido desde" hint="Opcional.">
              <Input type="date" value={draft.validFrom} onChange={(e) => set('validFrom', e.target.value)} />
            </Field>
            <Field label="Válido hasta" hint="Opcional.">
              <Input type="date" value={draft.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
            </Field>
          </div>
          <Field label="Orden" hint="Un número menor aparece antes.">
            <Input type="number" min={0} max={9999} value={draft.order} onChange={(e) => set('order', Number(e.target.value))} />
          </Field>
          <Toggle checked={draft.active} label="Visible para los socios" onChange={(v) => set('active', v)} />
        </Dialog>
      )}

      {removing && (
        <Dialog title="Retirar descuento" onClose={() => setRemoving(null)} busy={busy} submitLabel="Retirar" danger onSubmit={() => void remove()}>
          <p className="a-lead">Los socios dejarán de ver «{removing.title}». Puede publicar otra oferta cuando quiera.</p>
        </Dialog>
      )}
    </>
  )
}
