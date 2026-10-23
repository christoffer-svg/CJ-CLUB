import Header from '../components/Header'
import { RowCard, Section } from '../components/Card'
import { PhoneIcon, ScalesIcon, ShieldIcon, WrenchIcon } from '../components/Icons'

export default function Guide() {
  return (
    <>
      <Header eyebrow="Guía" title="Contactos de confianza" subtitle="Profesionales que conocemos y recomendamos." />
      <main className="page">
        <Section eyebrow="Para usted" title="Sus contactos">
          <RowCard icon={<PhoneIcon />} title="Contacto asignado" text="Ejemplo · Se mostrará aquí" />
        </Section>
        <Section eyebrow="Generales" title="Servicios">
          <RowCard icon={<WrenchIcon />} title="Mantenimiento" text="Ejemplo · Fontanería, electricidad" />
          <RowCard icon={<ScalesIcon />} title="Asesoría legal" text="Ejemplo · Abogados y gestoría" />
          <RowCard icon={<ShieldIcon />} title="Seguros" text="Ejemplo · Hogar y salud" />
        </Section>
      </main>
    </>
  )
}
