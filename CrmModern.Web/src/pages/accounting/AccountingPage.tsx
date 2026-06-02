import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getAccountingOrders, addTransaction, uploadMuhasebeEk, downloadAccountingExcel,
  getTransactionsForOrder,
} from '@/api/accounting'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate, formatCurrency } from '@/lib/utils'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { useToast } from '@/components/ToastProvider'
import type { AccountingOrderListDto, AccountingTransactionDto } from '@/types'

export function AccountingPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [detailNo, setDetailNo] = useState<string | null>(null)
  const [txTarget, setTxTarget] = useState<AccountingOrderListDto | null>(null)
  const [txTutar, setTxTutar] = useState<number>(0)
  const [txTarih, setTxTarih] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [ekTarget, setEkTarget] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [odemeDurum, setOdemeDurum] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['accounting-orders'],
    queryFn: getAccountingOrders,
  })

  const { data: txForOrder = [] } = useQuery({
    queryKey: ['order-tx', txTarget?.siparisNo],
    queryFn: () => getTransactionsForOrder(txTarget!.siparisNo),
    enabled: !!txTarget,
  })

  const addMut = useMutation({
    mutationFn: () => addTransaction({
      siparisNo: txTarget!.siparisNo,
      odenenMiktar: txTutar,
      tarih: txTarih,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting-orders'] })
      qc.invalidateQueries({ queryKey: ['order-tx', txTarget?.siparisNo] })
      qc.invalidateQueries({ queryKey: ['accounting-transactions'] })
      setTxTutar(0)
      toast({ title: t('common.success') })
    },
    onError: (e: unknown) => toast({ title: t('common.error'), description: (e as Error).message, variant: 'destructive' }),
  })

  const uploadMut = useMutation({
    mutationFn: ({ no, file }: { no: string; file: File }) => uploadMuhasebeEk(no, file),
    onSuccess: () => { toast({ title: t('common.success') }); setEkTarget(null) },
    onError: () => toast({ title: t('common.failed'), variant: 'destructive' }),
  })

  const filtered = orders.filter((o) => {
    if (search && !o.siparisNo.toLowerCase().includes(search.toLowerCase()) &&
        !o.musteriAd.toLowerCase().includes(search.toLowerCase())) return false
    if (odemeDurum !== 'all' && o.odemeDurum !== odemeDurum) return false
    if (from && new Date(o.tarih) < new Date(from)) return false
    if (to && new Date(o.tarih) > new Date(to)) return false
    return true
  })

  const cols: Column<AccountingOrderListDto & Record<string, unknown>>[] = [
    { key: 'siparisNo',    header: t('common.orderNo'),    sortable: true },
    { key: 'musteriAd',    header: t('common.customer'),   sortable: true },
    { key: 'mUlke',        header: t('common.country') },
    { key: 'paraTipi',     header: t('common.currency') },
    { key: 'toplamFiyat',  header: t('common.totalAmount'),render: (r) => formatCurrency((r.toplamFiyat as number) ?? 0, r.paraTipi as string) },
    { key: 'odenenMiktar', header: t('common.amount'),     render: (r) => r.odenenMiktar != null ? formatCurrency(r.odenenMiktar as number, r.paraTipi as string) : '—' },
    { key: 'kalanBakiye',  header: t('common.balance'),    render: (r) => formatCurrency((r.kalanBakiye as number) ?? 0, r.paraTipi as string) },
    { key: 'odemeDurum',   header: t('common.status'),     render: (r) => r.odemeDurum ? <StatusBadge value={r.odemeDurum as string} /> : '—' },
    { key: 'tarih',        header: t('common.date'),       render: (r) => formatDate((r.tarih as string) ?? '-') },
    {
      key: 'actions', header: t('common.actions'),
      render: (r) => (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setDetailNo(r.siparisNo as string)}>{t('common.details')}</Button>
          <Button size="sm" onClick={() => {
            setTxTarget(r as AccountingOrderListDto)
            setTxTutar(Number((r.kalanBakiye as number) ?? 0))
            setTxTarih(new Date().toISOString().slice(0, 10))
          }}>{t('common.add')}</Button>
          <Button size="sm" variant="outline" onClick={() => setEkTarget(r.siparisNo as string)}>{t('common.upload')}</Button>
        </div>
      ),
    },
  ]

  const txCols: Column<AccountingTransactionDto & Record<string, unknown>>[] = [
    { key: 'id', header: 'ID' },
    { key: 'tarih', header: 'Tarih', render: (r) => formatDate(r.tarih as string) },
    { key: 'odenenMiktar', header: 'Tutar', render: (r) => formatCurrency((r.odenenMiktar as number) ?? 0) },
    { key: 'kullaniciID', header: 'Kullanıcı' },
  ]

  return (
    <div>
      <PageHeader
        title={t('accounting.title')}
        actions={<Button variant="outline" onClick={() => downloadAccountingExcel()}>{t('common.excel')}</Button>}
      />
      <div className="p-6 space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 items-end">
          <Input placeholder={t('common.quickFilter')} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <select value={odemeDurum} onChange={(e) => setOdemeDurum(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
            <option value="all">{t('common.all')}</option>
            <option value="Beklemede">Beklemede</option>
            <option value="Ödendi">Ödendi</option>
          </select>
          <div className="flex items-center gap-1">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
            <span className="text-muted-foreground text-sm">—</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
          </div>
        </div>
        <DataTable columns={cols} data={filtered as (AccountingOrderListDto & Record<string, unknown>)[]} keyField="siparisNo" loading={isLoading} />
      </div>

      {/* Tahsilat Ekle modal */}
      <Dialog open={!!txTarget} onOpenChange={() => setTxTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tahsilat — {txTarget?.siparisNo}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/30 p-3 space-y-1">
              <div className="flex justify-between"><span>Toplam:</span><span>{formatCurrency(txTarget?.toplamFiyat ?? 0, txTarget?.paraTipi)}</span></div>
              <div className="flex justify-between"><span>Ödenen:</span><span>{formatCurrency(txTarget?.odenenMiktar ?? 0, txTarget?.paraTipi)}</span></div>
              <div className="flex justify-between font-semibold"><span>Kalan:</span><span>{formatCurrency(txTarget?.kalanBakiye ?? 0, txTarget?.paraTipi)}</span></div>
            </div>
            <div className="space-y-1">
              <Label>Tutar ({txTarget?.paraTipi})</Label>
              <Input type="number" value={txTutar} onChange={(e) => setTxTutar(Number(e.target.value))} min={0} step="0.01" />
            </div>
            <div className="space-y-1">
              <Label>Tarih</Label>
              <Input type="date" value={txTarih} onChange={(e) => setTxTarih(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Önceki tahsilatlar:</Label>
              <div className="mt-1 max-h-40 overflow-y-auto rounded border">
                {txForOrder.length === 0
                  ? <p className="p-2 text-xs text-muted-foreground">Henüz tahsilat yok.</p>
                  : <table className="w-full text-xs">
                      <thead className="bg-muted/30">
                        <tr><th className="text-left px-2 py-1">Tarih</th><th className="text-right px-2 py-1">Tutar</th></tr>
                      </thead>
                      <tbody>
                        {txForOrder.map((t) => (
                          <tr key={t.id} className="border-t">
                            <td className="px-2 py-1">{formatDate(t.tarih)}</td>
                            <td className="text-right px-2 py-1">{formatCurrency(t.odenenMiktar ?? 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxTarget(null)}>Kapat</Button>
            <Button disabled={txTutar <= 0 || addMut.isPending} onClick={() => addMut.mutate()}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MuhasebeEk uploader */}
      <Dialog open={!!ekTarget} onOpenChange={() => setEkTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>MuhasebeEk — {ekTarget}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Dosya (PDF/ZIP/JPG…)</Label>
            <input type="file" onChange={(e) => {
              const f = e.target.files?.[0]
              if (f && ekTarget) uploadMut.mutate({ no: ekTarget, file: f })
            }} />
            <p className="text-xs text-muted-foreground">
              SiparisAlTablo.MuhasebeEk kolonuna BLOB olarak yüklenir. (Faz 3 bloku Faz 5'te açıldı.)
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <OrderDetailModal siparisNo={detailNo} onClose={() => setDetailNo(null)} />
    </div>
  )
}
