import type { ReactNode } from 'react'
import { ChevronIcon } from './Icons'

type RowProps = {
  icon: ReactNode
  title: string
  text: string
}

export function RowCard({ icon, title, text }: RowProps) {
  return (
    <div className="card card--row">
      <div className="card__icon">{icon}</div>
      <div className="card__body">
        <span className="card__title">{title}</span>
        <span className="card__text">{text}</span>
      </div>
      <span className="card__chevron">
        <ChevronIcon />
      </span>
    </div>
  )
}

export function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section__head">
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="section__title">{title}</h2>
      </div>
      {children}
    </section>
  )
}
