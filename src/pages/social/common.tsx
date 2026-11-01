import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { useI18n } from '../../i18n'
import { useDoc } from '../../lib/data'
import type { Me, WithId } from '../../lib/social'
import type { Client, SocialPost } from '../../lib/types'
import { useViewer } from '../../lib/viewer'

/** Quién soy en Social: mi casa, mi usuario y el nombre de mi familia */
export function useMe(): Me | null {
  const { clientId } = useViewer()
  const { user } = useAuth()
  const client = useDoc<Client>(clientId ? `clients/${clientId}` : null)
  return clientId && user && client.data ? { clientId, uid: user.uid, familyName: client.data.familyName } : null
}

/** "del 10 al 14 de nov." o "jueves, 12 de nov." */
export function usePlanDates() {
  const { locale, t } = useI18n()
  const day = (s: string, weekday: boolean) => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d, 12).toLocaleDateString(locale, { ...(weekday ? { weekday: 'long' } : {}), day: 'numeric', month: 'short' })
  }
  return (p: Pick<SocialPost, 'dateFrom' | 'dateTo'>) => (p.dateTo ? t('social.dateRange', { from: day(p.dateFrom, false), to: day(p.dateTo, false) }) : day(p.dateFrom, true))
}

/** Tarjeta de una publicación en la lista */
export function PostCard({ p, joins }: { p: WithId<SocialPost>; joins?: number }) {
  const { base } = useViewer()
  const { t } = useI18n()
  const dates = usePlanDates()
  const cover = p.photos[0]
  return (
    <Link to={`${base}/social/${p.id}`} className="card sp-card">
      {cover && <img className="sp-card__photo" src={cover.url} alt="" loading="lazy" />}
      <span className="eyebrow">{p.kind === 'plan' ? t(`social.activity.${p.activity}`) : t('social.tip')}</span>
      <span className="sp-card__title">{p.title}</span>
      <span className="card__text">
        {p.familyName}
        {p.kind === 'plan' ? ` · ${dates(p)}` : ''}
        {p.place ? ` · ${p.place}` : ''}
      </span>
      {p.text && <span className="sp-card__text">{p.text}</span>}
      {p.kind === 'plan' && joins !== undefined && joins > 0 && <span className="sp-card__joins">{t(joins === 1 ? 'social.joins.one' : 'social.joins.other', { n: joins })}</span>}
    </Link>
  )
}
