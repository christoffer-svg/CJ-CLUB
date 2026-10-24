import type { GeoPoint } from './types'

/** Centro de la Costa Blanca, para mapas sin puntos */
export const COSTA_BLANCA: GeoPoint = { lat: 38.55, lng: -0.25 }

export const isGeoPoint = (p: unknown): p is GeoPoint =>
  typeof p === 'object' && p !== null && Number.isFinite((p as GeoPoint).lat) && Number.isFinite((p as GeoPoint).lng)

/** Distancia en línea recta, en km */
export function distanceKm(a: GeoPoint, b: GeoPoint) {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

/** "3,2" / "3.2" según el idioma; a partir de 10 km sin decimales */
export function formatKm(km: number, locale: string) {
  return km.toLocaleString(locale, { maximumFractionDigits: km < 10 ? 1 : 0 })
}

/** Enlace "Cómo llegar": abre Google Maps (o la app de mapas del móvil) con la ruta */
export function directionsUrl(p: GeoPoint) {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
}

/**
 * Coordenadas a partir de lo que pegue el equipo de CJ: un enlace de Google Maps
 * (".../@38.79,0.17,15z", "...?q=38.79,0.17", "...!3d38.79!4d0.17") o "38.79, 0.17".
 */
export function parseLocation(text: string): GeoPoint | null {
  const t = decodeURIComponent(text.trim())
  const patterns = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/]
  for (const re of patterns) {
    const m = t.match(re)
    if (m) {
      const p = { lat: Number(m[1]), lng: Number(m[2]) }
      if (Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180) return p
    }
  }
  return null
}
