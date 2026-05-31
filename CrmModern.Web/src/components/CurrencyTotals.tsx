import type { OrderTotals } from '@/api/orders'

const fmt = (n: number, sym: string) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' ' + sym

interface Props { totals: OrderTotals; loading?: boolean }

export function CurrencyTotals({ totals, loading }: Props) {
  const cards = [
    { label: 'Euro',    value: totals.euro,    sym: '€' },
    { label: 'Dolar',   value: totals.dolar,   sym: '$' },
    { label: 'TL',      value: totals.tl,      sym: '₺' },
    { label: 'Sterlin', value: totals.sterlin, sym: '£' },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-md border bg-card p-3">
          <p className="text-xs text-muted-foreground">{c.label} Toplam</p>
          <p className="text-lg font-semibold">{loading ? '…' : fmt(c.value, c.sym)}</p>
        </div>
      ))}
      <div className="col-span-2 md:col-span-4 text-xs text-muted-foreground">
        {totals.orderCount} sipariş bulundu (filtreye göre)
      </div>
    </div>
  )
}
