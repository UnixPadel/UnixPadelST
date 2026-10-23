import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { stageLabel } from '@/lib/status'
import type { OrderTrendPoint, StageDistribution, TopCustomer } from '@/types'

const STAGE_COLORS: Record<string, string> = {
  Teklif:      '#94a3b8',
  Siparis:     '#3b82f6',
  Planlama:    '#a855f7',
  Uretim:      '#f97316',
  Hazir:       '#eab308',
  Lojistik:    '#06b6d4',
  Tamamlandi:  '#22c55e',
  Iptal:       '#ef4444',
}

/** Aylık sipariş trendi — area chart. */
export function OrderTrendChart({ data }: { data: OrderTrendPoint[] }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('dashboard.charts.trend')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="ay" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="siparisSayisi" name={t('dashboard.charts.orderCount')}
                    stroke="#3b82f6" fill="url(#trendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

/** Aşama dağılımı — pie/donut chart. */
export function StageDistributionChart({ data }: { data: StageDistribution[] }) {
  const { t } = useTranslation()
  // Açıklamada ham aşama değeri ("Uretim") yerine okunur etiket ("Üretim" / "Production").
  const rows = data.map((d) => ({ ...d, etiket: stageLabel(t, d.asama) }))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('dashboard.charts.stages')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={rows} dataKey="sayi" nameKey="etiket"
                   cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                   paddingAngle={2}>
                {rows.map((d, i) => (
                  <Cell key={i} fill={STAGE_COLORS[d.asama] ?? '#64748b'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

/** Top müşteri — bar chart (Yönetici/Muhasebe görür). */
export function TopCustomersChart({ data }: { data: TopCustomer[] }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('dashboard.charts.topCustomers')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 12, left: 8, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" fontSize={11} />
              {/* Uzun müşteri adları eksen dışına taşmasın: kısaltılır, tam ad tooltip'te. */}
              <YAxis type="category" dataKey="musteriAd" width={140} fontSize={11}
                tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 21) + '…' : v)} />
              <Tooltip formatter={(v: number, _n, p: any) =>
                [`${v.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${p.payload.paraTipi}`, t('dashboard.charts.revenue')]
              } />
              <Bar dataKey="toplamCiro" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
