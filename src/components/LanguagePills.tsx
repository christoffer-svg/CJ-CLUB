import { useEffect, useRef, useState } from 'react'
import { languages, useI18n } from '../i18n'

/**
 * Selector de idioma en forma de píldoras. Con dos o tres idiomas se ven todas;
 * con más, una píldora con el idioma actual ("SV ▾") abre el resto.
 */
export default function LanguagePills() {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const options = languages.map((l) => (
    <button
      key={l.code}
      type="button"
      lang={l.code}
      data-lang={l.code}
      aria-pressed={lang === l.code}
      title={l.name}
      className={lang === l.code ? 'lang-pill lang-pill--active' : 'lang-pill'}
      onClick={() => {
        setLang(l.code)
        setOpen(false)
      }}
    >
      {l.label}
      {languages.length > 3 && <span className="lang-pill__name">{l.name}</span>}
    </button>
  ))

  if (languages.length <= 3) {
    return (
      <div className="lang-pills" role="group" aria-label={t('lang.selector')}>
        {options}
      </div>
    )
  }

  const current = languages.find((l) => l.code === lang)!
  return (
    <div className="lang-menu" ref={box}>
      <button
        type="button"
        className="lang-pills lang-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${t('lang.selector')}: ${current.name}`}
        onClick={() => setOpen(!open)}
      >
        <span className="lang-pill lang-pill--active">{current.label}</span>
        <span className="lang-trigger__caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="lang-menu__list" role="group" aria-label={t('lang.selector')}>
          {options}
        </div>
      )}
    </div>
  )
}
