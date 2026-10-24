import { useCallback, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import Header from '../components/Header'
import QrCode from '../components/QrCode'
import Sheet from '../components/Sheet'
import { logDealUse, useActiveDeals, useDoc } from '../lib/data'
import type { Client } from '../lib/types'
import type { Timestamp } from 'firebase/firestore'

type Shown = { name: string; code: string }

/** "04/26", como en una tarjeta */
function memberSince(ts: Timestamp) {
  const d = ts.toDate()
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`
}

export default function Benefits() {
  const { profile } = useAuth()
  const client = useDoc<Client>(profile?.clientId ? `clients/${profile.clientId}` : null)
  const deals = useActiveDeals()
  const [shown, setShown] = useState<Shown | null>(null)
  const close = useCallback(() => setShown(null), [])
  const c = client.data

  return (
    <>
      <Header eyebrow="Ventajas" title="Sus ventajas" subtitle="Enseñe su tarjeta o el código en el establecimiento" />
      <main className="page">
        <section className="member" aria-label="Tarjeta de socio">
          <div className="member-card">
            <svg className="member-card__guilloche" viewBox="0 0 320 200" preserveAspectRatio="none" aria-hidden="true">
              {Array.from({ length: 14 }, (_, i) => (
                <ellipse key={i} cx="300" cy="215" rx={60 + i * 16} ry={40 + i * 11} />
              ))}
            </svg>
            <span className="member-card__sheen" aria-hidden="true" />
            <img className="member-card__logo" src="/logo.png" alt="" />
            <div className="member-card__top">
              <span className="eyebrow">Miembro CJ Club</span>
            </div>
            <div className="member-card__bottom">
              <span className="member-card__name">{c?.familyName ?? '\u00a0'}</span>
              <div className="member-card__row">
                <span className="member-card__number">{c?.memberNumber ?? '\u00a0'}</span>
                {c?.clientSince && <span className="member-card__since">Socio desde {memberSince(c.clientSince)}</span>}
              </div>
            </div>
          </div>
          <button
            className="btn"
            disabled={!c}
            onClick={() => c && setShown({ name: c.familyName, code: c.memberNumber })}
          >
            Mostrar tarjeta
          </button>
        </section>

        <section className="section">
          <span className="eyebrow">Descuentos</span>
          <div className="card deal-list">
            {deals.data.map((d) => (
              <div key={d.id} className="deal">
                <span className="deal__value">{d.discountLabel}</span>
                <div className="deal__body">
                  <span className="card__title">{d.title}</span>
                  <span className="card__text">{d.conditions_es}</span>
                </div>
                <button
                  className="use-btn"
                  onClick={() => {
                    setShown({ name: d.title, code: d.code })
                    // Registro para CJ; si falla, el cliente puede usar el descuento igualmente
                    if (profile?.clientId) logDealUse(d.id, profile.clientId).catch(() => {})
                  }}
                >
                  Usar
                </button>
              </div>
            ))}
            {!deals.loading && deals.data.length === 0 && <p className="card__text">Pronto habrá nuevas ventajas.</p>}
          </div>
        </section>
      </main>

      {shown && (
        <Sheet title={shown.name} onClose={close}>
          <h2 className="sheet__title">{shown.name}</h2>
          <p className="sheet__text">Enséñelo al pagar. El descuento se aplica directamente.</p>
          <QrCode value={shown.code} />
          <span className="sheet__code">{shown.code}</span>
        </Sheet>
      )}
    </>
  )
}
