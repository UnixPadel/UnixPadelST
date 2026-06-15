import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getPendingPayment, getPurchaseById, setPaymentDetails,
  type SetPaymentDetailsRequest,
} from '@/api/purchase'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { PurchaseStatusBadge } from '@/components/PurchaseStatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { FieldError } from '@/components/FieldError'
import { ODEME_TURLERI } from '@/components/DynamicPaymentForm'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { PurchaseRequestListDto } from '@/types'

// PROMPT.md ACCOUNTING #10 (revised): "keep only the text `Ödeme Detayı`" +
// user follow-up: "keep odemeTuru as a single dropdown visible, no hardcoded
// default. Just drop the dynamic sub-fields underneath it."
//
// So this dialog now shows:
//   • Heading            "Ödeme Detayı"
//   • Ödeme Türü         dropdown (required)
//   • İşlem Tarihi       defaulted to DateTime.Now on open (task #11)
// No more amount / vade / kart-tipi sub-fields conditional on the type.

// `yyyy-MM-ddTHH:mm` in the user's local time, suitable for <input type="datetime-local" />.
function nowForDatetimeLocal(): string {
  const d = new Date()
  const tzOffsetMs = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16)
}

const buildEmpty = (): SetPaymentDetailsRequest => ({
  odemeTuru: '',
  odemeIslemTarihi: nowForDatetimeLocal(),
})

export function PaymentDetailsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [target, setTarget] = useState<number | null>(null)
  const [form, setForm] = useState<SetPaymentDetailsRequest>(buildEmpty())
  const [submitted, setSubmitted] = useState(false)

  const valid = !!form.odemeTuru
  const onSubmit = () => {
    setSubmitted(true)
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

  const saveMut = useMutation({
    mutationFn: () => setPaymentDetails(target!, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-pending'] })
      qc.invalidateQueries({ queryKey: ['preapproval'] })
      qc.invalidateQueries({ queryKey: ['final-pending'] })
      setTarget(null); setForm(buildEmpty()); setSubmitted(false)
      toast({ title: t('purchase.payment.saved') })
    },
    onError: (e: unknown) => toast({ title: t('common.failed'), description: (e as Error).message, variant: 'destructive' }),
  })

  const cols: Column<PurchaseRequestListDto & Record<string, unknown>>[] = [
    { key: 'talepID',       header: t('purchase.cols.id'), sortable: true },
    { key: 'urunAdi',       header: t('purchase.cols.urun') },
    { key: 'urunMaliyeti',  header: t('purchase.cols.maliyet'), render: (r) => formatCurrency((r.urunMaliyeti as number) ?? 0) },
    { key: 'departman',     header: t('purchase.cols.departman'), render: (r) => r.departman ? t(`roles.${r.departman as string}`, { defaultValue: r.departman as string }) : '—' },
    { key: 'talepEdenKullaniciAdi', header: t('purchase.cols.talepEden') },
    { key: 'talepTarihi',   header: t('purchase.cols.tarih'), render: (r) => formatDate(r.talepTarihi as string) },
    { key: 'durum',         header: t('purchase.cols.durum'), render: (r) => <PurchaseStatusBadge value={r.durum as string} /> },
    {
      key: 'actions', header: t('purchase.cols.islem'),
      render: (r) => (
        <Button size="sm" onClick={() => { setTarget(r.talepID as number); setForm(buildEmpty()); setSubmitted(false) }}>
          {t('purchase.payment.enter')}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title={t('purchase.payment.pageTitle')} />
      <div className="p-6">
        <DataTable columns={cols} data={pending as (PurchaseRequestListDto & Record<string, unknown>)[]} keyField="talepID" loading={isLoading} />
      </div>

      <Dialog open={!!target} onOpenChange={() => setTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('purchase.payment.dialogTitle', { id: target })}</DialogTitle>
          </DialogHeader>

          {detail && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1 mb-3">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">{t('purchase.detailPanel.urun')}:</span> {detail.urunAdi}</div>
                <div><span className="text-muted-foreground">{t('purchase.detailPanel.maliyet')}:</span> {formatCurrency(detail.urunMaliyeti ?? 0)}</div>
                <div><span className="text-muted-foreground">{t('purchase.detailPanel.departman')}:</span> {detail.departman}</div>
                <div><span className="text-muted-foreground">{t('purchase.detailPanel.talepEden')}:</span> {detail.talepEdenKullaniciAdi}</div>
                {detail.notlar && <div className="col-span-2"><span className="text-muted-foreground">{t('purchase.detailPanel.not')}:</span> {detail.notlar}</div>}
                {detail.onIzlemeYapan && <div className="col-span-2 text-xs text-blue-700">{t('purchase.detailPanel.onOnaylayan')}: {detail.onIzlemeYapan} · {detail.onIzlemeTarihi ? formatDate(detail.onIzlemeTarihi) : ''}</div>}
              </div>
            </div>
          )}

          {/* PROMPT.md ACCOUNTING #10 (revised): heading + Ödeme Türü dropdown +
              İşlem Tarihi (defaults to DateTime.Now — task #11). No sub-fields. */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">{t('purchase.payment.heading')}</h3>
            <div className="space-y-1">
              <Label>{t('purchase.payment.odemeTuru')}</Label>
              <Select
                value={form.odemeTuru}
                onValueChange={(s) => setForm((f) => ({ ...f, odemeTuru: s }))}
                disabled={saveMut.isPending}
              >
                <SelectTrigger><SelectValue placeholder={t('purchase.payment.selectPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {ODEME_TURLERI.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              {submitted && !form.odemeTuru && <FieldError message={t('validation.required')} />}
            </div>
            <div className="space-y-1">
              <Label>{t('purchase.payment.islemTarihi')}</Label>
              <Input
                type="datetime-local"
                value={form.odemeIslemTarihi ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, odemeIslemTarihi: e.target.value || undefined }))}
                disabled={saveMut.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>{t('common.cancel')}</Button>
            <Button disabled={saveMut.isPending} onClick={onSubmit}>
              {saveMut.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
