import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import LanguageSwitch from './LanguageSwitch'
import Disclaimer from './Disclaimer'

export default function Layout({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('s-textpaste-dark')
    if (stored !== null) return stored === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => { localStorage.setItem('s-textpaste-dark', String(dark)); document.documentElement.classList.toggle('dark', dark) }, [dark])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => { if (localStorage.getItem('s-textpaste-dark') === null) setDark(e.matches) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div className="layout">
      <Disclaimer />
      <header className="header">
        <div className="header-inner">
          <Link to="/create" className="logo" style={{ textDecoration: 'none' }}>
            <span className="logo-icon">{'\uD83D\uDD12'}</span>
            {t('appTitle')}
          </Link>
          <p className="subtitle">{t('appDesc')}</p>
        </div>
        <div className="header-actions">
          <Link to="/create" className="btn btn-sm btn-secondary" style={{ textDecoration: 'none' }}>+ {t('createPaste')}</Link>
          <button className="icon-btn" onClick={() => setDark(!dark)} title="Toggle dark mode">
            {dark ? '\u2600' : '\u263D'}
          </button>
          <LanguageSwitch />
        </div>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <p>S-TextPaste &copy; 2025 &middot; {t('appDesc')}</p>
      </footer>
    </div>
  )
}
