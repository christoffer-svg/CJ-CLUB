import type { TranslationKey } from '../i18n/translations'
import type { GeoPoint } from './types'

/**
 * Tiempo de la pantalla de inicio.
 *
 * La previsión sale de Open-Meteo: es gratis, no pide clave y el navegador puede leerla.
 * Para cambiar el pueblo que se usa cuando la vivienda no tiene mapa y el cliente
 * no comparte la ubicación del teléfono, edite DEFAULT_WEATHER_PLACE.
 *
 * Los avisos de color no son los de AEMET. Los listados oficiales (AEMET y MeteoAlarm)
 * no envían permiso para que una página web los lea, y consultarlos desde un servidor
 * exigiría el plan de pago de Firebase, que no está activado. Aquí se avisa solo si la
 * propia previsión pasa un umbral (viento, lluvia, calor, frío o tormenta), y se enlaza
 * la página oficial de AEMET para comprobarlo.
 */

/** Orihuela Costa (Alicante): centro de la costa, entre La Zenia y Cabo Roig. */
export const DEFAULT_WEATHER_PLACE: GeoPoint & { name: string } = {
  name: 'Orihuela Costa',
  lat: 37.925,
  lng: -0.73,
}

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const CACHE_MS = 15 * 60 * 1000
/** Hoy y los dos días siguientes. Más allá, basta con verlo en la previsión corta. */
const NOTICE_DAYS = 3

/** Umbrales orientativos. No son los del Plan Meteoalerta. */
const WIND_GUST_KMH = { moderate: 70, severe: 90, extreme: 110 }
const RAIN_MM = { moderate: 30, severe: 50, extreme: 80 }
const HEAT_C = { moderate: 38, severe: 40, extreme: 42 }
const COLD_C = { moderate: 2, severe: 0, extreme: -2 }

export type Severity = 'moderate' | 'severe' | 'extreme'
export type NoticeId = 'wind' | 'rain' | 'heat' | 'cold' | 'storm' | 'hail' | 'ice'

export type WeatherNotice = {
  id: NoticeId
  severity: Severity
  /** Día de la previsión, YYYY-MM-DD */
  date: string
  params: Record<string, number>
}

export type WeatherDay = {
  date: string
  code: number
  max: number
  min: number
  precipMm: number | null
  gustKmh: number | null
}

export type WeatherReport = {
  temperature: number
  apparent: number | null
  code: number
  windKmh: number | null
  humidity: number | null
  isDay: boolean
  days: WeatherDay[]
  notices: WeatherNotice[]
}

const cache = new Map<string, { at: number; data: WeatherReport }>()

const severityRank: Record<Severity, number> = { moderate: 1, severe: 2, extreme: 3 }
const noticeOrder: NoticeId[] = ['hail', 'storm', 'ice', 'wind', 'rain', 'heat', 'cold']

export function conditionKey(code: number): TranslationKey {
  if (code === 0) return 'weather.conditions.clear'
  if (code === 1) return 'weather.conditions.mainlyClear'
  if (code === 2) return 'weather.conditions.partlyCloudy'
  if (code === 3) return 'weather.conditions.overcast'
  if (code === 45 || code === 48) return 'weather.conditions.fog'
  if (code === 56 || code === 57 || code === 66 || code === 67) return 'weather.conditions.freezingRain'
  if (code >= 51 && code <= 55) return 'weather.conditions.drizzle'
  if (code >= 61 && code <= 65) return 'weather.conditions.rain'
  if (code >= 71 && code <= 77) return 'weather.conditions.snow'
  if (code >= 80 && code <= 82) return 'weather.conditions.showers'
  if (code === 85 || code === 86) return 'weather.conditions.snowShowers'
  if (code === 95) return 'weather.conditions.thunderstorm'
  if (code === 96 || code === 99) return 'weather.conditions.hail'
  return 'weather.conditions.unknown'
}

export function officialWarningsUrl(lang: string) {
  const prefix = lang === 'es' || lang === 'fr' ? lang : 'en'
  return `https://www.aemet.es/${prefix}/eltiempo/prediccion/avisos`
}

const PLACE_URL = 'https://nominatim.openstreetmap.org/reverse'
const placeNames = new Map<string, string>()

/** Nombre corto de un sitio a partir de la dirección de OpenStreetMap. */
export function placeLabel(address: Record<string, unknown> | null | undefined): string | null {
  if (!address) return null
  const text = (key: string) => (typeof address[key] === 'string' ? address[key].trim() : '')
  const suburb = text('suburb') || text('neighbourhood') || text('quarter') || text('hamlet')
  const city = text('city') || text('town') || text('village') || text('municipality')
  const local = suburb.replace(/^urbanizaci[oó]n\s+/i, '').replace(/\s+(?:ii|iii|iv)$/i, '').trim()
  return local || city || null
}

