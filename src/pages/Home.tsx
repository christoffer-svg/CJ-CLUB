import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { RowCard, Section } from '../components/Card'
import { CompassIcon, GuideIcon, KeyIcon, StarIcon } from '../components/Icons'

export default function Home() {
  return (
    <>
      <Header eyebrow="Bienvenido" title="Su vida en la Costa Blanca" subtitle="Todo lo que necesita, en un solo lugar." />
      <main className="page">
        <Section eyebrow="Su casa" title="Su gestor en CJ">
          <RowCard icon={<KeyIcon />} title="Equipo CJ" text="Su persona de contacto aparecerá aquí" />
        </Section>

        <Section eyebrow="CJ Club" title="Explore">
          <div className="grid-2">
            <Link to="/guia" className="card tile" style={{ textDecoration: 'none' }}>
              <span className="card__icon"><GuideIcon size={20} /></span>
              <span className="card__title">Guía</span>
              <span className="card__text">Contactos de confianza</span>
            </Link>
            <Link to="/descubrir" className="card tile" style={{ textDecoration: 'none' }}>
              <span className="card__icon"><CompassIcon size={20} /></span>
              <span className="card__title">Descubrir</span>
              <span className="card__text">Restaurantes, golf y planes</span>
            </Link>
            <Link to="/ventajas" className="card tile" style={{ textDecoration: 'none' }}>
              <span className="card__icon"><StarIcon size={20} /></span>
              <span className="card__title">Ventajas</span>
              <span className="card__text">Descuentos exclusivos</span>
            </Link>
            <Link to="/acceso" className="card tile" style={{ textDecoration: 'none' }}>
              <span className="card__icon"><KeyIcon size={20} /></span>
              <span className="card__title">Acceso</span>
              <span className="card__text">Vista de la pantalla de entrada</span>
            </Link>
          </div>
        </Section>
      </main>
    </>
  )
}
