import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import { RowCard, Section } from '../components/Card'
import { DishIcon, GolfIcon, SunIcon, WaveIcon } from '../components/Icons'

const categories = [
  { key: 'restaurants', Icon: DishIcon, title: 'Restaurantes', text: 'Ejemplo · Cocina mediterránea' },
  { key: 'golf', Icon: GolfIcon, title: 'Golf', text: 'Ejemplo · Campos cercanos' },
  { key: 'beaches', Icon: WaveIcon, title: 'Playas', text: 'Ejemplo · Calas y playas' },
  { key: 'plans', Icon: SunIcon, title: 'Planes', text: 'Ejemplo · Excursiones y cultura' },
]

export default function Discover() {
  // ?categoria=restaurants muestra solo esa categoría (p. ej. desde "Dónde comer" en Inicio)
  const [params] = useSearchParams()
  const selected = params.get('categoria')
  const shown = categories.filter((c) => !selected || c.key === selected)

  return (
    <>
      <Header eyebrow="Descubrir" title="Lo mejor de la zona" subtitle="Nuestras recomendaciones personales." />
      <main className="page">
        <Section eyebrow="Recomendaciones" title="Categorías">
          {shown.map(({ key, Icon, title, text }) => (
            <RowCard key={key} icon={<Icon />} title={title} text={text} />
          ))}
        </Section>
      </main>
    </>
  )
}
