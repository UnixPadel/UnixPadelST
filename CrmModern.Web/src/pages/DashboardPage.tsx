import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart, CheckSquare, Factory, Truck, Calculator,
  FileText, Users, Package, Search,
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

interface ModuleCard {
  path: string
  titleKey: string
  descKey: string
  icon: React.ReactNode
  color: string
  roles?: string[]
}

const modules: ModuleCard[] = [
  { path: '/orders',          titleKey: 'nav.myOrders',        descKey: 'dashboard.moduleCard.orders',         icon: <ShoppingCart className="h-6 w-6" />, color: 'text-blue-500'   },
  { path: '/quality-control', titleKey: 'nav.qualityControl',  descKey: 'dashboard.moduleCard.qc',             icon: <CheckSquare className="h-6 w-6" />,  color: 'text-purple-500', roles: ['Yonetici', 'Gozlemci'] },
  { path: '/factory',         titleKey: 'nav.factory',         descKey: 'dashboard.moduleCard.factory',        icon: <Factory className="h-6 w-6" />,     color: 'text-orange-500', roles: ['Yonetici', 'Fabrika'] },
  { path: '/logistics/ready', titleKey: 'nav.logisticsReady',  descKey: 'dashboard.moduleCard.logistics',      icon: <Truck className="h-6 w-6" />,       color: 'text-green-500',  roles: ['Yonetici', 'Lojistik'] },
  { path: '/accounting',      titleKey: 'nav.accounting',      descKey: 'dashboard.moduleCard.accounting',     icon: <Calculator className="h-6 w-6" />,  color: 'text-yellow-500', roles: ['Yonetici', 'Muhasebe'] },
  { path: '/purchase/mine',   titleKey: 'nav.purchaseMine',    descKey: 'dashboard.moduleCard.purchase',       icon: <FileText className="h-6 w-6" />,    color: 'text-indigo-500' },
  { path: '/customers',       titleKey: 'nav.customers',       descKey: 'dashboard.moduleCard.customers',      icon: <Users className="h-6 w-6" />,       color: 'text-pink-500'   },
  { path: '/product-catalog', titleKey: 'nav.productCatalog',  descKey: 'dashboard.moduleCard.productCatalog', icon: <Package className="h-6 w-6" />,     color: 'text-teal-500',  roles: ['Yonetici', 'Fabrika'] },
  { path: '/users',           titleKey: 'nav.users',           descKey: 'dashboard.moduleCard.users',          icon: <Users className="h-6 w-6" />,       color: 'text-red-500',   roles: ['Yonetici'] },
  { path: '/search',          titleKey: 'nav.search',          descKey: 'dashboard.moduleCard.search',         icon: <Search className="h-6 w-6" />,      color: 'text-cyan-500'   },
]

