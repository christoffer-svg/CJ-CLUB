import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import Header from '../components/Header'
import { useI18n } from '../i18n'
import { useDoc } from '../lib/data'
import { markRead, sendMessage, useConversation, useMessages } from '../lib/messaging'
import type { Client } from '../lib/types'
import { useViewer } from '../lib/viewer'
import { messageTime } from '../lib/when'

/** Chat del cliente con su equipo de CJ */
export default function Messages() {
  const { clientId, base, preview } = useViewer()
  const { user, profile } = useAuth()
  const { t, locale } = useI18n()
  const client = useDoc<Client>(clientId ? `clients/${clientId}` : null)
  const conv = useConversation(clientId)
  const messages = useMessages(clientId)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  // Al abrir y con cada mensaje nuevo: bajar al final y marcar como leído
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
    if (clientId && !preview) markRead(clientId, conv, 'client')
  }, [messages.data.length, clientId, conv, preview])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!clientId || !user || !client.data || !text.trim() || preview) return
    setBusy(true)
    setError(false)
    try {
      await sendMessage({
        clientId,
        familyName: client.data.familyName,
        text,
        side: 'client',
        authorUid: user.uid,
        authorName: profile?.name ?? client.data.familyName,
      })
      setText('')
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Header back={`${base}/`} eyebrow={t('chat.eyebrow')} title={t('chat.title')} subtitle={t('chat.subtitle')} />
      <main className="page chat">
        <p className="chat__note">{t('chat.emergency')}</p>
        <div className="chat__list" aria-live="polite">
          {!messages.loading && messages.data.length === 0 && <p className="empty">{t('chat.empty')}</p>}
          {messages.data.map((m) => (
            <div key={m.id} className={m.sender === 'client' ? 'bubble bubble--mine' : 'bubble'}>
              <span className="bubble__author">{m.sender === 'client' ? t('chat.you') : m.authorName}</span>
              <p className="bubble__text">{m.text}</p>
              <span className="bubble__time">{m.createdAt ? messageTime(m.createdAt, locale) : t('chat.sending')}</span>
            </div>
          ))}
          <div ref={end} className="chat__end" />
        </div>

        {preview ? (
          <p className="chat__note">{t('preview.readOnly')}</p>
        ) : (
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
                // Intro envía en ordenador; Mayús+Intro hace salto de línea
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
