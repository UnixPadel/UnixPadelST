import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getPendingPreApproval, getPurchaseById, preApprovePurchase, preRejectPurchase } from '@/api/purchase'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { PurchaseStatusBadge } from '@/components/PurchaseStatusBadge'
import { PurchaseLinesTable } from '@/components/PurchaseLinesTable'
import { PurchaseAttachment } from '@/components/PurchaseAttachment'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { hideMoneyFor } from '@/lib/visibility'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { PurchaseRequestListDto } from '@/types'

export function PreApprovalPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { toast } = useToast()
  const { getUser } = useAuth()
  // Round-11 §3 — omur.caliskan (Gozlemci, ön onaylayan) parasal değer görmez;
  // ürün/miktar/birim operasyonel bilgisinden ön onay verebilir.
  const hideMoney = hideMoneyFor(getUser())
  const [detailId, setDetailId] = useState<number | null>(null)
  const [rejectTarget, setRejectTarget] = useState<number | null>(null)
  const [redNotu, setRedNotu] = useState('')

  const { data = [], isLoading } = useQuery({ queryKey: ['preapproval'], queryFn: getPendingPreApproval })
  const { data: detail } = useQuery({
    queryKey: ['preapproval-detail', detailId],
    queryFn: () => getPurchaseById(detailId!),
    enabled: !!detailId,
  })

  const approveMut = useMutation({
    mutationFn: (id: number) => preApprovePurchase(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['preapproval'] }); setDetailId(null); toast({ title: t('purchase.pre.approved') }) },
    onError: (e: unknown) => toast({ title: t('common.error'), description: (e as Error).message, variant: 'destructive' }),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, not }: { id: number; not: string }) => preRejectPurchase(id, not),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preapproval'] })
      setRejectTarget(null); setRedNotu(''); setDetailId(null)
      toast({ title: t('purchase.pre.rejected') })
    },
    onError: () => toast({ title: t('common.error'), variant: 'destructive' }),
  })

  const cols: Column<PurchaseRequestListDto & Record<string, unknown>>[] = [
    { key: 'talepID',       header: t('purchase.cols.id'), sortable: true },
    { key: 'urunAdi',       header: t('purchase.cols.urun') },
    { key: 'urunTuru',      header: t('purchase.cols.tur') },
    ...(!hideMoney ? [
      { key: 'urunMaliyeti', header: t('purchase.cols.maliyet'), render: (r) => formatCurrency((r.urunMaliyeti as number) ?? 0, (r.paraBirimi as string) ?? '') },
    ] satisfies Column<PurchaseRequestListDto & Record<string, unknown>>[] : []),
    { key: 'alinanYer',     header: t('purchase.cols.alinanYer') },
    { key: 'departman',     header: t('purchase.cols.departman'), render: (r) => r.departman ? t(`roles.${r.departman as string}`, { defaultValue: r.departman as string }) : '—' },
    { key: 'talepEdenKullaniciAdi', header: t('purchase.cols.talepEden') },
    { key: 'talepTarihi',   header: t('purchase.cols.tarih'), render: (r) => formatDate(r.talepTarihi as string) },
    { key: 'durum',         header: t('purchase.cols.durum'), render: (r) => <PurchaseStatusBadge value={r.durum as string} /> },
    {
      key: 'actions', header: t('purchase.cols.islem'),
      render: (r) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setDetailId(r.talepID as number)}>{t('common.details')}</Button>
          <Button size="sm" disabled={approveMut.isPending} onClick={() => approveMut.mutate(r.talepID as number)}>{t('common.approve')}</Button>
          <Button size="sm" variant="destructive" onClick={() => { setRejectTarget(r.talepID as number); setRedNotu('') }}>{t('common.reject')}</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title={t('approval.preTitle')} />
      <div className="p-4 lg:p-6">
        <DataTable columns={cols} data={data as (PurchaseRequestListDto & Record<string, unknown>)[]} keyField="talepID" loading={isLoading} />
      </div>

      {/* Round-11 §9 — kalem detay + onay paneli (ön onaylayan ne onayladığını görür) */}
      <Dialog open={!!detailId} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('purchase.pre.reviewTitle', { id: detailId })}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="rounded-md border bg-card p-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <Row label={t('purchase.cols.alinanYer')}  value={detail.alinanYer} />
                <Row label={t('purchase.cols.departman')}  value={detail.departman ? t(`roles.${detail.departman}`, { defaultValue: detail.departman }) : null} />
                <Row label={t('purchase.cols.talepEden')}  value={detail.talepEdenKullaniciAdi} />
                <Row label={t('purchase.paraBirimi')}      value={detail.paraBirimi ?? undefined} />
                {!hideMoney && <Row label={t('purchase.cols.maliyet')} value={formatCurrency(detail.urunMaliyeti ?? 0, detail.paraBirimi ?? '')} />}
                <Row label={t('purchase.notlar')}          value={detail.notlar} />
              </div>

              {detail.kalemler && detail.kalemler.length > 0 && (
                <div className="rounded-md border bg-card p-3">
                  <h3 className="font-semibold border-b pb-1 mb-2 text-sm">{t('purchase.lines.title')}</h3>
                  <PurchaseLinesTable
                    kalemler={detail.kalemler}
                    paraBirimi={detail.paraBirimi}
                    grandTotal={detail.urunMaliyeti ?? 0}
                    hideMoney={hideMoney}
                  />
                </div>
              )}

              {/* Talep sahibinin eklediği dosya — ön onay basamağı da görür. */}
              <PurchaseAttachment talepId={detail.talepID} />
            </div>
          )}
          <DialogFooter className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setDetailId(null)}>{t('common.close')}</Button>
            <Button variant="destructive" onClick={() => { setRejectTarget(detailId); setRedNotu('') }}>{t('common.reject')}</Button>
            <Button disabled={approveMut.isPending} onClick={() => approveMut.mutate(detailId!)}>{t('common.approve')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectTarget !== null} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('purchase.reject.title', { id: rejectTarget })}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>{t('purchase.reject.note')}</Label>
            <Textarea value={redNotu} onChange={(e) => setRedNotu(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" disabled={!redNotu.trim() || rejectMut.isPending}
              onClick={() => rejectMut.mutate({ id: rejectTarget!, not: redNotu })}>{t('common.reject')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground min-w-28">{label}:</span>
      <span className="font-medium break-words">{value}</span>
    </div>
  )
}
