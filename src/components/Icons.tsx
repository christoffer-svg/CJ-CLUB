import type { ReactNode } from 'react'

type IconProps = { size?: number }

function Svg({ size = 22, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
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
      {children}
    </svg>
  )
}

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 10.5 12 4l8.5 6.5" />
    <path d="M5.5 9v10.5h13V9" />
    <path d="M10 19.5v-5h4v5" />
  </Svg>
)

export const GuideIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4.5h11.5a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2z" />
    <path d="M5 17.5a2 2 0 0 1 2-2h11.5" />
    <path d="M9 8.5h6M9 11.5h4" />
  </Svg>
)

export const CompassIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z" />
  </Svg>
)

export const StarIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 4 2.4 5 5.3.6-3.9 3.7 1 5.3L12 16l-4.8 2.6 1-5.3-3.9-3.7 5.3-.6z" />
  </Svg>
)

export const PhoneIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 4h3l1.5 4-2 1.3a10 10 0 0 0 4.7 4.7l1.3-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 4.5 6a2 2 0 0 1 2-2z" />
  </Svg>
)

export const KeyIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="15" r="3.5" />
    <path d="m10.5 12.5 8-8M16 7l2 2M14 9l1.5 1.5" />
  </Svg>
)

export const WrenchIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 5.5a4 4 0 0 0 4.9 4.9l-8.8 8.8a2 2 0 0 1-2.8-2.8l8.8-8.8a4 4 0 0 1-2.1-2.1z" />
  </Svg>
)

export const ScalesIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v16M7 20h10M5 7h14" />
    <path d="m5 7-2.5 6a2.5 2.5 0 0 0 5 0zM19 7l-2.5 6a2.5 2.5 0 0 0 5 0z" />
  </Svg>
)

export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 19 6v5.5c0 4.2-3 7.5-7 9-4-1.5-7-4.8-7-9V6z" />
  </Svg>
)

export const DishIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 16h16M5.5 16a6.5 6.5 0 0 1 13 0M12 9.5V8M3.5 19h17" />
  </Svg>
)

export const GolfIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 20V4l7 3.5L9 11" />
    <ellipse cx="12" cy="20" rx="7" ry="1.5" />
  </Svg>
)

export const WaveIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 10c2 0 2-1.5 4.5-1.5S9.5 10 12 10s2-1.5 4.5-1.5S19 10 21 10" />
    <path d="M3 15c2 0 2-1.5 4.5-1.5S9.5 15 12 15s2-1.5 4.5-1.5S19 15 21 15" />
  </Svg>
)

export const SunIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
  </Svg>
)

export const ChevronIcon = (p: IconProps) => (
  <Svg size={18} {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
)

export const ChatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 19.5 5.6 16A7.5 7.5 0 1 1 8.4 18.6z" />
    <path d="M9 10.5h6M9 13.5h4" />
  </Svg>
)

export const CrossIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.5 4.5h5v5h5v5h-5v5h-5v-5h-5v-5h5z" />
  </Svg>
)

export const AlertIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4 21 19.5H3z" />
    <path d="M12 10v4.5M12 17v.01" />
  </Svg>
)
