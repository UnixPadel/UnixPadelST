import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart, CheckSquare, Factory, Truck, Calculator,
  FileText, Users, Search,
  Activity, Clock, AlertCircle, Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin } from '@/lib/permissions'
import { hideMoneyFor } from '@/lib/visibility'
import { formatMoney } from '@/lib/currency'
import { visibleNavItems, NAV_ITEMS } from '@/lib/navigation'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { KPICard } from '@/components/KPICard'
import {
  OrderTrendChart, StageDistributionChart, TopCustomersChart,
} from '@/components/DashboardCharts'
import {
  getDashboardKpis, getOrdersByMonth, getOrdersByStage, getTopCustomers,
} from '@/api/reporting'
import type {
  DashboardKpi, OrderTrendPoint, StageDistribution, TopCustomer,
} from '@/types'

/**
 * PROMPT.md GLOBAL #2: rol-bazlı dashboard widget seçimi.
 *
 * Tek bir DashboardPage tüm rolleri kapsıyor. ROLE_LAYOUT haritası her rol
 * için hangi KPI'lar, ciro şeridi, grafikler ve modül kartları gösterileceğini
 * deklare ediyor. Yeni bir rol eklemek = ROLE_LAYOUT'a satır eklemek.
 *
 * Admin (Yonetici) panel #5'te 4ace351'den geri restore edildi; #2 bu paneli
 * korur ve diğer rollere uygun varyantlar ekler. Network çağrıları rol
 * gereksinimine göre koşullu (trend / top-customers gerekmiyorsa boş array).
 */

// ── KPI catalog ──────────────────────────────────────────────────────────────
// Her KPI bir defs satırı. Render sırasında ROLE_LAYOUT.kpis listesindeki
// id'ler bu catalog'tan okunup KPICard'a basılır.

type KpiId =
  | 'last30Orders' | 'myOpenOrders' | 'pendingQC' | 'inProduction'
  | 'pendingShipment' | 'pendingPayment' | 'pendingPurchase'

interface KpiDef {
  i18nKey: string         // dashboard.kpi.<key> + dashboard.kpi.<key>Hint
  field: keyof DashboardKpi
  icon: React.ReactNode
  highlightWhenPositive?: boolean
  /** QW-11 — kart tıklanınca gidilecek kuyruk (kullanıcının erişimi varsa). */
  path?: string
}

const KPI_DEFS: Record<KpiId, KpiDef> = {
  last30Orders:    { i18nKey: 'last30Orders',    field: 'son30GunSiparisSayisi',        icon: <ShoppingCart className="h-5 w-5" />, path: '/orders/mine' },
  myOpenOrders:    { i18nKey: 'myOpenOrders',    field: 'kendiAcikSiparisSayisi',       icon: <Activity className="h-5 w-5" />, path: '/orders/mine' },
  pendingQC:       { i18nKey: 'pendingQC',       field: 'bekleyenKontrolSayisi',        icon: <CheckSquare className="h-5 w-5" />, highlightWhenPositive: true, path: '/quality-control' },
  inProduction:    { i18nKey: 'inProduction',    field: 'uretimdekiSiparisSayisi',      icon: <Factory className="h-5 w-5" />, path: '/factory' },
  pendingShipment: { i18nKey: 'pendingShipment', field: 'sevkiyatBekleyenSayisi',       icon: <Truck className="h-5 w-5" />,  highlightWhenPositive: true, path: '/logistics/ready' },
  pendingPayment:  { i18nKey: 'pendingPayment',  field: 'odemeBekleyenSayisi',          icon: <Wallet className="h-5 w-5" />, highlightWhenPositive: true, path: '/accounting' },
  pendingPurchase: { i18nKey: 'pendingPurchase', field: 'bekleyenSatinAlmaTalepSayisi', icon: <AlertCircle className="h-5 w-5" />, path: '/purchase/all' },
}

// ── Module cards catalog ─────────────────────────────────────────────────────
// Path → tile metadata. ROLE_LAYOUT.tiles listesindeki path'ler buradan okunur.

// QW-11 — modül ikonları nötr: yeşil/sarı/kırmızı yalnız durum anlamı taşır
// (önceden Lojistik yeşil, Muhasebe sarı, Kullanıcılar kırmızıydı).
interface ModuleCard {
  path: string
  titleKey: string
  descKey: string
  icon: React.ReactNode
}

