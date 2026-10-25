import { useEffect, useState } from 'react'
import type { TranslationKey } from '../i18n/translations'
import { useI18n } from '../i18n'
import { isGeoPoint } from '../lib/geo'
import type { GeoPoint } from '../lib/types'
import {
  DEFAULT_WEATHER_PLACE,
  conditionKey,
  fetchWeather,
  lookupPlaceName,
  officialWarningsUrl,
  type NoticeId,
  type Severity,
  type WeatherDay,
  type WeatherReport,
} from '../lib/weather'

const MODE_KEY = 'cjclub.weatherMode'
const LEGACY_DEVICE_KEY = 'cjclub.weatherDevice'

type WeatherMode = 'device' | 'fallback'
type Source = 'pending' | WeatherMode

const noticeText: Record<NoticeId, TranslationKey> = {
  wind: 'weather.notice.wind',
  rain: 'weather.notice.rain',
  heat: 'weather.notice.heat',
  cold: 'weather.notice.cold',
  storm: 'weather.notice.storm',
  hail: 'weather.notice.hail',
  ice: 'weather.notice.ice',
}

const severityText: Record<Severity, TranslationKey> = {
  moderate: 'weather.notice.moderate',
  severe: 'weather.notice.severe',
  extreme: 'weather.notice.extreme',
}

type GeoMessage = 'denied' | 'unavailable'

function readMode(): WeatherMode | null {
  try {
    const mode = localStorage.getItem(MODE_KEY)
    if (mode === 'device' || mode === 'fallback') return mode
    if (localStorage.getItem(LEGACY_DEVICE_KEY) === '1') return 'device'
    return null
  } catch {
    return null
  }
}

function rememberMode(mode: WeatherMode) {
  try {
    localStorage.setItem(MODE_KEY, mode)
    localStorage.removeItem(LEGACY_DEVICE_KEY)
  } catch {
    // sin almacenamiento local el tiempo se sigue viendo
  }
}

let inflightFix: Promise<GeoPoint> | null = null

function locateDevice(): Promise<GeoPoint> {
  if (!navigator.geolocation) return Promise.reject(new Error('geolocation'))
  if (!inflightFix) {
    inflightFix = new Promise<GeoPoint>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 },
      )
    }).finally(() => {
      inflightFix = null
    })
  }
  return inflightFix
}

function initialSource(allowDevice: boolean): Source {
  if (!allowDevice || typeof navigator === 'undefined' || !('geolocation' in navigator)) return 'fallback'
  return readMode() === 'fallback' ? 'fallback' : 'pending'
}

function messageFor(err: unknown): GeoMessage {
  const code = typeof err === 'object' && err !== null && 'code' in err ? Number((err as { code: unknown }).code) : 0
  const text =
    typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string'
      ? (err as { message: string }).message.toLowerCase()
      : ''
  return code === 1 || text.includes('denied') || text.includes('permission') ? 'denied' : 'unavailable'
}

function formatTemp(value: number, locale: string) {
  return `${Math.round(value).toLocaleString(locale)}°`
}

function dayLabel(date: string, days: WeatherDay[], locale: string, today: string, tomorrow: string) {
  if (date === days[0]?.date) return today
  if (date === days[1]?.date) return tomorrow
  return new Date(`${date}T12:00:00`).toLocaleDateString(locale, { weekday: 'short' })
}

function iconKind(code: number, day: boolean): 'sun' | 'moon' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm' {
  if (code >= 95) return 'storm'
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if (code >= 3) return 'cloud'
  if (!day && code <= 1) return 'moon'
  if (code === 2) return day ? 'sun' : 'cloud'
  return 'sun'
}

