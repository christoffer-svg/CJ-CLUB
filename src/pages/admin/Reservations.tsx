import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, Timestamp, where } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageTitle } from '../../components/admin/AdminLayout'
import { Select } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { useLiveCollection } from '../../lib/admin'
import { db } from '../../lib/firebase'
import type { Place, ReservationChannel, ReservationClick, ReservationConfirm, ReservationReport } from '../../lib/types'

function lastMonths(now: Date) {
  return Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - i, 1))
}
const monthLabel = (d: Date) => d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(' de ', ' ')
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

const channelName: Record<ReservationChannel, string> = {
  link: 'Enlace',
  phone: 'Teléfono',
  whatsapp: 'WhatsApp',
}

type ClickRow = Pick<ReservationClick, 'placeId' | 'clientId' | 'uid' | 'channel'>
type ConfirmRow = Pick<ReservationConfirm, 'placeId' | 'clientId' | 'uid'>

function useRange<T>(name: string, start: Date, end: Date) {
  const [data, setData] = useState<T[] | null>(null)
  useEffect(() => {
    setData(null)
    return onSnapshot(
      query(collection(db, name), where('createdAt', '>=', Timestamp.fromDate(start)), where('createdAt', '<', Timestamp.fromDate(end))),
      (snap) => setData(snap.docs.map((d) => d.data() as T)),
      () => setData([]),
    )
  }, [name, start, end])
  return data
}

function useReports(month: string) {
  const [data, setData] = useState<ReservationReport[] | null>(null)
  useEffect(() => {
    setData(null)
    return onSnapshot(
      query(collection(db, 'reservationReports'), where('month', '==', month)),
      (snap) => setData(snap.docs.map((d) => d.data() as ReservationReport)),
      () => setData([]),
    )
  }, [month])
  return data
}

type Stats = {
  clicks: number
  users: number
  confirms: number
  channels: Record<ReservationChannel, number>
  reported: number | null
}

function csvCell(value: string) {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safe.replaceAll('"', '""')}"`
}

