import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { Link, useSearchParams } from 'react-router-dom'
import Header from '../../components/Header'
import { useI18n } from '../../i18n'
import { db } from '../../lib/firebase'
import { isChatUnread, isPostCurrent, useMyChats, useSocialPosts } from '../../lib/social'
import { useViewer } from '../../lib/viewer'
import { messageTime } from '../../lib/when'
import { PostCard } from './common'

type Tab = 'all' | 'plan' | 'tip' | 'chats'

/** Número de familias apuntadas a cada plan */
function useJoinCounts(ids: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const key = ids.join(',')
  useEffect(() => {
    const offs = ids.map((id) => onSnapshot(collection(db, 'socialPosts', id, 'joins'), (s) => setCounts((c) => ({ ...c, [id]: s.size })), () => {}))
    return () => offs.forEach((o) => o())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return counts
}

/** Social: planes (golf, pádel, cenas…) y recomendaciones de los clientes de CJ */
export default function Social() {
  const { base, clientId, preview } = useViewer()
  const { t, locale } = useI18n()
  const [params, setParams] = useSearchParams()
  const tab = (['plan', 'tip', 'chats'].includes(params.get('ver') ?? '') ? params.get('ver') : 'all') as Tab
  const posts = useSocialPosts()
  const chats = useMyChats(preview ? null : clientId)
  const shown = posts.data.filter((p) => isPostCurrent(p) && (tab === 'all' || p.kind === tab))
  const counts = useJoinCounts(shown.filter((p) => p.kind === 'plan').map((p) => p.id))
  const unread = clientId ? chats.data.filter((c) => isChatUnread(c, clientId)).length : 0

  return (
    <>
      <Header eyebrow={t('social.eyebrow')} title={t('social.title')} subtitle={t('social.subtitle')} />
      <main className="page">
        <div className="pills" role="tablist">
          {(['all', 'plan', 'tip', 'chats'] as Tab[]).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'pill pill--active' : 'pill'} onClick={() => setParams(k === 'all' ? {} : { ver: k }, { replace: true })}>
              {t(`social.tab.${k}`)}
              {k === 'chats' && unread > 0 && <span className="pill__badge">{unread}</span>}
            </button>
          ))}
        </div>

        {tab === 'chats' ? (
          <div className="card sp-chats">
            {!chats.loading && chats.data.length === 0 && <p className="empty">{t('social.noChats')}</p>}
            {chats.data.map((c) => {
              const other = c.members.find((m) => m !== clientId) ?? ''
              const isNew = clientId ? isChatUnread(c, clientId) : false
              return (
                <Link key={c.id} to={`${base}/social/chat/${c.id}`} className="team__row sp-chat-row">
                  <span className="card__body">
                    <span className="card__title">{c.names[other] ?? ''}</span>
                    <span className="eyebrow">{c.postTitle}</span>
                    <span className={isNew ? 'card__text team__new' : 'card__text'}>
                      {c.lastText || t('social.chatEmpty')}
                      {c.lastText && c.lastAt ? ` · ${messageTime(c.lastAt, locale)}` : ''}
                    </span>
                  </span>
                  {isNew && <span className="dot" aria-hidden="true" />}
                </Link>
              )
            })}
          </div>
        ) : (
          <>
            {!preview && (
              <Link to={`${base}/social/nuevo`} className="btn sp-new">
                {t('social.new')}
              </Link>
            )}
            {!posts.loading && shown.length === 0 && <p className="empty">{t('social.empty')}</p>}
            <div className="place-list sp-list">
              {shown.map((p) => (
                <PostCard key={p.id} p={p} joins={counts[p.id]} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  )
}
