import { useTranslation } from 'react-i18next'
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
