import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
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
  return (
    <Dialog open={!!row} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Talep Detayları</DialogTitle></DialogHeader>
        {row && (
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            <Row label="Sipariş No"      value={row.siparisNo} />
            <Row label="Müşteri Adı"     value={row.musteriAd} />
            <Row label="Ülke"            value={row.mUlke ?? '—'} />
            <Row label="Şirket"          value={row.sirket ?? '—'} />
            <Row label="Aşama"           value={row.siparisMiTeklifMi} />
            <Row label="Tarih"           value={formatDate(row.tarih)} />
            <Row label="Para Tipi"       value={row.paraTipi} />
            <div className="my-2 border-t" />
            <Row label="Toplam Sipariş"  value={formatCurrency(row.toplamFiyat ?? 0, row.paraTipi)} />
            <Row label="Kapora Bakiyesi" value={formatCurrency(row.kaparoFiyat ?? 0, row.paraTipi)} />
            <Row label="Kalan Bakiye"    value={formatCurrency(row.kalanBakiye ?? 0, row.paraTipi)} />
            <Row label="Peşin Yüzde"     value={`%${row.pesinYuzde}`} />
            <Row label="Teslimat Çeşidi" value={row.teslimatCesiti ?? '—'} />
            <Row label="Ödeme Durumu"    value={row.odemeDurum ?? '—'} />
            {row.maliyet != null && (
              <Row label="Maliyet" value={formatCurrency(row.maliyet, row.paraTipi)} />
            )}
            {row.kar != null && (
              <Row label="Kar" value={formatCurrency(row.kar, row.paraTipi)} />
            )}
            {row.maliyetDetayi && (
              <>
                <div className="my-2 border-t" />
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Maliyet Notu</span>
                  <p className="text-sm whitespace-pre-wrap rounded border bg-muted/30 p-2">{row.maliyetDetayi}</p>
                </div>
              </>
            )}
            {row.muhasebeDurumu && (
              <>
                <div className="my-2 border-t" />
                <Row label="Muhasebe Durumu" value={row.muhasebeDurumu} />
                {row.muhasebeRedNotu && <Row label="Red Notu" value={row.muhasebeRedNotu} />}
              </>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Kapat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
