import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

type GtagCommand = 'js' | 'config' | 'event' | 'set'

declare global {
  interface Window {
    gtag: (command: GtagCommand | Date, ...args: unknown[]) => void
    dataLayer: unknown[]
  }
}

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined

let gtagLoaded = false

function loadGtag(id: string) {
  if (gtagLoaded || typeof window === 'undefined') return
  gtagLoaded = true

  window.dataLayer = window.dataLayer ?? []
  window.gtag = (...args: unknown[]) => window.dataLayer.push(args)
  window.gtag('js', new Date())
  window.gtag('config', id, { send_page_view: false })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
  document.head.appendChild(script)
}

export function usePageTracking() {
  const location = useLocation()

  useEffect(() => {
    if (!GA_ID) return
    loadGtag(GA_ID)
  }, [])

  useEffect(() => {
    if (!GA_ID || typeof window.gtag !== 'function') return
    window.gtag('event', 'page_view', {
      page_path: location.pathname + location.search,
      page_title: document.title,
    })
  }, [location])
}
