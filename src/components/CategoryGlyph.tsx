import type { ReactNode } from 'react'
import { CompassIcon, HomeIcon, KeyIcon, ScalesIcon, ShieldIcon, SunIcon, WaveIcon, WrenchIcon } from './Icons'
import { normalizeIcon, type CategoryIcon } from '../lib/services'

const icons: Record<CategoryIcon, (props: { size?: number }) => ReactNode> = {
  default: CompassIcon,
  scales: ScalesIcon,
  shield: ShieldIcon,
  wave: WaveIcon,
  wrench: WrenchIcon,
  sun: SunIcon,
  key: KeyIcon,
  home: HomeIcon,
}

/** Icono de línea de un servicio. Si no hay uno elegido, el de por defecto. */
export default function CategoryGlyph({ icon, size = 18 }: { icon?: string; size?: number }) {
  const Icon = icons[normalizeIcon(icon)]
  return (
    <span className="a-glyph" aria-hidden="true">
      <Icon size={size} />
    </span>
  )
}
