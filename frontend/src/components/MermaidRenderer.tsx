import { useEffect, useRef } from 'react'

interface Props {
  code: string
}

export default function MermaidRenderer({ code }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !code) return
    import('mermaid').then(async (m) => {
      const isDark = document.documentElement.classList.contains('dark')
      m.default.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' })
      try {
        const { svg } = await m.default.render(`mermaid-${Date.now()}`, code)
        ref.current!.innerHTML = svg
      } catch {
        ref.current!.textContent = code
      }
    }).catch(() => {
      ref.current!.textContent = `[Mermaid]\n${code}`
    })
  }, [code])

  return <div ref={ref} className="mermaid-render" />
}
