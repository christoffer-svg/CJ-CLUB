import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import Header from '../../components/Header'
import { useI18n } from '../../i18n'
import { markSocialRead, sendSocialMessage, useSocialChat } from '../../lib/social'
import { useViewer } from '../../lib/viewer'
import { messageTime } from '../../lib/when'
import { useMe } from './common'
import { FamilyAvatar } from '../../components/FamilyAvatar'
import { useSocialProfiles } from '../../lib/familyPhoto'

/** Chat privado entre quien publica un plan y una familia que se apunta */
export default function SocialChatPage() {
  const { chatId = '' } = useParams()
  const { base, preview } = useViewer()
  const { t, locale } = useI18n()
  const me = useMe()
  const { chat, messages } = useSocialChat(chatId)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const avatars = useSocialProfiles()
  const c = chat.data
  const other = c && me ? (c.members.find((m) => m !== me.clientId) ?? '') : ''

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
    if (c && me && !preview) markSocialRead(chatId, me.clientId).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, Boolean(c), me?.clientId])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!me || !text.trim() || preview) return
    setBusy(true)
    setError(false)
    try {
      await sendSocialMessage(chatId, me, text)
      setText('')
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Header back={`${base}/social?ver=chats`} eyebrow={t('social.chat')} title={c ? (c.names[other] ?? '') : ''} />
      <main className="page chat">
        {c && (
          <div className="sp-author sp-author--chat">
            <FamilyAvatar url={avatars[other]} name={c.names[other] ?? ''} size={44} />
          </div>
        )}
        {c && (
          <p className="chat__note">
            <Link to={`${base}/social/${c.postId}`}>{c.postTitle}</Link> · {t('social.chatNote')}
          </p>
        )}
        {!chat.loading && !c && <p className="empty">{t('profile.notFound')}</p>}
        <div className="chat__list" aria-live="polite">
          {c && messages.length === 0 && <p className="empty">{t('social.chatStart')}</p>}
          {messages.map((m) => (
            <div key={m.id} className={m.clientId === me?.clientId ? 'bubble bubble--mine' : 'bubble'}>
              <span className="bubble__author">{m.clientId === me?.clientId ? t('chat.you') : m.familyName}</span>
              <p className="bubble__text">{m.text}</p>
              <span className="bubble__time">{m.createdAt ? messageTime(m.createdAt, locale) : t('chat.sending')}</span>
            </div>
          ))}
          <div ref={end} className="chat__end" />
        </div>
        {c && !preview && (
          <form className="composer" onSubmit={submit}>
            <textarea
              className="composer__input"
              rows={2}
              maxLength={2000}
              aria-label={t('chat.placeholder')}
              placeholder={t('chat.placeholder')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
                  e.preventDefault()
                  ;(e.currentTarget.form as HTMLFormElement).requestSubmit()
                }
              }}
            />
            <button className="btn composer__send" type="submit" disabled={busy || !text.trim()}>
              {busy ? t('chat.sending') : t('chat.send')}
            </button>
            {error && <p className="composer__error">{t('chat.error')}</p>}
          </form>
        )}
      </main>
    </>
  )
}
