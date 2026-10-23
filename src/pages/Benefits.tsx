import Header from '../components/Header'
import { Section } from '../components/Card'

const examples = [
  { value: '10%', title: 'Restaurante colaborador', text: 'Ejemplo · Presente su tarjeta CJ Club' },
  { value: '15%', title: 'Club de golf', text: 'Ejemplo · Green fees' },
  { value: '20%', title: 'Tienda de decoración', text: 'Ejemplo · Mobiliario y textil' },
]

export default function Benefits() {
  return (
    <>
      <Header eyebrow="Ventajas" title="Descuentos exclusivos" subtitle="Solo para miembros de CJ Club." />
      <main className="page">
        <Section eyebrow="Colaboradores" title="Sus ventajas">
          {examples.map((p) => (
            <div key={p.title} className="card perk">
              <span className="perk__value">{p.value}</span>
              <div className="card__body">
                <span className="card__title">{p.title}</span>
                <span className="card__text">{p.text}</span>
              </div>
            </div>
          ))}
        </Section>
      </main>
    </>
  )
}
