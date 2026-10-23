import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  getPendingFinal, getPurchaseById, finalApprovePurchase, finalRejectPurchase,
} from '@/api/purchase'
import { PageHeader } from '@/components/PageHeader'
import { FillPage, FillRegion } from '@/components/FillPage'
import { DataTable, type Column } from '@/components/DataTable'
import { PurchaseStatusBadge } from '@/components/PurchaseStatusBadge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useAppMutation } from '@/hooks/useAppMutation'
import { describeApiError } from '@/lib/axios'
import { invalidateOrderGraph } from '@/lib/queryKeys'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { hideMoneyFor } from '@/lib/visibility'
import { PurchaseLinesTable } from '@/components/PurchaseLinesTable'
import { KeyValue } from '@/components/ui/key-value'
import { PurchaseAttachment } from '@/components/PurchaseAttachment'
import { WaitingUpstreamPanel } from '@/components/WaitingUpstreamPanel'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { PurchaseRequestListDto } from '@/types'

export function FinalApprovalPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { getUser } = useAuth()
  // Round-11 §3 — omur.caliskan (Gozlemci) parasal değer görmez.
  const hideMoney = hideMoneyFor(getUser())
  const { askReason, confirm } = useConfirm()
  const [params] = useSearchParams()
  // E-10 — Bekleyen İşler "İşle" → ?sel=ID ile inceleme penceresi açık gelir.
  const [detailId, setDetailId] = useState<number | null>(() => (params.get('sel') ? Number(params.get('sel')) : null))
  const [selection, setSelection] = useState<(string | number)[]>([])
  const [bulkRunning, setBulkRunning] = useState(false)

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['final-pending'], queryFn: getPendingFinal,
  })
  const { data: detail } = useQuery({
    queryKey: ['final-detail', detailId],
    queryFn: () => getPurchaseById(detailId!),
    enabled: !!detailId,
  })

  const approveMut = useAppMutation({
    mutationFn: (id: number) => finalApprovePurchase(id),
    successTitle: t('purchase.final.approved'),
    successDescription: (_d, id) => '#' + id,
    errorTitle: t('purchase.final.approveFailed'),
    onSuccess: () => setDetailId(null),
  })

  const rejectMut = useAppMutation({
    mutationFn: ({ id, not }: { id: number; not: string }) => finalRejectPurchase(id, not),
    successTitle: t('purchase.final.rejected'),
    errorTitle: t('common.error'),
    onSuccess: () => setDetailId(null),
  })

  // Ret: ortak zorunlu gerekçe penceresi (önceden detay penceresinin üstünde ikinci pencere açılıyordu).
  const askReject = async (id: number) => {
    const not = await askReason({ title: t('purchase.reject.title', { id }), label: t('purchase.reject.note'), destructive: true, confirmLabel: t('common.reject') })
    if (not) rejectMut.mutate({ id, not })
  }

  // E-17 — toplu nihai onay (kural ihlali olan satırlar seçilemez).
  const bulkApprove = async (rows: PurchaseRequestListDto[]) => {
    if (!(await confirm({ title: t('purchase.final.bulkConfirm', { count: rows.length }), description: rows.map((r) => '#' + r.talepID + ' ' + r.urunAdi).join(', '), confirmLabel: t('common.approve') }))) return
    setBulkRunning(true)
    const failed: number[] = []
    let lastErr: unknown = null
    for (const r of rows) {
      try { await finalApprovePurchase(r.talepID) } catch (e) { failed.push(r.talepID); lastErr = e }
    }
    setBulkRunning(false)
    void invalidateOrderGraph(qc)
    setSelection(failed)
    toast({
      title: t('purchase.final.approved') + ' — ' + t('bulk.result', { ok: rows.length - failed.length, failed: failed.length }),
      description: failed.length ? describeApiError(lastErr) : undefined,
      variant: failed.length ? 'warning' : 'success',
    })
  }

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
    { key: 'talepID', pin: 'left', header: t('purchase.cols.id'), sortable: true },
    { key: 'urunAdi',       header: t('purchase.cols.urun') },
    ...(!hideMoney ? [
      { key: 'urunMaliyeti', header: t('purchase.cols.maliyet'), render: (r) => formatCurrency((r.urunMaliyeti as number) ?? 0, (r.paraBirimi as string) ?? '') },
    ] satisfies Column<PurchaseRequestListDto & Record<string, unknown>>[] : []),
    { key: 'departman',     header: t('purchase.cols.departman'), render: (r) => r.departman ? t(`roles.${r.departman as string}`, { defaultValue: r.departman as string }) : '—' },
    { key: 'talepTipi',     header: t('purchase.cols.tip'), render: (r) => t(`purchase.tipLabel.${(r.talepTipi as string) ?? 'SatinAlma'}`, { defaultValue: (r.talepTipi as string) ?? 'SatinAlma' }) },
    { key: 'talepEdenKullaniciAdi', header: t('purchase.cols.talepEden') },
    { key: 'talepTarihi',   header: t('purchase.cols.tarih'), render: (r) => formatDate(r.talepTarihi as string) },
    { key: 'durum',         header: t('purchase.cols.durum'), render: (r) => (
      <span className="flex items-center gap-1">
        <PurchaseStatusBadge value={r.durum as string} />
        {ruleBlocked(r as PurchaseRequestListDto) && <Badge variant="warning" title={t('purchase.final.ruleBlocked')}>{t('purchase.final.needsPayment')}</Badge>}
      </span>
    ) },
    {
      key: 'actions', pin: 'right', header: t('purchase.cols.islem'), hideable: false, exportValue: false,
      render: (r) => (
        <Button size="xs" variant="outline" onClick={() => setDetailId(r.talepID as number)}>
          {t('purchase.final.reviewApprove')}
        </Button>
      ),
    },
  ]

  return (
    // Scaling Faz 2 — FillPage: sayfa kaymaz, tablo kalan yüksekliği doldurur
    // (başlık + araç çubuğu yerinde kalır).
    <FillPage>
      <PageHeader density="compact" actions={<WaitingUpstreamPanel screen="final-approval" variant="button" />} title={t('approval.finalTitle')} />
      <FillRegion className="pt-2">
        <DataTable
          fill
          tableId="final-approval"
          exportFileName="nihai-onay"
          columns={cols}
          data={pending as (PurchaseRequestListDto & Record<string, unknown>)[]}
          keyField="talepID"
          loading={isLoading}
          onRowActivate={(r) => setDetailId(r.talepID as number)}
          selectable={(r) => !ruleBlocked(r as PurchaseRequestListDto)}
          selectedKeys={selection}
          onSelectionChange={setSelection}
          bulkActions={(rows) => (
            <Button size="xs" loading={bulkRunning} onClick={() => bulkApprove(rows as PurchaseRequestListDto[])}>
              <CheckCheck className="h-3.5 w-3.5" /> {t('purchase.final.bulkApprove', { count: rows.length })}
            </Button>
          )}
        />
      </FillRegion>

      {/* Detail + onay panel */}
      <Dialog open={!!detailId} onOpenChange={(o) => { if (!o) setDetailId(null) }}>
        <DialogContent size="lg" className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('purchase.final.reviewTitle', { id: detailId })}</DialogTitle>
          </DialogHeader>

          {!detail && <div className="h-40 animate-pulse rounded-md bg-muted" />}
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
                  : <p className="text-xs text-warning">
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
              onClick={() => askReject(detailId!)}
              loading={rejectMut.isPending}
              disabled={!detail}
            >{t('common.reject')}</Button>
            {/* Detay yüklenmeden onay verilemez (önceden detail undefined iken aktifti). */}
            <Button
              loading={approveMut.isPending}
              disabled={!detail || (!detail.odemeTuru && (!detail.talepTipi || detail.talepTipi === 'SatinAlma'))}
              title={detail && !detail.odemeTuru && (!detail.talepTipi || detail.talepTipi === 'SatinAlma') ? t('purchase.final.ruleBlocked') : ''}
              onClick={() => approveMut.mutate(detailId!)}
            >{t('common.approve')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </FillPage>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return <KeyValue label={label} value={value} className="justify-start [&>span:first-child]:min-w-32 [&>span:last-child]:text-left" />
}
