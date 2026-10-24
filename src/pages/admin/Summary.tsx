import { collection, onSnapshot, query, Timestamp, where } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { PageTitle } from '../../components/admin/AdminLayout'
import { Select } from '../../components/admin/Fields'
import { useLiveCollection } from '../../lib/admin'
import { db } from '../../lib/firebase'
import type { Client, Deal, Place, UserProfile } from '../../lib/types'

/** Los últimos 12 meses, del actual hacia atrás */
function lastMonths(now: Date) {
  return Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - i, 1))
}
const monthLabel = (d: Date) => d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(' de ', ' ')

function useDealUsesBetween(start: Date, end: Date) {
  const [data, setData] = useState<{ dealId: string; clientId: string }[] | null>(null)
  useEffect(() => {
    setData(null)
    return onSnapshot(
      query(collection(db, 'dealUses'), where('date', '>=', Timestamp.fromDate(start)), where('date', '<', Timestamp.fromDate(end))),
      (snap) => setData(snap.docs.map((d) => ({ dealId: d.get('dealId'), clientId: d.get('clientId') }))),
      () => setData([]),
    )
  }, [start, end])
  return data
}

type Row = { id: string; label: string; value: number }

/** Lista ordenada con barras proporcionales y el número al lado (una sola serie, sin leyenda) */
function Ranking({ title, unit, rows, empty }: { title: string; unit: [string, string]; rows: Row[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <section className="card a-rank">
      <h2 className="a-section-title">{title}</h2>
      {rows.length === 0 ? (
        <p className="a-empty">{empty}</p>
      ) : (
        <ol className="a-rank__list">
          {rows.map((r) => (
            <li key={r.id} className="a-rank__row" title={`${r.label}: ${r.value} ${r.value === 1 ? unit[0] : unit[1]}`}>
              <span className="a-rank__label">{r.label}</span>
              <span className="a-rank__track" aria-hidden="true">
                <span className="a-rank__bar" style={{ width: `${(r.value / max) * 100}%` }} />
              </span>
              <span className="a-rank__value">{r.value}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export default function Summary() {
  const [now] = useState(() => new Date())
  const months = useMemo(() => lastMonths(now), [now])
  const [monthIndex, setMonthIndex] = useState(0)
  const start = months[monthIndex]
  const end = useMemo(() => new Date(start.getFullYear(), start.getMonth() + 1, 1), [start])

  const clients = useLiveCollection<Client>('clients')
  const users = useLiveCollection<UserProfile>('users')
  const deals = useLiveCollection<Deal>('deals')
  const places = useLiveCollection<Place>('places')
  const uses = useDealUsesBetween(start, end)

  const newClients = clients.data.filter((c) => {
    const d = c.clientSince?.toDate()
    return d && d >= start && d < end
  }).length
  const clientUsers = users.data.filter((u) => u.role === 'client')
  const dealName = Object.fromEntries(deals.data.map((d) => [d.id, d.title]))
  const placeName = Object.fromEntries(places.data.map((p) => [p.id, p.name]))

  const byDeal: Record<string, number> = {}
  uses?.forEach((u) => (byDeal[u.dealId] = (byDeal[u.dealId] ?? 0) + 1))
  const dealRows = Object.entries(byDeal)
    .map(([id, value]) => ({ id, label: dealName[id] ?? 'Descuento borrado', value }))
    .sort((a, b) => b.value - a.value)
  const familiesUsing = new Set(uses?.map((u) => u.clientId)).size

  const bySaved: Record<string, number> = {}
  clientUsers.forEach((u) => u.favorites?.forEach((id) => placeName[id] && (bySaved[id] = (bySaved[id] ?? 0) + 1)))
  const placeRows = Object.entries(bySaved)
    .map(([id, value]) => ({ id, label: placeName[id], value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const loading = clients.loading || uses === null
  const tiles = [
    { label: 'Clientes', value: clients.data.length, note: 'en total' },
    { label: 'Altas', value: newClients, note: 'con fecha de alta en el mes' },
    { label: 'Descuentos usados', value: uses?.length ?? 0, note: `por ${familiesUsing} ${familiesUsing === 1 ? 'familia' : 'familias'}` },
    { label: 'Lugares guardados', value: Object.values(bySaved).reduce((a, b) => a + b, 0), note: 'favoritos de todos los clientes, hoy' },
  ]

  return (
    <>
      <PageTitle eyebrow="Panel" title="Resumen del mes">
        <Select aria-label="Mes" value={monthIndex} onChange={(e) => setMonthIndex(Number(e.target.value))}>
          {months.map((m, i) => (
            <option key={i} value={i}>
              {monthLabel(m)}
            </option>
          ))}
        </Select>
      </PageTitle>

      <div className="a-tiles" aria-busy={loading}>
        {tiles.map((t) => (
          <div key={t.label} className="card a-tile">
            <span className="a-tile__label">{t.label}</span>
            <span className="a-tile__value">{loading ? '–' : t.value}</span>
            <span className="a-tile__note">{t.note}</span>
          </div>
        ))}
      </div>

      <div className="a-rank-grid">
        <Ranking
          title="Descuentos más usados"
          unit={['uso', 'usos']}
          rows={dealRows}
          empty={`Ningún descuento usado en ${monthLabel(start)}.`}
        />
        <Ranking title="Lugares más guardados" unit={['cliente', 'clientes']} rows={placeRows} empty="Ningún cliente ha guardado lugares todavía." />
      </div>
      <p className="a-field__hint">
        «Descuentos usados» cuenta cada vez que un cliente pulsa «Usar» en la app. Los lugares guardados son los favoritos actuales.
      </p>
    </>
  )
}