/** Formats money to "12.345,67 €" style with currency symbol. */
function formatCiro(amount: number, paraTipi: string): string {
  const sym = paraTipi === 'Euro' ? '€' : paraTipi === 'Dolar' ? '$' : paraTipi === 'TL' ? '₺' : paraTipi === 'Sterlin' ? '£' : ''
  const formatted = amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${formatted} ${sym}`.trim()
}

export function DashboardPage() {
  const { getUser } = useAuth()
  const { t } = useTranslation()
  const user = getUser()
  const role = user?.yetkiTuru ?? ''

  const [kpis,   setKpis]   = useState<DashboardKpi | null>(null)
  const [trend,  setTrend]  = useState<OrderTrendPoint[]>([])
  const [stages, setStages] = useState<StageDistribution[]>([])
  const [top,    setTop]    = useState<TopCustomer[]>([])
  const [loading, setLoading] = useState(true)

  const isYonetici  = role === 'Yonetici'
  const isFabrika   = role === 'Fabrika'
  const isLojistik  = role === 'Lojistik'
  const isMuhasebe  = role === 'Muhasebe'
  const canSeeTopCustomers = isYonetici || isMuhasebe || role === 'Gozlemci'

  // Paket 1 — widget izolasyonu: her endpoint AYRI try/catch ile çağrılır.
  // Bir tanesi 500 atsa bile diğer widget'lar yüklenmeye devam eder.
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)

      const [kRes, tRes, sRes, cRes] = await Promise.allSettled([
        getDashboardKpis(),
        getOrdersByMonth(12),
        getOrdersByStage(),
        canSeeTopCustomers ? getTopCustomers(90, 10) : Promise.resolve([] as TopCustomer[]),
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
  }, [canSeeTopCustomers])

  const visibleModules = modules.filter((m) => {
    if (!m.roles) return true
    return user ? m.roles.includes(user.yetkiTuru) : false
  })

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        description={`${t('dashboard.welcome')}, ${user?.kullaniciAdi ?? ''} (${user?.yetkiTuru ?? ''})`}
      />

      {/* ── KPI cards — rol bazlı ─────────────────────────────────────────── */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        <KPICard
          baslik={t('dashboard.kpi.last30Orders')}
          deger={kpis?.son30GunSiparisSayisi ?? (loading ? '…' : 0)}
          altMetin={t('dashboard.kpi.last30OrdersHint')}
          ikon={<ShoppingCart className="h-5 w-5" />}
          renk="text-blue-500"
        />
        <KPICard
          baslik={t('dashboard.kpi.myOpenOrders')}
          deger={kpis?.kendiAcikSiparisSayisi ?? (loading ? '…' : 0)}
          altMetin={t('dashboard.kpi.myOpenOrdersHint')}
          ikon={<Activity className="h-5 w-5" />}
          renk="text-cyan-500"
        />

        {(isYonetici || role === 'Gozlemci') && (
          <KPICard
            baslik={t('dashboard.kpi.pendingQC')}
            deger={kpis?.bekleyenKontrolSayisi ?? (loading ? '…' : 0)}
            altMetin={t('dashboard.kpi.pendingQCHint')}
            ikon={<CheckSquare className="h-5 w-5" />}
            renk="text-purple-500"
            vurgu={(kpis?.bekleyenKontrolSayisi ?? 0) > 0 ? 'uyari' : 'normal'}
          />
        )}

        {(isYonetici || isFabrika) && (
          <KPICard
            baslik={t('dashboard.kpi.inProduction')}
            deger={kpis?.uretimdekiSiparisSayisi ?? (loading ? '…' : 0)}
            altMetin={t('dashboard.kpi.inProductionHint')}
            ikon={<Factory className="h-5 w-5" />}
            renk="text-orange-500"
          />
        )}

        {(isYonetici || isLojistik) && (
          <KPICard
            baslik={t('dashboard.kpi.pendingShipment')}
            deger={kpis?.sevkiyatBekleyenSayisi ?? (loading ? '…' : 0)}
            altMetin={t('dashboard.kpi.pendingShipmentHint')}
            ikon={<Truck className="h-5 w-5" />}
            renk="text-green-500"
            vurgu={(kpis?.sevkiyatBekleyenSayisi ?? 0) > 0 ? 'uyari' : 'normal'}
          />
        )}

        {(isYonetici || isMuhasebe) && (
          <KPICard
            baslik={t('dashboard.kpi.pendingPayment')}
            deger={kpis?.odemeBekleyenSayisi ?? (loading ? '…' : 0)}
            altMetin={t('dashboard.kpi.pendingPaymentHint')}
            ikon={<Wallet className="h-5 w-5" />}
            renk="text-yellow-600"
            vurgu={(kpis?.odemeBekleyenSayisi ?? 0) > 0 ? 'uyari' : 'normal'}
          />
        )}

        <KPICard
          baslik={t('dashboard.kpi.pendingPurchase')}
          deger={kpis?.bekleyenSatinAlmaTalepSayisi ?? (loading ? '…' : 0)}
          altMetin={t('dashboard.kpi.pendingPurchaseHint')}
          ikon={<AlertCircle className="h-5 w-5" />}
          renk="text-indigo-500"
        />
      </div>

      {/* ── Ciro kartları (4 döviz) — Yönetici/Muhasebe ────────────────────── */}
      {(isYonetici || isMuhasebe) && kpis && (
        <div className="px-6 pb-2">
          <p className="text-xs uppercase text-muted-foreground font-medium mb-2 flex items-center gap-1">
            <Clock className="h-3 w-3" /> {t('dashboard.revenue')}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard baslik="Euro"    deger={formatCiro(kpis.son30GunCiroEuro, 'Euro')}    />
            <KPICard baslik="Dolar"   deger={formatCiro(kpis.son30GunCiroDolar, 'Dolar')}   />
            <KPICard baslik="TL"      deger={formatCiro(kpis.son30GunCiroTL, 'TL')}        />
            <KPICard baslik="Sterlin" deger={formatCiro(kpis.son30GunCiroSterlin, 'Sterlin')} />
          </div>
        </div>
      )}

      {/* ── Charts ─────────────────────────────────────────────────────────── */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OrderTrendChart data={trend} />
        <StageDistributionChart data={stages} />
        {canSeeTopCustomers && top.length > 0 && (
          <div className="lg:col-span-2">
            <TopCustomersChart data={top} />
          </div>
        )}
      </div>

      {/* ── Module navigation cards (preserve Faz 1 scaffold) ──────────────── */}
      <div className="px-6 pb-6">
        <p className="text-xs uppercase text-muted-foreground font-medium mb-2">{t('dashboard.modules')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {visibleModules.map((m) => (
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
    </div>
  )
}