function WeatherIcon({ code, day, size = 40 }: { code: number; day: boolean; size?: number }) {
  const kind = iconKind(code, day)
  return (
    <svg
      className="weather__icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'moon' && <path d="M16 3.5a7 7 0 1 0 4.5 12A7.5 7.5 0 0 1 16 3.5z" />}
      {kind === 'sun' && (
        <>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6" />
        </>
      )}
      {kind === 'cloud' && <path d="M7 17h10a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6-1.2A3.2 3.2 0 0 0 7 17z" />}
      {kind === 'fog' && <path d="M5 9h14M4 12h16M6 15h12" />}
      {kind === 'rain' && (
        <>
          <path d="M7 13h10a3.2 3.2 0 0 0 .3-6.4 4.6 4.6 0 0 0-8.8-1A3 3 0 0 0 7 13z" />
          <path d="M8 16.5 7 19M12 16.5 11 19M16 16.5 15 19" />
        </>
      )}
      {kind === 'snow' && (
        <>
          <path d="M7 12h10a3.2 3.2 0 0 0 .3-6.4 4.6 4.6 0 0 0-8.8-1A3 3 0 0 0 7 12z" />
          <path d="M8 16.5v.01M12 16.5v.01M16 16.5v.01M10 19v.01M14 19v.01" />
        </>
      )}
      {kind === 'storm' && (
        <>
          <path d="M7 13h10a3.2 3.2 0 0 0 .3-6.4 4.6 4.6 0 0 0-8.8-1A3 3 0 0 0 7 13z" />
          <path d="M12 14.5 10 18h3l-1.2 3.5" />
        </>
      )}
    </svg>
  )
}

type Props = {
  /** Mientras carga la ficha, no se pide el tiempo: así no se consulta dos veces. */
  ready: boolean
  propertyName?: string
  propertyPoint?: GeoPoint | null
  /** En la vista previa del equipo no se usa el teléfono de quien mira. */
  allowDevice: boolean
}

