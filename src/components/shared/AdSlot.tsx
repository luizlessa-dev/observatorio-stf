import { useEffect, useRef } from 'react'

// Publisher ID do Google AdSense (ex: ca-pub-1234567890123456)
const ADSENSE_CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT as string) || ''

// Carrega o script do AdSense uma única vez, se configurado
let adsenseLoaded = false
function loadAdSenseScript() {
  if (adsenseLoaded || !ADSENSE_CLIENT || !ADSENSE_CLIENT.startsWith('ca-pub-')) return
  if (document.querySelector('script[src*="adsbygoogle.js"]')) {
    adsenseLoaded = true
    return
  }
  const s = document.createElement('script')
  s.async = true
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`
  s.crossOrigin = 'anonymous'
  document.head.appendChild(s)
  adsenseLoaded = true
}

interface AdSlotProps {
  slot: string // ID do ad unit configurado no AdSense
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical'
  fullWidthResponsive?: boolean
  className?: string
  style?: React.CSSProperties
}

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

export function AdSlot({
  slot,
  format = 'auto',
  fullWidthResponsive = true,
  className = '',
  style,
}: AdSlotProps) {
  const ref = useRef<HTMLModElement>(null)
  const pushedRef = useRef(false)

  useEffect(() => {
    if (!ADSENSE_CLIENT || pushedRef.current) return
    loadAdSenseScript()
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      pushedRef.current = true
    } catch (err) {
      console.error('AdSense error', err)
    }
  }, [])

  // Se não tiver cliente configurado, não renderiza nada
  if (!ADSENSE_CLIENT) return null

  return (
    <ins
      ref={ref}
      className={`adsbygoogle block ${className}`}
      style={{ display: 'block', ...style }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
    />
  )
}
