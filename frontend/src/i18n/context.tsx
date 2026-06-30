import { useState, createContext, useContext, type ReactNode } from 'react'
import { en, zh } from './translations'

export type Lang = 'en' | 'zh'
export type Translations = typeof en

const translations: Record<Lang, Translations> = { en, zh }

interface I18nContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: keyof Translations) => string
  dir: 'ltr' | 'rtl'
}

const ctx = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
  dir: 'ltr',
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('s-textpaste-lang')
    if (stored === 'zh' || stored === 'en') return stored
    return navigator.language.startsWith('zh') ? 'zh' : 'en'
  })

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('s-textpaste-lang', l)
  }

  const t = (key: keyof Translations): string => {
    return translations[lang][key] || key
  }

  return (
    <ctx.Provider value={{ lang, setLang, t, dir: 'ltr' }}>
      {children}
    </ctx.Provider>
  )
}

export function useI18n() {
  return useContext(ctx)
}
