import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getCustomers } from '@/api/customers'
import { getCustomerBalance } from '@/api/accounting'
import { PageHeader } from '@/components/PageHeader'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

export function CustomerBalancePage() {
  const { t } = useTranslation()
  const [musteriId, setMusteriId] = useState<number | null>(null)

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const { data: balance, isLoading } = useQuery({
    queryKey: ['customer-balance', musteriId],
    queryFn: () => getCustomerBalance(musteriId!),
    enabled: !!musteriId,
  })

  return (
    <div>
      <PageHeader title={t('accounting.balanceTitle')} />
      <div className="p-6 space-y-4">
        <div className="space-y-1 max-w-md">
          <Label>{t('common.customer')}</Label>
          <Select onValueChange={(v) => setMusteriId(Number(v))}>
            <SelectTrigger><SelectValue placeholder={t('orders.form.musteriSec')} /></SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.musteriID} value={String(c.musteriID)}>{c.musteriAd} ({c.ulkeAdi})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!musteriId && <p className="text-sm text-muted-foreground">{t('common.customer')}…</p>}
        {musteriId && isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
        {balance && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">{balance.musteriAd}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {balance.lines.map((l) => {
                const sym = l.paraTipi === 'Euro' ? '€' : l.paraTipi === 'Dolar' ? '$' : l.paraTipi === 'TL' ? '₺' : '£'
                return (
                  <div key={l.paraTipi} className="rounded-md border bg-card p-4 space-y-2">
                    <h4 className="font-semibold">{l.paraTipi}</h4>
                    <div className="flex justify-between text-sm"><span>{t('common.totalAmount')}:</span><span>{formatCurrency(l.toplam, sym)}</span></div>
                    <div className="flex justify-between text-sm"><span>{t('common.amount')}:</span><span className="text-green-700">{formatCurrency(l.odenen, sym)}</span></div>
                    <div className="flex justify-between text-sm font-semibold border-t pt-2"><span>{t('common.balance')}:</span><span className={l.kalan > 0 ? 'text-orange-700' : 'text-muted-foreground'}>{formatCurrency(l.kalan, sym)}</span></div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
