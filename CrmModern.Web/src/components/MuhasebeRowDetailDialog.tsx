import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getAccountingOrders, getTransactionsForOrder } from '@/api/accounting'
import { CancelTransactionDialog, CancelTxButton, type CancelTxTarget } from '@/components/CancelTransactionDialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { isAccountingApprover } from '@/lib/permissions'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
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

export function MuhasebeRowDetailDialog({ row: rowProp, onClose }: Props) {
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const canCancel = isAccountingApprover(getUser())
  const [cancelTarget, setCancelTarget] = useState<CancelTxTarget | null>(null)
  // rowProp açılıştaki anlık görüntü; tahsilat iptalinden sonra Kalan Bakiye /
  // Ödeme Durumu güncel görünsün diye liste cache'indeki satır tercih edilir.
  const { data: orders } = useQuery({
    queryKey: ['accounting-orders'],
    queryFn: getAccountingOrders,
    enabled: !!rowProp,
  })
  const row = rowProp && (orders?.find((o) => o.siparisNo === rowProp.siparisNo) ?? rowProp)
  const siparisNo = row?.siparisNo
  // Tahsilat Ekle modalıyla aynı ['order-tx', no] öneki — yeni tahsilat / iptalde
  // burası da yenilenir. İptaller de gelir (ayrı anahtar: o modal iptalleri almaz).
  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['order-tx', siparisNo, 'withCancelled'],
    queryFn: () => getTransactionsForOrder(siparisNo!, true),
    enabled: !!siparisNo,
  })
  const sortedTx = useMemo(
    () => [...transactions].sort((a, b) => (a.tarih ?? '').localeCompare(b.tarih ?? '')),
    [transactions],
  )
  // İptal edilen tahsilatlar üstü çizili görünür; sıra numarası ve toplama girmez.
  const activeIndex = useMemo(() => {
    const m = new Map<number, number>()
    sortedTx.filter((tx) => !tx.iptal).forEach((tx, i) => m.set(tx.id, i + 1))
    return m
  }, [sortedTx])
  const txTotal = sortedTx.reduce((sum, tx) => sum + (tx.iptal ? 0 : (tx.odenenMiktar ?? 0)), 0)
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
                {activeIndex.size > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">{activeIndex.size}</span>
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
                        {canCancel && <th className="w-8 px-1 py-1" />}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTx.map((tx) => (
                        <tr key={tx.id}
                          className={cn('border-t', tx.iptal && 'text-muted-foreground line-through')}
                          title={tx.iptal ? t('accApproval.cancelTx.cancelledInfo', {
                            kim: tx.iptalKullaniciAdSoyad ?? '—',
                            tarih: tx.iptalTarihi ? formatDate(tx.iptalTarihi) : '—',
                          }) : undefined}>
                          <td className="px-2 py-1 text-muted-foreground tabular-nums">
                            {tx.iptal
                              ? <span className="inline-block text-[10px] font-medium text-destructive">{t('accApproval.cancelTx.badge')}</span>
                              : activeIndex.get(tx.id)}
                          </td>
                          <td className="px-2 py-1">{formatDate(tx.tarih)}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{formatCurrency(tx.odenenMiktar ?? 0, row.paraTipi)}</td>
                          {canCancel && (
                            <td className="px-1 py-0.5 text-center">
                              {!tx.iptal && (
                                <CancelTxButton onClick={() => setCancelTarget({
                                  ...tx, paraTipi: row.paraTipi, kalanBakiye: row.kalanBakiye ?? 0,
                                })} />
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/30 font-semibold">
                        <td className="px-2 py-1" colSpan={2}>{t('accountingHistory.cols.toplamTahsilat')}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{formatCurrency(txTotal, row.paraTipi)}</td>
                        {canCancel && <td />}
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
        {/* İç içe dialog: üstteki katman dış tıklamaları alır, bu dialog kapanmaz. */}
        <CancelTransactionDialog target={cancelTarget} onClose={() => setCancelTarget(null)} />
      </DialogContent>
    </Dialog>
  )
}
