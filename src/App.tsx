import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/shared/Layout'
import { TRIBUNAL_LIST } from '@/lib/tribunais'
import { usePageTracking } from '@/hooks/useAnalytics'

// Lazy load all pages for code splitting
const HomePage = lazy(() => import('@/pages/home/HomePage'))
const HighlightsAdminPage = lazy(() => import('@/pages/admin/HighlightsAdminPage'))
const TribunalDashboard = lazy(() => import('@/pages/tribunal/TribunalDashboard'))
const TribunalProcessos = lazy(() => import('@/pages/tribunal/TribunalProcessos'))
const ProcessoDetalhe = lazy(() => import('@/pages/tribunal/ProcessoDetalhe'))
const TribunalMinistros = lazy(() => import('@/pages/tribunal/TribunalMinistros'))
const MinistroPage = lazy(() => import('@/pages/tribunal/MinistroPage'))
const BuscaPage = lazy(() => import('@/pages/busca/BuscaPage'))
const SobrePage = lazy(() => import('@/pages/institucional/SobrePage'))
const NotFoundPage = lazy(() => import('@/pages/error/NotFoundPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
      Carregando…
    </div>
  )
}

/** Needs to live inside <BrowserRouter> to access useLocation for GA tracking */
function AppInner() {
  usePageTracking()
  return (
    <Routes>
        <Route element={<Layout />}>
          <Route
            index
            element={
              <Suspense fallback={<PageLoader />}>
                <HomePage />
              </Suspense>
            }
          />
          <Route
            path="busca"
            element={
              <Suspense fallback={<PageLoader />}>
                <BuscaPage />
              </Suspense>
            }
          />

          {TRIBUNAL_LIST.map((t) => {
            const slug = t.path.slice(1)
            return (
              <Route key={t.id} path={slug}>
                <Route
                  index
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <TribunalDashboard />
                    </Suspense>
                  }
                />
                <Route
                  path="processos"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <TribunalProcessos />
                    </Suspense>
                  }
                />
                <Route
                  path="processo/:id"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProcessoDetalhe />
                    </Suspense>
                  }
                />
                <Route
                  path="ministros"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <TribunalMinistros />
                    </Suspense>
                  }
                />
                <Route
                  path="ministro/:slug"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <MinistroPage />
                    </Suspense>
                  }
                />
              </Route>
            )
          })}

          <Route
            path="sobre"
            element={
              <Suspense fallback={<PageLoader />}>
                <SobrePage />
              </Suspense>
            }
          />
          <Route
            path="metodologia"
            element={
              <Suspense fallback={<PageLoader />}>
                <SobrePage />
              </Suspense>
            }
          />
          <Route
            path="dados-abertos"
            element={
              <Suspense fallback={<PageLoader />}>
                <SobrePage />
              </Suspense>
            }
          />
          <Route
            path="api"
            element={
              <Suspense fallback={<PageLoader />}>
                <SobrePage />
              </Suspense>
            }
          />
          <Route
            path="privacidade"
            element={
              <Suspense fallback={<PageLoader />}>
                <SobrePage />
              </Suspense>
            }
          />

          <Route
            path="*"
            element={
              <Suspense fallback={<PageLoader />}>
                <NotFoundPage />
              </Suspense>
            }
          />
        </Route>

        {/* Admin — outside Layout, standalone */}
        <Route
          path="admin/highlights"
          element={
            <Suspense fallback={<PageLoader />}>
              <HighlightsAdminPage />
            </Suspense>
          }
        />
      </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
