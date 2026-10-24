import { useState } from 'react'
import MapView from '../MapView'
import { parseLocation } from '../../lib/geo'
import type { GeoPoint } from '../../lib/types'
import { Input } from './Fields'

/**
 * Elegir una ubicación: tocando el mapa, o pegando un enlace de Google Maps o unas coordenadas.
 */
export default function LocationPicker({
  value,
  onChange,
  label,
}: {
  value: GeoPoint | null | undefined
  onChange: (p: GeoPoint | null) => void
  label: string
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  return (
    <div className="a-location">
      <MapView
        label={label}
        className="map--picker"
        points={value ? [{ id: 'sel', label, ...value }] : []}
        selected="sel"
        onPick={(p) => {
          setError('')
          onChange(p)
        }}
      />
      <div className="a-inline">
        <Input
          aria-label="Enlace de Google Maps o coordenadas"
          placeholder="Pegue un enlace de Google Maps o coordenadas (38.79, 0.17)"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          onBlur={() => {
            if (!text.trim()) return
            const p = parseLocation(text)
            if (p) {
              onChange(p)
              setText('')
            } else setError('No se reconocen coordenadas en ese texto. Pruebe con el enlace "Compartir" de Google Maps abierto en el ordenador.')
          }}
        />
        {value && (
          <button type="button" className="btn btn--ghost a-btn" onClick={() => onChange(null)}>
            Quitar ubicación
          </button>
        )}
      </div>
      <span className="a-field__hint">
        {value ? `Ubicación: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}. Toque el mapa para moverla.` : 'Sin ubicación. Toque el mapa para colocarla.'}
      </span>
      {error && <span className="a-error">{error}</span>}
    </div>
  )
}