const MODULES: Record<string, ModuleCard> = {
  '/quality-control':    { path: '/quality-control',    titleKey: 'nav.qualityControl',    descKey: 'dashboard.moduleCard.qc',                icon: <CheckSquare className="h-6 w-6" /> },
  '/factory':            { path: '/factory',            titleKey: 'nav.factory',           descKey: 'dashboard.moduleCard.factory',           icon: <Factory className="h-6 w-6" /> },
  '/logistics/ready':    { path: '/logistics/ready',    titleKey: 'nav.logisticsReady',    descKey: 'dashboard.moduleCard.logistics',         icon: <Truck className="h-6 w-6" />  },
  '/logistics/history':  { path: '/logistics/history',  titleKey: 'nav.logisticsHistory',  descKey: 'dashboard.moduleCard.logisticsHistory',  icon: <Truck className="h-6 w-6" />  },
  '/accounting':         { path: '/accounting',         titleKey: 'nav.accounting',        descKey: 'dashboard.moduleCard.accounting',        icon: <Calculator className="h-6 w-6" /> },
  '/accounting/approval':{ path: '/accounting/approval',titleKey: 'nav.accountingApproval',descKey: 'dashboard.moduleCard.accountingApproval',icon: <CheckSquare className="h-6 w-6" />  },
  '/accounting/history': { path: '/accounting/history', titleKey: 'nav.accountingHistory', descKey: 'dashboard.moduleCard.accountingHistory', icon: <Calculator className="h-6 w-6" /> },
  '/orders/new':         { path: '/orders/new',         titleKey: 'nav.createOrderQuote',  descKey: 'dashboard.moduleCard.createOrderQuote',  icon: <ShoppingCart className="h-6 w-6" />   },
  '/orders/mine':        { path: '/orders/mine',        titleKey: 'nav.myOrders',          descKey: 'dashboard.moduleCard.myOrders',          icon: <ShoppingCart className="h-6 w-6" />   },
  '/purchase/mine':      { path: '/purchase/mine',      titleKey: 'nav.purchaseMine',      descKey: 'dashboard.moduleCard.purchase',          icon: <FileText className="h-6 w-6" /> },
  '/users':              { path: '/users',              titleKey: 'nav.users',             descKey: 'dashboard.moduleCard.users',             icon: <Users className="h-6 w-6" />    },
  '/search':             { path: '/search',             titleKey: 'nav.search',            descKey: 'dashboard.moduleCard.search',            icon: <Search className="h-6 w-6" />   },
}

// ── Per-role layout ──────────────────────────────────────────────────────────
type ChartId = 'trend' | 'stage' | 'topCustomers'

interface RoleLayout {
  kpis: KpiId[]
  revenue: boolean
  charts: ChartId[]
  tiles: string[]   // path keys into MODULES
}

// PROMPT-v4 §1: /quality-control kartı hiçbir rol layout'unda yer almaz —
// yalnız elshan.rasulov kullanıcı adına eklenir (aşağıda tiles hesabında).
const ADMIN_LAYOUT: RoleLayout = {
  kpis:    ['last30Orders', 'myOpenOrders', 'pendingQC', 'inProduction', 'pendingShipment', 'pendingPayment', 'pendingPurchase'],
  revenue: true,
  charts:  ['trend', 'stage', 'topCustomers'],
  tiles:   ['/factory', '/logistics/ready', '/accounting', '/purchase/mine', '/users', '/search'],
}

