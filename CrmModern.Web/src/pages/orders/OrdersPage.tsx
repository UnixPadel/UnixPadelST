import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  getOrders, getOrderTotals, approveOrder, rejectOrder,
  cloneOrder, downloadExcel, type OrderFilter,
} from '@/api/orders'
import { describeApiError } from '@/lib/axios'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CurrencyTotals } from '@/components/CurrencyTotals'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { useToast } from '@/components/ToastProvider'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { OrderListDto } from '@/types'

const ASAMALAR = ['Teklif', 'Siparis', 'Planlama', 'Uretim', 'Hazir', 'Lojistik', 'Tamamlandi', 'Iptal'] as const
const PARA_TIPLERI = ['Euro', 'Dolar', 'TL', 'Sterlin'] as const

export function OrdersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const role = getUser()?.yetkiTuru ?? ''
  const canApprove = role === 'Yonetici'
  const canCreate = role === 'Yonetici' || role === 'Temsilci'

  const [filter, setFilter] = useState<OrderFilter>({ page: 1, pageSize: 25 })
  const [detailNo, setDetailNo] = useState<string | null>(null)

  const { data: page, isLoading } = useQuery({
    queryKey: ['orders', filter],
    queryFn: () => getOrders(filter),
  })
  const { data: totals } = useQuery({
    queryKey: ['order-totals', filter],
    queryFn: () => getOrderTotals(filter),
  })

  // Paket 2 — onSuccess'te hem 'orders' hem 'my-orders' cache'leri yenilensin
  // (Yönetici onay/red sonrası kullanıcı da güncel durumu görmeli)
  const invalidateOrderCaches = () => {
    qc.invalidateQueries({ queryKey: ['orders'] })
    qc.invalidateQueries({ queryKey: ['my-orders'] })
    qc.invalidateQueries({ queryKey: ['order-totals'] })
  }

  const approveMut = useMutation({
    mutationFn: (no: string) => approveOrder(no),
    onSuccess: () => { invalidateOrderCaches(); toast({ title: t('orders.orderApproved') }) },
    onError: (err) => toast({ title: t('orders.approveFailed'), description: describeApiError(err), variant: 'destructive' }),
  })
  const rejectMut = useMutation({
    mutationFn: ({ no, reason }: { no: string; reason: string }) => rejectOrder(no, reason),
    onSuccess: () => { invalidateOrderCaches(); toast({ title: t('orders.orderRejected') }) },
    onError: (err) => toast({ title: t('orders.rejectFailed'), description: describeApiError(err), variant: 'destructive' }),
  })
  const cloneMut = useMutation({
    mutationFn: (no: string) => cloneOrder(no),
    onSuccess: (newNo) => { invalidateOrderCaches(); toast({ title: t('orders.cloned'), description: newNo }) },
    onError: (err) => toast({ title: t('orders.cloneFailed'), description: describeApiError(err), variant: 'destructive' }),
  })

  const cols: Column<OrderListDto & Record<string, unknown>>[] = [
    { key: 'siparisNo', header: t('common.orderNo'), sortable: true },
    { key: 'teklifNo', header: t('common.quoteNo'), sortable: true },
    { key: 'musteriAd', header: t('common.customer'), sortable: true },
    { key: 'mUlke', header: t('common.country') },
    { key: 'paraTipi', header: t('common.currency') },
    { key: 'toplamFiyat', header: t('common.totalAmount'), render: (r) => formatCurrency(r.toplamFiyat ?? 0, r.paraTipi as string) },
    { key: 'siparisMiTeklifMi', header: t('common.stage'), render: (r) => <StatusBadge value={r.siparisMiTeklifMi as string} /> },
    { key: 'kontrol', header: t('common.control'), render: (r) => <StatusBadge value={r.kontrol as string} /> },
    { key: 'tarih', header: t('common.date'), render: (r) => formatDate(r.tarih as string) },
    {
      key: 'actions', header: t('common.actions'),
      render: (r) => {
        const asama = r.siparisMiTeklifMi as string
        const no = (asama === 'Teklif' ? r.teklifNo : r.siparisNo) as string
        const kontrol = r.kontrol as string
        return (
          <div className="flex gap-1 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setDetailNo(no)}>{t('common.details')}</Button>
            <Button size="sm" variant="outline" onClick={async () => {
              try { await downloadExcel(no); toast({ title: t('orders.excelDownloaded'), description: no }) }
              catch (err) { toast({ title: t('orders.excelFailed'), description: describeApiError(err), variant: 'destructive' }) }
            }}>{t('common.excel')}</Button>
            {canCreate && (
              <Button size="sm" variant="secondary"
                disabled={cloneMut.isPending}
                onClick={() => cloneMut.mutate(no)}>{t('common.clone')}</Button>
            )}
            {canApprove && kontrol === 'Kontrol' && (
              <>
                <Button size="sm" onClick={() => approveMut.mutate(no)} disabled={approveMut.isPending}>{t('common.approve')}</Button>
                <Button size="sm" variant="destructive"
                  onClick={() => {
                    const reason = window.prompt(t('common.rejectReasonPrompt'))
                    if (reason) rejectMut.mutate({ no, reason })
                  }}
                  disabled={rejectMut.isPending}>{t('common.reject')}</Button>
              </>
            )}
          </div>
        )
      },
    },
  ]

  const update = <K extends keyof OrderFilter>(k: K, v: OrderFilter[K]) =>
    setFilter((f) => ({ ...f, [k]: v, page: 1 }))

  return (
    <div>
      <PageHeader
        title={t('orders.title')}
        description={t('orders.subtitle')}
        actions={canCreate && <Button onClick={() => navigate('/orders/new')}>{t('orders.newOrder')}</Button>}
      />
      <div className="p-6 space-y-5">
        {totals && <CurrencyTotals totals={totals} loading={isLoading} />}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-md border bg-card p-3">
          <div className="space-y-1"><Label>{t('orders.filters.orderNo')}</Label><Input value={filter.siparisNo ?? ''} onChange={(e) => update('siparisNo', e.target.value || undefined)} /></div>
          <div className="space-y-1"><Label>{t('orders.filters.customer')}</Label><Input value={filter.musteriAd ?? ''} onChange={(e) => update('musteriAd', e.target.value || undefined)} /></div>
          <div className="space-y-1"><Label>{t('orders.filters.country')}</Label><Input value={filter.mUlke ?? ''} onChange={(e) => update('mUlke', e.target.value || undefined)} /></div>
          <div className="space-y-1">
            <Label>{t('orders.filters.stage')}</Label>
            <Select value={filter.asama ?? 'all'} onValueChange={(v) => update('asama', v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {ASAMALAR.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t('orders.filters.currency')}</Label>
            <Select value={filter.paraTipi ?? 'all'} onValueChange={(v) => update('paraTipi', v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {PARA_TIPLERI.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>{t('orders.filters.start')}</Label><Input type="date" value={filter.baslangicTarih ?? ''} onChange={(e) => update('baslangicTarih', e.target.value || undefined)} /></div>
          <div className="space-y-1"><Label>{t('orders.filters.end')}</Label><Input type="date" value={filter.bitisTarih ?? ''} onChange={(e) => update('bitisTarih', e.target.value || undefined)} /></div>
          <div className="space-y-1 flex items-end">
            <Button variant="outline" onClick={() => setFilter({ page: 1, pageSize: 25 })}>{t('common.clear')}</Button>
          </div>
        </div>

        <DataTable<OrderListDto & Record<string, unknown>>
          columns={cols}
          data={(page?.items ?? []) as (OrderListDto & Record<string, unknown>)[]}
          keyField="siparisAlID"
          loading={isLoading}
        />

        {page && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('common.total')}: {page.totalCount} • {t('common.page')} {page.page}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={(filter.page ?? 1) <= 1} onClick={() => setFilter((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}>{t('common.previous')}</Button>
              <Button size="sm" variant="outline" disabled={page.items.length < (filter.pageSize ?? 25)} onClick={() => setFilter((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}>{t('common.next')}</Button>
            </div>
          </div>
        )}
      </div>
      <OrderDetailModal siparisNo={detailNo} onClose={() => setDetailNo(null)} />
    </div>
  )
}
