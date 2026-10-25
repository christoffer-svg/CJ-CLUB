import { Link, useSearchParams } from 'react-router-dom'
import { PageTitle } from '../../components/admin/AdminLayout'
import AutoInput from '../../components/admin/AutoInput'
import { Select } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { useLiveCollection } from '../../lib/admin'
import { updateRequest } from '../../lib/messaging'
import type { ClientRequest, RequestStatus, RequestType } from '../../lib/types'
import { shortDate } from '../../lib/when'

const typeLabel: Record<RequestType, string> = {
  repair: 'Reparación',
  budget: 'Presupuesto',
  keys: 'Llaves',
  cleaning: 'Limpieza',
  other: 'Otro',
}
const statusLabel: Record<RequestStatus, string> = {
  new: 'Nueva',
  in_progress: 'En curso',
  done: 'Hecha',
  cancelled: 'Cancelada',
}
const filters: [string, string][] = [
  ['abiertas', 'Abiertas'],
  ['new', 'Nuevas'],
  ['in_progress', 'En curso'],
  ['done', 'Hechas'],
  ['todas', 'Todas'],
]

/** Peticiones de los clientes como tareas del equipo */
export default function AdminRequests() {
  const requests = useLiveCollection<ClientRequest>('requests')
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const filter = params.get('ver') ?? 'abiertas'

  const list = requests.data
    .filter((r) =>
      filter === 'todas' ? true : filter === 'abiertas' ? r.status === 'new' || r.status === 'in_progress' : r.status === filter,
    )
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
  const count = (s: string) =>
    requests.data.filter((r) => (s === 'todas' ? true : s === 'abiertas' ? r.status === 'new' || r.status === 'in_progress' : r.status === s))
      .length

  const save = (r: ClientRequest & { id: string }, data: Partial<Pick<ClientRequest, 'status' | 'cjNote'>>) =>
    updateRequest(r.id, data)
      .then(() => toast(`Guardado para ${r.familyName}`))
      .catch(() => toast('No se pudo guardar. Inténtelo de nuevo.', 'error'))

  return (
    <>
      <PageTitle eyebrow="Panel" title="Peticiones" />
      <div className="pills pills--wrap" role="tablist" aria-label="Filtrar peticiones">
        {filters.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            className={filter === key ? 'pill pill--active' : 'pill'}
            onClick={() => setParams(key === 'abiertas' ? {} : { ver: key }, { replace: true })}
          >
            {label} · {count(key)}
          </button>
        ))}
      </div>
      <div className="a-requests">
        {list.map((r) => (
          <article key={r.id} className={r.status === 'new' ? 'card a-request a-request--new' : 'card a-request'}>
            <div className="a-request__head">
              <div className="a-row__body">
                <span className="eyebrow">
                  {typeLabel[r.type]} · {shortDate(r.createdAt, 'es-ES')}
                </span>
                <Link to={`/admin/clientes/${r.clientId}`} className="card__title a-request__family">
                  {r.familyName}
                </Link>
              </div>
              <Select
                aria-label={`Estado de la petición de ${r.familyName}`}
                value={r.status}
                onChange={(e) => save(r, { status: e.target.value as RequestStatus })}
              >
                {(Object.keys(statusLabel) as RequestStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {statusLabel[s]}
                  </option>
                ))}
              </Select>
            </div>
            <p className="request__text">{r.description}</p>
            {r.preferredDate && <span className="card__text">Fecha preferida: {shortDate(r.preferredDate, 'es-ES')}</span>}
            <label className="a-field">
              <span className="a-field__label">Nota para el cliente</span>
              <AutoInput
                value={r.cjNote ?? ''}
                placeholder="P. ej. «El fontanero irá el jueves por la mañana»"
                onCommit={(v) => save(r, { cjNote: v })}
              />
            </label>
            <Link to={`/admin/mensajes/${r.clientId}`} className="a-link a-request__chat">
              Escribir a {r.familyName}
            </Link>
          </article>
        ))}
        {!requests.loading && list.length === 0 && <p className="a-empty">No hay peticiones en esta lista.</p>}
      </div>
    </>
  )
}
