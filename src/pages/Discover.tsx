import Header from '../components/Header'
import { RowCard, Section } from '../components/Card'
import { DishIcon, GolfIcon, SunIcon, WaveIcon } from '../components/Icons'

export default function Discover() {
  return (
    <>
      <Header eyebrow="Descubrir" title="Lo mejor de la zona" subtitle="Nuestras recomendaciones personales." />
      <main className="page">
        <Section eyebrow="Recomendaciones" title="Categorías">
          <RowCard icon={<DishIcon />} title="Restaurantes" text="Ejemplo · Cocina mediterránea" />
          <RowCard icon={<GolfIcon />} title="Golf" text="Ejemplo · Campos cercanos" />
          <RowCard icon={<WaveIcon />} title="Playas" text="Ejemplo · Calas y playas" />
          <RowCard icon={<SunIcon />} title="Planes" text="Ejemplo · Excursiones y cultura" />
        </Section>
      </main>
    </>
  )
}
