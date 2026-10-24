import { useCallback, useState } from 'react'
import Header from '../components/Header'
import QrCode from '../components/QrCode'
import Sheet from '../components/Sheet'
import { useI18n } from '../i18n'
import { familyName } from '../lib/format'
import { logDealUse, useActiveDeals, useDoc } from '../lib/data'
import type { Client } from '../lib/types'
import { useViewer } from '../lib/viewer'
import type { Timestamp } from 'firebase/firestore'

type Shown = { name: string; code: string }

/** "04/26", como en una tarjeta */
function memberSince(ts: Timestamp) {
  const d = ts.toDate()
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`
}

export default function Benefits() {
  const { clientId, preview } = useViewer()
  const { t, pick, lang } = useI18n()
  // "Gratis" se guarda en español; el resto de etiquetas (20%, 2x1...) no se traducen
  const label = (l: string) => (l.trim().toLowerCase() === 'gratis' ? t('benefits.free') : l)
  const client = useDoc<Client>(clientId ? `clients/${clientId}` : null)
  const deals = useActiveDeals()
  const [shown, setShown] = useState<Shown | null>(null)
  const close = useCallback(() => setShown(null), [])
  const c = client.data

  return (
    <>
      <Header eyebrow={t('benefits.eyebrow')} title={t('benefits.title')} subtitle={t('benefits.subtitle')} />
      <main className="page">
        <section className="member" aria-label={t('benefits.card')}>
          <div className="member-card">
            <svg className="member-card__guilloche" viewBox="0 0 320 200" preserveAspectRatio="none" aria-hidden="true">
              {Array.from({ length: 14 }, (_, i) => (
                <ellipse key={i} cx="300" cy="215" rx={60 + i * 16} ry={40 + i * 11} />
              ))}
            </svg>
            <span className="member-card__sheen" aria-hidden="true" />
            <img className="member-card__logo" src="/logo.png" alt="" />
            <div className="member-card__top">
              <span className="eyebrow">{t('benefits.member')}</span>
            </div>
            <div className="member-card__bottom">
              <span className="member-card__name">{c ? familyName(c.familyName, lang) : '\u00a0'}</span>
              <div className="member-card__row">
                <span className="member-card__number">{c?.memberNumber ?? '\u00a0'}</span>
                {c?.clientSince && <span className="member-card__since">{t('benefits.memberSince', { date: memberSince(c.clientSince) })}</span>}
              </div>
            </div>
          </div>
          <button
            className="btn"
            disabled={!c}
            onClick={() => c && setShown({ name: familyName(c.familyName, lang), code: c.memberNumber })}
          >
            {t('benefits.showCard')}
          </button>
        </section>

        <section className="section">
          <span className="eyebrow">{t('benefits.deals')}</span>
          <div className="card deal-list">
            {deals.data.map((d) => (
              <div key={d.id} className="deal">
                <span className="deal__value">{label(d.discountLabel)}</span>
                <div className="deal__body">
                  <span className="card__title">{d.title}</span>
                  <span className="card__text">{pick(d, 'conditions')}</span>
                </div>
                <button
                  className="use-btn"
                  onClick={() => {
                    setShown({ name: d.title, code: d.code })
                    // Registro para CJ (no en la vista previa); si falla, el cliente puede usar el descuento igualmente
                    if (clientId && !preview) logDealUse(d.id, clientId).catch(() => {})
                  }}
                >
                  {t('benefits.use')}
                </button>
              </div>
            ))}
            {!deals.loading && deals.data.length === 0 && <p className="card__text">{t('benefits.empty')}</p>}
          </div>
        </section>
      </main>

      {shown && (
        <Sheet title={shown.name} closeLabel={t('benefits.close')} onClose={close}>
          <h2 className="sheet__title">{shown.name}</h2>
          <p className="sheet__text">{t('benefits.sheetText')}</p>
          <QrCode value={shown.code} label={t('benefits.qr', { code: shown.code })} />
          <span className="sheet__code">{shown.code}</span>
        </Sheet>
      )}
    </>
  )
}
