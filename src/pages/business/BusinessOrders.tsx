import { useOutletContext, useSearchParams } from 'react-router-dom'
import { PageTitle } from '../../components/admin/AdminLayout'
import OrderItemsEditor from '../../components/OrderItemsEditor'
import OrdersManager from '../../components/OrdersManager'
import type { BusinessOutlet } from './BusinessLayout'

/** Pedidos de comida de los clientes de CJ (para llevar o a domicilio) y la lista de platos */
export default function BusinessOrders() {
  const { placeName, placeId, place } = useOutletContext<BusinessOutlet>()
  const [params, setParams] = useSearchParams()
  const tab = params.get('ver') === 'platos' ? 'items' : 'orders'
  return (
    <>
      <PageTitle eyebrow={placeName} title="Pedidos" />
      <div className="pills">
        <button className={tab === 'orders' ? 'pill pill--active' : 'pill'} onClick={() => setParams({}, { replace: true })}>
          Pedidos
        </button>
        <button className={tab === 'items' ? 'pill pill--active' : 'pill'} onClick={() => setParams({ ver: 'platos' }, { replace: true })}>
          Platos y ajustes
        </button>
      </div>
      {!place || !placeId ? (
        <p className="a-empty">Cargando…</p>
      ) : place.category !== 'restaurants' ? (
        <p className="a-empty">Los pedidos son solo para restaurantes.</p>
      ) : tab === 'orders' ? (
        <>
          <p className="card__text">
            Mantenga esta página abierta mientras acepte pedidos: los nuevos aparecen al momento. Acepte o rechace cada pedido; el cliente ve el estado en la app. Se paga al recoger o al repartidor.
          </p>
          <OrdersManager placeId={placeId} />
        </>
      ) : (
        <OrderItemsEditor key={placeId} placeId={placeId} place={place} />
      )}
    </>
  )
}
