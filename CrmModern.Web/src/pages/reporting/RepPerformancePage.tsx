import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { Download, Globe, Package, ShoppingCart, FileText, TrendingUp, Layers, Loader2 } from 'lucide-react'
import { getRepPerformance, getRepDetail, exportRepReport } from '@/api/reporting'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ToastProvider'
import { formatCurrency } from '@/lib/utils'
import type { RepPerformance, RepDetail } from '@/types'

type Period = 'day' | 'week' | 'month'
type Currency = 'Euro' | 'Dolar' | 'TL' | 'Sterlin'

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

// §19 — en yüksek toplam ciroya sahip para birimi (KPI ve grafik başlığı için).
function primaryCurrency(d: RepDetail): Currency {
  const totals: [Currency, number][] = [
    ['Euro', d.ciroEuro], ['Dolar', d.ciroDolar], ['TL', d.ciroTL], ['Sterlin', d.ciroSterlin],
  ]
  totals.sort((a, b) => b[1] - a[1])
  return totals[0][1] > 0 ? totals[0][0] : 'Euro'
}

// Bir satırın sıfır olmayan tüm para birimlerini ayrı ayrı (karıştırmadan) formatlar.
function multiCurrency(parts: { Euro: number; Dolar: number; TL: number; Sterlin: number }): string {
  const out = (['Euro', 'Dolar', 'TL', 'Sterlin'] as Currency[])
    .filter((c) => parts[c] > 0)
    .map((c) => formatCurrency(parts[c], c))
  return out.length ? out.join(' · ') : '—'
}

