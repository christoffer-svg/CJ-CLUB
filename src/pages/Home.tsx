import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import Header from '../components/Header'
import { AlertIcon, ChatIcon, CrossIcon, DishIcon, PhoneIcon, StarIcon } from '../components/Icons'
import { useActiveDealsCount, useDoc } from '../lib/data'
import { greetingName, monthYear, telLink, whatsappLink } from '../lib/format'
import type { Client, TipOfTheWeek } from '../lib/types'

export default function Home() {
  const { profile, logout } = useAuth()
  const client = useDoc<Client>(profile?.clientId ? `clients/${profile.clientId}` : null)
  const tip = useDoc<TipOfTheWeek>('settings/tipOfTheWeek')
  const dealsCount = useActiveDealsCount()
  const c = client.data

  const title = c ? `Hola, ${greetingName(c.familyName)}` : client.loading ? '' : 'Hola'
  const subtitle = c ? [c.property, c.clientSince && `Clientes desde ${monthYear(c.clientSince)}`].filter(Boolean).join(' · ') : ''

  return (
    <>
      <Header title={title} subtitle={subtitle} overlap />
      <main className="page page--overlap">
        <section className="card agent-card" aria-label="Su agente">
          <img className="agent-card__logo" src="/logo.png" alt="" />
          <div className="card__body">
            <span className="eyebrow">Su agente</span>
            <span className="card__title">{c?.agentName || (client.loading ? '' : 'Equipo CJ')}</span>
          </div>
          {c?.agentWhatsapp && (
            <a className="round-btn" href={whatsappLink(c.agentWhatsapp)} target="_blank" rel="noreferrer" aria-label="Escribir por WhatsApp">
              <ChatIcon size={20} />
            </a>
          )}
          {c?.agentPhone && (
            <a className="round-btn" href={telLink(c.agentPhone)} aria-label="Llamar">
              <PhoneIcon size={20} />
            </a>
          )}
        </section>

        <section className="section">
          <h2 className="section__title">¿Qué necesita?</h2>
          <div className="grid-2">
            <Link to="/guia" className="card quick quick--emergency">
              <span className="quick__icon"><AlertIcon size={22} /></span>
              <span className="quick__title">Emergencia</span>
              <span className="quick__text">112 y urgencias</span>
            </Link>
            <Link to="/guia" className="card quick">
              <span className="quick__icon"><CrossIcon size={22} /></span>
              <span className="quick__title">Salud</span>
              <span className="quick__text">Médicos y clínicas</span>
            </Link>
            <Link to="/descubrir?categoria=restaurants" className="card quick">
              <span className="quick__icon"><DishIcon size={22} /></span>
              <span className="quick__title">Dónde comer</span>
              <span className="quick__text">Nuestros restaurantes</span>
            </Link>
            <Link to="/ventajas" className="card quick">
              <span className="quick__icon"><StarIcon size={22} /></span>
              <span className="quick__title">Mis ventajas</span>
              <span className="quick__text">
                {dealsCount === null ? 'Descuentos exclusivos' : `${dealsCount} ${dealsCount === 1 ? 'descuento activo' : 'descuentos activos'}`}
              </span>
            </Link>
          </div>
        </section>

        {tip.data?.text_es && (
          <section className="tip">
            <span className="eyebrow">Consejo de la semana</span>
            <p className="tip__text">{tip.data.text_es}</p>
          </section>
        )}

        <button className="link-btn link-btn--dark" onClick={logout}>
          Cerrar sesión
        </button>
      </main>
    </>
  )
}
