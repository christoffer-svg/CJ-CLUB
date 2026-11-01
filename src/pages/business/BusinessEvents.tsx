import { useOutletContext } from 'react-router-dom'
import { PageTitle } from '../../components/admin/AdminLayout'
import EventsManager from '../../components/EventsManager'
import type { BusinessOutlet } from './BusinessLayout'

/** El negocio publica sus eventos (catas, música en vivo…) y confirma las reservas de los clientes de CJ */
export default function BusinessEvents() {
  const { placeName, placeId } = useOutletContext<BusinessOutlet>()
  return (
    <>
      <PageTitle eyebrow={placeName} title="Eventos" />
      <p className="card__text">
        Publique catas, música en vivo o cenas especiales. Los clientes de CJ Club los ven en la app y pueden pedir reserva; usted la confirma o la rechaza aquí y el cliente lo ve al momento. El pago se hace en su local.
      </p>
      {placeId ? <EventsManager placeId={placeId} placeName={placeName} /> : <p className="a-empty">Cargando…</p>}
    </>
  )
}
