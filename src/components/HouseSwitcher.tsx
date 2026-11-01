import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { useHouses } from '../lib/data'
import { useViewer } from '../lib/viewer'

/** Si el cliente tiene varias casas, píldoras para elegir cuál ver. Todo en la app sigue a la casa elegida. */
export default function HouseSwitcher() {
  const { profile, switchHouse } = useAuth()
  const { preview } = useViewer()
  const { t } = useI18n()
  const houses = useHouses(preview ? undefined : profile?.clientIds)
  if (preview || houses.length < 2) return null
  return (
    <div className="houses" role="group" aria-label={t('home.houses')}>
      <span className="eyebrow">{t('home.houses')}</span>
      <div className="houses__list">
        {houses.map((h, i) => (
          <button
            key={h.id}
            type="button"
            aria-pressed={profile?.clientId === h.id}
            className={profile?.clientId === h.id ? 'house-pill house-pill--active' : 'house-pill'}
            onClick={() => switchHouse(h.id)}
          >
            {h.property || `${t('home.house')} ${i + 1}`}
          </button>
        ))}
      </div>
    </div>
  )
}
