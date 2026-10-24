import { languages, useI18n } from '../i18n'

/** Selector de idioma ES / EN en forma de píldoras */
export default function LanguagePills() {
  const { lang, setLang, t } = useI18n()
  return (
    <div className="lang-pills" role="group" aria-label={t('lang.selector')}>
      {languages.map((l) => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          data-lang={l.code}
          aria-pressed={lang === l.code}
          className={lang === l.code ? 'lang-pill lang-pill--active' : 'lang-pill'}
          onClick={() => setLang(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
