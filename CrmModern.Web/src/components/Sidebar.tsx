import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { logout as apiLogout } from '@/api/auth'
import {
  NAV_GROUPS, activeNavPath, shortNavLabel, visibleNavItems,
} from '@/lib/navigation'
import { useNavCounts } from '@/hooks/useNavCounts'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * QW-10 / SR-10 — gruplu menü (LOGO modül menüsü: Satış / Operasyon / Lojistik /
 * Muhasebe / Satın Alma / Yönetim), benzersiz ikonlar, alt rotalarda da aktif
 * vurgu (en uzun önek), kuyruk sayaç rozetleri. Masaüstünde kapalıyken tamamen
 * gizlenmek yerine ikon rayına (w-14, tooltip'li) daralır.
 */
export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { getUser, logout } = useAuth()
  const user = getUser()
  const counts = useNavCounts()

  const items = visibleNavItems(user)
  const active = activeNavPath(location.pathname, items)
  const rail = !isOpen

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
        aria-label={t('nav.menu')}
        className={cn(
          'flex h-screen flex-col border-r bg-card transition-all duration-200 ease-in-out overflow-hidden',
          'lg:relative lg:translate-x-0',
          isOpen ? 'lg:w-60' : 'lg:w-14',
          // Mobil: fixed overlay, slayt animasyonu
          'fixed inset-y-0 left-0 z-40 w-60',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo + mobil kapat */}
        <div className={cn('flex h-14 shrink-0 items-center gap-2 border-b', rail ? 'lg:justify-center lg:px-0 px-4' : 'px-4')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            UP
          </div>
          <div className={cn('flex-1', rail && 'lg:hidden')}>
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
        <nav className={cn('flex-1 overflow-y-auto py-2', rail ? 'lg:px-1.5 px-3' : 'px-3')}>
          {NAV_GROUPS.map((group) => {
            const groupItems = items.filter((i) => i.group === group)
            if (groupItems.length === 0) return null
            return (
              <div key={group} className="mb-2">
                {group !== 'general' && (
                  <p className={cn('px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80', rail && 'lg:hidden')}>
                    {t(`nav.groups.${group}`)}
                  </p>
                )}
                {rail && group !== 'general' && <div className="mx-2 my-1 hidden h-px bg-border lg:block" />}
                <div className="space-y-0.5">
                  {groupItems.map((item) => {
                    const isActive = item.path === active
                    const label = t(item.i18nKey)
                    const count = item.countField ? counts?.[item.countField] : undefined
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        title={rail ? `${label} (${item.code})` : undefined}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => { if (window.innerWidth < 1024) onClose() }}
                        className={cn(
                          'relative flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors',
                          rail && 'lg:justify-center lg:px-0 lg:py-2',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className={cn('flex-1 truncate', rail && 'lg:hidden')}>
                          {group === 'general' ? label : shortNavLabel(label)}
                        </span>
                        {typeof count === 'number' && count > 0 && (
                          <span
                            className={cn(
                              'min-w-[1.25rem] rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums',
                              isActive ? 'bg-primary-foreground/20' : 'bg-warning-soft text-warning-soft-foreground',
                              rail && 'lg:absolute lg:-right-0.5 lg:-top-0.5 lg:min-w-0 lg:px-1 lg:text-[10px]',
                            )}
                            aria-label={t('nav.pendingCount', { count })}
                          >
                            {count > 99 ? '99+' : count}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* User */}
        <div className={cn('border-t p-3 shrink-0', rail && 'lg:p-1.5')}>
          {user && (
            <div className={cn('mb-2 rounded-md bg-muted px-3 py-2', rail && 'lg:hidden')}>
              <p className="text-xs font-medium truncate">{user.kullaniciAdi}</p>
              <p className="text-xs text-muted-foreground">{user.yetkiTuru}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={rail ? t('common.logout') : undefined}
            className={cn('flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors', rail && 'lg:justify-center lg:px-0')}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={cn(rail && 'lg:hidden')}>{t('common.logout')}</span>
          </button>
          {/* Sol alt köşe — güncel sürüm (package.json'dan derleme anında gömülür). */}
          <p className={cn('mt-2 px-3 text-center text-[10px] text-muted-foreground/70', rail && 'lg:hidden')}>
            v{__APP_VERSION__}
          </p>
        </div>
      </aside>
    </>
  )
}
