import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { COSTA_BLANCA } from '../lib/geo'
import type { GeoPoint } from '../lib/types'

export type MapPoint = GeoPoint & { id: string; label: string }

type Props = {
  points?: MapPoint[]
  /** vivienda del cliente */
  home?: GeoPoint | null
  homeLabel?: string
  selected?: string | null
  onSelect?: (id: string) => void
  /** modo selector: un toque en el mapa elige la ubicación */
  onPick?: (p: GeoPoint) => void
  label: string
  className?: string
}

const pin = (active: boolean) =>
  L.divIcon({ className: '', html: `<span class="map-pin${active ? ' map-pin--active' : ''}"></span>`, iconSize: [22, 22], iconAnchor: [11, 11] })
const homeIcon = L.divIcon({ className: '', html: '<span class="map-home"></span>', iconSize: [26, 26], iconAnchor: [13, 13] })

/** Mapa de OpenStreetMap en tonos de la marca, con puntos dorados */
export default function MapView({ points = [], home, homeLabel, selected, onSelect, onPick, label, className }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const pickRef = useRef(onPick)
  const selectRef = useRef(onSelect)
  pickRef.current = onPick
  selectRef.current = onSelect

  useEffect(() => {
    if (!el.current) return
    const m = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView(
      [COSTA_BLANCA.lat, COSTA_BLANCA.lng],
      9,
    )
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      className: 'map-tiles',
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(m)
    m.attributionControl.setPrefix(false)
    m.on('click', (e: L.LeafletMouseEvent) => pickRef.current?.({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }))
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  // Puntos y encuadre
  const key = JSON.stringify([points.map((p) => [p.id, p.lat, p.lng]), home])
  useEffect(() => {
    const m = map.current
    const g = layer.current
    if (!m || !g) return
    g.clearLayers()
    const bounds: L.LatLngExpression[] = []
    if (home) {
      L.marker([home.lat, home.lng], { icon: homeIcon, title: homeLabel, keyboard: false, zIndexOffset: 500 })
        .addTo(g)
        .bindTooltip(homeLabel ?? '', { direction: 'top', offset: [0, -12] })
      bounds.push([home.lat, home.lng])
    }
    for (const p of points) {
      L.marker([p.lat, p.lng], { icon: pin(p.id === selected), title: p.label, alt: p.label })
        .addTo(g)
        .on('click', () => selectRef.current?.(p.id))
      bounds.push([p.lat, p.lng])
    }
    if (bounds.length === 1) m.setView(bounds[0], onPick ? 15 : 13)
    else if (bounds.length > 1) m.fitBounds(L.latLngBounds(bounds), { padding: [32, 32], maxZoom: 14 })
    // eslint-style: solo cuando cambian los puntos, no en cada render
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key, selected])

  return <div ref={el} className={className ? `map ${className}` : 'map'} role="region" aria-label={label} />
}
