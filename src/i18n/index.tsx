import { doc, updateDoc } from 'firebase/firestore'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { auth, db } from '../lib/firebase'
import { defaultLanguage, languages, translations, type Language, type TranslationKey } from './translations'

export { languages, type Language } from './translations'

type I18n = {
  lang: Language
  setLang: (lang: Language) => void
  /** Texto fijo traducido; {n}, {name}... se sustituyen por params */
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  /** Campo de datos en el idioma actual (p. ej. name_en), con el español como reserva */
  pick: (item: object | null | undefined, field: string) => string
  locale: string
}

const I18nContext = createContext<I18n | null>(null)
const STORAGE_KEY = 'cjclub.language'

const isLanguage = (v: unknown): v is Language => languages.some((l) => l.code === v)

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(saved)) return saved
  } catch {
    // sin almacenamiento local: se usa el idioma del navegador
  }
  const browser = navigator.language?.slice(0, 2)
  return isLanguage(browser) ? browser : defaultLanguage
}

function build(lang: Language, setLang: (l: Language) => void): I18n {
  const dict = translations[lang]
  return {
    lang,
    setLang,
    locale: languages.find((l) => l.code === lang)!.locale,
    t: (key, params) => {
      let text = dict[key] ?? translations[defaultLanguage][key] ?? key
      if (params) for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v))
      return text
    },
    pick: (item, field) => {
      const rec = (item ?? {}) as Record<string, unknown>
      const value = rec[`${field}_${lang}`]
      return typeof value === 'string' && value.trim() ? value : ((rec[`${field}_${defaultLanguage}`] as string) ?? '')
    },
  }
}

/**
 * Idioma de la app de clientes. Antes de entrar se recuerda en el navegador; con sesión
 * abierta se guarda en users/{uid}.language y manda el del perfil.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const [lang, setLangState] = useState<Language>(initialLanguage)
  // Idioma elegido en la pantalla de acceso antes de entrar: se guarda en el perfil al entrar
  const chosenBeforeLogin = useRef<Language | null>(null)

  const remember = (l: Language) => {
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      // no es imprescindible
    }
  }

  // El idioma del perfil se aplica una sola vez por sesión (al entrar), no cada vez que cambia el perfil
  const appliedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!user || !profile) {
      appliedFor.current = null
      return
    }
    if (appliedFor.current === user.uid) return
    appliedFor.current = user.uid
    const chosen = chosenBeforeLogin.current
    chosenBeforeLogin.current = null
    if (chosen) {
      if (chosen !== profile.language) updateDoc(doc(db, 'users', user.uid), { language: chosen }).catch(() => {})
      return
    }
    if (isLanguage(profile.language)) {
      setLangState(profile.language)
      remember(profile.language)
    }
  }, [user, profile])

  useEffect(() => {
    document.documentElement.lang = lang
    // los correos de Firebase (p. ej. recuperar contraseña) salen en este idioma
    auth.languageCode = lang
  }, [lang])

  const setLang = useCallback(
    (l: Language) => {
      setLangState(l)
      remember(l)
      if (user && profile) {
        updateDoc(doc(db, 'users', user.uid), { language: l }).catch(() => {})
      } else {
        chosenBeforeLogin.current = l
      }
    },
    [user, profile],
  )

  return <I18nContext.Provider value={build(lang, setLang)}>{children}</I18nContext.Provider>
}

/** Idioma fijo para "Ver como cliente": no guarda nada en el perfil del cliente */
export function PreviewLanguage({ initial, children }: { initial: Language; children: ReactNode }) {
  const [lang, setLang] = useState<Language>(initial)
  useEffect(() => setLang(initial), [initial])
  return <I18nContext.Provider value={build(lang, setLang)}>{children}</I18nContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n debe usarse dentro de LanguageProvider')
  return ctx
}