const ROLE_LAYOUT: Record<string, RoleLayout> = {
  Yonetici: ADMIN_LAYOUT,
  Muhasebe: {
    kpis:    ['pendingPayment', 'pendingPurchase', 'last30Orders'],
    revenue: true,
    charts:  ['stage', 'topCustomers'],
    tiles:   ['/accounting', '/accounting/history', '/purchase/mine', '/search'],
  },
  Fabrika: {
    kpis:    ['inProduction', 'pendingQC', 'myOpenOrders'],
    revenue: false,
    charts:  ['stage'],
    tiles:   ['/factory', '/purchase/mine', '/search'],
  },
  Lojistik: {
    kpis:    ['pendingShipment', 'myOpenOrders'],
    revenue: false,
    charts:  ['stage'],
    tiles:   ['/logistics/ready', '/logistics/history', '/purchase/mine', '/search'],
  },
  // Read-only observer — full Admin-style visibility minus mutating tiles.
  Gozlemci: {
    kpis:    ['last30Orders', 'pendingQC', 'pendingShipment', 'pendingPayment'],
    revenue: true,
    charts:  ['trend', 'stage', 'topCustomers'],
    tiles:   ['/logistics/history', '/accounting/history', '/purchase/mine', '/search'],
  },
  // Note: tiles include only existing routes. /orders/new is Temsilci-only
  // (PROMPT-v3 §1) — no other role layout may list it.
  Temsilci: {
    kpis:    ['myOpenOrders', 'pendingPurchase'],
    revenue: false,
    charts:  [],
    // PROMPT.md #20: /orders/mine added now that the screen exists.
    tiles:   ['/orders/new', '/orders/mine', '/purchase/mine', '/search'],
  },
}