/** Pueblo o barrio de unas coordenadas. Vacío si el servicio no responde. */
export async function lookupPlaceName(point: GeoPoint, lang: string, signal?: AbortSignal): Promise<string | null> {
  const key = `${lang}:${point.lat.toFixed(2)},${point.lng.toFixed(2)}`
  const saved = placeNames.get(key)
  if (saved) return saved
  const url = new URL(PLACE_URL)
  url.searchParams.set('lat', String(point.lat))
  url.searchParams.set('lon', String(point.lng))
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('zoom', '13')
  url.searchParams.set('accept-language', lang)
  const res = await fetch(url, { signal, headers: { 'Accept-Language': lang } })
  if (!res.ok) return null
  const json = (await res.json()) as { address?: Record<string, unknown> }
  const name = placeLabel(json.address)
  if (name) placeNames.set(key, name)
  return name
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function cacheKey(point: GeoPoint) {
  return `${point.lat.toFixed(3)},${point.lng.toFixed(3)}`
}

function stepped(value: number | null, steps: { moderate: number; severe: number; extreme: number }, direction: 'up' | 'down'): Severity | null {
  if (value == null) return null
  if (direction === 'up') {
    if (value >= steps.extreme) return 'extreme'
    if (value >= steps.severe) return 'severe'
    if (value >= steps.moderate) return 'moderate'
    return null
  }
  if (value <= steps.extreme) return 'extreme'
  if (value <= steps.severe) return 'severe'
  if (value <= steps.moderate) return 'moderate'
  return null
}

function noticesForDay(day: WeatherDay): WeatherNotice[] {
  const out: WeatherNotice[] = []
  const { code, date } = day
  if (code === 99) out.push({ id: 'hail', severity: 'extreme', date, params: {} })
  else if (code === 96) out.push({ id: 'hail', severity: 'severe', date, params: {} })
  else if (code === 95) out.push({ id: 'storm', severity: 'moderate', date, params: {} })

  if (code === 67) out.push({ id: 'ice', severity: 'extreme', date, params: {} })
  else if (code === 66) out.push({ id: 'ice', severity: 'severe', date, params: {} })
  else if (code === 56 || code === 57) out.push({ id: 'ice', severity: 'moderate', date, params: {} })

  const wind = stepped(day.gustKmh, WIND_GUST_KMH, 'up')
  if (wind && day.gustKmh != null) out.push({ id: 'wind', severity: wind, date, params: { speed: Math.round(day.gustKmh) } })
  const rain = stepped(day.precipMm, RAIN_MM, 'up')
  if (rain && day.precipMm != null) out.push({ id: 'rain', severity: rain, date, params: { amount: Math.round(day.precipMm) } })
  const heat = stepped(day.max, HEAT_C, 'up')
  if (heat) out.push({ id: 'heat', severity: heat, date, params: { temp: Math.round(day.max) } })
  const cold = stepped(day.min, COLD_C, 'down')
  if (cold) out.push({ id: 'cold', severity: cold, date, params: { temp: Math.round(day.min) } })
  return out
}

/** El aviso más alto de cada tipo, dentro de los próximos días. Vacío si no hay ninguno. */
export function buildNotices(days: WeatherDay[]): WeatherNotice[] {
  const best = new Map<NoticeId, WeatherNotice>()
  for (const day of days.slice(0, NOTICE_DAYS)) {
    for (const notice of noticesForDay(day)) {
      const prev = best.get(notice.id)
      if (!prev || severityRank[notice.severity] > severityRank[prev.severity]) best.set(notice.id, notice)
    }
  }
  return [...best.values()].sort(
    (a, b) => severityRank[b.severity] - severityRank[a.severity] || noticeOrder.indexOf(a.id) - noticeOrder.indexOf(b.id),
  )
}

function parseReport(json: unknown): WeatherReport {
  if (!json || typeof json !== 'object') throw new Error('weather')
  const root = json as Record<string, unknown>
  const current = root.current
  const daily = root.daily
  if (!current || typeof current !== 'object' || !daily || typeof daily !== 'object') throw new Error('weather')
  const c = current as Record<string, unknown>
  const d = daily as Record<string, unknown>
  const temperature = num(c.temperature_2m)
  const code = num(c.weather_code)
  if (temperature == null || code == null) throw new Error('weather')

  const dates = d.time
  const codes = d.weather_code
  const maxes = d.temperature_2m_max
  const mins = d.temperature_2m_min
  if (!Array.isArray(dates) || !Array.isArray(codes) || !Array.isArray(maxes) || !Array.isArray(mins)) throw new Error('weather')
  const precips = Array.isArray(d.precipitation_sum) ? d.precipitation_sum : []
  const gusts = Array.isArray(d.wind_gusts_10m_max) ? d.wind_gusts_10m_max : []

  const days: WeatherDay[] = []
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    const dayCode = num(codes[i])
    const max = num(maxes[i])
    const min = num(mins[i])
    if (typeof date !== 'string' || dayCode == null || max == null || min == null) continue
    days.push({
      date,
      code: dayCode,
      max,
      min,
      precipMm: num(precips[i]),
      gustKmh: num(gusts[i]),
    })
  }
  if (days.length === 0) throw new Error('weather')

  return {
    temperature,
    apparent: num(c.apparent_temperature),
    code,
    windKmh: num(c.wind_speed_10m),
    humidity: num(c.relative_humidity_2m),
    isDay: c.is_day !== 0,
    days,
    notices: buildNotices(days),
  }
}

export async function fetchWeather(point: GeoPoint, signal?: AbortSignal, force = false): Promise<WeatherReport> {
  const key = cacheKey(point)
  const hit = cache.get(key)
  if (!force && hit && Date.now() - hit.at < CACHE_MS) return hit.data

  const url = new URL(FORECAST_URL)
  url.searchParams.set('latitude', String(point.lat))
  url.searchParams.set('longitude', String(point.lng))
  url.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day')
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max')
  url.searchParams.set('forecast_days', '4')
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('wind_speed_unit', 'kmh')

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('weather')
  const report = parseReport(await res.json())
  cache.set(key, { at: Date.now(), data: report })
  return report
}
