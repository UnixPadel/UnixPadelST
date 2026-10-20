import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getTransactionsForOrder } from '@/api/accounting'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { statusLabel } from '@/lib/status'
import type { AccountingOrderListDto } from '@/types'

/**
 * PROMPT.md ACCOUNTING #14: legacy Muhasebe.cs `siparisAlDataGrid_CellDoubleClick`
 * (lines 84-148) — MessageBox with a labeled dump of the row. Replaced here
 * with a small dialog. Optional sections (Maliyet, Kar, Muhasebe Durumu)
 * only render when those fields are populated, matching the original
 * `if (!string.IsNullOrEmpty(...))` guards.
 *
 * Muhasebe Geçmişi bölümü: Muhasebe onay ekranındaki "Muhasebe Geçmişi"
 * sekmesiyle aynı kaynak (MuhasebeIslemTablo — getTransactionsForOrder);
 * finansal blokların hemen altında, kronolojik + toplam satırıyla.
 */
interface Props {
  row: AccountingOrderListDto | null
  onClose: () => void
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium break-words">{value}</span>
  </div>
)

export function MuhasebeRowDetailDialog({ row, onClose }: Props) {
  const { t } = useTranslation()
  const siparisNo = row?.siparisNo
  // Tahsilat Ekle modalıyla aynı queryKey — yeni tahsilat kaydında burası da yenilenir.
  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['order-tx', siparisNo],
    queryFn: () => getTransactionsForOrder(siparisNo!),
    enabled: !!siparisNo,
  })
  const sortedTx = useMemo(
    () => [...transactions].sort((a, b) => (a.tarih ?? '').localeCompare(b.tarih ?? '')),
    [transactions],
  )
  const txTotal = sortedTx.reduce((sum, tx) => sum + (tx.odenenMiktar ?? 0), 0)
  return (
    <Dialog open={!!row} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t('accounting.rowDetailTitle')}</DialogTitle></DialogHeader>
        {row && (
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            <Row label={t('common.orderNo')}            value={row.siparisNo} />
            <Row label={t('qc.grid.musteriAd')}         value={row.musteriAd} />
            <Row label={t('common.country')}            value={row.mUlke ?? '—'} />
            <Row label={t('orders.form.sirket')}        value={row.sirket ?? '—'} />
            <Row label={t('common.stage')}              value={statusLabel(t, row.siparisMiTeklifMi)} />
            <Row label={t('common.date')}               value={formatDate(row.tarih)} />
            <Row label={t('qc.grid.paraTipi')}          value={row.paraTipi} />
            <div className="my-2 border-t" />
            <Row label={t('qc.grid.toplamSiparis')}     value={formatCurrency(row.toplamFiyat ?? 0, row.paraTipi)} />
            <Row label={t('qc.grid.kaparoBakiyesi')}    value={formatCurrency(row.kaparoFiyat ?? 0, row.paraTipi)} />
            <Row label={t('qc.grid.kalanBakiye')}       value={formatCurrency(row.kalanBakiye ?? 0, row.paraTipi)} />
            <Row label={t('orderDetail.pesinYuzde')}    value={`%${row.pesinYuzde}`} />
            <Row label={t('qc.fields.teslimatCesidi')}  value={row.teslimatCesiti ?? '—'} />
            <Row label={t('qc.grid.odemeDurumu')}       value={row.odemeDurum ? statusLabel(t, row.odemeDurum) : '—'} />
            {row.maliyet != null && (
              <Row label={t('accountingFull.maliyet.maliyet')} value={formatCurrency(row.maliyet, row.paraTipi)} />
            )}
            {row.kar != null && (
              <Row label={t('accountingFull.cols.kar')} value={formatCurrency(row.kar, row.paraTipi)} />
            )}

            {/* Muhasebe Geçmişi — girilen tahsilat bakiyeleri */}
            <div className="my-2 border-t" />
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">{t('qc.tabs.muhasebeGecmisi')}</span>
                {sortedTx.length > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">{sortedTx.length}</span>
                )}
              </div>
              <div className="rounded border">
                {txLoading ? (
                  <p className="p-2 text-xs text-muted-foreground">{t('common.loading')}</p>
                ) : sortedTx.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">{t('accounting.tahsilat.none')}</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="w-8 px-2 py-1 text-left font-medium">#</th>
                        <th className="px-2 py-1 text-left font-medium">{t('qc.tx.tarih')}</th>
                        <th className="px-2 py-1 text-right font-medium">{t('qc.tx.odenenBakiye')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTx.map((tx, i) => (
                        <tr key={tx.id} className="border-t">
                          <td className="px-2 py-1 text-muted-foreground tabular-nums">{i + 1}</td>
                          <td className="px-2 py-1">{formatDate(tx.tarih)}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{formatCurrency(tx.odenenMiktar ?? 0, row.paraTipi)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/30 font-semibold">
                        <td className="px-2 py-1" colSpan={2}>{t('accountingHistory.cols.toplamTahsilat')}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{formatCurrency(txTotal, row.paraTipi)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
            {row.maliyetDetayi && (
              <>
                <div className="my-2 border-t" />
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">{t('accountingFull.maliyet.notu')}</span>
                  <p className="text-sm whitespace-pre-wrap rounded border bg-muted/30 p-2">{row.maliyetDetayi}</p>
                </div>
              </>
            )}
            {row.muhasebeDurumu && (
              <>
                <div className="my-2 border-t" />
                <Row label={t('accountingFull.cols.muhasebeDurum')} value={row.muhasebeDurumu} />
                {row.muhasebeRedNotu && <Row label={t('orderDetail.redNotu')} value={row.muhasebeRedNotu} />}
              </>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
