import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getTransactionHistory, downloadAccountingExcel, type TransactionFilter } from '@/api/accounting'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate, formatCurrency } from '@/lib/utils'

export function AccountingHistoryPage() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<TransactionFilter>({ page: 1, pageSize: 50 })

  const { data: page, isLoading } = useQuery({
    queryKey: ['tx-history', filter],
    queryFn: () => getTransactionHistory(filter),
  })

  const cols: Column<{ id: number; siparisNo: string; musteriAd?: string; kullanici?: string; paraTipi?: string; odenenMiktar: number | null; tarih: string } & Record<string, unknown>>[] = [
    { key: 'id', header: 'ID' },
    { key: 'tarih', header: t('common.date'), render: (r) => formatDate(r.tarih as string) },
    { key: 'siparisNo', header: t('common.orderNo') },
    { key: 'musteriAd', header: t('common.customer') },
    { key: 'kullanici', header: t('login.username') },
    { key: 'paraTipi', header: t('common.currency') },
    { key: 'odenenMiktar', header: t('common.amount'), render: (r) => formatCurrency((r.odenenMiktar as number) ?? 0, r.paraTipi as string) },
  ]

  const update = <K extends keyof TransactionFilter>(k: K, v: TransactionFilter[K]) =>
    setFilter((f) => ({ ...f, [k]: v, page: 1 }))

  return (
    <div>
      <PageHeader
        title={t('accounting.historyTitle')}
        actions={<Button variant="outline" onClick={() => downloadAccountingExcel(filter)}>{t('common.excel')}</Button>}
      />
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-md border bg-card p-3">
          <div className="space-y-1"><Label>{t('common.orderNo')}</Label><Input value={filter.siparisNo ?? ''} onChange={(e) => update('siparisNo', e.target.value || undefined)} /></div>
          <div className="space-y-1"><Label>{t('common.customer')}</Label><Input value={filter.musteriAd ?? ''} onChange={(e) => update('musteriAd', e.target.value || undefined)} /></div>
          <div className="space-y-1"><Label>{t('common.startDate')}</Label><Input type="date" value={filter.baslangicTarih ?? ''} onChange={(e) => update('baslangicTarih', e.target.value || undefined)} /></div>
          <div className="space-y-1"><Label>{t('common.endDate')}</Label><Input type="date" value={filter.bitisTarih ?? ''} onChange={(e) => update('bitisTarih', e.target.value || undefined)} /></div>
        </div>
        <DataTable columns={cols} data={(page?.items ?? []) as unknown as ({ id: number; siparisNo: string; musteriAd?: string; kullanici?: string; paraTipi?: string; odenenMiktar: number | null; tarih: string } & Record<string, unknown>)[]} keyField="id" loading={isLoading} />
        {page && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('common.total')}: {page.totalCount} • {t('common.page')} {page.page}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={(filter.page ?? 1) <= 1} onClick={() => setFilter((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}>{t('common.previous')}</Button>
              <Button size="sm" variant="outline" disabled={page.items.length < (filter.pageSize ?? 50)} onClick={() => setFilter((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}>{t('common.next')}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
