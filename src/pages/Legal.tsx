import { useNavigate } from 'react-router-dom'
import LanguagePills from '../components/LanguagePills'
import { useI18n } from '../i18n'
import { draft, legalDoc, type LegalPageKey } from '../legal/content'

/** Política de privacidad o aviso legal; accesible con o sin sesión */
export default function Legal({ page }: { page: LegalPageKey }) {
  const { lang, t } = useI18n()
  const navigate = useNavigate()
  const doc = legalDoc(lang, page)

  return (
    <>
      <header className="header">
        <div className="header__top">
          <button
            className="link-btn legal__back"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/acceso'))}
          >
            ‹ {t('legal.back')}
          </button>
          <LanguagePills />
        </div>
        <h1 className="header__title">{doc.title}</h1>
        <p className="header__subtitle">{doc.updated}</p>
      </header>
      <main className="page legal">
        {draft && <p className="legal__draft">{t('legal.draft')}</p>}
        {doc.sections.map((s) => (
          <section key={s.title} className="legal__section">
            <h2 className="legal__title">{s.title}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="legal__text">
                {p}
              </p>
            ))}
          </section>
        ))}
      </main>
    </>
  )
}
