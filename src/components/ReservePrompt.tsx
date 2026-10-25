import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { clearReservePending, logReservationConfirm, readReservePending, type ReservePending } from '../lib/reservations'
import { useViewer } from '../lib/viewer'
import Sheet from './Sheet'

/** Al volver de reservar, pregunta una sola vez si consiguió mesa. En la vista previa no se anota nada. */
export default function ReservePrompt() {
  const { preview, clientId } = useViewer()
  const { t } = useI18n()
  const [ask, setAsk] = useState<ReservePending | null>(null)
  const [done, setDone] = useState(false)
  const left = useRef(false)
  const shown = useRef(false)

  useEffect(() => {
    if (preview) return
    const consider = () => {
      if (shown.current || !left.current || document.visibilityState === 'hidden') return
      const pending = readReservePending()
      if (!pending || Date.now() - pending.at < 1500) return
      shown.current = true
      setAsk(pending)
    }
    const onHide = () => {
      left.current = true
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') onHide()
      else consider()
    }
    window.addEventListener('blur', onHide)
    window.addEventListener('focus', consider)
    document.addEventListener('visibilitychange', onVis)
    const timer = window.setInterval(consider, 1000)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('blur', onHide)
      window.removeEventListener('focus', consider)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [preview])

  if (preview || !ask) return null

  function close() {
    clearReservePending()
    setAsk(null)
    setDone(false)
    left.current = false
    shown.current = false
  }

  return (
    <Sheet
      title={t('discover.reserveAsk', { name: ask.name })}
      closeLabel={done ? t('benefits.close') : t('discover.reserveNo')}
      onClose={close}
    >
      <h2 className="sheet__title">{done ? t('discover.reserveThanks') : t('discover.reserveAsk', { name: ask.name })}</h2>
      {!done && <p className="sheet__text">{t('discover.reserveAskText')}</p>}
      {!done && (
        <button
          className="btn"
          onClick={() => {
            if (clientId) logReservationConfirm(ask.placeId, clientId).catch(() => {})
            clearReservePending()
            setDone(true)
            left.current = false
          }}
        >
          {t('discover.reserveYes')}
        </button>
      )}
    </Sheet>
  )
}
