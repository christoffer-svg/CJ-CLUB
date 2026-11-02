import { httpsCallable } from 'firebase/functions'
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { functions } from './firebase'

/** Qué traducir: una publicación de Social (título, sitio y texto) o un mensaje de un chat */
export type TranslateTarget = { postId: string } | { chatId: string; messageId: string }

type Result = { texts: string[]; same: boolean }

const call = httpsCallable<TranslateTarget & { target: string }, Result>(functions, 'translateSocial', { timeout: 30_000 })

/**
 * Botón «Traducir» / «Ver original». Traduce al idioma de la app con la función translateSocial
 * (el servidor comprueba que se puede leer el texto). La traducción se pide solo al pulsar.
 * Devuelve los textos que hay que mostrar (originales o traducidos) y el botón.
 */
export function useTranslatable(target: TranslateTarget | null, originals: string[]) {
  const { t, lang } = useI18n()
  const [result, setResult] = useState<Result | null>(null)
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const key = JSON.stringify([target, originals, lang])

  useEffect(() => {
    setResult(null)
    setOn(false)
    setError('')
  }, [key])

  async function toggle() {
    if (on) return setOn(false)
    if (result) return setOn(true)
    if (!target) return
    setBusy(true)
    setError('')
    try {
      const r = (await call({ ...target, target: lang })).data
      setResult(r)
      setOn(!r.same)
    } catch (e) {
      setError(t((e as { code?: string }).code === 'functions/resource-exhausted' ? 'translate.limit' : 'translate.error'))
    } finally {
      setBusy(false)
    }
  }

  const shown = on && result ? originals.map((o, i) => result.texts[i] ?? o) : originals
  const control = target ? (
    <span className="translate">
      {result?.same ? (
        <span className="translate__note">{t('translate.same')}</span>
      ) : (
        <button type="button" className="translate__btn" disabled={busy} onClick={toggle}>
          {busy ? t('translate.busy') : on ? t('translate.original') : t('translate.do')}
        </button>
      )}
      {on && <span className="translate__note">{t('translate.by')}</span>}
      {error && <span className="translate__error">{error}</span>}
    </span>
  ) : null
  return { shown, control }
}
