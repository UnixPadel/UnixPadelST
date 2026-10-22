import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getPendingPayment, getPurchaseById, setPaymentDetails,
  type SetPaymentDetailsRequest,
} from '@/api/purchase'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { PurchaseStatusBadge } from '@/components/PurchaseStatusBadge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAppMutation } from '@/hooks/useAppMutation'
import { PurchaseLinesTable } from '@/components/PurchaseLinesTable'
import { PurchaseAttachment } from '@/components/PurchaseAttachment'
import { DynamicPaymentForm } from '@/components/DynamicPaymentForm'
import { formatDate, formatCurrency } from '@/lib/utils'
import { localDateTimeInput } from '@/lib/date'
import type { PurchaseRequestListDto } from '@/types'

// Ödeme Detayı diyaloğu: seçilen ödeme türüne göre DynamicPaymentForm türe-özel
// kırılım alanlarını gösterir. Alt-alanlar zorunlu DEĞİLDİR — yalnız ödeme türü
// seçilmiş olmalı; alanlar boş bırakılsa da kayıt geçer (backend de gevşetildi).

// `yyyy-MM-ddTHH:mm` in the user's local time — shared helper (lib/date).
const nowForDatetimeLocal = () => localDateTimeInput()

const buildEmpty = (): SetPaymentDetailsRequest => ({
  odemeTuru: '',
  odemeIslemTarihi: nowForDatetimeLocal(),
})

export function PaymentDetailsPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  // E-10 — Bekleyen İşler "İşle" → ?sel=ID ile ödeme penceresi açık gelir.
  const [target, setTarget] = useState<number | null>(() => (params.get('sel') ? Number(params.get('sel')) : null))
  const [form, setForm] = useState<SetPaymentDetailsRequest>(buildEmpty())

  // Yalnız ödeme türü zorunlu; alt-alanlar opsiyonel.
  const valid = !!form.odemeTuru
  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!valid) return
    saveMut.mutate()
  }

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['payment-pending'], queryFn: getPendingPayment,
  })
  const { data: detail } = useQuery({
    queryKey: ['payment-detail', target],
    queryFn: () => getPurchaseById(target!),
    enabled: !!target,
  })

  const saveMut = useAppMutation({
    mutationFn: (_: void) => setPaymentDetails(target!, form),
    successTitle: t('purchase.payment.saved'),
    successDescription: () => '#' + target,
    errorTitle: t('common.failed'),
    onSuccess: () => { setTarget(null); setForm(buildEmpty()) },
  })

  const cols: Column<PurchaseRequestListDto & Record<string, unknown>>[] = [
    { key: 'talepID',       header: t('purchase.cols.id'), sortable: true },
    { key: 'urunAdi',       header: t('purchase.cols.urun') },
    { key: 'urunMaliyeti',  header: t('purchase.cols.maliyet'), type: 'money', sortable: true, render: (r) => formatCurrency((r.urunMaliyeti as number) ?? 0, (r.paraBirimi as string) ?? '') },
    { key: 'departman',     header: t('purchase.cols.departman'), render: (r) => r.departman ? t(`roles.${r.departman as string}`, { defaultValue: r.departman as string }) : '—' },
    { key: 'talepEdenKullaniciAdi', header: t('purchase.cols.talepEden') },
    { key: 'talepTarihi',   header: t('purchase.cols.tarih'), render: (r) => formatDate(r.talepTarihi as string) },
    { key: 'durum',         header: t('purchase.cols.durum'), render: (r) => <PurchaseStatusBadge value={r.durum as string} /> },
    {
      key: 'actions', header: t('purchase.cols.islem'),
      render: (r) => (
        <Button size="xs" onClick={() => { setTarget(r.talepID as number); setForm(buildEmpty()) }}>
          {t('purchase.payment.enter')}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title={t('purchase.payment.pageTitle')} />
      <div className="p-6">
        <DataTable
          tableId="payment-details"
          exportFileName="odeme-detay"
          columns={cols}
          data={pending as (PurchaseRequestListDto & Record<string, unknown>)[]}
          keyField="talepID"
          loading={isLoading}
          onRowActivate={(r) => { setTarget(r.talepID as number); setForm(buildEmpty()) }}
        />
      </div>

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) setTarget(null) }}>
        <DialogContent size="lg">
          <form onSubmit={onSubmit} className="space-y-3">
          <DialogHeader>
            <DialogTitle>{t('purchase.payment.dialogTitle', { id: target })}</DialogTitle>
          </DialogHeader>

          {!detail && <div className="h-24 animate-pulse rounded-md bg-muted" />}
          {detail && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">{t('purchase.detailPanel.urun')}:</span> {detail.urunAdi}</div>
                <div><span className="text-muted-foreground">{t('purchase.detailPanel.maliyet')}:</span> {formatCurrency(detail.urunMaliyeti ?? 0, detail.paraBirimi ?? '')}</div>
                <div><span className="text-muted-foreground">{t('purchase.detailPanel.departman')}:</span> {detail.departman}</div>
                <div><span className="text-muted-foreground">{t('purchase.detailPanel.talepEden')}:</span> {detail.talepEdenKullaniciAdi}</div>
                {detail.notlar && <div className="col-span-2"><span className="text-muted-foreground">{t('purchase.detailPanel.not')}:</span> {detail.notlar}</div>}
                {detail.onIzlemeYapan && <div className="col-span-2 text-xs text-info">{t('purchase.detailPanel.onOnaylayan')}: {detail.onIzlemeYapan} · {detail.onIzlemeTarihi ? formatDate(detail.onIzlemeTarihi) : ''}</div>}
              </div>
              {/* Round-9 §9 — kalem satırları (varsa) — FA ile aynı ortak tablo. */}
              {detail.kalemler && detail.kalemler.length > 0 && (
                <div className="mt-2 border-t pt-2">
                  <PurchaseLinesTable kalemler={detail.kalemler} paraBirimi={detail.paraBirimi} grandTotal={detail.urunMaliyeti ?? 0} hideMoney={false} />
                </div>
              )}
            </div>
          )}

          {detail && (
            <div>
              <PurchaseAttachment talepId={detail.talepID} />
            </div>
          )}

          {/* Türe göre kırılım alanları — hiçbiri zorunlu değil (yalnız ödeme türü). */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t('purchase.payment.heading')}</h3>
            <DynamicPaymentForm value={form} onChange={setForm} disabled={saveMut.isPending} />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setTarget(null)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={saveMut.isPending} disabled={!valid} title={valid ? undefined : t('purchase.payment.typeRequired')}>
              {t('common.save')}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
