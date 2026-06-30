import { useEffect, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n/context'
import LanguageSwitch from './LanguageSwitch'

export default function Layout({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('s-textpaste-dark')
    if (stored !== null) return stored === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    localStorage.setItem('s-textpaste-dark', String(dark))
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem('s-textpaste-dark')
      if (stored === null) setDark(e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner">
          <h1 className="logo">
            <span className="logo-icon">&#128274;</span>
            {t('appTitle')}
          </h1>
          <p className="subtitle">{t('appDesc')}</p>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setDark(!dark)} title="Toggle dark mode">
            {dark ? '&#9790;' : '&#9788;'}
          </button>
          <LanguageSwitch />
        </div>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <p>S-TextPaste &copy; 2024 &middot; Zero-trust end-to-end encrypted</p>
      </footer>
    </div>
  )
}
