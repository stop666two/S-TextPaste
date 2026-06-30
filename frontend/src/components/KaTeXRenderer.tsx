import { useEffect, useRef } from 'react'

interface Props {
  code: string
}

export default function KaTeXRenderer({ code }: Props) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current || !code) return
    import('katex').then((katexModule) => {
      try {
        katexModule.default.render(code, ref.current!, {
          displayMode: code.startsWith('$'),
          throwOnError: false,
        })
      } catch {
        ref.current!.textContent = code
      }
    }).catch(() => {
      ref.current!.textContent = code
    })
  }, [code])

  return <span ref={ref} className="katex-render" />
}
