import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, CheckSquare, Factory, Truck,
  Calculator, FileText, Users, UserPlus, Search, LogOut, ChevronRight, Sparkles, X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { logout as apiLogout } from '@/api/auth'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  path: string
  i18nKey: string
  icon: React.ReactNode
  roles?: string[]
  usernames?: string[]   // rol VEYA kullanıcı adı — birden fazla varsa OR
}

const navItems: NavItem[] = [
  { path: '/dashboard',       i18nKey: 'nav.dashboard',         icon: <LayoutDashboard className="h-4 w-4" /> },
  { path: '/orders/new',      i18nKey: 'nav.createOrderQuote',  icon: <ShoppingCart className="h-4 w-4" />, roles: ['Yonetici','Temsilci','Gozlemci'] },
  { path: '/orders/mine',     i18nKey: 'nav.myOrders',          icon: <ShoppingCart className="h-4 w-4" />, roles: ['Yonetici','Temsilci','Gozlemci'] },
  { path: '/quality-control', i18nKey: 'nav.qualityControl',    icon: <CheckSquare className="h-4 w-4" />, roles: ['Yonetici'] },
  { path: '/factory',         i18nKey: 'nav.factory',           icon: <Factory className="h-4 w-4" />,   roles: ['Yonetici', 'Fabrika', 'Gozlemci'] },
  { path: '/logistics/ready',     i18nKey: 'nav.logisticsReady',     icon: <Truck className="h-4 w-4" />, roles: ['Yonetici', 'Lojistik'] },
  { path: '/logistics/history',   i18nKey: 'nav.logisticsHistory',   icon: <Truck className="h-4 w-4" />, roles: ['Yonetici', 'Lojistik', 'Gozlemci'], usernames: ['elshan.rasulov'] },
  { path: '/logistics/carriers',  i18nKey: 'nav.logisticsCarriers',  icon: <Truck className="h-4 w-4" />, roles: ['Yonetici', 'Lojistik', 'Gozlemci'], usernames: ['elshan.rasulov'] },
  { path: '/accounting',         i18nKey: 'nav.accounting',                       icon: <Calculator className="h-4 w-4" />, roles: ['Yonetici', 'Muhasebe'] },
  { path: '/accounting/logistics-approvals', i18nKey: 'nav.accountingLogisticsApprovals', icon: <Truck className="h-4 w-4" />, roles: ['Yonetici', 'Muhasebe'], usernames: ['elshan.rasulov'] },
  { path: '/accounting/history', i18nKey: 'nav.accountingHistory',                icon: <Calculator className="h-4 w-4" />, roles: ['Yonetici', 'Muhasebe', 'Gozlemci'] },
  { path: '/accounting/balance', i18nKey: 'nav.accountingBalance',                icon: <Calculator className="h-4 w-4" />, roles: ['Yonetici', 'Muhasebe'] },
  { path: '/purchase/new',     i18nKey: 'nav.purchaseNew',   icon: <FileText className="h-4 w-4" />, roles: ['Yonetici','Lojistik','Fabrika','Gozlemci','Temsilci'] },
  { path: '/purchase/mine',    i18nKey: 'nav.purchaseMine',  icon: <FileText className="h-4 w-4" /> },
  { path: '/purchase/all',     i18nKey: 'nav.purchaseAll',   icon: <FileText className="h-4 w-4" />, roles: ['Yonetici','Gozlemci','Muhasebe'], usernames: ['elshan.rasulov'] },
  { path: '/approval/pre',     i18nKey: 'nav.approvalPre',     icon: <FileText className="h-4 w-4" />, usernames: ['omur.caliskan'] },
  { path: '/approval/payment', i18nKey: 'nav.approvalPayment', icon: <FileText className="h-4 w-4" />, roles: ['Muhasebe'] },
  { path: '/approval/final',   i18nKey: 'nav.approvalFinal',   icon: <FileText className="h-4 w-4" />, roles: ['Yonetici'], usernames: ['elshan.rasulov'] },
  { path: '/customers',       i18nKey: 'nav.customers',       icon: <UserPlus className="h-4 w-4" />,roles: ['Yonetici','Temsilci','Gozlemci','Muhasebe'] },
  { path: '/users',           i18nKey: 'nav.users',           icon: <Users className="h-4 w-4" />,   roles: ['Yonetici'] },
  { path: '/search',          i18nKey: 'nav.search',          icon: <Search className="h-4 w-4" /> },
  { path: '/updates',         i18nKey: 'nav.updates',         icon: <Sparkles className="h-4 w-4" /> },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { getUser, logout } = useAuth()
  const user = getUser()

  const visibleItems = navItems.filter((item) => {
    if (!item.roles && !item.usernames) return true
    if (!user) return false
    const roleOk = item.roles?.includes(user.yetkiTuru) ?? false
    const userOk = item.usernames?.includes(user.kullaniciAdi) ?? false
    return roleOk || userOk
  })

  // HashRouter altında window.location.href = '/login' yanlış URL üretir.
  // navigate(..., { replace: true }) hem doğru hash route'una gider hem de
  // mevcut history entry'sini değiştirir → back tuşu auth'lı sayfaya dönmez.
  const handleLogout = async () => {
    await apiLogout()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Mobil overlay — sidebar açıkken arka planı karart, tıklayınca kapat */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'flex h-screen flex-col border-r bg-card transition-all duration-300 ease-in-out overflow-hidden',
          // Geniş ekran: in-flow, genişlik 0/240
          'lg:relative lg:translate-x-0',
          isOpen ? 'lg:w-60' : 'lg:w-0',
          // Mobil: fixed overlay, slayt animasyonu
          'fixed inset-y-0 left-0 z-40 w-60',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo + mobil kapat */}
        <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            UP
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Unix Padel</p>
            <p className="text-xs text-muted-foreground">CRM</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden rounded-md p-1 hover:bg-accent"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {item.icon}
                <span className="flex-1">{t(item.i18nKey)}</span>
                {active && <ChevronRight className="h-3 w-3" />}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-t p-3 shrink-0">
          {user && (
            <div className="mb-2 rounded-md bg-muted px-3 py-2">
              <p className="text-xs font-medium">{user.kullaniciAdi}</p>
              <p className="text-xs text-muted-foreground">{user.yetkiTuru}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {t('common.logout')}
          </button>
        </div>
      </aside>
    </>
  )
}
