import { Link, useSearchParams } from 'react-router-dom'
import { PageTitle } from '../../components/admin/AdminLayout'
import { Select } from '../../components/admin/Fields'
import { useToast } from '../../components/admin/Toast'
import { patchDoc, removeDoc, useLiveCollection } from '../../lib/admin'
import { whatsappLink } from '../../lib/format'
import type { MembershipRequest, MembershipStatus } from '../../lib/types'
import { shortDate } from '../../lib/when'

const statusLabel: Record<MembershipStatus, string> = { new: 'Nueva', contacted: 'Contactada', member: 'Ya es cliente', declined: 'Descartada' }
const languageName: Record<string, string> = { es: 'Español', en: 'Inglés', nl: 'Neerlandés', sv: 'Sueco', de: 'Alemán', fr: 'Francés', pl: 'Polaco' }
const filters: [string, string][] = [
  ['abiertas', 'Abiertas'],
  ['todas', 'Todas'],
]

/** Personas que no son clientes y piden formar parte de CJ Club (formulario de la pantalla de acceso) */
export default function AdminJoinRequests() {
  const items = useLiveCollection<MembershipRequest>('membershipRequests')
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const filter = params.get('ver') ?? 'abiertas'
  const open = (r: MembershipRequest) => r.status === 'new' || r.status === 'contacted'
  const list = items.data.filter((r) => filter === 'todas' || open(r)).sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))

  return (
    <>
      <PageTitle eyebrow="Clientes" title="Solicitudes para unirse" />
      <p className="a-lead">
        Personas que aún no son clientes y han pedido formar parte de CJ Club desde la pantalla de acceso. También le llega un correo a info@cjclub.eu con cada
        una.
      </p>
      <div className="pills pills--wrap" role="tablist" aria-label="Filtrar solicitudes">
        {filters.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            className={filter === key ? 'pill pill--active' : 'pill'}
            onClick={() => setParams(key === 'abiertas' ? {} : { ver: key }, { replace: true })}
          >
            {label} · {items.data.filter((r) => key === 'todas' || open(r)).length}
          </button>
        ))}
      </div>
      <div className="a-requests">
        {list.map((r) => (
          <article key={r.id} className={r.status === 'new' ? 'card a-request a-request--new' : 'card a-request'}>
            <div className="a-request__head">
              <div className="a-row__body">
                <span className="eyebrow">
                  {shortDate(r.createdAt, 'es-ES')} · {languageName[r.language] ?? r.language}
                  {r.country ? ` · ${r.country}` : ''}
                </span>
                <span className="card__title">{r.name}</span>
              </div>
              <Select
                aria-label={`Estado de la solicitud de ${r.name}`}
                value={r.status}
                onChange={(e) =>
                  patchDoc(`membershipRequests/${r.id}`, { status: e.target.value })
                    .then(() => toast(`Guardado: ${r.name}`))
                    .catch(() => toast('No se pudo guardar.', 'error'))
                }
              >
                {(Object.keys(statusLabel) as MembershipStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {statusLabel[s]}
                  </option>
                ))}
              </Select>
            </div>
            <span className="card__text">
              <a className="a-link a-link--plain" href={`mailto:${r.email}`}>
                {r.email}
              </a>
              {' · '}
              <a className="a-link a-link--plain" href={`tel:${r.phone.replace(/[^\d+]/g, '')}`}>
                {r.phone}
              </a>
              {' · '}
              <a className="a-link a-link--plain" href={whatsappLink(r.phone)} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </span>
            {r.message && <p className="request__text">{r.message}</p>}
            <div className="sp-actions">
              <Link
                className="a-link"
                to={`/admin/clientes/nuevo?${new URLSearchParams({ email: r.email, familia: `Familia ${r.name.split(' ').slice(-1)[0]}`, idioma: r.language, origen: 'solicitud' }).toString()}`}
              >
                Darle de alta como cliente
              </Link>
              <button
                type="button"
                className="link-btn link-btn--dark"
                onClick={() =>
                  window.confirm(`¿Borrar la solicitud de ${r.name}? No se puede deshacer.`) &&
                  removeDoc(`membershipRequests/${r.id}`)
                    .then(() => toast('Solicitud borrada.'))
                    .catch(() => toast('No se pudo borrar.', 'error'))
                }
              >
                Borrar
              </button>
            </div>
          </article>
        ))}
        {!items.loading && list.length === 0 && <p className="a-empty">No hay solicitudes en esta lista.</p>}
      </div>
    </>
  )
}
