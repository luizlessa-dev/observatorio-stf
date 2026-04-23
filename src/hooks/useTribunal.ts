import { useLocation } from 'react-router-dom'
import { TRIBUNAL_LIST, type TribunalConfig } from '@/lib/tribunais'

export function useTribunalFromPath(): { tribunalId: string; tribunal: TribunalConfig | undefined } {
  const { pathname } = useLocation()
  const slug = pathname.split('/')[1]?.toLowerCase()
  const tribunal = TRIBUNAL_LIST.find((t) => t.path === `/${slug}`)
  return { tribunalId: tribunal?.id ?? slug?.toUpperCase() ?? '', tribunal }
}
