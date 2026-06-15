import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getLogisticsHistory, completeShipment, cancelShipment } from '@/api/logistics'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { LogisticsStatusBadge } from '@/components/LogisticsStatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ToastProvider'
import { formatCurrency } from '@/lib/utils'
import type { LogisticsHistoryDto } from '@/types'

export function LogisticsHistoryPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const role = getUser()?.yetkiTuru ?? ''
  const canMutate = role === 'Yonetici' || role === 'Lojistik'

  const [filter, setFilter] = useState({ siparisNo: '', firmaAdi: '' })

  const { data = [], isLoading } = useQuery({
    queryKey: ['logistics-history', filter],
    queryFn: () => getLogisticsHistory(filter.siparisNo || undefined, filter.firmaAdi || undefined),
  })

  const completeMut = useMutation({
    mutationFn: (sevkId: number) => completeShipment(sevkId),
    // PROMPT-v5 §3 — sipariş statü geçişleri Siparişlerim'e canlı yansısın.
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['logistics-history'] }); qc.invalidateQueries({ queryKey: ['my-orders'] }); toast({ title: t('logistics.toast.completed') }) },
    onError: () => toast({ title: t('logistics.toast.error'), variant: 'destructive' }),
  })

  const cancelMut = useMutation({
    mutationFn: ({ id, sebep }: { id: number; sebep: string }) => cancelShipment(id, sebep),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['logistics-history'] }); qc.invalidateQueries({ queryKey: ['my-orders'] }); toast({ title: t('logistics.toast.cancelled') }) },
    onError: () => toast({ title: t('logistics.toast.error'), variant: 'destructive' }),
  })

  const cols: Column<LogisticsHistoryDto & Record<string, unknown>>[] = [
    { key: 'id',           header: 'ID',          sortable: true },
    { key: 'siparisNo',    header: t('common.orderNo'),  sortable: true },
    { key: 'firmaAdi',     header: t('logistics.history.firma'), sortable: true },
    { key: 'lojistikCesit',header: t('logistics.history.tur'),   sortable: true },
    // PROMPT.md OBSERVER #18: operatör Ad Soyad kolonu.
    { key: 'kullaniciAdSoyad', header: t('logistics.history.operator'), sortable: true,
      render: (r) => (r.kullaniciAdSoyad as string) || '—' },
    { key: 'fiyat',        header: t('common.amount'),    render: (r) => formatCurrency((r.fiyat as number) ?? 0) },
    { key: 'siparisMiTeklifMi', header: t('common.status'),
      render: (r) => <LogisticsStatusBadge value={(r.siparisMiTeklifMi as string) ?? ''} /> },
    { key: 'lNot',         header: t('common.note'),      render: (r) => <span className="text-sm text-muted-foreground">{(r.lNot as string) ?? '—'}</span> },
    {
      key: 'actions', header: t('common.actions'),
      render: (r) => {
        if (!canMutate) return null
        // Paket 3: sadece "Sevk Yolda" (Order=Lojistik) satırlarda Tamamla/İptal gösterilir.
        // "Muhasebe Onayı Bekliyor" (Hazir) için aksiyon Muhasebe'ye aittir.
        const stage = r.siparisMiTeklifMi as string | undefined
        if (stage !== 'Lojistik') return <span className="text-xs text-muted-foreground">—</span>
        return (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => completeMut.mutate(r.id as number)} disabled={completeMut.isPending}>{t('logistics.history.complete')}</Button>
            <Button size="sm" variant="destructive"
              onClick={() => {
                const sebep = window.prompt(t('logistics.history.cancelPrompt'))
                if (sebep) cancelMut.mutate({ id: r.id as number, sebep })
              }}>{t('common.cancel')}</Button>
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader title={t('logistics.historyTitle')} />
      <div className="p-6 space-y-3">
        <div className="flex gap-2 max-w-2xl">
          <Input placeholder={t('common.orderNo')} value={filter.siparisNo} onChange={(e) => setFilter((f) => ({ ...f, siparisNo: e.target.value }))} />
          <Input placeholder={t('logistics.history.firmaPlaceholder')} value={filter.firmaAdi} onChange={(e) => setFilter((f) => ({ ...f, firmaAdi: e.target.value }))} />
        </div>
        <DataTable columns={cols} data={data as (LogisticsHistoryDto & Record<string, unknown>)[]} keyField="id" loading={isLoading} density="compact" />
      </div>
    </div>
  )
}
