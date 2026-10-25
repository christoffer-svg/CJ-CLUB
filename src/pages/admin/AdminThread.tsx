import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { PageTitle } from '../../components/admin/AdminLayout'
import { useToast } from '../../components/admin/Toast'
import { useLiveDoc } from '../../lib/admin'
import { markRead, sendMessage, useConversation, useMessages } from '../../lib/messaging'
import type { Client } from '../../lib/types'
import { messageTime } from '../../lib/when'

/** Conversación con un cliente, vista por el equipo de CJ */
export default function AdminThread() {
  const { clientId = '' } = useParams()
  const { user, profile } = useAuth()
  const toast = useToast()
  const client = useLiveDoc<Client>(`clients/${clientId}`)
  const conv = useConversation(clientId)
  const messages = useMessages(clientId)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
    markRead(clientId, conv, 'cj')
  }, [messages.data.length, clientId, conv])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!user || !client.data || !text.trim()) return
    setBusy(true)
    try {
      await sendMessage({
        clientId,
        familyName: client.data.familyName,
        text,
        side: 'cj',
        authorUid: user.uid,
        authorName: profile?.name ? `${profile.name} · CJ` : 'Equipo CJ',
      })
      setText('')
    } catch {
      toast('No se pudo enviar. Inténtelo de nuevo.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!client.loading && !client.data) return <p className="a-empty">Este cliente no existe.</p>

  return (
    <>
      <PageTitle eyebrow="Mensajes" title={client.data?.familyName ?? ''}>
        <Link to={`/admin/clientes/${clientId}`} className="btn btn--ghost a-btn">
          Ver ficha
        </Link>
      </PageTitle>
      <div className="card a-thread">
        <div className="chat__list">
          {!messages.loading && messages.data.length === 0 && <p className="a-empty">Aún no hay mensajes. Escriba el primero.</p>}
          {messages.data.map((m) => (
            <div key={m.id} className={m.sender === 'cj' ? 'bubble bubble--mine' : 'bubble'}>
              <span className="bubble__author">{m.sender === 'cj' ? m.authorName : client.data?.familyName}</span>
              <p className="bubble__text">{m.text}</p>
              <span className="bubble__time">{m.createdAt ? messageTime(m.createdAt, 'es-ES') : 'Enviando…'}</span>
            </div>
          ))}
          <div ref={end} />
        </div>
        <form className="composer a-composer" onSubmit={submit}>
          <textarea
            className="composer__input"
            rows={2}
            maxLength={2000}
            aria-label="Respuesta"
            placeholder={`Escriba a ${client.data?.familyName ?? 'el cliente'}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                ;(e.currentTarget.form as HTMLFormElement).requestSubmit()
              }
            }}
          />
          <button className="btn a-btn" type="submit" disabled={busy || !text.trim()}>
            {busy ? 'Enviando…' : 'Enviar'}
          </button>
        </form>
        <span className="a-field__hint">Intro envía; Mayúsculas + Intro hace un salto de línea. El cliente lo verá en su app.</span>
      </div>
    </>
  )
}
