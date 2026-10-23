type Props = {
  eyebrow?: string
  title: string
  subtitle?: string
}

export default function Header({ eyebrow, title, subtitle }: Props) {
  return (
    <header className="header">
      <div className="header__brand">
        <img className="header__logo" src="/logo.png" alt="CJ" />
        <span className="eyebrow header__tagline">
          Real Estate &amp; Services
          <br />
          Costa Blanca
        </span>
      </div>
      {eyebrow && (
        <p className="eyebrow" style={{ marginTop: 26 }}>
          {eyebrow}
        </p>
      )}
      <h1 className="header__title" style={eyebrow ? { marginTop: 8 } : undefined}>
        {title}
      </h1>
      {subtitle && <p className="header__subtitle">{subtitle}</p>}
    </header>
  )
}
