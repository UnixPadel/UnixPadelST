import {
  LayoutDashboard, Inbox, FilePlus2, ClipboardList, Contact, BarChart3, ShieldCheck, Factory,
  PackageCheck, Handshake, History, Truck, Wallet, FileText, BadgeCheck, ReceiptText, Scale,
  ShoppingCart, ShoppingBag, Boxes, CreditCard, Stamp, Users, Search, Sparkles, Settings, BookOpen,
  type LucideIcon,
} from 'lucide-react'
import type { AuthUser, DashboardKpi } from '@/types'
import { isSuperAdmin } from '@/lib/permissions'

/**
 * E-1 / QW-10 — tek menü kaydı. Sidebar (gruplu), Komut Paleti (işlem kodları)
 * ve Dashboard modül kartları buradan okur; önceden Sidebar `navItems` ve
 * Dashboard `MODULES` iki ayrı kopyaydı ve 6 öğe aynı FileText ikonunu
 * paylaşıyordu.
 *
 * `code` — SAP işlem kodu mantığı: Ctrl+K → "YS" → Yeni Sipariş.
 * `countField` — Dashboard KPI'larından kuyruk sayacı (sidebar rozeti, Bekleyen İşler).
 */
export type NavGroup = 'general' | 'sales' | 'operations' | 'logistics' | 'accounting' | 'purchase' | 'admin'

export interface NavItem {
  path: string
  i18nKey: string
  /** Dashboard kartı açıklaması (dashboard.moduleCard.*). */
  descKey?: string
  icon: LucideIcon
  group: NavGroup
  code: string
  roles?: string[]
  usernames?: string[]   // rol VEYA kullanıcı adı — birden fazla varsa OR
  countField?: keyof DashboardKpi
}

export const NAV_GROUPS: NavGroup[] = ['general', 'sales', 'operations', 'logistics', 'accounting', 'purchase', 'admin']

