import React from 'react'
import ReactDOM from 'react-dom/client'
// HashRouter — Electron file:// protokolünde BrowserRouter çalışmaz
// (history API serverless ortamda direct URL'leri çözemez). Hash-based
// routing hem dev hem prod'da güvenle çalışır; URL'ler /#/login formuna döner.
// SR-9 — router artık App.tsx'teki createHashRouter (data router) örneğidir.
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ToastProvider'
import { ConfirmProvider } from '@/components/ui/confirm-dialog'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { router } from './App'
import './i18n/i18n'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmProvider>
            <RouterProvider router={router} />
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
