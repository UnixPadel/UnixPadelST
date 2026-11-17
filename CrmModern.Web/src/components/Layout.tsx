import { Suspense, useEffect, useState } from 'react'
import { Outlet, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Sidebar } from './Sidebar'
import { CommandPalette } from './CommandPalette'
import { UpdatesModal } from './UpdatesModal'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ZoomControl } from './ZoomControl'
import { ViewScaleSwitch } from './ViewScaleSwitch'
import { PageLoader } from './PageLoader'
import { StatusBar } from './StatusBar'
import { ShortcutHelpDialog } from './ShortcutHelpDialog'
import { OrderDetailModal } from './OrderDetailModal'
import { GuideDialog } from './guide/GuideDialog'
import { Button } from './ui/button'
import { openGuide } from '@/lib/guideStore'
import { useAuth } from '@/hooks/useAuth'
import { useHotkeys } from '@/hooks/useHotkeys'
import { getToken } from '@/lib/authStore'
import { applyUiScale, usePreferences } from '@/lib/preferences'
import { me } from '@/api/auth'

const SIDEBAR_KEY = 'sidebar:open'

export function Layout() {
  const { isLoggedIn, getUser, refreshUser } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [bootstrapped, setBootstrapped] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  // Görünüm ölçeği kullanıcıya özeldir: giriş/çıkışta ve Tercihlerim'de değişince uygulanır.
  const { uiScale } = usePreferences()
  useEffect(() => { applyUiScale(uiScale) }, [uiScale])

  // Sidebar tercihini localStorage'dan oku — yoksa default açık.
  // Mobilde ilk girişte kapalı olsun ki içerik açılışta görünür kalsın.
  // SR-10: masaüstünde "kapalı" artık ikon rayı (tamamen gizli değil).
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
      // me() boş token döndürür → mevcut token korunur; depolama tercihi (remember) değişmez.
      .then((u) => refreshUser({ ...getUser()!, ...u, token: getToken()! }))
      .catch(() => { /* axios interceptor 401'de zaten /login'e atar */ })
      .finally(() => setBootstrapped(true))
  }, [])

  // E-2 — uygulama geneli tuşlar (sayfalar kendi tuşlarını ayrıca bağlar).
  useHotkeys({
    f1: () => setHelpOpen(true),
    'shift+f1': () => openGuide(),
    f3: () => navigate(-1),
    f5: () => { void queryClient.invalidateQueries() },
    'ctrl+b': () => setSidebarOpen((o) => !o),
    '/': () => {
      const el = document.querySelector<HTMLElement>('main form[role="search"] input, main form[role="search"] [role="combobox"]')
      if (!el) return false
      el.focus()
    },
    f8: () => {
      const f = document.querySelector<HTMLFormElement>('main form[role="search"]')
      if (!f) return false
      f.requestSubmit()
    },
  }, { enabled: bootstrapped })

  if (!isLoggedIn()) return <Navigate to="/login" replace />
  if (!bootstrapped) return <PageLoader />

  // E-1 / E-8 — "?order=NO" her ekranda sipariş detayını (Sipariş Geçmişi dahil) açar
  // (Komut Paleti "SP <no>", Bekleyen İşler ve bağlam menüleri bunu kullanır).
  const orderParam = params.get('order')
  const closeOrder = () => setParams((p) => { const np = new URLSearchParams(p); np.delete('order'); return np }, { replace: true })

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        {/* Tek satır: dar ekranda (ör. 1280 px, %150 Windows ölçeği) iki satıra bölünüp
            her ekrandan ~45 px yükseklik yiyordu. Arama kutusu daralır; Kılavuz ve
            "Görünüm:" etiketleri geniş ekranda yazılı, dar ekranda yalnız simge/ipucu. */}
        <header className="flex min-h-14 shrink-0 items-center gap-x-3 border-b bg-background px-4 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-expanded={sidebarOpen}
            title={`${t('topbar.toggleMenu')} (Ctrl+B)`}
          >
            <Menu className="h-5 w-5" aria-hidden /> {t('topbar.menu')}
          </Button>
          <CommandPalette />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* Kullanım Kılavuzu — bulunulan ekranın bölümünü açar (Shift+F1). */}
            <Button size="sm" variant="ghost" onClick={() => openGuide()} title={`${t('guide.title')} (Shift+F1)`} aria-label={t('guide.button')}>
              <BookOpen className="h-4 w-4" aria-hidden /> <span className="hidden 2xl:inline">{t('guide.button')}</span>
            </Button>
            <ViewScaleSwitch />
            <ZoomControl />
            <LanguageSwitcher />
          </div>
        </header>
        {/* PROMPT-v6 §6 — sayfa düzeyinde yatay scrollbar üretilmez; geniş
             tablolar kendi sarmalayıcılarında (overflow-x-auto) kayar. */}
        {/* 0.3.4 — gri zemin: beyaz kartlar/alanlar zeminden ayrışır. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-canvas">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
        <StatusBar onShowHelp={() => setHelpOpen(true)} />
      </div>
      <UpdatesModal />
      <ShortcutHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <GuideDialog />
      <OrderDetailModal siparisNo={orderParam} onClose={closeOrder} />
    </div>
  )
}
