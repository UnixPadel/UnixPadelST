import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getPendingFinal, getPurchaseById, finalApprovePurchase, finalRejectPurchase,
} from '@/api/purchase'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { PurchaseStatusBadge } from '@/components/PurchaseStatusBadge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { hideMoneyFor } from '@/lib/visibility'
import { PurchaseLinesTable } from '@/components/PurchaseLinesTable'
import { PurchaseAttachment } from '@/components/PurchaseAttachment'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { PurchaseRequestListDto } from '@/types'

export function FinalApprovalPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { getUser } = useAuth()
  // Round-11 §3 — omur.caliskan (Gozlemci) parasal değer görmez.
  const hideMoney = hideMoneyFor(getUser())
  const [detailId, setDetailId] = useState<number | null>(null)
  const [rejectTarget, setRejectTarget] = useState<number | null>(null)
  const [redNotu, setRedNotu] = useState('')

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['final-pending'], queryFn: getPendingFinal,
  })
  const { data: detail } = useQuery({
    queryKey: ['final-detail', detailId],
    queryFn: () => getPurchaseById(detailId!),
    enabled: !!detailId,
  })

  const approveMut = useMutation({
    mutationFn: (id: number) => finalApprovePurchase(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['final-pending'] })
      setDetailId(null)
      toast({ title: t('purchase.final.approved') })
    },
    onError: (e: unknown) => toast({ title: t('purchase.final.approveFailed'), description: (e as Error).message, variant: 'destructive' }),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, not }: { id: number; not: string }) => finalRejectPurchase(id, not),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['final-pending'] })
      setRejectTarget(null); setRedNotu(''); setDetailId(null)
      toast({ title: t('purchase.final.rejected') })
    },
    onError: () => toast({ title: t('common.error'), variant: 'destructive' }),
  })

  const isSatinAlma = (r: PurchaseRequestListDto) =>
    !r.talepTipi || r.talepTipi === 'SatinAlma'

  // Rule 4 frontend kontrolü (backend de aynı kontrolü yapar — defansif çiftli koruma)
  const ruleBlocked = (r: PurchaseRequestListDto): boolean => {
    if (!isSatinAlma(r)) return false
    // List DTO'da OdemeTuru yok; detail çağırıldığında dolu olur. Liste seviyesinde
    // sadece "Muhasebe Tamamlandı" satırlar görünür → ödeme zaten girilmiş.
    // SatinAlma + Ön Onaylandı satırı buraya düşerse blok.
    return r.durum === 'Ön Onaylandı'
  }

  const cols: Column<PurchaseRequestListDto & Record<string, unknown>>[] = [
    { key: 'talepID',       header: t('purchase.cols.id'), sortable: true },
    { key: 'urunAdi',       header: t('purchase.cols.urun') },
    ...(!hideMoney ? [
      { key: 'urunMaliyeti', header: t('purchase.cols.maliyet'), render: (r) => formatCurrency((r.urunMaliyeti as number) ?? 0, (r.paraBirimi as string) ?? '') },
    ] satisfies Column<PurchaseRequestListDto & Record<string, unknown>>[] : []),
    { key: 'departman',     header: t('purchase.cols.departman'), render: (r) => r.departman ? t(`roles.${r.departman as string}`, { defaultValue: r.departman as string }) : '—' },
    { key: 'talepTipi',     header: t('purchase.cols.tip'), render: (r) => t(`purchase.tipLabel.${(r.talepTipi as string) ?? 'SatinAlma'}`, { defaultValue: (r.talepTipi as string) ?? 'SatinAlma' }) },
    { key: 'talepEdenKullaniciAdi', header: t('purchase.cols.talepEden') },
    { key: 'talepTarihi',   header: t('purchase.cols.tarih'), render: (r) => formatDate(r.talepTarihi as string) },
    { key: 'durum',         header: t('purchase.cols.durum'), render: (r) => <PurchaseStatusBadge value={r.durum as string} /> },
    {
      key: 'actions', header: t('purchase.cols.islem'),
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => setDetailId(r.talepID as number)}>
          {t('purchase.final.reviewApprove')}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title={t('approval.finalTitle')} />
      <div className="p-6">
        <DataTable columns={cols} data={pending as (PurchaseRequestListDto & Record<string, unknown>)[]} keyField="talepID" loading={isLoading} />
      </div>

      {/* Detail + onay panel */}
      <Dialog open={!!detailId} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('purchase.final.reviewTitle', { id: detailId })}</DialogTitle>
          </DialogHeader>

          {detail && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sol: Talep + Muhasebe paneli */}
              <div className="rounded-md border bg-card p-3 space-y-2 text-sm">
                <h3 className="font-semibold border-b pb-1">{t('purchase.final.talep')}</h3>
                <Row label={t('purchase.final.fields.urun')}       value={detail.urunAdi} />
                <Row label={t('purchase.final.fields.tur')}        value={detail.urunTuru} />
                {!hideMoney && <Row label={t('purchase.final.fields.maliyet')} value={formatCurrency(detail.urunMaliyeti ?? 0, detail.paraBirimi ?? '')} />}
                <Row label={t('purchase.paraBirimi')}              value={detail.paraBirimi ?? undefined} />
                <Row label={t('purchase.final.fields.alinanYer')}  value={detail.alinanYer} />
                <Row label={t('purchase.final.fields.departman')}  value={detail.departman ? t(`roles.${detail.departman}`, { defaultValue: detail.departman }) : null} />
                <Row label={t('purchase.final.fields.talepEden')}  value={detail.talepEdenKullaniciAdi} />
                <Row label={t('purchase.final.fields.tarih')}      value={formatDate(detail.talepTarihi)} />
                <Row label={t('purchase.final.fields.notlar')}     value={detail.notlar} />
                {detail.onIzlemeYapan && (
                  <Row label={t('purchase.final.fields.onOnay')} value={`${detail.onIzlemeYapan} (${detail.onIzlemeTarihi ? formatDate(detail.onIzlemeTarihi) : ''})`} />
                )}
              </div>

              <div className="rounded-md border bg-muted/20 p-3 space-y-2 text-sm">
                <h3 className="font-semibold border-b pb-1">{t('purchase.final.muhasebeReadonly')}</h3>
                {detail.odemeTuru
                  ? <>
                      <Row label={t('purchase.final.fields.odemeTuru')}    value={detail.odemeTuru} />
                      <Row label={t('purchase.final.fields.odenenTutar')}  value={!hideMoney && detail.odenenTutar != null ? formatCurrency(detail.odenenTutar, detail.paraBirimi ?? '') : null} />
                      <Row label={t('purchase.final.fields.odemeTutari')}  value={!hideMoney && detail.odemeTutari != null ? formatCurrency(detail.odemeTutari, detail.paraBirimi ?? '') : null} />
                      <Row label={t('purchase.final.fields.vadeSuresi')}   value={detail.odemeVadeSuresi} />
                      <Row label={t('purchase.final.fields.vadeTutari')}   value={!hideMoney && detail.odemeVadeTutari != null ? formatCurrency(detail.odemeVadeTutari, detail.paraBirimi ?? '') : null} />
                      <Row label={t('purchase.final.fields.vadeTarihi')}   value={detail.odemeVadeTarihi} />
                      <Row label={t('purchase.final.fields.belgeNo')}      value={detail.odemeBelgeNo} />
                      <Row label={t('purchase.final.fields.bankaAdi')}     value={detail.odemeBankaAdi} />
                      <Row label={t('purchase.final.fields.islemTarihi')}  value={detail.odemeIslemTarihi ? formatDate(detail.odemeIslemTarihi) : null} />
                      <Row label={t('purchase.final.fields.kartTipi')}     value={detail.odemeKartTipi} />
                      <Row label={t('purchase.final.fields.taksit')}       value={detail.odemeTaksitSayisi?.toString()} />
                      <Row label={t('purchase.final.fields.aciklama')}     value={detail.odemeAciklama} />
                      <Row label={t('purchase.final.fields.muhasebeYapan')} value={detail.muhasebeYapanKullanici} />
                      <Row label={t('purchase.final.fields.muhasebeTarihi')} value={detail.muhasebeTarihi ? formatDate(detail.muhasebeTarihi) : null} />
                    </>
                  : <p className="text-orange-700 text-xs">
                      {t('purchase.final.noPayment')}
                    </p>}
              </div>

              {/* Round-9 §9 + Round-11 §9 — kalem satırları (para birimi + omur gizleme). */}
              {detail.kalemler && detail.kalemler.length > 0 && (
                <div className="md:col-span-2 rounded-md border bg-card p-3">
                  <h3 className="font-semibold border-b pb-1 mb-2 text-sm">{t('purchase.lines.title')}</h3>
                  <PurchaseLinesTable
                    kalemler={detail.kalemler}
                    paraBirimi={detail.paraBirimi}
                    grandTotal={detail.urunMaliyeti ?? 0}
                    hideMoney={hideMoney}
                  />
                </div>
              )}

              {/* Talep sahibinin eklediği dosya — nihai onay basamağı da görür. */}
              <div className="md:col-span-2">
                <PurchaseAttachment talepId={detail.talepID} />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setDetailId(null)}>{t('common.close')}</Button>
            <Button
              variant="destructive"
              onClick={() => { setRejectTarget(detailId); setRedNotu('') }}
              disabled={rejectMut.isPending}
            >{t('common.reject')}</Button>
            <Button
              disabled={approveMut.isPending || (detail && !detail.odemeTuru && (!detail.talepTipi || detail.talepTipi === 'SatinAlma'))}
              title={detail && !detail.odemeTuru && (!detail.talepTipi || detail.talepTipi === 'SatinAlma') ? t('purchase.final.ruleBlocked') : ''}
              onClick={() => approveMut.mutate(detailId!)}
            >{t('common.approve')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject sub-modal */}
      <Dialog open={rejectTarget !== null} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('purchase.reject.title', { id: rejectTarget })}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>{t('purchase.reject.note')}</Label>
            <Textarea rows={3} value={redNotu} onChange={(e) => setRedNotu(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" disabled={!redNotu.trim() || rejectMut.isPending}
              onClick={() => rejectMut.mutate({ id: rejectTarget!, not: redNotu })}>{t('common.reject')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* dummy reference to silence unused-var lint */}
      <span hidden>{pending.filter(ruleBlocked).length}</span>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground min-w-32">{label}:</span>
      <span>{value}</span>
    </div>
  )
}
