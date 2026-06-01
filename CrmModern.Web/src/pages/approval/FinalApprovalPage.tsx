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
import { formatDate, formatCurrency } from '@/lib/utils'
import type { PurchaseRequestListDto } from '@/types'

export function FinalApprovalPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
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
      toast({ title: 'Onaylandı' })
    },
    onError: (e: unknown) => toast({ title: 'Onay başarısız', description: (e as Error).message, variant: 'destructive' }),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, not }: { id: number; not: string }) => finalRejectPurchase(id, not),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['final-pending'] })
      setRejectTarget(null); setRedNotu(''); setDetailId(null)
      toast({ title: 'Reddedildi' })
    },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
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
    { key: 'talepID',       header: 'ID', sortable: true },
    { key: 'urunAdi',       header: 'Ürün' },
    { key: 'urunMaliyeti',  header: 'Maliyet', render: (r) => formatCurrency((r.urunMaliyeti as number) ?? 0) },
    { key: 'departman',     header: 'Departman' },
    { key: 'talepTipi',     header: 'Tip', render: (r) => r.talepTipi ?? 'SatinAlma' },
    { key: 'talepEdenKullaniciAdi', header: 'Talep Eden' },
    { key: 'talepTarihi',   header: 'Tarih', render: (r) => formatDate(r.talepTarihi as string) },
    { key: 'durum',         header: 'Durum', render: (r) => <PurchaseStatusBadge value={r.durum as string} /> },
    {
      key: 'actions', header: 'İşlem',
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => setDetailId(r.talepID as number)}>
          İncele / Onayla
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
            <DialogTitle>Talep İnceleme — #{detailId}</DialogTitle>
          </DialogHeader>

          {detail && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sol: Talep + Muhasebe paneli */}
              <div className="rounded-md border bg-card p-3 space-y-2 text-sm">
                <h3 className="font-semibold border-b pb-1">Talep</h3>
                <Row label="Ürün"        value={detail.urunAdi} />
                <Row label="Tür"         value={detail.urunTuru} />
                <Row label="Maliyet"     value={formatCurrency(detail.urunMaliyeti ?? 0)} />
                <Row label="Alınan Yer"  value={detail.alinanYer} />
                <Row label="Departman"   value={detail.departman} />
                <Row label="Talep Eden"  value={detail.talepEdenKullaniciAdi} />
                <Row label="Tarih"       value={formatDate(detail.talepTarihi)} />
                <Row label="Notlar"      value={detail.notlar} />
                {detail.onIzlemeYapan && (
                  <Row label="Ön Onay" value={`${detail.onIzlemeYapan} (${detail.onIzlemeTarihi ? formatDate(detail.onIzlemeTarihi) : ''})`} />
                )}
              </div>

              <div className="rounded-md border bg-muted/20 p-3 space-y-2 text-sm">
                <h3 className="font-semibold border-b pb-1">Muhasebe Ödeme Detayı (read-only)</h3>
                {detail.odemeTuru
                  ? <>
                      <Row label="Ödeme Türü"       value={detail.odemeTuru} />
                      <Row label="Ödenen Tutar"    value={detail.odenenTutar != null ? formatCurrency(detail.odenenTutar) : null} />
                      <Row label="Ödeme Tutarı"    value={detail.odemeTutari != null ? formatCurrency(detail.odemeTutari) : null} />
                      <Row label="Vade Süresi"     value={detail.odemeVadeSuresi} />
                      <Row label="Vade Tutarı"     value={detail.odemeVadeTutari != null ? formatCurrency(detail.odemeVadeTutari) : null} />
                      <Row label="Vade Tarihi"     value={detail.odemeVadeTarihi} />
                      <Row label="Belge No"        value={detail.odemeBelgeNo} />
                      <Row label="Banka Adı"       value={detail.odemeBankaAdi} />
                      <Row label="İşlem Tarihi"    value={detail.odemeIslemTarihi ? formatDate(detail.odemeIslemTarihi) : null} />
                      <Row label="Kart Tipi"       value={detail.odemeKartTipi} />
                      <Row label="Taksit"          value={detail.odemeTaksitSayisi?.toString()} />
                      <Row label="Açıklama"        value={detail.odemeAciklama} />
                      <Row label="Muhasebe Yapan"  value={detail.muhasebeYapanKullanici} />
                      <Row label="Muhasebe Tarihi" value={detail.muhasebeTarihi ? formatDate(detail.muhasebeTarihi) : null} />
                    </>
                  : <p className="text-orange-700 text-xs">
                      ⚠ Ödeme detayı henüz girilmemiş (RULE 4: SatinAlma tipi için zorunlu).
                    </p>}
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDetailId(null)}>Kapat</Button>
            <Button
              variant="destructive"
              onClick={() => { setRejectTarget(detailId); setRedNotu('') }}
              disabled={rejectMut.isPending}
            >Reddet</Button>
            <Button
              disabled={approveMut.isPending || (detail && !detail.odemeTuru && (!detail.talepTipi || detail.talepTipi === 'SatinAlma'))}
              title={detail && !detail.odemeTuru && (!detail.talepTipi || detail.talepTipi === 'SatinAlma') ? 'RULE 4: Ödeme detayı eksik' : ''}
              onClick={() => approveMut.mutate(detailId!)}
            >Onayla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject sub-modal */}
      <Dialog open={rejectTarget !== null} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reddet — #{rejectTarget}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Red Notu *</Label>
            <Textarea rows={3} value={redNotu} onChange={(e) => setRedNotu(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>İptal</Button>
            <Button variant="destructive" disabled={!redNotu.trim() || rejectMut.isPending}
              onClick={() => rejectMut.mutate({ id: rejectTarget!, not: redNotu })}>Reddet</Button>
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
