import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useViewer } from '../lib/viewer'
import Header from '../components/Header'
import { AlertIcon, ChatIcon, ChevronIcon, CrossIcon, DishIcon, KeyIcon, PhoneIcon, StarIcon, WhatsAppIcon } from '../components/Icons'
import { useActiveDealsCount, useDoc } from '../lib/data'
import { isUnread, useClientRequests, useConversation } from '../lib/messaging'
import { useI18n } from '../i18n'
import { familyName, monthYear, telLink, whatsappLink } from '../lib/format'
import type { Client, TipOfTheWeek } from '../lib/types'

export default function Home() {
  const { logout } = useAuth()
  const { clientId, base, preview } = useViewer()
  const { t, pick, locale } = useI18n()
  const client = useDoc<Client>(clientId ? `clients/${clientId}` : null)
  const tip = useDoc<TipOfTheWeek>('settings/tipOfTheWeek')
  const dealsCount = useActiveDealsCount()
  const conv = useConversation(clientId)
  const requests = useClientRequests(clientId)
  const unread = isUnread(conv, 'client')
  const openRequests = requests.data.filter((r) => r.status === 'new' || r.status === 'in_progress').length
  const c = client.data

  const title = c ? t('home.greeting', { name: familyName(c.familyName, t, true) }) : client.loading ? '' : t('home.hello')
  const subtitle = c
    ? [c.property, c.clientSince && t('home.clientsSince', { date: monthYear(c.clientSince, locale) })].filter(Boolean).join(' · ')
    : ''
  const tipText = pick(tip.data, 'text')

  return (
    <>
      <Header title={title} subtitle={subtitle} overlap />
      <main className="page page--overlap">
        <section className="card agent-card" aria-label={t('home.yourAgent')}>
          <img className="agent-card__logo" src="/logo.png" alt="" />
          <div className="card__body">
            <span className="eyebrow">{t('home.yourAgent')}</span>
            <span className="card__title">{c?.agentName || (client.loading ? '' : t('home.cjTeam'))}</span>
          </div>
          <Link className="round-btn round-btn--badge" to={`${base}/mensajes`} aria-label={t('home.chat')}>
            <ChatIcon size={20} />
            {unread && <span className="dot" aria-hidden="true" />}
          </Link>
          {c?.agentWhatsapp && (
            <a className="round-btn" href={whatsappLink(c.agentWhatsapp)} target="_blank" rel="noreferrer" aria-label={t('home.whatsapp')}>
              <WhatsAppIcon size={20} />
            </a>
          )}
          {c?.agentPhone && (
            <a className="round-btn" href={telLink(c.agentPhone)} aria-label={t('home.call')}>
              <PhoneIcon size={20} />
            </a>
          )}
        </section>

        <section className="section">
          <h2 className="section__title">{t('home.whatDoYouNeed')}</h2>
          <div className="grid-2">
            <Link to={`${base}/guia`} className="card quick quick--emergency">
              <span className="quick__icon"><AlertIcon size={22} /></span>
              <span className="quick__title">{t('home.emergency')}</span>
              <span className="quick__text">{t('home.emergencyText')}</span>
            </Link>
            <Link to={`${base}/guia`} className="card quick">
              <span className="quick__icon"><CrossIcon size={22} /></span>
              <span className="quick__title">{t('home.health')}</span>
              <span className="quick__text">{t('home.healthText')}</span>
            </Link>
            <Link to={`${base}/descubrir?categoria=restaurants`} className="card quick">
              <span className="quick__icon"><DishIcon size={22} /></span>
              <span className="quick__title">{t('home.eat')}</span>
              <span className="quick__text">{t('home.eatText')}</span>
            </Link>
            <Link to={`${base}/ventajas`} className="card quick">
              <span className="quick__icon"><StarIcon size={22} /></span>
              <span className="quick__title">{t('home.benefits')}</span>
              <span className="quick__text">
                {dealsCount === null
                  ? t('home.benefitsText')
                  : t(dealsCount === 1 ? 'home.activeDeals.one' : 'home.activeDeals.other', { n: dealsCount })}
              </span>
            </Link>
          </div>
        </section>

        <section className="section">
          <h2 className="section__title">{t('team.eyebrow')}</h2>
          <div className="card team">
            <Link to={`${base}/mensajes`} className="team__row">
              <span className="card__icon">
                <ChatIcon />
              </span>
              <span className="card__body">
                <span className="card__title">{t('team.messages')}</span>
                <span className={unread ? 'card__text team__new' : 'card__text'}>{unread ? t('team.unread') : t('team.messagesText')}</span>
              </span>
              {unread && <span className="dot" aria-hidden="true" />}
              <span className="card__chevron">
                <ChevronIcon />
              </span>
            </Link>
            <Link to={`${base}/peticiones`} className="team__row">
              <span className="card__icon">
                <KeyIcon />
              </span>
              <span className="card__body">
                <span className="card__title">{t('team.requests')}</span>
                <span className="card__text">
                  {openRequests
                    ? t(openRequests === 1 ? 'team.openRequests.one' : 'team.openRequests.other', { n: openRequests })
                    : t('team.requestsText')}
                </span>
              </span>
              <span className="card__chevron">
                <ChevronIcon />
              </span>
            </Link>
          </div>
        </section>

        {tipText && (
          <section className="tip">
            <span className="eyebrow">{t('home.tip')}</span>
            <p className="tip__text">{tipText}</p>
          </section>
        )}

        {!preview && (
          <button className="link-btn link-btn--dark" onClick={logout}>
            {t('home.logout')}
          </button>
        )}
      </main>
    </>
  )
}
