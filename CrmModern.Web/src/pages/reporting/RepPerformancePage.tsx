import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getRepPerformance } from '@/api/reporting'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { RepPerformance } from '@/types'

type Period = 'day' | 'week' | 'month'

// Round-8 §13 — dönem → [baslangic, bitis] (yerel gün sınırı, ISO yyyy-MM-dd).
function rangeFor(period: Period): { baslangic: string; bitis: string } {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const start = new Date(end)
  if (period === 'day') start.setHours(0, 0, 0, 0)
  else if (period === 'week') start.setDate(end.getDate() - 6)
  else start.setDate(end.getDate() - 29)
  start.setHours(0, 0, 0, 0)
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { baslangic: iso(start), bitis: iso(end) }
}

export function RepPerformancePage() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<Period>('month')
  const { baslangic, bitis } = useMemo(() => rangeFor(period), [period])

  const { data = [], isLoading } = useQuery({
    queryKey: ['rep-performance', baslangic, bitis],
    queryFn: () => getRepPerformance(baslangic, bitis),
  })

  const ciroCell = (r: RepPerformance) => {
    const parts = [
      r.ciroEuro ? formatCurrency(r.ciroEuro, 'Euro') : null,
      r.ciroDolar ? formatCurrency(r.ciroDolar, 'Dolar') : null,
      r.ciroTL ? formatCurrency(r.ciroTL, 'TL') : null,
      r.ciroSterlin ? formatCurrency(r.ciroSterlin, 'Sterlin') : null,
    ].filter(Boolean)
    return parts.length ? parts.join(' · ') : '—'
  }

  const cols: Column<RepPerformance & Record<string, unknown>>[] = [
    { key: 'adSoyad',     header: t('common.representative'), sortable: true },
    { key: 'olusturulan', header: t('reporting.cols.olusturulan'), sortable: true },
    { key: 'teklif',      header: t('reporting.cols.teklif'), sortable: true },
    { key: 'siparis',     header: t('reporting.cols.siparis'), sortable: true },
    { key: 'onaylanan',   header: t('reporting.cols.onaylanan'), sortable: true },
    { key: 'reddedilen',  header: t('reporting.cols.reddedilen'), sortable: true },
    { key: 'bekleyen',    header: t('reporting.cols.bekleyen'), sortable: true },
    { key: 'tamamlanan',  header: t('reporting.cols.tamamlanan'), sortable: true },
    { key: 'donusumOrani', header: t('reporting.cols.donusum'), sortable: true,
      render: (r) => `%${(r.donusumOrani as number) ?? 0}` },
    { key: 'ciro',        header: t('reporting.cols.ciro'),
      render: (r) => <span className="text-xs">{ciroCell(r as RepPerformance)}</span> },
  ]

  const PERIODS: Period[] = ['day', 'week', 'month']

  return (
    <div>
      <PageHeader title={t('reporting.repTitle')} description={t('reporting.repSubtitle')} />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <Button key={p} size="sm" variant={period === p ? 'default' : 'outline'}
              onClick={() => setPeriod(p)}>
              {t(`reporting.period.${p}`)}
            </Button>
          ))}
        </div>
        <DataTable
          columns={cols}
          data={data as (RepPerformance & Record<string, unknown>)[]}
          keyField="kullaniciID"
          loading={isLoading}
          density="compact"
          emptyMessage={t('reporting.empty')}
        />
      </div>
    </div>
  )
}
