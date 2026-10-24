import { useEffect, useState } from 'react'
import { PageTitle } from '../../components/admin/AdminLayout'
import { Bilingual } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { saveDoc, useLiveDoc } from '../../lib/admin'
import type { TipOfTheWeek } from '../../lib/types'

export default function Tip() {
  const tip = useLiveDoc<TipOfTheWeek>('settings/tipOfTheWeek')
  const toast = useToast()
  const [draft, setDraft] = useState<TipOfTheWeek>({ text_es: '', text_en: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (tip.data) setDraft({ text_es: tip.data.text_es ?? '', text_en: tip.data.text_en ?? '' })
  }, [tip.data])

  const changed = draft.text_es !== (tip.data?.text_es ?? '') || draft.text_en !== (tip.data?.text_en ?? '')

  return (
    <>
      <PageTitle eyebrow="Panel" title="Consejo de la semana" />
      <form
        className="card a-form"
        onSubmit={(e) => {
          e.preventDefault()
          setBusy(true)
          saveDoc('settings/tipOfTheWeek', { text_es: draft.text_es.trim(), text_en: draft.text_en.trim() })
            .then(() => toast('Consejo de la semana guardado'))
            .catch(() => toast('No se pudo guardar.', 'error'))
            .finally(() => setBusy(false))
        }}
      >
        <Bilingual
          label="Consejo"
          multiline
          es={draft.text_es}
          en={draft.text_en}
          onEs={(v) => setDraft({ ...draft, text_es: v })}
          onEn={(v) => setDraft({ ...draft, text_en: v })}
        />
        <p className="card__text">Aparece en la pantalla de Inicio de todos los clientes. Si lo deja vacío, no se muestra.</p>
        <div className="a-actions">
          <button className="btn a-btn" type="submit" disabled={busy || !changed}>
            Guardar
          </button>
        </div>
      </form>
    </>
  )
}
