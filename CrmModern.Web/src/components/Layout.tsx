import { Suspense, useEffect, useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Sidebar } from './Sidebar'
import { GlobalSearch } from './GlobalSearch'
import { UpdatesModal } from './UpdatesModal'
import { LanguageSwitcher } from './LanguageSwitcher'
import { PageLoader } from './PageLoader'
import { useAuth } from '@/hooks/useAuth'
import { me } from '@/api/auth'

const SIDEBAR_KEY = 'sidebar:open'

export function Layout() {
  const { isLoggedIn, getUser, saveUser } = useAuth()
  const { t } = useTranslation()
  const [bootstrapped, setBootstrapped] = useState(false)

  // Sidebar tercihini localStorage'dan oku — yoksa default açık.
  // Mobilde ilk girişte kapalı olsun ki içerik açılışta görünür kalsın.
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY)
    if (saved !== null) return saved === '1'
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  })

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, sidebarOpen ? '1' : '0')
  }, [sidebarOpen])

  // Sayfa yenilemede token varsa /me ile kullanıcıyı doğrula + tazele.
  useEffect(() => {
    if (!isLoggedIn()) { setBootstrapped(true); return }
    me()
      .then((u) => saveUser({ ...getUser()!, ...u, token: localStorage.getItem('token')! }))
      .catch(() => { /* axios interceptor 401'de zaten /login'e atar */ })
      .finally(() => setBootstrapped(true))
  }, [])

  if (!isLoggedIn()) return <Navigate to="/login" replace />
  if (!bootstrapped) return <PageLoader />

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b bg-background/80 backdrop-blur flex items-center px-4 gap-4 shrink-0">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="rounded-md p-2 hover:bg-accent transition-colors"
            aria-label={t('topbar.toggleMenu')}
            title={t('topbar.toggleMenu')}
          >
            <Menu className="h-5 w-5" />
          </button>
          <GlobalSearch />
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </header>
        {/* PROMPT-v6 §6 — sayfa düzeyinde yatay scrollbar üretilmez; geniş
             tablolar kendi sarmalayıcılarında (overflow-x-auto) kayar. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <UpdatesModal />
    </div>
  )
}
