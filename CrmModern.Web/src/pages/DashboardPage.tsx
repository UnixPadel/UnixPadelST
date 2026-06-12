import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart, CheckSquare, Factory, Truck, Calculator,
  FileText, Users, Search,
  Activity, Clock, AlertCircle, Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
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
  color: string
  highlightWhenPositive?: boolean
}

const KPI_DEFS: Record<KpiId, KpiDef> = {
  last30Orders:    { i18nKey: 'last30Orders',    field: 'son30GunSiparisSayisi',        icon: <ShoppingCart className="h-5 w-5" />, color: 'text-blue-500'    },
  myOpenOrders:    { i18nKey: 'myOpenOrders',    field: 'kendiAcikSiparisSayisi',       icon: <Activity className="h-5 w-5" />,     color: 'text-cyan-500'    },
  pendingQC:       { i18nKey: 'pendingQC',       field: 'bekleyenKontrolSayisi',        icon: <CheckSquare className="h-5 w-5" />,  color: 'text-purple-500', highlightWhenPositive: true },
  inProduction:    { i18nKey: 'inProduction',    field: 'uretimdekiSiparisSayisi',      icon: <Factory className="h-5 w-5" />,      color: 'text-orange-500' },
  pendingShipment: { i18nKey: 'pendingShipment', field: 'sevkiyatBekleyenSayisi',       icon: <Truck className="h-5 w-5" />,        color: 'text-green-500',  highlightWhenPositive: true },
  pendingPayment:  { i18nKey: 'pendingPayment',  field: 'odemeBekleyenSayisi',          icon: <Wallet className="h-5 w-5" />,       color: 'text-yellow-600', highlightWhenPositive: true },
  pendingPurchase: { i18nKey: 'pendingPurchase', field: 'bekleyenSatinAlmaTalepSayisi', icon: <AlertCircle className="h-5 w-5" />,  color: 'text-indigo-500' },
}

// ── Module cards catalog ─────────────────────────────────────────────────────
// Path → tile metadata. ROLE_LAYOUT.tiles listesindeki path'ler buradan okunur.

interface ModuleCard {
  path: string
  titleKey: string
  descKey: string
  icon: React.ReactNode
  color: string
}

