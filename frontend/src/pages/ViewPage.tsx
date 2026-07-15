import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { getPaste, deletePaste } from '../api'
import SecurityDashboard from '../components/SecurityDashboard'

export default function ViewPage() {
  const { id } = useParams<{ id: string }>()
  const safeId = id || ''
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading] = useState(true)
  const [pasteData, setPasteData] = useState<any>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteToken, setDeleteToken] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const loadedFromState = useRef(false)

  useEffect(() => {
    if (loadedFromState.current) return
    loadedFromState.current = true
    // Content MUST come from React Router state (in-memory), NEVER from URL
    const state = location.state as any
    if (state?.content) {
      setMarkdown(state.content)
      if (safeId) getPaste(safeId).then(setPasteData).catch(() => {})
      setLoading(false)
      // Clear URL history so back button can't reveal content
      window.history.replaceState(null, '', `/view/${safeId}`)
      return
    }
    // No state = no authorization. Redirect to decrypt.
    if (safeId) navigate(`/read/${safeId}`, { replace: true })
  }, [safeId])

  const handleDelete = async () => {
    setDeleteError(''); setDeleting(true)
    try { await deletePaste(safeId, deleteToken); navigate('/create') }
    catch (err: any) { setDeleteError(err.message || 'Delete failed') }
    finally { setDeleting(false) }
  }

  if (loading) return <div className="view-page"><div className="loading">{t('loading')}</div></div>

  return (
    <div className="view-page">
      <div className="view-header">
        <h2>{t('appTitle')}</h2>
        <div className="view-actions">
          <button className="btn btn-danger btn-sm" onClick={() => setShowDelete(!showDelete)}>{t('delete')}</button>
        </div>
      </div>

      {showDelete && (
        <div className="delete-section">
          <h4>{t('delete')}</h4>
          <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('deleteTokenHint')}</p>
          <input type="text" className="delete-input" placeholder={t('deleteToken') + '...'} value={deleteToken} onChange={e => setDeleteToken(e.target.value)} autoComplete="off" />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting || !deleteToken}>{deleting ? t('loading') : t('delete')}</button>
            <button className="btn btn-secondary" onClick={() => { setShowDelete(false); setDeleteToken(''); setDeleteError('') }}>{t('cancel')}</button>
          </div>
          {deleteError && <div className="error-message" style={{ marginTop: '0.5rem' }}>{deleteError}</div>}
        </div>
      )}

      <SecurityDashboard pasteData={pasteData} />

      {markdown ? (
        <div className="rendered-markdown"><FullContentRenderer markdown={markdown} /></div>
      ) : (
        <div className="error-message">
          <p>{t('decryptFailed')}</p>
          <button className="btn btn-secondary" onClick={() => navigate(`/read/${safeId}`)} style={{ marginTop: '1rem' }}>{t('decrypt')}</button>
        </div>
      )}
    </div>
  )
}

// ============ Full Markdown Renderer ============

function FullContentRenderer({ markdown }: { markdown: string }) {
  const [html, setHtml] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([import('marked'), import('highlight.js'), import('katex'), import('mermaid'), import('dompurify')])
      .then(([markedModule, hljsModule, katexModule, mermaidModule, DOMPurifyModule]) => {
        if (cancelled) return
        const { marked, Renderer } = markedModule
        const hljs = hljsModule.default
        const katex = katexModule.default
        const DOMPurify = DOMPurifyModule.default
        const isDark = document.documentElement.classList.contains('dark')
        mermaidModule.default.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' })

        const renderer = new Renderer()
        renderer.code = function({ text, lang }: { text: string; lang?: string }) {
          if (lang === 'mermaid') { const id = `m-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; setTimeout(() => renderMermaid(id, text, mermaidModule.default), 50); return `<div class="mermaid-container" id="${id}">${escapeHtml(text)}</div>` }
          if (lang === 'katex' || lang === 'math') { try { return `<p class="katex-display">${katex.renderToString(text, { displayMode: true, throwOnError: false })}</p>` } catch { return `<pre><code>${escapeHtml(text)}</code></pre>` } }
          if (lang && hljs.getLanguage(lang)) { try { return `<pre><code class="hljs language-${lang}">${hljs.highlight(text, { language: lang }).value}</code></pre>` } catch { } }
          return `<pre><code>${escapeHtml(text)}</code></pre>`
        }

        marked.setOptions({ gfm: true, breaks: true, renderer })
        let processed = markdown
          .replace(/\$\$(.+?)\$\$/gs, (_, m) => { try { return `<p class="katex-display">${katex.renderToString(m.trim(), { displayMode: true, throwOnError: false })}</p>` } catch { return `$$${m}$$` } })
          .replace(/(?<!\d)\$(.+?)\$(?!\d)/g, (_, m) => { try { return katex.renderToString(m, { throwOnError: false }) } catch { return `$${m}$` } })
        const rendered = marked.parse(processed) as string
        if (!cancelled) setHtml(DOMPurify.sanitize(rendered))
      }).catch(() => { if (!cancelled) setHtml('<p>Error rendering content</p>') })
    return () => { cancelled = true }
  }, [markdown])

  return <article ref={containerRef} className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
}

async function renderMermaid(id: string, code: string, mm: any) { const el = document.getElementById(id); if (!el) return; try { el.innerHTML = (await mm.render(`m-${id}`, code)).svg; el.classList.add('mermaid-rendered') } catch { el.textContent = code } }
function escapeHtml(s: string): string { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
