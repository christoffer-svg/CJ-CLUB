import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { PageTitle } from '../../components/admin/AdminLayout'
import { Select } from '../../components/admin/Fields'
import { fetchReservationSummary, lastMonthKeys, monthLabel } from '../../lib/business'
import type { BusinessOutlet } from './BusinessLayout'

export default function BusinessReservations() {
  const { placeName, place } = useOutletContext<BusinessOutlet>()
  const months = useState(() => lastMonthKeys())[0]
  const [month, setMonth] = useState(months[0])
  const [clicks, setClicks] = useState<number | null>(null)
  const [error, setError] = useState(false)
  const restaurant = place?.category === 'restaurants'

  useEffect(() => {
    if (!restaurant) return
    let cancelled = false
    setClicks(null)
    setError(false)
    fetchReservationSummary(month)
      .then((res) => {
        if (!cancelled) setClicks(res.clicks)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [month, restaurant])

  return (
    <>
      <PageTitle eyebrow="Su negocio" title="Reservas">
        {restaurant && (
          <Select aria-label="Mes" value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </Select>
        )}
      </PageTitle>

      {!place && <p className="a-empty">Cargando la ficha…</p>}

      {place && !restaurant && (
        <p className="a-lead">Este resumen es para restaurantes. Su ficha no tiene el botón Reservar.</p>
      )}

      {restaurant && (
        <>
          <div className="a-tiles">
            <div className="card a-tile">
              <span className="a-tile__label">Pulsaciones en Reservar</span>
              <span className="a-tile__value">{error ? '–' : clicks === null ? '–' : clicks}</span>
              <span className="a-tile__note">{monthLabel(month)}</span>
            </div>
          </div>
          <p className="a-lead">
            Cada vez que un socio de CJ Club pulsa Reservar en {placeName}, se suma aquí. No vemos su nombre ni si la reserva se
            completó en su sistema. El mes es el de España.
          </p>
          {error && <p className="a-error">No se pudo cargar el resumen. Inténtelo de nuevo más tarde.</p>}
        </>
      )}
    </>
  )
}