export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', i18nKey: 'nav.dashboard', icon: LayoutDashboard, group: 'general', code: 'AN' },
  { path: '/inbox',     i18nKey: 'nav.inbox',     icon: Inbox,           group: 'general', code: 'BI' },
  { path: '/search',    i18nKey: 'nav.search',    icon: Search,          group: 'general', code: 'AR', descKey: 'dashboard.moduleCard.search' },

  // PROMPT-v3 §1 — sipariş/teklif oluşturma yalnız Temsilci'ye açık. İstisna: elshan.rasulov.
  { path: '/orders/new',  i18nKey: 'nav.createOrderQuote', icon: FilePlus2,     group: 'sales', code: 'YS', roles: ['Temsilci'], usernames: ['elshan.rasulov'], descKey: 'dashboard.moduleCard.createOrderQuote' },
  // PROMPT-v4 §6.2 — elshan.rasulov tüm siparişleri Siparişlerim'den izler.
  { path: '/orders/mine', i18nKey: 'nav.myOrders',         icon: ClipboardList, group: 'sales', code: 'SL', roles: ['Yonetici','Temsilci','Gozlemci'], usernames: ['elshan.rasulov'], descKey: 'dashboard.moduleCard.myOrders' },
  { path: '/customers',   i18nKey: 'nav.customers',        icon: Contact,       group: 'sales', code: 'MU', roles: ['Yonetici','Temsilci','Gozlemci','Muhasebe','Lojistik'] },

  // PROMPT-v4 §1 — Kontrol yalnız elshan.rasulov (kullanıcı adı bazlı; rol yok).
  { path: '/quality-control', i18nKey: 'nav.qualityControl', icon: ShieldCheck, group: 'operations', code: 'KK', usernames: ['elshan.rasulov'], countField: 'bekleyenKontrolSayisi', descKey: 'dashboard.moduleCard.qc' },
  { path: '/factory',         i18nKey: 'nav.factory',        icon: Factory,     group: 'operations', code: 'FB', roles: ['Yonetici', 'Fabrika', 'Gozlemci'], countField: 'uretimdekiSiparisSayisi', descKey: 'dashboard.moduleCard.factory' },

  { path: '/logistics/ready',    i18nKey: 'nav.logisticsReady',    icon: PackageCheck, group: 'logistics', code: 'LH', roles: ['Yonetici', 'Lojistik'], countField: 'sevkiyatBekleyenSayisi', descKey: 'dashboard.moduleCard.logistics' },
  { path: '/logistics/offers',   i18nKey: 'nav.logisticsOffers',   icon: Handshake,    group: 'logistics', code: 'LT', roles: ['Yonetici', 'Lojistik'] },
  { path: '/logistics/history',  i18nKey: 'nav.logisticsHistory',  icon: History,      group: 'logistics', code: 'LG', roles: ['Yonetici', 'Lojistik', 'Gozlemci'], usernames: ['elshan.rasulov'], descKey: 'dashboard.moduleCard.logisticsHistory' },
  { path: '/logistics/carriers', i18nKey: 'nav.logisticsCarriers', icon: Truck,        group: 'logistics', code: 'TS', roles: ['Yonetici', 'Lojistik', 'Gozlemci'], usernames: ['elshan.rasulov'] },

  { path: '/accounting',          i18nKey: 'nav.accounting',         icon: Wallet,      group: 'accounting', code: 'TH', roles: ['Yonetici', 'Muhasebe'], countField: 'odemeBekleyenSayisi', descKey: 'dashboard.moduleCard.accounting' },
  // PROMPT-v6 §1 — Burcu onay ekranı yalnız burcu.karaman (kullanıcı adı bazlı; rol yok).
  { path: '/accounting/approval', i18nKey: 'nav.accountingApproval', icon: BadgeCheck,  group: 'accounting', code: 'MO', usernames: ['burcu.karaman'], descKey: 'dashboard.moduleCard.accountingApproval' },
  { path: '/accounting/orders',   i18nKey: 'nav.accountingOrders',   icon: FileText,    group: 'accounting', code: 'MS', roles: ['Yonetici', 'Muhasebe'], descKey: 'dashboard.moduleCard.accountingOrders' },
  { path: '/accounting/history',  i18nKey: 'nav.accountingHistory',  icon: ReceiptText, group: 'accounting', code: 'MG', roles: ['Yonetici', 'Muhasebe', 'Gozlemci'], descKey: 'dashboard.moduleCard.accountingHistory' },
  { path: '/accounting/balance',  i18nKey: 'nav.accountingBalance',  icon: Scale,       group: 'accounting', code: 'CE', roles: ['Yonetici', 'Muhasebe'] },

  { path: '/purchase/new',     i18nKey: 'nav.purchaseNew',     icon: ShoppingCart, group: 'purchase', code: 'ST', roles: ['Yonetici','Lojistik','Fabrika','Gozlemci','Temsilci'] },
  { path: '/purchase/mine',    i18nKey: 'nav.purchaseMine',    icon: ShoppingBag,  group: 'purchase', code: 'SA', descKey: 'dashboard.moduleCard.purchase' },
  { path: '/purchase/all',     i18nKey: 'nav.purchaseAll',     icon: Boxes,        group: 'purchase', code: 'TT', roles: ['Yonetici','Gozlemci','Muhasebe'], usernames: ['elshan.rasulov'], countField: 'bekleyenSatinAlmaTalepSayisi' },
  { path: '/approval/payment', i18nKey: 'nav.approvalPayment', icon: CreditCard,   group: 'purchase', code: 'OD', roles: ['Muhasebe'] },
  { path: '/approval/final',   i18nKey: 'nav.approvalFinal',   icon: Stamp,        group: 'purchase', code: 'FO', roles: ['Yonetici'], usernames: ['elshan.rasulov'] },

  { path: '/users',                     i18nKey: 'nav.users',       icon: Users,     group: 'admin', code: 'KU', roles: ['Yonetici'], descKey: 'dashboard.moduleCard.users' },
  // Round-8 §13 — Temsilci performans raporu yalnız Yonetici.
  { path: '/reporting/representatives', i18nKey: 'nav.reporting',   icon: BarChart3, group: 'admin', code: 'RP', roles: ['Yonetici'] },
  { path: '/preferences',               i18nKey: 'nav.preferences', icon: Settings,  group: 'admin', code: 'TR' },
  { path: '/updates',                   i18nKey: 'nav.updates',     icon: Sparkles,  group: 'admin', code: 'NY' },
  { path: '/guide',                     i18nKey: 'nav.guide',       icon: BookOpen,  group: 'admin', code: 'KL' },
]

/** Kullanıcının görebildiği menü öğeleri (Sidebar ile birebir aynı kural). */
export function visibleNavItems(user: AuthUser | null): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (!item.roles && !item.usernames) return true
    if (!user) return false
    // PROMPT-v7 §1 — merkezi bypass: elshan.rasulov TÜM nav kayıtlarını görür.
    // §24 — Admin (süper-admin) da tüm menüleri (gizli dahil) görür.
    if (user.kullaniciAdi === 'elshan.rasulov' || isSuperAdmin(user)) return true
    const roleOk = item.roles?.includes(user.yetkiTuru) ?? false
    const userOk = item.usernames?.includes(user.kullaniciAdi) ?? false
    return roleOk || userOk
  })
}

/** "Lojistik · Hazır" / "Lojistik — Hazır" → "Hazır" (grup başlığı zaten "Lojistik" der). */
export function shortNavLabel(label: string): string {
  const m = label.match(/^.+?\s[·—–-]\s(.+)$/)
  return m ? m[1] : label
}

/** En uzun önek eşleşmesi: /customers/12/edit → /customers aktif. */
export function activeNavPath(pathname: string, items: NavItem[]): string | null {
  let best: string | null = null
  for (const it of items) {
    if (pathname === it.path || pathname.startsWith(it.path + '/')) {
      if (!best || it.path.length > best.length) best = it.path
    }
  }
  return best
}
