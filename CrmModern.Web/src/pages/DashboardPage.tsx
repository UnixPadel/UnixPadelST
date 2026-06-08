import { useEffect, useState } from 'react'
import { Factory } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { KPICard } from '@/components/KPICard'
import { StageDistributionChart } from '@/components/DashboardCharts'
import { getDashboardKpis, getOrdersByStage } from '@/api/reporting'
import type { DashboardKpi, StageDistribution } from '@/types'

/**
 * Faz-fix 2.7 — Panel sadece fabrika verisi.
 *
 * Kaldırılanlar:
 *   • Son 30 Gün Sipariş, Açık Siparişlerim, Bekleyen Kontrol, Sevkiyat Bekleyen,
 *     Ödeme Bekleyen, Bekleyen Satın Alma KPI'ları
 *   • 4 döviz ciro kartı (Euro/Dolar/TL/Sterlin)
 *   • Sipariş Trend chart
 *   • Top Müşteriler chart
 *   • Modül navigasyon kartları
 *
 * Kalanlar:
 *   • Üretimdeki Sipariş KPI'ı  (uretimdekiSiparisSayisi)
 *   • Aşama Dağılım chart       (StageDistributionChart)
 */
export function DashboardPage() {
  const { getUser } = useAuth()
  const { t } = useTranslation()
  const user = getUser()

  const [kpis,   setKpis]   = useState<DashboardKpi | null>(null)
  const [stages, setStages] = useState<StageDistribution[]>([])
  const [loading, setLoading] = useState(true)

  // Widget izolasyonu: KPI 500 atsa bile chart yüklenmeye devam etsin.
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [kRes, sRes] = await Promise.allSettled([
        getDashboardKpis(),
        getOrdersByStage(),
      ])
      if (cancelled) return

      if (kRes.status === 'fulfilled') setKpis(kRes.value)
      else { setKpis(null); console.error('KPI yüklenemedi:', kRes.reason) }

      if (sRes.status === 'fulfilled') setStages(sRes.value)
      else { setStages([]); console.error('Aşama dağılımı yüklenemedi:', sRes.reason) }

      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        description={`${t('dashboard.welcome')}, ${user?.kullaniciAdi ?? ''} (${user?.yetkiTuru ?? ''})`}
      />

      {/* Tek KPI — Üretimdeki Sipariş */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        <KPICard
          baslik={t('dashboard.kpi.inProduction')}
          deger={kpis?.uretimdekiSiparisSayisi ?? (loading ? '…' : 0)}
          altMetin={t('dashboard.kpi.inProductionHint')}
          ikon={<Factory className="h-5 w-5" />}
          renk="text-orange-500"
        />
      </div>

      {/* Tek chart — Aşama Dağılımı */}
      <div className="p-6">
        <StageDistributionChart data={stages} />
      </div>
    </div>
  )
}
