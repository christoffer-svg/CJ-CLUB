import { doc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { db, functions } from './firebase'

/**
 * Traducción de «Mi reforma» al idioma de quien la lee (si no es el español). La hace el servidor
 * (función translateReform, con la IA de Claude) y la guarda en projects/{id}/translations/{idioma}.
 * Los componentes de la reforma muestran sus textos con tr(texto).
 */
export type ReformTr = {
  /** hay traducción para este idioma */
  active: boolean
  /** el cliente ha pulsado «Ver original» */
  original: boolean
  setOriginal: (v: boolean) => void
  /** traduciendo algo nuevo */
  working: boolean
  tr: (text: string | null | undefined) => string
}

const identity: ReformTr = { active: false, original: false, setOriginal: () => {}, working: false, tr: (s) => s ?? '' }
export const ReformTrContext = createContext<ReformTr>(identity)
export const useTr = () => useContext(ReformTrContext).tr

const call = httpsCallable<{ projectId: string; target: string }, { translated: number }>(functions, 'translateReform', { timeout: 300_000 })

export function useReformTranslation(projectId: string, enabled: boolean): ReformTr {
  const { lang } = useI18n()
  const on = enabled && lang !== 'es' && Boolean(projectId)
  const [map, setMap] = useState<Map<string, string> | null>(null)
  const [original, setOriginal] = useState(false)
  const [working, setWorking] = useState(false)
  const misses = useRef(new Set<string>())
  const asked = useRef(new Set<string>())
  const busy = useRef(false)

  useEffect(() => {
    setMap(null)
    misses.current.clear()
    asked.current.clear()
    if (!on) return
    return onSnapshot(
      doc(db, 'projects', projectId, 'translations', lang),
      (s) => setMap(new Map(((s.get('items') as { s: string; t: string }[] | undefined) ?? []).map((x) => [x.s, x.t]))),
      () => setMap(new Map()),
    )
  }, [on, projectId, lang])

  // Al abrir y cuando aparece un texto sin traducir: el servidor traduce todo lo que falte de la reforma
  const run = () => {
    if (!on || busy.current) return
    busy.current = true
    setWorking(true)
    for (const m of misses.current) asked.current.add(m)
    misses.current.clear()
    call({ projectId, target: lang })
      .catch(() => {})
      .finally(() => {
        busy.current = false
        setWorking(false)
      })
  }
  useEffect(() => {
    if (on) run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, projectId, lang])
  useEffect(() => {
    if (!on || map === null || !misses.current.size) return
    const timer = setTimeout(run, 1500)
    return () => clearTimeout(timer)
  })

  const tr = (text: string | null | undefined) => {
    const s = (text ?? '').trim()
    if (!on || !s) return text ?? ''
    const found = map?.get(s)
    if (found === undefined && map !== null && !asked.current.has(s)) misses.current.add(s)
    return original || found === undefined ? (text ?? '') : found
  }
  return { active: on && Boolean(map?.size), original, setOriginal, working, tr }
}

/** Aviso arriba de la reforma: traducción automática, el original es el que vale, y «Ver original» */
export function ReformTrNotice({ value }: { value: ReformTr }) {
  const { t } = useI18n()
  if (!value.active && !value.working) return null
  return (
    <p className="chat__note reform-tr">
      {value.working && !value.active ? t('reformTr.working') : t('reformTr.notice')}{' '}
      {value.active && (
        <button type="button" className="translate__btn" onClick={() => value.setOriginal(!value.original)}>
          {value.original ? t('reformTr.showTranslation') : t('translate.original')}
        </button>
      )}
    </p>
  )
}
