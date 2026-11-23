import { FirebaseError } from 'firebase/app'
import { useState } from 'react'
import { whatsappInviteLink } from '../../lib/admin'
import type { Language } from '../../lib/types'
import Dialog from './Dialog'
import { Field, Input } from './Fields'

/** Mensaje de invitación de un profesional de «Mi reforma», en su idioma y de usted */
const MESSAGES: Record<Language, (name: string, link: string, email: string) => string> = {
  es: (n, l, e) =>
    `Hola ${n}:\n\nCJ Real Estate & Services le da acceso a CJ Club para seguir las reformas en las que colabora con nosotros (presupuestos, avances, planos y mensajes).\n\nPulse este enlace para elegir su contraseña y entrar (vale 24 horas):\n${l}\n\nSu usuario es su correo: ${e}`,
  en: (n, l, e) =>
    `Hello ${n},\n\nCJ Real Estate & Services has given you access to CJ Club to follow the renovations you work on with us (budgets, progress, plans and messages).\n\nTap this link to choose your password and sign in (valid for 24 hours):\n${l}\n\nYour username is your email: ${e}`,
  nl: (n, l, e) =>
    `Beste ${n},\n\nCJ Real Estate & Services geeft u toegang tot CJ Club om de renovaties te volgen waaraan u met ons werkt (offertes, voortgang, plannen en berichten).\n\nTik op deze link om uw wachtwoord te kiezen en in te loggen (24 uur geldig):\n${l}\n\nUw gebruikersnaam is uw e-mailadres: ${e}`,
  sv: (n, l, e) =>
    `Hej ${n},\n\nCJ Real Estate & Services ger dig tillgång till CJ Club för att följa renoveringarna du arbetar med hos oss (offerter, framsteg, ritningar och meddelanden).\n\nTryck på länken för att välja ditt lösenord och logga in (giltig i 24 timmar):\n${l}\n\nDitt användarnamn är din e-postadress: ${e}`,
  de: (n, l, e) =>
    `Guten Tag ${n},\n\nCJ Real Estate & Services gibt Ihnen Zugang zu CJ Club, um die Renovierungen zu verfolgen, an denen Sie mit uns arbeiten (Kostenvoranschläge, Fortschritt, Pläne und Nachrichten).\n\nTippen Sie auf diesen Link, um Ihr Passwort zu wählen und sich anzumelden (24 Stunden gültig):\n${l}\n\nIhr Benutzername ist Ihre E-Mail-Adresse: ${e}`,
  fr: (n, l, e) =>
    `Bonjour ${n},\n\nCJ Real Estate & Services vous donne accès à CJ Club pour suivre les rénovations sur lesquelles vous travaillez avec nous (devis, avancement, plans et messages).\n\nTouchez ce lien pour choisir votre mot de passe et vous connecter (valable 24 heures) :\n${l}\n\nVotre identifiant est votre adresse e-mail : ${e}`,
  pl: (n, l, e) =>
    `Dzień dobry ${n},\n\nCJ Real Estate & Services udostępnia Państwu CJ Club, aby mogli Państwo śledzić remonty, przy których z nami współpracują (kosztorysy, postępy, plany i wiadomości).\n\nProszę kliknąć ten link, aby wybrać hasło i się zalogować (ważny 24 godziny):\n${l}\n\nNazwa użytkownika to Państwa adres e-mail: ${e}`,
}

/**
 * Ventana para invitar a un profesional por WhatsApp: se escribe (o confirma) su móvil, la app prepara
 * el mensaje en su idioma con el enlace de 24 horas y lo abre en el WhatsApp de quien lo envía.
 */
export default function WhatsappInvite({ uid, name, phone: initialPhone, onClose }: { uid: string; name: string; phone?: string; onClose: () => void }) {
  const [phone, setPhone] = useState(initialPhone ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState<{ text: string; phone: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function prepare() {
    setBusy(true)
    setError('')
    try {
      const res = await whatsappInviteLink(uid, phone)
      const first = (res.name || name).trim()
      setReady({ text: (MESSAGES[res.language] ?? MESSAGES.es)(first, res.link, res.email), phone: res.phone })
    } catch (err) {
      const msg = err instanceof FirebaseError ? err.message.replace(/\s*\[\d+\]$/, '') : ''
      setError(msg && !msg.startsWith('internal') ? msg : 'No se pudo preparar la invitación. Inténtelo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  if (!ready)
    return (
      <Dialog title={`Invitar por WhatsApp · ${name}`} submitLabel={busy ? 'Preparando…' : 'Preparar mensaje'} busy={busy} onClose={onClose} onSubmit={prepare}>
        <Field label="Móvil (WhatsApp)" hint="Con el prefijo del país, por ejemplo +34 600 000 000. Si es un móvil español, basta con las 9 cifras.">
          <Input required type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <p className="card__text">
          Se preparará el mensaje en su idioma con un enlace para elegir su contraseña, válido 24 horas. Si antes le envió otra invitación (por correo o
          WhatsApp), esa deja de valer.
        </p>
        {error && <p className="a-error">{error}</p>}
      </Dialog>
    )

  const href = `https://wa.me/${ready.phone}?text=${encodeURIComponent(ready.text)}`
  return (
    <Dialog title={`Invitar por WhatsApp · ${name}`} submitLabel="Hecho" onClose={onClose} onSubmit={onClose}>
      <p className="card__text">Este es el mensaje. Pulse «Abrir WhatsApp» y después «Enviar» en WhatsApp.</p>
      <pre className="a-wa-preview">{ready.text}</pre>
      <div className="a-wa-actions">
        <a className="btn a-btn" href={href} target="_blank" rel="noopener noreferrer">
          Abrir WhatsApp
        </a>
        <button
          type="button"
          className="a-link"
          onClick={() =>
            navigator.clipboard?.writeText(ready.text).then(
              () => setCopied(true),
              () => setCopied(false),
            )
          }
        >
          {copied ? 'Mensaje copiado' : 'Copiar mensaje'}
        </button>
      </div>
    </Dialog>
  )
}
