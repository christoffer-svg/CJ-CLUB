import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageTitle } from '../../components/admin/AdminLayout'
import { Input } from '../../components/admin/Fields'
import { useLiveCollection } from '../../lib/admin'
import type { Client, UserProfile } from '../../lib/types'

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export default function Clients() {
  const clients = useLiveCollection<Client>('clients')
  const users = useLiveCollection<UserProfile>('users')
  const [search, setSearch] = useState('')

  const emailOf = Object.fromEntries(users.data.filter((u) => u.clientId).map((u) => [u.clientId, u.email]))
  const q = normalize(search.trim())
  const list = clients.data
    .filter((c) => !q || normalize([c.familyName, c.property, c.memberNumber, emailOf[c.id] ?? ''].join(' ')).includes(q))
    .sort((a, b) => a.familyName.localeCompare(b.familyName))

  return (
    <>
      <PageTitle eyebrow="Panel" title="Clientes">
        <Link to="/admin/clientes/nuevo" className="btn a-btn">
          Nuevo cliente
        </Link>
      </PageTitle>
      <Input
        type="search"
        placeholder="Buscar por familia, propiedad, correo o nº de socio"
        aria-label="Buscar clientes"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="card a-list">
        {list.map((c) => (
          <Link key={c.id} to={`/admin/clientes/${c.id}`} className="a-row">
            <div className="a-row__body">
              <span className="card__title">{c.familyName}</span>
              <span className="card__text">
                {[c.property, emailOf[c.id]].filter(Boolean).join(' · ')}
              </span>
            </div>
            <span className="a-row__meta">{c.memberNumber}</span>
          </Link>
        ))}
        {!clients.loading && list.length === 0 && (
          <p className="a-empty">{q ? 'Ningún cliente coincide con la búsqueda.' : 'Aún no hay clientes.'}</p>
        )}
      </div>
    </>
  )
}
