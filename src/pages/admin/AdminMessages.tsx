import { Link } from 'react-router-dom'
import { PageTitle } from '../../components/admin/AdminLayout'
import { useLiveCollection } from '../../lib/admin'
import { isUnread } from '../../lib/messaging'
import type { Conversation } from '../../lib/types'
import { messageTime } from '../../lib/when'

/** Conversaciones con los clientes, la más reciente arriba */
export default function AdminMessages() {
  const convs = useLiveCollection<Conversation>('conversations')
  const list = [...convs.data].sort((a, b) => (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0))
  const unread = list.filter((c) => isUnread(c, 'cj')).length

  return (
    <>
      <PageTitle eyebrow="Panel" title="Mensajes" />
      <p className="card__text">
        {unread ? `${unread} ${unread === 1 ? 'conversación con mensajes sin leer' : 'conversaciones con mensajes sin leer'}.` : 'Todo leído.'}{' '}
        Para escribir a un cliente que aún no ha escrito, abra su ficha y pulse «Mensajes».
      </p>
      <div className="card a-list">
        {list.map((c) => {
          const isNew = isUnread(c, 'cj')
          return (
            <Link key={c.clientId} to={`/admin/mensajes/${c.clientId}`} className={isNew ? 'a-row a-row--unread' : 'a-row'}>
              {isNew ? <span className="dot" aria-label="Sin leer" /> : <span className="a-row__spacer" />}
              <div className="a-row__body">
                <span className="card__title">{c.familyName}</span>
                <span className="card__text a-ellipsis">
                  {c.lastSender === 'cj' ? 'CJ: ' : ''}
                  {c.lastMessageText}
                </span>
              </div>
              <span className="a-row__meta">{messageTime(c.lastMessageAt, 'es-ES')}</span>
            </Link>
          )
        })}
        {!convs.loading && list.length === 0 && <p className="a-empty">Aún no hay conversaciones.</p>}
      </div>
    </>
  )
}
