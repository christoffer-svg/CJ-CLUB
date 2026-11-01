import { PageTitle } from '../../components/admin/AdminLayout'
import OrdersManager from '../../components/OrdersManager'

/** CJ ve los pedidos de comida de todos los restaurantes; puede actuar si el restaurante lo pide */
export default function AdminOrders() {
  return (
    <>
      <PageTitle eyebrow="Panel" title="Pedidos de comida" />
      <p className="card__text">Los gestiona cada restaurante desde su panel. Aquí los ve todos y, si hace falta, puede aceptar o rechazar uno en su nombre.</p>
      <OrdersManager placeId={null} admin />
    </>
  )
}