const MODULES: Record<string, ModuleCard> = {
  '/quality-control':    { path: '/quality-control',    titleKey: 'nav.qualityControl',    descKey: 'dashboard.moduleCard.qc',                icon: <CheckSquare className="h-6 w-6" />, color: 'text-purple-500' },
  '/factory':            { path: '/factory',            titleKey: 'nav.factory',           descKey: 'dashboard.moduleCard.factory',           icon: <Factory className="h-6 w-6" />,     color: 'text-orange-500' },
  '/logistics/ready':    { path: '/logistics/ready',    titleKey: 'nav.logisticsReady',    descKey: 'dashboard.moduleCard.logistics',         icon: <Truck className="h-6 w-6" />,       color: 'text-green-500'  },
  '/logistics/history':  { path: '/logistics/history',  titleKey: 'nav.logisticsHistory',  descKey: 'dashboard.moduleCard.logisticsHistory',  icon: <Truck className="h-6 w-6" />,       color: 'text-green-500'  },
  '/accounting':         { path: '/accounting',         titleKey: 'nav.accounting',        descKey: 'dashboard.moduleCard.accounting',        icon: <Calculator className="h-6 w-6" />,  color: 'text-yellow-500' },
  '/accounting/approval':{ path: '/accounting/approval',titleKey: 'nav.accountingApproval',descKey: 'dashboard.moduleCard.accountingApproval',icon: <CheckSquare className="h-6 w-6" />, color: 'text-amber-500'  },
  '/accounting/history': { path: '/accounting/history', titleKey: 'nav.accountingHistory', descKey: 'dashboard.moduleCard.accountingHistory', icon: <Calculator className="h-6 w-6" />,  color: 'text-yellow-500' },
  '/orders/new':         { path: '/orders/new',         titleKey: 'nav.createOrderQuote',  descKey: 'dashboard.moduleCard.createOrderQuote',  icon: <ShoppingCart className="h-6 w-6" />,color: 'text-blue-500'   },
  '/orders/mine':        { path: '/orders/mine',        titleKey: 'nav.myOrders',          descKey: 'dashboard.moduleCard.myOrders',          icon: <ShoppingCart className="h-6 w-6" />,color: 'text-blue-500'   },
  '/purchase/mine':      { path: '/purchase/mine',      titleKey: 'nav.purchaseMine',      descKey: 'dashboard.moduleCard.purchase',          icon: <FileText className="h-6 w-6" />,    color: 'text-indigo-500' },
  '/users':              { path: '/users',              titleKey: 'nav.users',             descKey: 'dashboard.moduleCard.users',             icon: <Users className="h-6 w-6" />,       color: 'text-red-500'    },
  '/search':             { path: '/search',             titleKey: 'nav.search',            descKey: 'dashboard.moduleCard.search',            icon: <Search className="h-6 w-6" />,      color: 'text-cyan-500'   },
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

/** Formats money to "12.345,67 €" style with currency symbol. */
function formatCiro(amount: number, paraTipi: string): string {
  const sym = paraTipi === 'Euro' ? '€' : paraTipi === 'Dolar' ? '$' : paraTipi === 'TL' ? '₺' : paraTipi === 'Sterlin' ? '£' : ''
  const formatted = amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${formatted} ${sym}`.trim()
}

// ── Component ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { getUser } = useAuth()
  const { t } = useTranslation()
  const user = getUser()
  const role = user?.yetkiTuru ?? ''
  const layout = ROLE_LAYOUT[role] ?? DEFAULT_LAYOUT

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
  const isControlUser = user?.kullaniciAdi === 'elshan.rasulov'
  // PROMPT-v6 §1: Muhasebe Onay kartı yalnız burcu.karaman'a görünür (rol bağımsız).
  const isAccountingApprover = user?.kullaniciAdi === 'burcu.karaman'
  const tiles = useMemo(() => {
    let paths = layout.tiles
    if (isControlUser) paths = ['/quality-control', ...paths]
    if (isAccountingApprover) paths = ['/accounting/approval', ...paths]
    return paths.map((p) => MODULES[p]).filter(Boolean)
  }, [layout.tiles, isControlUser, isAccountingApprover])

  // Welcome string: Ad Soyad'tan üretiliyor, kullanıcı adına geri düşüyor.
  const fullName = [user?.ad, user?.soyad].filter(Boolean).join(' ') || user?.kullaniciAdi || ''

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
        renk={def.color}
        vurgu={def.highlightWhenPositive ? highlight : undefined}
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
      {layout.kpis.length > 0 && (
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {layout.kpis.map(renderKpi)}
        </div>
      )}

      {/* ── Revenue strip (4 currency cards) ───────────────────────────── */}
      {layout.revenue && kpis && (
        <div className="px-6 pb-2">
          <p className="text-xs uppercase text-muted-foreground font-medium mb-2 flex items-center gap-1">
            <Clock className="h-3 w-3" /> {t('dashboard.revenue')}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard baslik="Euro"    deger={formatCiro(kpis.son30GunCiroEuro,    'Euro')}    />
            <KPICard baslik="Dolar"   deger={formatCiro(kpis.son30GunCiroDolar,   'Dolar')}   />
            <KPICard baslik="TL"      deger={formatCiro(kpis.son30GunCiroTL,      'TL')}      />
            <KPICard baslik="Sterlin" deger={formatCiro(kpis.son30GunCiroSterlin, 'Sterlin')} />
          </div>
        </div>
      )}

      {/* ── Charts ─────────────────────────────────────────────────────── */}
      {hasCharts && (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {tiles.map((m) => (
              <Link key={m.path} to={m.path}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className={m.color}>{m.icon}</div>
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
