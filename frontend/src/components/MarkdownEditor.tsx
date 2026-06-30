import { useState, useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { useI18n } from '../i18n/context'

export default function MarkdownEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (val: string) => void
}) {
  const { t } = useI18n()
  const [html, setHtml] = useState('')
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    Promise.all([
      import('marked'),
      import('highlight.js'),
      import('dompurify')
    ]).then(([markedModule, hljsModule, DOMPurifyModule]) => {
      if (!mountedRef.current) return
      const { marked, Renderer } = markedModule
      const hljs = hljsModule.default
      const DOMPurify = DOMPurifyModule.default

      const renderer = new Renderer()
      renderer.code = function({ text, lang }: { text: string; lang?: string }) {
        if (lang === 'mermaid') {
          return `<pre class="mermaid-placeholder"><code>${escapeHtml(text)}</code></pre>`
        }
        if (lang && hljs.getLanguage(lang)) {
          try {
            const highlighted = hljs.highlight(text, { language: lang }).value
            return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`
          } catch { /* fall through */ }
        }
        return `<pre><code>${escapeHtml(text)}</code></pre>`
      }

      marked.setOptions({ gfm: true, breaks: true, renderer })
      try {
        const rendered = marked.parse(value) as string
        setHtml(DOMPurify.sanitize(rendered))
      } catch {
        setHtml('<p>Error rendering markdown</p>')
      }
    }).catch(() => {
      setHtml('<p>Error loading renderer</p>')
    })
    return () => { mountedRef.current = false }
  }, [value])

  return (
    <div className="editor-container">
      <div className="editor-pane">
        <div className="pane-header">{t('editor')}</div>
        <CodeMirror
          value={value}
          height="100%"
          extensions={[markdown()]}
          onChange={onChange}
          theme={oneDark}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            foldGutter: true,
            bracketMatching: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
          }}
        />
      </div>
      <div className="preview-pane">
        <div className="pane-header">{t('preview')}</div>
        <div className="preview-content" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
