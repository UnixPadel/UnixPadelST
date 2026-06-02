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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['logistics-history'] }); toast({ title: 'Sevkiyat tamamlandı' }) },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })

  const cancelMut = useMutation({
    mutationFn: ({ id, sebep }: { id: number; sebep: string }) => cancelShipment(id, sebep),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['logistics-history'] }); toast({ title: 'Sevkiyat iptal edildi' }) },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })

  const cols: Column<LogisticsHistoryDto & Record<string, unknown>>[] = [
    { key: 'id',           header: 'ID',          sortable: true },
    { key: 'siparisNo',    header: 'Sipariş No',  sortable: true },
    { key: 'firmaAdi',     header: 'Firma',       sortable: true },
    { key: 'lojistikCesit',header: 'Tür',         sortable: true },
    { key: 'fiyat',        header: 'Fiyat',       render: (r) => formatCurrency((r.fiyat as number) ?? 0) },
    { key: 'siparisMiTeklifMi', header: 'Durum',
      render: (r) => <LogisticsStatusBadge value={(r.siparisMiTeklifMi as string) ?? ''} /> },
    { key: 'lNot',         header: 'Not',         render: (r) => <span className="text-sm text-muted-foreground">{(r.lNot as string) ?? '—'}</span> },
    {
      key: 'actions', header: 'İşlem',
      render: (r) => {
        if (!canMutate) return null
        // Paket 3: sadece "Sevk Yolda" (Order=Lojistik) satırlarda Tamamla/İptal gösterilir.
        // "Muhasebe Onayı Bekliyor" (Hazir) için aksiyon Muhasebe'ye aittir.
        const stage = r.siparisMiTeklifMi as string | undefined
        if (stage !== 'Lojistik') return <span className="text-xs text-muted-foreground">—</span>
        return (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => completeMut.mutate(r.id as number)} disabled={completeMut.isPending}>Tamamla</Button>
            <Button size="sm" variant="destructive"
              onClick={() => {
                const sebep = window.prompt('İptal gerekçesi:')
                if (sebep) cancelMut.mutate({ id: r.id as number, sebep })
              }}>İptal</Button>
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
          <Input placeholder="Sipariş No" value={filter.siparisNo} onChange={(e) => setFilter((f) => ({ ...f, siparisNo: e.target.value }))} />
          <Input placeholder="Firma Adı" value={filter.firmaAdi} onChange={(e) => setFilter((f) => ({ ...f, firmaAdi: e.target.value }))} />
        </div>
        <DataTable columns={cols} data={data as (LogisticsHistoryDto & Record<string, unknown>)[]} keyField="id" loading={isLoading} />
      </div>
    </div>
  )
}
