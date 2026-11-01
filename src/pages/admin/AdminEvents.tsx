import { PageTitle } from '../../components/admin/AdminLayout'
import EventsManager from '../../components/EventsManager'

/** CJ ve los eventos de todos los negocios y sus reservas; puede ocultar uno o responder por el negocio */
export default function AdminEvents() {
  return (
    <>
      <PageTitle eyebrow="Panel" title="Eventos" />
      <p className="card__text">Los publica cada negocio desde su panel. Aquí puede ocultar un evento a los clientes y, si hace falta, confirmar o rechazar una reserva en nombre del negocio.</p>
      <EventsManager placeId={null} placeName="" admin />
    </>
  )
}