export default function WeatherCard({ ready, propertyName, propertyPoint, allowDevice }: Props) {
  const { t, lang, locale } = useI18n()
  const [source, setSource] = useState<Source>(() => initialSource(allowDevice))
  const [device, setDevice] = useState<GeoPoint | null>(null)
  const [placeName, setPlaceName] = useState<string | null>(null)
  const [geoMessage, setGeoMessage] = useState<GeoMessage | null>(null)
  const [loaded, setLoaded] = useState<{ key: string; data: WeatherReport } | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  const property = propertyPoint && isGeoPoint(propertyPoint) ? propertyPoint : null
  const fallbackPoint = property ?? DEFAULT_WEATHER_PLACE
  const point = source === 'device' && device ? device : fallbackPoint
  const homeLabel = propertyName?.trim() || t('weather.yourHome')
  const fallbackLabel = property ? homeLabel : DEFAULT_WEATHER_PLACE.name
  const label = source === 'device' ? placeName || t('weather.yourLocation') : fallbackLabel
  const canLocate = allowDevice && typeof navigator !== 'undefined' && 'geolocation' in navigator

  useEffect(() => {
    if (source !== 'pending') return
    let ignore = false
    locateDevice()
      .then((fix) => {
        if (ignore) return
        setDevice(fix)
        setPlaceName(null)
        setGeoMessage(null)
        setSource('device')
        rememberMode('device')
      })
      .catch((err: unknown) => {
        if (ignore) return
        setDevice(null)
        setPlaceName(null)
        setSource('fallback')
        rememberMode('fallback')
        setGeoMessage(messageFor(err))
      })
    return () => {
      ignore = true
    }
  }, [source])

  useEffect(() => {
    if (source !== 'device' || !device) return
    const ctrl = new AbortController()
    let ignore = false
    lookupPlaceName(device, lang, ctrl.signal)
      .then((name) => {
        if (!ignore && name) setPlaceName(name)
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
      })
    return () => {
      ignore = true
      ctrl.abort()
    }
  }, [source, device, lang])

  const lat = point.lat
  const lng = point.lng
  const pointKey = `${lat.toFixed(3)},${lng.toFixed(3)}`
  const report = source === 'pending' ? null : loaded?.key === pointKey ? loaded.data : null
  const failed = source !== 'pending' && failedKey === pointKey

  useEffect(() => {
    if (!ready || source === 'pending') return
    const ctrl = new AbortController()
    let ignore = false
    fetchWeather({ lat, lng }, ctrl.signal, reload > 0)
      .then((data) => {
        if (ignore) return
        setLoaded({ key: pointKey, data })
        setFailedKey(null)
      })
      .catch((err: unknown) => {
        if (ignore || (err instanceof Error && err.name === 'AbortError')) return
        setFailedKey(pointKey)
      })
    return () => {
      ignore = true
      ctrl.abort()
    }
  }, [ready, source, lat, lng, pointKey, reload])

  function useSavedPlace() {
    setDevice(null)
    setPlaceName(null)
    setGeoMessage(null)
    setSource('fallback')
    rememberMode('fallback')
  }

  const notices = report?.notices ?? []

  return (
    <section className="weather-block" aria-label={t('weather.eyebrow')}>
      {report && notices.length > 0 && (
        <div className="weather-notices">
          <p className="weather-disclaimer">{t('weather.notice.disclaimer')}</p>
          <ul>
            {notices.map((notice) => (
              <li key={notice.id} className={`weather-notice weather-notice--${notice.severity}`}>
                <span className="weather-notice__level">
                  {t(severityText[notice.severity])}
                  {' · '}
                  {dayLabel(notice.date, report.days, locale, t('weather.today'), t('weather.tomorrow'))}
                </span>
                <p className="weather-notice__text">{t(noticeText[notice.id], notice.params)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card weather">
        <div className="weather__head">
          <span className="eyebrow">{t('weather.eyebrow')}</span>
          {ready && source !== 'pending' && <p className="card__title">{label}</p>}
        </div>

        {!ready || (!report && !failed) ? (
          <p className="weather__hint">{t('weather.loading')}</p>
        ) : failed && !report ? (
          <div className="weather__error">
            <p className="weather__hint">{t('weather.error')}</p>
            <button
              type="button"
              className="link-btn weather__action"
              onClick={() => {
                setFailedKey(null)
                setReload((n) => n + 1)
              }}
            >
              {t('weather.retry')}
            </button>
          </div>
        ) : report ? (
          <>
            <div className="weather__now">
              <div>
                <p className="weather__temp">{formatTemp(report.temperature, locale)}</p>
                <p className="weather__cond">{t(conditionKey(report.code))}</p>
              </div>
              <WeatherIcon code={report.code} day={report.isDay} />
            </div>
            <div className="weather__meta">
              {report.windKmh != null && <span>{t('weather.wind', { speed: Math.round(report.windKmh) })}</span>}
              {report.humidity != null && <span>{t('weather.humidity', { n: Math.round(report.humidity) })}</span>}
              {report.apparent != null && Math.abs(report.apparent - report.temperature) >= 2 && (
                <span>{t('weather.feels', { temp: Math.round(report.apparent) })}</span>
              )}
            </div>
            <div className="weather__days">
              {report.days.map((day) => (
                <div key={day.date} className="weather__day">
                  <span className="weather__day-name">
                    {dayLabel(day.date, report.days, locale, t('weather.today'), t('weather.tomorrow'))}
                  </span>
                  <WeatherIcon code={day.code} day size={20} />
                  <span className="weather__day-max">{formatTemp(day.max, locale)}</span>
                  <span className="weather__day-min">{formatTemp(day.min, locale)}</span>
                </div>
              ))}
            </div>
            {failed && (
              <div className="weather__error">
                <p className="weather__hint">{t('weather.error')}</p>
                <button
                  type="button"
                  className="link-btn weather__action"
                  onClick={() => {
                    setFailedKey(null)
                    setReload((n) => n + 1)
                  }}
                >
                  {t('weather.retry')}
                </button>
              </div>
            )}
          </>
        ) : null}

        {geoMessage && <p className="weather__hint">{t(geoMessage === 'denied' ? 'weather.geoDenied' : 'weather.geoUnavailable', { place: fallbackLabel })}</p>}

        {canLocate && source === 'fallback' && (
          <button
            type="button"
            className="link-btn weather__action"
            onClick={() => {
              setGeoMessage(null)
              setSource('pending')
            }}
          >
            {t('weather.useDevice')}
          </button>
        )}
        {source === 'device' && (
          <button type="button" className="link-btn weather__action" onClick={useSavedPlace}>
            {t('weather.usePlace', { place: fallbackLabel })}
          </button>
        )}

        <div className="weather__footer">
          <a href={officialWarningsUrl(lang)} target="_blank" rel="noreferrer">
            {t('weather.official')}
          </a>
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            {t('weather.source')}
          </a>
          {source === 'device' && placeName && (
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              {t('weather.osm')}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
