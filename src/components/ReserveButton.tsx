import { useI18n } from '../i18n'
import { logReservationClick, markReservePending, reservationHref } from '../lib/reservations'
import type { Place } from '../lib/types'
import { useViewer } from '../lib/viewer'

/** Botón Reservar de un restaurante (enlace, teléfono o WhatsApp, según lo haya configurado CJ) */
export default function ReserveButton({ place, id }: { place: Place; id: string }) {
  const { clientId, preview } = useViewer()
  const { t } = useI18n()
  const href = reservationHref(place, t('discover.reserveWhatsapp'))
  if (!href) return null
  return (
    <a
      className="btn place__reserve"
      href={href}
      {...(place.reservationChannel === 'phone' ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
      onClick={() => {
        // En la vista previa se abre el enlace, pero no se cuenta el pinchazo
        if (preview || !clientId || !place.reservationChannel) return
        logReservationClick(id, clientId, place.reservationChannel).catch(() => {})
        markReservePending(id, place.name)
      }}
    >
      {t('discover.reserve')}
    </a>
  )
}
