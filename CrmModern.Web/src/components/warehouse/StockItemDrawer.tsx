import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StockStatusBadge } from './StockStatusBadge'
import {
  FileText,
  Download,
  Truck,
  RotateCcw,
  Calendar,
  Building,
  Hash,
  Scale,
  Package,
} from 'lucide-react'
import { downloadDeclarationDocument } from '@/api/warehouseStock'
import { formatDate } from '@/lib/utils'
import type { StockItemDetailDto } from '@/types'

interface StockItemDrawerProps {
  open: boolean
  detail: StockItemDetailDto | null
  loading?: boolean
  onClose: () => void
  onOpenExitDialog?: () => void
  onUndoExit?: (exitId: number) => Promise<void>
  undoingId?: number | null
  canMutate?: boolean
}

export function StockItemDrawer({
  open,
  detail,
  loading = false,
  onClose,
  onOpenExitDialog,
  onUndoExit,
  undoingId = null,
  canMutate = false,
}: StockItemDrawerProps) {
  const { t } = useTranslation()

  if (!open || !detail) return null

  const item = detail.item
  const beyanname = detail.beyanname
  const cikislar = detail.cikislar

  const handleDownloadDoc = async () => {
    if (beyanname) {
      await downloadDeclarationDocument(beyanname.id, beyanname.belgeAdi ?? undefined)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent size="lg" className="p-6 max-h-[92vh] flex flex-col">
        <DialogHeader className="shrink-0 border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={item.konum === 'Antrepo' ? 'info' : 'secondary'}
                  className="px-2 py-0.5 text-xs font-semibold"
                >
                  {item.konum}
                </Badge>
                <StockStatusBadge
                  status={item.durum}
                  exitedQuantity={item.miktar - item.kalan}
                  unit={item.birim}
                />
              </div>
              <DialogTitle className="text-lg font-bold mt-1.5 text-foreground">
                {item.malAdi}
              </DialogTitle>
              {item.beyannameNo && (
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  Beyanname No: <span className="text-foreground font-semibold">{item.beyannameNo}</span>
                </p>
              )}
            </div>

            {/* Kalan Stok Göstergesi */}
            <div className="text-right shrink-0 bg-muted/60 px-4 py-2 rounded-lg border">
              <span className="text-2xs uppercase tracking-wide text-muted-foreground block font-medium">
                Kalan Stok
              </span>
              <span className="text-base font-bold text-foreground tabular-nums">
                {item.kalan} / {item.miktar} {item.birim}
              </span>
              {item.kapAdedi != null && (
                <span className="text-xs text-muted-foreground block font-normal">
                  {item.kalanKap ?? 0} / {item.kapAdedi} {item.kapCinsi ?? 'kap'}
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-1 space-y-5 py-3">
          {/* Kalem ve Beyanname Özeti */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Sol Kart: Mal Özellikleri */}
            <div className="rounded-lg border bg-card p-3.5 space-y-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5 pb-1 border-b">
                <Package className="h-3.5 w-3.5 text-primary" />
                Mal Özellikleri
              </span>
              <div className="space-y-1.5 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Ölçü Birimi:</span>
                  <span className="font-medium text-foreground">{item.birim}</span>
                </div>
                {item.kapCinsi && (
                  <div className="flex justify-between">
                    <span>Kap Cinsi:</span>
                    <span className="font-medium text-foreground">{item.kapCinsi}</span>
                  </div>
                )}
                {detail.gtip && (
                  <div className="flex justify-between">
                    <span>GTİP Kodu:</span>
                    <span className="font-medium font-mono text-foreground">{detail.gtip}</span>
                  </div>
                )}
                {detail.menseUlke && (
                  <div className="flex justify-between">
                    <span>Menşe Ülke:</span>
                    <span className="font-medium text-foreground">{detail.menseUlke}</span>
                  </div>
                )}
                {(detail.netKg != null || detail.brutKg != null) && (
                  <div className="flex justify-between">
                    <span>Ağırlık (Net / Brüt):</span>
                    <span className="font-medium text-foreground">
                      {detail.netKg ?? '—'} kg / {detail.brutKg ?? '—'} kg
                    </span>
                  </div>
                )}
                {item.ticariTanim && (
                  <div className="pt-1 text-2xs text-muted-foreground border-t">
                    <span className="font-medium text-foreground block">Ticari Tanım:</span>
                    {item.ticariTanim}
                  </div>
                )}
              </div>
            </div>

            {/* Sağ Kart: Beyanname & Belge Bilgileri */}
            <div className="rounded-lg border bg-card p-3.5 space-y-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5 pb-1 border-b">
                <Building className="h-3.5 w-3.5 text-primary" />
                Beyanname &amp; Belge
              </span>
              {beyanname ? (
                <div className="space-y-1.5 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Tescil Tarihi:</span>
                    <span className="font-medium text-foreground">
                      {beyanname.tescilTarihi ? formatDate(beyanname.tescilTarihi) : '—'}
                    </span>
                  </div>
                  {beyanname.gumrukIdaresi && (
                    <div className="flex justify-between">
                      <span>Gümrük İdaresi:</span>
                      <span className="font-medium text-foreground">{beyanname.gumrukIdaresi}</span>
                    </div>
                  )}
                  {beyanname.gonderici && (
                    <div className="flex justify-between">
                      <span>Gönderici:</span>
                      <span className="font-medium text-foreground truncate max-w-[150px]">
                        {beyanname.gonderici}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Giriş Türü:</span>
                    <span className="font-medium text-foreground">{beyanname.kaynak}</span>
                  </div>

                  {beyanname.belgeVar && (
                    <div className="pt-2 border-t mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={handleDownloadDoc}
                        className="w-full gap-1.5 text-xs text-primary hover:text-primary"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Orijinal Beyannameyi Aç ({beyanname.belgeAdi || 'PDF'})</span>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground py-2 text-xs">
                  Bu kalem doğrudan elle kaydedilmiştir; bağlı gümrük beyannamesi bulunmamaktadır.
                </p>
              )}
            </div>
          </div>

          {/* Çıkış Hareketleri Geçmişi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                Çıkış Hareketleri ({cikislar.length})
              </h4>
              <span className="text-2xs text-muted-foreground">
                Geri alma süresi: 30 gün
              </span>
            </div>

            {cikislar.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                Bu maldan henüz herhangi bir yola çıkış hareketi yapılmamıştır.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b text-2xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Tarih</th>
                      <th className="py-2 px-3 font-semibold">Çıkan Miktar</th>
                      <th className="py-2 px-3 font-semibold">Çıkan Kap</th>
                      <th className="py-2 px-3 font-semibold">Plaka / Not</th>
                      <th className="py-2 px-3 font-semibold">İşlemi Yapan</th>
                      <th className="py-2 px-3 font-semibold text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cikislar.map((c) => {
                      const isUndone = c.geriAlinmaZamani != null
                      return (
                        <tr
                          key={c.id}
                          className={isUndone ? 'bg-muted/30 text-muted-foreground line-through decoration-1' : 'hover:bg-muted/20'}
                        >
                          <td className="py-2.5 px-3 whitespace-nowrap font-medium">
                            {formatDate(c.tarih)}
                          </td>
                          <td className="py-2.5 px-3 font-semibold tabular-nums text-foreground">
                            <span className={isUndone ? 'line-through' : ''}>
                              {c.miktar} {item.birim}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 tabular-nums">
                            {c.kapAdedi != null ? `${c.kapAdedi} ${item.kapCinsi ?? 'kap'}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 max-w-[140px] truncate" title={c.not ?? ''}>
                            {c.not ?? '—'}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {c.girenAd ?? 'Kullanıcı'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {isUndone ? (
                              <Badge variant="outline" className="text-2xs text-muted-foreground">
                                Geri Alındı
                              </Badge>
                            ) : c.geriAlinabilir && canMutate ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                loading={undoingId === c.id}
                                onClick={() => onUndoExit?.(c.id)}
                                className="h-6 px-2 text-2xs gap-1 text-danger hover:bg-destructive/10 hover:text-danger"
                                title="Çıkışı geri al (stok tekrar artar)"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Geri Al
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-2xs">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t pt-3 flex items-center justify-between sm:justify-between">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>

          {canMutate && item.kalan > 0 && (
            <Button
              type="button"
              onClick={() => {
                onClose()
                onOpenExitDialog?.()
              }}
              className="gap-1.5 font-semibold"
            >
              <Truck className="h-4 w-4" />
              <span>Araca Yükle / Çıkış Yap</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
