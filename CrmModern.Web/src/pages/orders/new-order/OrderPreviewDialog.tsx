import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { KeyValue } from '@/components/ui/key-value'
import { SectionTitle } from '@/components/ui/section-title'
import { STANDART_DETAY_SARTLARI, isFreeNote } from '@/lib/clauses'
import { formatNumberTR } from '@/lib/number'
import type { OrderTotals, SetTabState } from '@/lib/orderForm'
import type { CreateOrderDto } from '@/types'

/**
 * Sipariş özeti önizlemesi — kaydetmeden önce nasıl oluştuğunu gösterir.
 * Ctrl+S bu pencereyi açar; kaydetme butonları alt çubuktadır (gözden geçir →
 * kaydet akışı, yanlışlıkla tek tuşla sipariş oluşmaz).
 */
export function OrderPreviewDialog({
  open, onOpenChange, form, tabs, totals, sym, footer,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  form: CreateOrderDto
  tabs: SetTabState[]
  totals: OrderTotals
  sym: string
  footer?: React.ReactNode
}) {
  const { t } = useTranslation()
  const m = (n: number) => `${formatNumberTR(n)} ${sym}`
  const sets = tabs.filter((tb) => tb.kategoriID)
  const sartlar = (form.details ?? []).filter((d) => STANDART_DETAY_SARTLARI.includes(d) || isFreeNote(d))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[88vh]">
        <DialogHeader>
          <DialogTitle>{t('orders.form.onizlemeBaslik')}</DialogTitle>
          <DialogDescription>{t('orders.form.onizlemeAciklama')}</DialogDescription>
        </DialogHeader>

        <section className="space-y-1.5 rounded-md border p-3">
          <KeyValue label={t('orders.form.musteri')} value={<span className="font-medium">{form.musteriAd}</span>} />
          <KeyValue label={t('orders.form.sirket')} value={form.sirket} />
          <KeyValue label={t('orders.form.paraTipi')} value={`${form.paraTipi} (${sym})`} />
          {[
            [t('orders.form.telefon'), form.mTelefon],
            [t('orders.form.email'), form.mMail],
            [t('orders.form.ulke'), form.mUlke],
            [t('orders.form.vat'), form.mVATNumarasi],
            [t('orders.form.adres'), form.mAdres],
          ].filter(([, v]) => (v ?? '').toString().trim().length > 0).map(([label, v]) => (
            <KeyValue key={label} label={label} value={v} />
          ))}
        </section>

        <section className="space-y-2">
          <SectionTitle as="h4">{t('orders.form.previewUrunler')}</SectionTitle>
          {sets.length === 0 && (form.freeItems ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('orders.form.previewBosUrun')}</p>
          ) : sets.map((tb, i) => (
            <div key={i} className="space-y-1 rounded-md border p-3 text-sm">
              <div className="flex justify-between gap-4 font-medium">
                <span>{tb.kategoriAdi || t('orders.form.anaUrun')}</span>
                <span className="tabular-nums">{tb.adet} × {m(tb.kategoriFiyat)} = {m(tb.kategoriFiyat * tb.adet)}</span>
              </div>
              {tb.components.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  {tb.components.map((c, j) => (
                    <li key={j} className="flex justify-between gap-4">
                      <span>• {c.bilesenAdi}{c.oznitelikSecili ? ` (${c.oznitelikSecili})` : ''}</span>
                      <span className="shrink-0 tabular-nums">{c.adet} {c.birim} × {m(c.birimFiyat)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {(form.freeItems ?? []).length > 0 && (
            <div className="space-y-0.5 rounded-md border p-3 text-xs text-muted-foreground">
              {(form.freeItems ?? []).map((fi, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span>• {fi.bilesenAdi}{fi.oznitelikAdi ? ` (${fi.oznitelikAdi})` : ''}</span>
                  <span className="tabular-nums">{fi.adet} {fi.birim ?? ''} × {m(fi.fiyat ?? 0)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {(form.montajVar || form.teslimatVar) && (
          <section className="space-y-1.5 rounded-md border p-3">
            <SectionTitle as="h4">{t('orders.form.previewMontajTeslimat')}</SectionTitle>
            {form.montajVar && <KeyValue label={t('orders.form.montaj')} value={<span className="tabular-nums">{form.mAdet} × {m(form.montajFiyat)} = {m(totals.montaj)}</span>} />}
            {form.teslimatVar && (
              <KeyValue
                label={`${t('orders.form.teslimat')}${form.teslimatCesiti ? ` (${form.teslimatCesiti})` : ''}`}
                value={<span className="tabular-nums">{form.mTeslimat} × {m(form.teslimatFiyat)} = {m(totals.teslimat)}</span>}
              />
            )}
          </section>
        )}

        <section className="space-y-1.5 rounded-md border p-3">
          <SectionTitle as="h4">{t('orders.form.previewFiyat')}</SectionTitle>
          <KeyValue label={t('orders.form.previewBrut')} value={<span className="tabular-nums">{m(totals.brut)}</span>} />
          {(form.indirim ?? 0) > 0 && <KeyValue label={`${t('orders.form.indirim')}`} value={<span className="tabular-nums">−{m(totals.indirimTutar)} (%{form.indirim})</span>} />}
          {(form.kdv ?? 0) > 0 && <KeyValue label={t('orders.form.kdv')} value={<span className="tabular-nums">+{m(totals.kdvTutar)} (%{form.kdv})</span>} />}
          {(form.extraCosts ?? []).filter((e) => (Number(e.tutar) || 0) > 0).map((e, i) => (
            <KeyValue key={i} label={`${t('orders.form.ekstraMaliyet')}${e.aciklama ? `: ${e.aciklama}` : ''}`} value={<span className="tabular-nums">{m(Number(e.tutar) || 0)}</span>} />
          ))}
          <KeyValue emphasis className="border-t pt-1.5" label={t('orders.form.toplamFiyatLabel')} value={<span className="tabular-nums">{m(totals.toplam)}</span>} />
          {(form.pesinYuzde ?? 0) > 0 && (
            <KeyValue label={`${t('orders.form.kaporaMiktari')} (%${form.pesinYuzde})`} value={<span className="tabular-nums">{m(totals.kapora)}</span>} />
          )}
        </section>

        {sartlar.length > 0 && (
          <section className="space-y-1">
            <SectionTitle as="h4">{t('orders.form.previewSartlar')}</SectionTitle>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
              {sartlar.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </section>
        )}

        {form.siparisNotu?.trim() && (
          <section className="space-y-1">
            <SectionTitle as="h4">{t('orders.form.siparisNotu')}</SectionTitle>
            <p className="whitespace-pre-wrap text-sm">{form.siparisNotu}</p>
          </section>
        )}

        {footer && <DialogFooter className="gap-2 border-t pt-3">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