// Fallback for any unknown role: post-prune minimal panel.
const DEFAULT_LAYOUT: RoleLayout = {
  kpis:    ['inProduction'],
  revenue: false,
  charts:  ['stage'],
  tiles:   [],
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** QW-13 — ortak para biçimi ("12.345,67 €"). */
const formatCiro = (amount: number, paraTipi: string): string => formatMoney(amount, paraTipi)

// ── Component ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { getUser } = useAuth()
  const { t } = useTranslation()
  const user = getUser()
  const role = user?.yetkiTuru ?? ''
  const baseLayout = ROLE_LAYOUT[role] ?? DEFAULT_LAYOUT
  // Round-11 §3 — ad-bazlı ciro gizleme (omur.caliskan, rolü Gozlemci olsa da):
  // gelir şeridi + "En Çok Ciro" grafiği kaldırılır; sayaç KPI'ları/işlem kartları kalır.
  const layout = hideMoneyFor(user)
    ? { ...baseLayout, revenue: false, charts: baseLayout.charts.filter((c) => c !== 'topCustomers') }
    : baseLayout

  const needsTrend = layout.charts.includes('trend')
  const needsTop   = layout.charts.includes('topCustomers')

  const [kpis,   setKpis]   = useState<DashboardKpi | null>(null)
  const [trend,  setTrend]  = useState<OrderTrendPoint[]>([])
  const [stages, setStages] = useState<StageDistribution[]>([])
  const [top,    setTop]    = useState<TopCustomer[]>([])
  const [loading, setLoading] = useState(true)

  // Widget izolasyonu: bir endpoint 500 atsa bile diğerleri yüklenmeye devam etsin.
  // Rolün ihtiyaç duymadığı endpoint'ler ağa hiç çıkmaz (boş array ile resolve).
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)

      const [kRes, tRes, sRes, cRes] = await Promise.allSettled([
        getDashboardKpis(),
        needsTrend ? getOrdersByMonth(12)    : Promise.resolve([] as OrderTrendPoint[]),
        getOrdersByStage(),
        needsTop   ? getTopCustomers(90, 10) : Promise.resolve([] as TopCustomer[]),
      ])

      if (cancelled) return

      if (kRes.status === 'fulfilled') setKpis(kRes.value)
      else { setKpis(null); console.error('KPI yüklenemedi:', kRes.reason) }

      if (tRes.status === 'fulfilled') setTrend(tRes.value)
      else { setTrend([]); console.error('Trend yüklenemedi:', tRes.reason) }

      if (sRes.status === 'fulfilled') setStages(sRes.value)
      else { setStages([]); console.error('Aşama dağılımı yüklenemedi:', sRes.reason) }

      if (cRes.status === 'fulfilled') setTop(cRes.value)
      else { setTop([]); console.error('Top müşteriler yüklenemedi:', cRes.reason) }

      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [needsTrend, needsTop])

  // PROMPT-v4 §1: Kontrol kartı yalnız elshan.rasulov'a görünür (rol bağımsız).
  // §24 — Admin (süper-admin) Kontrol ve Cari Onay kartlarını da görür.
  const isControlUser = user?.kullaniciAdi === 'elshan.rasulov' || isSuperAdmin(user)
  // PROMPT-v6 §1: Muhasebe Onay kartı burcu.karaman'a görünür (rol bağımsız).
  // PROMPT-v7 §1: elshan.rasulov da Cari Onay kartını görür (merkezi bypass).
  const isAccountingApprover = user?.kullaniciAdi === 'burcu.karaman' || user?.kullaniciAdi === 'elshan.rasulov' || isSuperAdmin(user)
  const tiles = useMemo(() => {
    let paths = layout.tiles
    if (isControlUser) paths = ['/quality-control', ...paths]
    if (isAccountingApprover) paths = ['/accounting/approval', ...paths]
    return paths.map((p) => MODULES[p]).filter(Boolean)
  }, [layout.tiles, isControlUser, isAccountingApprover])

  // Welcome string: Ad Soyad'tan üretiliyor, kullanıcı adına geri düşüyor.
  const fullName = [user?.ad, user?.soyad].filter(Boolean).join(' ') || user?.kullaniciAdi || ''

  const reachable = useMemo(() => new Set(visibleNavItems(user).map((n) => n.path)), [user])
  const renderKpi = (id: KpiId) => {
    const def = KPI_DEFS[id]
    const value = kpis ? (kpis[def.field] as number) : (loading ? '…' : 0)
    const highlight = def.highlightWhenPositive && typeof value === 'number' && value > 0
      ? 'uyari' as const
      : 'normal' as const
    return (
      <KPICard
        key={id}
        baslik={t(`dashboard.kpi.${def.i18nKey}`)}
        deger={value}
        altMetin={t(`dashboard.kpi.${def.i18nKey}Hint`)}
        ikon={def.icon}
        vurgu={def.highlightWhenPositive ? highlight : undefined}
        to={def.path && reachable.has(def.path) ? def.path : undefined}
      />
    )
  }

  const hasCharts = layout.charts.length > 0

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        description={`${t('dashboard.welcome')}, ${fullName}`}
      />

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      {/* Scaling Faz 3 — kart sayısı pencereye değil alana göre (auto-fill). */}
      {layout.kpis.length > 0 && (
        <div className="p-6 grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
          {layout.kpis.map(renderKpi)}
        </div>
      )}

      {/* ── Revenue strip (4 currency cards) ───────────────────────────── */}
      {layout.revenue && kpis && (
        <div className="px-6 pb-2">
          <p className="text-xs uppercase text-muted-foreground font-medium mb-2 flex items-center gap-1">
            <Clock className="h-3 w-3" /> {t('dashboard.revenue')}
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
            <KPICard baslik="Euro"    deger={formatCiro(kpis.son30GunCiroEuro,    'Euro')}    />
            <KPICard baslik="Dolar"   deger={formatCiro(kpis.son30GunCiroDolar,   'Dolar')}   />
            <KPICard baslik="TL"      deger={formatCiro(kpis.son30GunCiroTL,      'TL')}      />
            <KPICard baslik="Sterlin" deger={formatCiro(kpis.son30GunCiroSterlin, 'Sterlin')} />
          </div>
        </div>
      )}

      {/* ── Charts ─────────────────────────────────────────────────────── */}
      {hasCharts && (
        <div className="p-6 grid grid-cols-[repeat(auto-fit,minmax(28rem,1fr))] gap-4">
          {needsTrend && <OrderTrendChart data={trend} />}
          {layout.charts.includes('stage') && <StageDistributionChart data={stages} />}
          {needsTop && top.length > 0 && (
            <div className="lg:col-span-2">
              <TopCustomersChart data={top} />
            </div>
          )}
        </div>
      )}

      {/* ── Module navigation cards ────────────────────────────────────── */}
      {tiles.length > 0 && (
        <div className="px-6 pb-6">
          <p className="text-xs uppercase text-muted-foreground font-medium mb-2">{t('dashboard.modules')}</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
            {tiles.map((m) => (
              <Link key={m.path} to={m.path} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    {/* Menüyle aynı (benzersiz) ikon — lib/navigation kaydından. */}
                    <div className="text-primary">{(() => { const I = NAV_ITEMS.find((n) => n.path === m.path)?.icon; return I ? <I className="h-6 w-6" /> : m.icon })()}</div>
                    <CardTitle className="text-base mt-2">{t(m.titleKey)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{t(m.descKey)}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