export function RepPerformancePage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [period, setPeriod] = useState<Period>('month')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const { baslangic, bitis } = useMemo(() => rangeFor(period), [period])

  const { data: reps = [], isLoading } = useQuery({
    queryKey: ['rep-performance', baslangic, bitis],
    queryFn: () => getRepPerformance(baslangic, bitis),
  })

  const selectedRep = useMemo(
    () => reps.find((r) => r.kullaniciID === selectedId) ?? null,
    [reps, selectedId],
  )

  const {
    data: detail, isLoading: detailLoading, isError: detailError,
  } = useQuery({
    queryKey: ['rep-detail', selectedId, baslangic, bitis],
    queryFn: () => getRepDetail(selectedId!, baslangic, bitis),
    enabled: selectedId != null,
  })

  const onExport = async () => {
    if (!detail) return
    setExporting(true)
    try {
      await exportRepReport(detail.kullaniciID, baslangic, bitis, detail.adSoyad)
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  const ciroCell = (r: RepPerformance) =>
    multiCurrency({ Euro: r.ciroEuro, Dolar: r.ciroDolar, TL: r.ciroTL, Sterlin: r.ciroSterlin })

  const cols: Column<RepPerformance & Record<string, unknown>>[] = [
    { key: 'adSoyad',     header: t('common.representative'), sortable: true },
    { key: 'olusturulan', header: t('reporting.cols.olusturulan'), sortable: true },
    { key: 'teklif',      header: t('reporting.cols.teklif'), sortable: true },
    { key: 'siparis',     header: t('reporting.cols.siparis'), sortable: true },
    { key: 'onaylanan',   header: t('reporting.cols.onaylanan'), sortable: true },
    { key: 'tamamlanan',  header: t('reporting.cols.tamamlanan'), sortable: true },
    { key: 'donusumOrani', header: t('reporting.cols.donusum'), sortable: true,
      render: (r) => `%${(r.donusumOrani as number) ?? 0}` },
    { key: 'ciro',        header: t('reporting.cols.ciro'),
      render: (r) => <span className="text-xs">{ciroCell(r as RepPerformance)}</span> },
    { key: 'detay', header: '',
      render: (r) => (
        <Button size="sm" variant={(r.kullaniciID as number) === selectedId ? 'default' : 'outline'}
          onClick={() => setSelectedId(r.kullaniciID as number)}>
          {t('reporting.detail.analytics')}
        </Button>
      ) },
  ]

  const PERIODS: Period[] = ['day', 'week', 'month']

  const cur = detail ? primaryCurrency(detail) : 'Euro'
  const chartData = useMemo(
    () => (detail?.aylikCiro ?? []).map((m) => ({
      ay: m.ay,
      ciro: m.ciroEuro || m.ciroDolar || m.ciroTL || m.ciroSterlin
        ? ({ Euro: m.ciroEuro, Dolar: m.ciroDolar, TL: m.ciroTL, Sterlin: m.ciroSterlin })[cur]
        : 0,
    })),
    [detail, cur],
  )

  return (
    <div>
      <PageHeader title={t('reporting.repTitle')} description={t('reporting.repSubtitle')} />
      <div className="p-6 space-y-4">
        {/* Filtreler: dönem + temsilci seçimi */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <Button key={p} size="sm" variant={period === p ? 'default' : 'outline'}
                onClick={() => setPeriod(p)}>
                {t(`reporting.period.${p}`)}
              </Button>
            ))}
          </div>
          <div className="min-w-56">
            <Select
              value={selectedId != null ? String(selectedId) : undefined}
              onValueChange={(v) => setSelectedId(Number(v))}
            >
              <SelectTrigger><SelectValue placeholder={t('reporting.detail.selectRep')} /></SelectTrigger>
              <SelectContent>
                {reps.map((r) => (
                  <SelectItem key={r.kullaniciID} value={String(r.kullaniciID)}>{r.adSoyad}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto">
            <Button onClick={onExport} disabled={!detail || exporting}>
              {exporting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('reporting.detail.exporting')}</>
                : <><Download className="mr-2 h-4 w-4" />{t('reporting.detail.export')}</>}
            </Button>
          </div>
        </div>

        {/* Tüm temsilciler tablosu */}
        <DataTable
          columns={cols}
          data={reps as (RepPerformance & Record<string, unknown>)[]}
          keyField="kullaniciID"
          loading={isLoading}
          density="compact"
          emptyMessage={t('reporting.empty')}
        />

        {/* Seçili temsilci analiz panosu */}
        {selectedId == null ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
            {t('reporting.detail.selectHint')}
          </CardContent></Card>
        ) : detailLoading ? (
          <Card><CardContent className="py-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('common.loading')}
          </CardContent></Card>
        ) : detailError || !detail ? (
          <Card><CardContent className="py-10 text-center text-destructive text-sm">
            {t('reporting.detail.loadError')}
          </CardContent></Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{selectedRep?.adSoyad ?? detail.adSoyad}</h2>
              <span className="text-xs text-muted-foreground">· {t('reporting.detail.analytics')}</span>
            </div>

            {/* KPI kartları */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              <Kpi icon={<ShoppingCart className="h-4 w-4" />} label={t('reporting.detail.orders')} value={detail.siparisSayisi} />
              <Kpi icon={<FileText className="h-4 w-4" />} label={t('reporting.detail.quotations')} value={detail.teklifSayisi} />
              <Kpi icon={<Package className="h-4 w-4" />} label={t('reporting.detail.quantity')} value={detail.toplamAdet} />
              <Kpi icon={<Globe className="h-4 w-4" />} label={t('reporting.detail.countries')} value={detail.ulkeSayisi} />
              <Kpi icon={<TrendingUp className="h-4 w-4" />} label={t('reporting.detail.conversion')} value={`%${detail.donusumOrani}`} />
              <Kpi icon={<Layers className="h-4 w-4" />} label={t('reporting.detail.totalRevenue')}
                value={multiCurrency({ Euro: detail.ciroEuro, Dolar: detail.ciroDolar, TL: detail.ciroTL, Sterlin: detail.ciroSterlin })} small />
              <Kpi icon={<TrendingUp className="h-4 w-4" />} label={t('reporting.detail.aov')}
                value={formatCurrency(({ Euro: detail.aovEuro, Dolar: detail.aovDolar, TL: detail.aovTL, Sterlin: detail.aovSterlin })[cur], cur)} small />
            </div>

            {/* Aylık ciro grafiği */}
            <Card>
              <CardHeader><CardTitle className="text-base">{t('reporting.detail.monthlyRevenue')} ({cur})</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  {chartData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t('reporting.empty')}</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="ay" fontSize={12} />
                        <YAxis fontSize={12} width={70}
                          tickFormatter={(v) => formatCurrency(Number(v), cur)} />
                        <Tooltip formatter={(v) => formatCurrency(Number(v), cur)} />
                        <Bar dataKey="ciro" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top ülkeler + top ürünler */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">{t('reporting.detail.topCountries')}</CardTitle></CardHeader>
                <CardContent>
                  {detail.ulkeler.length === 0 ? <Empty t={t} /> : (
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-muted-foreground text-xs">
                        <th className="text-left py-1.5">{t('reporting.detail.country')}</th>
                        <th className="text-right py-1.5">{t('reporting.detail.ordersShort')}</th>
                        <th className="text-right py-1.5">{t('reporting.detail.qty')}</th>
                        <th className="text-right py-1.5">{t('reporting.detail.revenue')}</th>
                      </tr></thead>
                      <tbody>
                        {detail.ulkeler.slice(0, 8).map((u) => (
                          <tr key={u.ulke} className="border-b last:border-0">
                            <td className="py-1.5">{u.ulke}</td>
                            <td className="text-right tabular-nums">{u.siparisSayisi}</td>
                            <td className="text-right tabular-nums">{u.adet}</td>
                            <td className="text-right text-xs">{multiCurrency({ Euro: u.ciroEuro, Dolar: u.ciroDolar, TL: u.ciroTL, Sterlin: u.ciroSterlin })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">{t('reporting.detail.topProducts')}</CardTitle></CardHeader>
                <CardContent>
                  {detail.urunler.length === 0 ? <Empty t={t} /> : (
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-muted-foreground text-xs">
                        <th className="text-left py-1.5">{t('reporting.detail.product')}</th>
                        <th className="text-right py-1.5">{t('reporting.detail.qty')}</th>
                        <th className="text-right py-1.5">{t('reporting.detail.ordersShort')}</th>
                      </tr></thead>
                      <tbody>
                        {detail.urunler.slice(0, 8).map((p) => (
                          <tr key={p.urun} className="border-b last:border-0">
                            <td className="py-1.5">{p.urun}</td>
                            <td className="text-right tabular-nums">{p.adet}</td>
                            <td className="text-right tabular-nums">{p.siparisSayisi}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Kpi({ icon, label, value, small }: { icon: React.ReactNode; label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">{icon}<span>{label}</span></div>
        <div className={`mt-1.5 font-semibold ${small ? 'text-sm' : 'text-2xl'} tabular-nums`}>{value}</div>
      </CardContent>
    </Card>
  )
}

function Empty({ t }: { t: (k: string) => string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{t('reporting.empty')}</p>
}