function fileSlug(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'restaurante'
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = `\uFEFF${rows.map((r) => r.map(csvCell).join(';')).join('\r\n')}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function letter(name: string, when: string, stats: Stats) {
  const reported = stats.reported === null ? 'aún sin anotar' : String(stats.reported)
  const clickWord = stats.clicks === 1 ? 'vez han pulsado Reservar' : 'veces han pulsado Reservar'
  const userWord = stats.users === 1 ? 'cliente distinto' : 'clientes distintos'
  const confirmWord = stats.confirms === 1 ? 'vez un cliente indicó que reservó' : 'veces un cliente indicó que reservó'
  return [
    `CJ Club — Reservas de ${when}`,
    name,
    '',
    `· ${stats.clicks} ${clickWord}`,
    `· ${stats.users} ${userWord}`,
    `· ${stats.confirms} ${confirmWord}`,
    `· Reservas confirmadas por el restaurante: ${reported}`,
    '',
    'Los enlaces de la app llevan utm_source=cjclub para reconocerlos en el sistema de reservas del restaurante.',
    'CJ Club no ve si la reserva se completó en TheFork, CoverManager, OpenTable o la web del restaurante.',
  ].join('\n')
}

const csvHeader = ['Restaurante', 'Pinchazos', 'Clientes distintos', 'El cliente dijo que reservó', 'Reservas anotadas por el restaurante', 'Cómo reservan']

function ReportedCount({ placeId, month, saved, name }: { placeId: string; month: string; saved: number | null; name: string }) {
  const toast = useToast()
  const [draft, setDraft] = useState<string | null>(null)
  const [local, setLocal] = useState(saved)
  const [busy, setBusy] = useState(false)
  const shown = draft ?? (local === null ? '' : String(local))

  useEffect(() => setLocal(saved), [saved])

  async function save() {
    const text = (draft ?? (saved === null ? '' : String(saved))).trim()
    if (text === '') {
      setDraft(null)
      return
    }
    const n = Number(text)
    if (!Number.isInteger(n) || n < 0 || n > 100000) {
      toast('Escriba un número entero, cero o más.', 'error')
      setDraft(null)
      return
    }
    if (n === saved) {
      setDraft(null)
      return
    }
    setBusy(true)
    try {
      await setDoc(doc(db, 'reservationReports', `${placeId}_${month}`), {
        placeId,
        month,
        count: n,
        updatedAt: serverTimestamp(),
      })
      setLocal(n)
      setDraft(null)
      toast('Número anotado')
    } catch {
      toast('No se pudo guardar.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <input
      className="a-input a-reserve-count"
      inputMode="numeric"
      aria-label={`Reservas anotadas de ${name}`}
      placeholder="—"
      disabled={busy}
      value={shown}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => void save()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          void save()
        }
      }}
    />
  )
}

export default function Reservations() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [now] = useState(() => new Date())
  const months = useMemo(() => lastMonths(now), [now])
  const fromUrl = months.findIndex((m) => monthKey(m) === params.get('mes'))
  const [monthIndex, setMonthIndex] = useState(fromUrl >= 0 ? fromUrl : 0)
  const start = months[monthIndex]
  const end = useMemo(() => new Date(start.getFullYear(), start.getMonth() + 1, 1), [start])
  const key = monthKey(start)
  const when = monthLabel(start)
  const informeId = params.get('informe')

  const places = useLiveCollection<Place>('places')
  const clicks = useRange<ClickRow>('reservationClicks', start, end)
  const confirms = useRange<ConfirmRow>('reservationConfirms', start, end)
  const reports = useReports(key)

  const rows = useMemo(() => {
    const byId = new Map(places.data.map((p) => [p.id, p]))
    const ids = new Set(places.data.filter((p) => p.category === 'restaurants').map((p) => p.id))
    clicks?.forEach((c) => ids.add(c.placeId))
    confirms?.forEach((c) => ids.add(c.placeId))
    reports?.forEach((r) => ids.add(r.placeId))

    const blank = (): Stats & { usersSet: Set<string> } => ({
      clicks: 0,
      users: 0,
      confirms: 0,
      channels: { link: 0, phone: 0, whatsapp: 0 },
      reported: null,
      usersSet: new Set(),
    })
    const map = new Map<string, ReturnType<typeof blank>>()
    ids.forEach((id) => map.set(id, blank()))
    clicks?.forEach((c) => {
      const row = map.get(c.placeId)
      if (!row) return
      row.clicks += 1
      if (c.uid || c.clientId) row.usersSet.add(c.uid || c.clientId)
      if (c.channel === 'link' || c.channel === 'phone' || c.channel === 'whatsapp') row.channels[c.channel] += 1
    })
    confirms?.forEach((c) => {
      const row = map.get(c.placeId)
      if (row) row.confirms += 1
    })
    reports?.forEach((r) => {
      const row = map.get(r.placeId)
      if (row && typeof r.count === 'number') row.reported = r.count
    })

    return [...map.entries()]
      .map(([id, row]) => {
        const place = byId.get(id)
        const stats: Stats = { clicks: row.clicks, users: row.usersSet.size, confirms: row.confirms, channels: row.channels, reported: row.reported }
        return { id, place, name: place?.name ?? 'Restaurante ya no está en Lugares', stats }
      })
      .sort((a, b) => b.stats.clicks - a.stats.clicks || a.name.localeCompare(b.name, 'es'))
  }, [places.data, clicks, confirms, reports])

  const loading = places.loading || clicks === null || confirms === null || reports === null
  const totals = rows.reduce(
    (acc, row) => {
      acc.clicks += row.stats.clicks
      acc.confirms += row.stats.confirms
      if (row.stats.reported !== null) {
        acc.reported = (acc.reported ?? 0) + row.stats.reported
        acc.annotated += 1
      }
      return acc
    },
    { clicks: 0, confirms: 0, reported: null as number | null, annotated: 0 },
  )
  const uniqueUsers = new Set([
    ...(clicks ?? []).map((c) => c.uid || c.clientId).filter(Boolean),
  ]).size

  function openMonth(index: number) {
    setMonthIndex(index)
    const next = new URLSearchParams(params)
    next.set('mes', monthKey(months[index]))
    next.delete('informe')
    setParams(next, { replace: true })
  }

  function openInforme(id: string | null) {
    const next = new URLSearchParams(params)
    next.set('mes', key)
    if (id) next.set('informe', id)
    else next.delete('informe')
    setParams(next, { replace: true })
  }

  async function send(text: string) {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Reservas CJ Club', text })
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      toast('Texto copiado. Puede pegarlo en un mensaje al restaurante.')
    } catch {
      toast('No se pudo copiar. Use Imprimir o descargue el CSV.', 'error')
    }
  }

  function csvRows(list: typeof rows) {
    return [
      csvHeader,
      ...list.map((row) => [
        row.name,
        String(row.stats.clicks),
        String(row.stats.users),
        String(row.stats.confirms),
        row.stats.reported === null ? '' : String(row.stats.reported),
        row.place?.reservationChannel ? channelName[row.place.reservationChannel] : 'Sin botón',
      ]),
    ]
  }

  const informe = rows.find((row) => row.id === informeId) ?? null
  const tiles = [
    { label: 'Pinchazos', value: loading ? '–' : String(totals.clicks), note: 'veces que han pulsado Reservar' },
    { label: 'Clientes distintos', value: loading ? '–' : String(uniqueUsers), note: 'personas que han pulsado, en total' },
    { label: 'Dijeron que reservaron', value: loading ? '–' : String(totals.confirms), note: 'al volver a la app, es voluntario' },
    {
      label: 'Anotadas por el restaurante',
      value: loading ? '–' : totals.reported === null ? '—' : String(totals.reported),
      note: totals.annotated ? `suma de ${totals.annotated} ${totals.annotated === 1 ? 'restaurante' : 'restaurantes'}` : 'aún no ha anotado ningún número',
    },
  ]

  return (
    <>
      <div className="no-print">
        <PageTitle eyebrow="Panel" title="Reservas">
          <Select aria-label="Mes" value={monthIndex} onChange={(e) => openMonth(Number(e.target.value))}>
            {months.map((m, i) => (
              <option key={monthKey(m)} value={i}>
                {monthLabel(m)}
              </option>
            ))}
          </Select>
        </PageTitle>
      </div>

      {informe ? (
        <Informe
          name={informe.name}
          when={when}
          stats={informe.stats}
          onBack={() => openInforme(null)}
          onPrint={() => window.print()}
          onCsv={() => downloadCsv(`reservas-${fileSlug(informe.name)}-${key}.csv`, csvRows([informe]))}
          onSend={() => void send(letter(informe.name, when, informe.stats))}
        />
      ) : (
        <>
          <p className="print-only informe__kicker">
            CJ Club · Reservas · {when}
          </p>
          <div className="a-tiles" aria-busy={loading}>
            {tiles.map((tile) => (
              <div key={tile.label} className="card a-tile">
                <span className="a-tile__label">{tile.label}</span>
                <span className="a-tile__value">{tile.value}</span>
                <span className="a-tile__note">{tile.note}</span>
              </div>
            ))}
          </div>

          <section className="card a-reserve">
            <div className="a-reserve__bar no-print">
              <h2 className="a-section-title">Por restaurante</h2>
              <div className="a-title__actions">
                <button className="btn btn--ghost a-btn" type="button" onClick={() => window.print()}>
                  Imprimir
                </button>
                <button
                  className="btn a-btn"
                  type="button"
                  onClick={() => downloadCsv(`reservas-cjclub-${key}.csv`, csvRows(rows))}
                  disabled={rows.length === 0}
                >
                  Descargar CSV
                </button>
              </div>
            </div>
            {rows.length === 0 ? (
              <p className="a-empty">Aún no hay restaurantes. Añádalos en Lugares.</p>
            ) : (
              <div className="a-table-wrap">
                <table className="a-table">
                  <thead>
                    <tr>
                      <th>Restaurante</th>
                      <th>Pinchazos</th>
                      <th>Clientes</th>
                      <th>Dijeron que sí</th>
                      <th>Anotadas</th>
                      <th className="no-print">Informe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const bits = (Object.entries(row.stats.channels) as [ReservationChannel, number][])
                        .filter(([, n]) => n > 0)
                        .map(([channel, n]) => `${n} ${channelName[channel].toLowerCase()}`)
                      return (
                        <tr key={row.id}>
                          <td>
                            <span className="a-table__name">{row.name}</span>
                            {row.place?.active === false && <span className="a-badge">Oculto</span>}
                            <span className="card__text">
                              {row.place?.category === 'restaurants' && row.place.reservationChannel
                                ? `Reserva por ${channelName[row.place.reservationChannel].toLowerCase()}`
                                : 'Sin botón de reserva'}
                              {bits.length > 0 ? ` · ${bits.join(' · ')}` : ''}
                            </span>
                          </td>
                          <td className="a-table__num">{loading ? '–' : row.stats.clicks}</td>
                          <td className="a-table__num">{loading ? '–' : row.stats.users}</td>
                          <td className="a-table__num">{loading ? '–' : row.stats.confirms}</td>
                          <td className="no-print">
                            {row.place?.category === 'restaurants' ? (
                              <ReportedCount placeId={row.id} month={key} saved={row.stats.reported} name={row.name} />
                            ) : (
                              <span className="a-table__num">{row.stats.reported === null ? '—' : row.stats.reported}</span>
                            )}
                          </td>
                          <td className="print-only a-table__num">{row.stats.reported === null ? '—' : row.stats.reported}</td>
                          <td className="no-print">
                            <button className="a-link" type="button" onClick={() => openInforme(row.id)}>
                              Preparar
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="a-field__hint">
            El botón Reservar se pone en Lugares, en cada restaurante: un enlace de TheFork, CoverManager, OpenTable o su web, o un teléfono o WhatsApp.
            Los enlaces salen con la marca utm_source=cjclub para que el restaurante los vea en su propio sistema. La app no puede saber si la reserva se completó allí.
            «Dijeron que sí» es lo que el cliente responde al volver, si quiere. «Anotadas» es el número que le diga el restaurante: escríbalo y pulse fuera de la casilla para guardarlo.
            Ponga 0 si le confirman que no hubo reservas. El informe de cada restaurante no incluye los datos de los demás.
          </p>
        </>
      )}
    </>
  )
}

function Informe({
  name,
  when,
  stats,
  onBack,
  onPrint,
  onCsv,
  onSend,
}: {
  name: string
  when: string
  stats: Stats
  onBack: () => void
  onPrint: () => void
  onCsv: () => void
  onSend: () => void
}) {
  const figures = [
    { label: 'Han pulsado Reservar', value: String(stats.clicks), note: stats.clicks === 1 ? 'vez' : 'veces' },
    { label: 'Clientes distintos', value: String(stats.users), note: stats.users === 1 ? 'persona' : 'personas' },
    { label: 'Confirmaron en la app', value: String(stats.confirms), note: 'de forma voluntaria' },
    { label: 'Confirmadas por el restaurante', value: stats.reported === null ? '—' : String(stats.reported), note: stats.reported === null ? 'pendiente de anotar' : 'anotadas por CJ' },
  ]
  return (
    <article className="informe">
      <div className="a-title__actions no-print">
        <button className="btn btn--ghost a-btn" type="button" onClick={onBack}>
          Volver al resumen
        </button>
        <button className="btn btn--ghost a-btn" type="button" onClick={onPrint}>
          Imprimir o PDF
        </button>
        <button className="btn btn--ghost a-btn" type="button" onClick={onCsv}>
          Descargar CSV
        </button>
        <button className="btn a-btn" type="button" onClick={onSend}>
          Copiar o enviar
        </button>
      </div>
      <img className="informe__logo" src="/logo.png" alt="CJ" />
      <p className="informe__kicker">CJ Club · Costa Blanca</p>
      <h1 className="informe__title">Reservas desde la app</h1>
      <p className="informe__when">{when}</p>
      <h2 className="informe__place">{name}</h2>
      <div className="informe__stats">
        {figures.map((figure) => (
          <div key={figure.label} className="informe__stat">
            <span className="a-tile__label">{figure.label}</span>
            <b>{figure.value}</b>
            <span className="a-tile__note">{figure.note}</span>
          </div>
        ))}
      </div>
      <p className="informe__note">
        Estas cifras son de los clientes de CJ Club. Cada pinchazo es una vez que alguien ha abierto la reserva desde la app.
        Los enlaces llevan la referencia utm_source=cjclub, utm_medium=app y utm_campaign=reserva, para poder verlos en TheFork, CoverManager, OpenTable o la analítica de la web.
        CJ Club no recibe aviso cuando la reserva se completa en ese sistema. El número «confirmadas por el restaurante» es el que el restaurante ha comunicado a CJ para este mes.
        «Confirmaron en la app» son los clientes que, al volver, han indicado que consiguieron mesa. Es voluntario y no sustituye al número del restaurante.
      </p>
    </article>
  )
}
