import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getMyOrders, convertToOrder, downloadExcel, submitForApproval } from '@/api/orders'
import { describeApiError } from '@/lib/axios'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, formatCurrency } from '@/lib/utils'

// Paket 2 — aşama enum'ları (WinForms SiparisMiTeklifMi birebir)
const ASAMALAR = ['Teklif', 'Siparis', 'Planlama', 'Uretim', 'Hazir', 'Lojistik', 'Tamamlandi', 'Iptal'] as const
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { useToast } from '@/components/ToastProvider'
import type { OrderListDto } from '@/types'

export function MyOrdersPage() {
  const { getUser } = useAuth()
  const { t } = useTranslation()
  const user = getUser()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [filter, setFilter] = useState('')
  const [asama, setAsama] = useState<string | undefined>(undefined)
  const [detailNo, setDetailNo] = useState<string | null>(null)

  // Paket 2 — aşama dropdown değişimi sorguyu yeniden çağırır (queryKey'e dahil)
  const { data = [], isLoading } = useQuery({
    queryKey: ['my-orders', asama ?? 'all'],
    queryFn: () => getMyOrders(asama),
    enabled: !!user,
  })

  const convertMut = useMutation({
    mutationFn: (teklifNo: string) => convertToOrder(teklifNo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-orders'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast({ title: t('orders.convertSuccess') })
    },
    onError: (err) => toast({ title: t('orders.convertFailed'), description: describeApiError(err), variant: 'destructive' }),
  })

  const submitMut = useMutation({
    mutationFn: (no: string) => submitForApproval(no),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-orders'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast({ title: t('orders.submitSuccess') })
    },
    onError: (err) => toast({ title: t('orders.submitFailed'), description: describeApiError(err), variant: 'destructive' }),
  })

  const filtered = data.filter((o) =>
    !filter ||
    (o.siparisNo ?? '').toLowerCase().includes(filter.toLowerCase()) ||
    o.musteriAd.toLowerCase().includes(filter.toLowerCase())
  )

  const columns: Column<OrderListDto & Record<string, unknown>>[] = [
    { key: 'siparisNo',  header: t('common.orderNo'), sortable: true },
    { key: 'teklifNo',   header: t('common.quoteNo'),  sortable: true },
    { key: 'musteriAd',  header: t('common.customer'),    sortable: true },
    { key: 'mUlke',      header: t('common.country'),       sortable: true },
    { key: 'paraTipi',   header: t('common.currency') },
    { key: 'toplamFiyat', header: t('common.totalAmount'), render: (r) => formatCurrency(r.toplamFiyat ?? 0, r.paraTipi as string) },
    { key: 'siparisMiTeklifMi', header: t('common.stage'), render: (r) => <StatusBadge value={r.siparisMiTeklifMi as string} /> },
    { key: 'kontrol',    header: t('common.control'), render: (r) => <StatusBadge value={r.kontrol as string} /> },
    { key: 'tarih',      header: t('common.date'), render: (r) => formatDate(r.tarih as string) },
    {
      key: 'actions', header: t('common.actions'),
      render: (r) => {
        const asama = r.siparisMiTeklifMi as string
        const kontrol = r.kontrol as string
        const no = (asama === 'Teklif' ? r.teklifNo : r.siparisNo) as string
        return (
          <div className="flex gap-1 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setDetailNo(no)}>{t('common.form')}</Button>
            <Button size="sm" variant="outline" onClick={async () => {
              try { await downloadExcel(no); toast({ title: t('orders.excelDownloaded'), description: no }) }
              catch (err) { toast({ title: t('orders.excelFailed'), description: describeApiError(err), variant: 'destructive' }) }
            }}>{t('common.excel')}</Button>
            {(asama === 'Teklif' || asama === 'Siparis') && kontrol === 'Kontrol' && (
              <Button size="sm" variant="secondary"
                disabled={submitMut.isPending}
                onClick={() => submitMut.mutate(no)}>{t('common.submitForApproval')}</Button>
            )}
            {(asama === 'Teklif' || asama === 'Siparis') && kontrol !== 'Onay' && (
              <Button size="sm" variant="secondary" onClick={() => navigate(`/orders/new?revise=${no}`)}>{t('common.revise')}</Button>
            )}
            {asama === 'Teklif' && (
              <Button size="sm" variant="secondary" disabled={convertMut.isPending}
                onClick={() => convertMut.mutate(r.teklifNo as string)}>{t('common.convertToOrder')}</Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('orders.myTitle')}
        description={t('orders.mySubtitle')}
        actions={<Button onClick={() => navigate('/orders/new')}>{t('orders.newOrder')}</Button>}
      />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 flex-1 min-w-[240px] max-w-sm">
            <Label>{t('common.quickFilter')}</Label>
            <Input placeholder={t('orders.quickFilterPlaceholder')} value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
          <div className="space-y-1 w-48">
            <Label>{t('common.stage')}</Label>
            <Select value={asama ?? 'all'} onValueChange={(v) => setAsama(v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {ASAMALAR.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DataTable<OrderListDto & Record<string, unknown>>
          columns={columns}
          data={filtered as (OrderListDto & Record<string, unknown>)[]}
          keyField="siparisAlID"
          loading={isLoading}
        />
      </div>
      <OrderDetailModal siparisNo={detailNo} onClose={() => setDetailNo(null)} />
    </div>
  )
}
