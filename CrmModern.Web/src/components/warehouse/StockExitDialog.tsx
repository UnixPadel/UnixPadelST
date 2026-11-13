import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/DecimalInput'
import { FormField } from '@/components/ui/form-field'
import { Badge } from '@/components/ui/badge'
import { Truck, Check, CornerDownLeft } from 'lucide-react'
import { localDateInput } from '@/lib/date'
import type { StockItemListDto, AddStockExitRequest } from '@/types'

interface StockExitDialogProps {
  item: StockItemListDto | null
  open: boolean
  onClose: () => void
  onConfirm: (req: AddStockExitRequest) => Promise<void>
  loading?: boolean
}

export function StockExitDialog({
  item,
  open,
  onClose,
  onConfirm,
  loading = false,
}: StockExitDialogProps) {
  const { t } = useTranslation()
  const [tamami, setTamami] = useState(true)
  const [miktar, setMiktar] = useState<number | ''>('')
  const [kapAdedi, setKapAdedi] = useState<number | ''>('')
  const [tarih, setTarih] = useState(localDateInput())
  const [not, setNot] = useState('')
  const [error, setError] = useState<string | null>(null)

  const miktarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && item) {
      setTamami(true)
      setMiktar('')
      setKapAdedi('')
      setTarih(localDateInput())
      setNot('')
      setError(null)
    }
  }, [open, item])

  useEffect(() => {
    if (!tamami) {
      setTimeout(() => {
        miktarInputRef.current?.focus()
      }, 50)
    }
  }, [tamami])

  if (!item) return null

  const kalan = item.kalan
  const birim = item.birim
  const kalanKap = item.kalanKap

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (loading) return

    setError(null)

    if (!tamami) {
      if (miktar === '' || miktar <= 0) {
        setError('Çıkan miktar 0\'dan büyük olmalıdır.')
        return
      }
      if (miktar > kalan) {
        setError(`Çıkan miktar kalan miktardan (${kalan} ${birim}) fazla olamaz.`)
        return
      }
      if (kapAdedi !== '' && kapAdedi < 0) {
        setError('Kap adedi eksi olamaz.')
        return
      }
      if (kapAdedi !== '' && kalanKap != null && kapAdedi > kalanKap) {
        setError(`Çıkan kap kalan kaptan (${kalanKap}) fazla olamaz.`)
        return
      }
    }

    const payload: AddStockExitRequest = {
      tamami,
      miktar: tamami ? null : (miktar as number),
      kapAdedi: tamami ? null : (kapAdedi === '' ? null : (kapAdedi as number)),
      tarih: tarih ? tarih : null,
      not: not.trim() || null,
    }

    await onConfirm(payload)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose() }}>
      <DialogContent size="md" className="p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold leading-tight">
                Araca Yükle / Çıkış İşaretle
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.malAdi} · <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{item.konum}</Badge>
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Kalan stok bilgisi özet şeridi */}
        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-2.5 text-xs">
          <span className="text-muted-foreground font-medium">Mevcut Kalan Stok:</span>
          <span className="font-semibold text-foreground text-sm tabular-nums">
            {kalan} {birim}
            {kalanKap != null && (
              <span className="text-xs text-muted-foreground ml-1 font-normal">
                ({kalanKap} {item.kapCinsi ?? 'kap'})
              </span>
            )}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Çıkış tipi seçim alanı (Hick's Law - 2 net seçenek) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">
              Ne kadar mal çıktı?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setTamami(true); setError(null) }}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                  tamami
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                    : 'border-border bg-card hover:bg-accent/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-sm text-foreground">Tamamı çıktı</span>
                  {tamami && <Check className="h-4 w-4 text-primary" />}
                </div>
                <span className="text-xs text-muted-foreground mt-1 tabular-nums">
                  Kalanın tamamı: {kalan} {birim}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setTamami(false); setError(null) }}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                  !tamami
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                    : 'border-border bg-card hover:bg-accent/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-sm text-foreground">Bir kısmı çıktı</span>
                  {!tamami && <Check className="h-4 w-4 text-primary" />}
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  Miktarı belirterek düş
                </span>
              </button>
            </div>
          </div>

          {/* Bir kısmı çıktı seçilince açılan miktar alanı */}
          {!tamami && (
            <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/[0.02] space-y-3 animate-in fade-in-50 duration-150">
              <FormField
                label={`Çıkan Miktar (${birim})`}
                required
                hint={`En fazla ${kalan} ${birim} girilebilir.`}
              >
                <div className="flex gap-2">
                  <DecimalInput
                    ref={miktarInputRef}
                    value={miktar}
                    onValueChange={(val) => { setMiktar(val); setError(null) }}
                    placeholder={`Örn: ${Math.min(2, kalan)}`}
                    className="h-10 text-base font-medium tabular-nums"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 h-10 px-3 text-xs"
                    onClick={() => setMiktar(kalan)}
                  >
                    Tümü
                  </Button>
                </div>
              </FormField>

              {kalanKap != null && kalanKap > 0 && (
                <FormField
                  label={`Çıkan Kap Adedi (${item.kapCinsi ?? 'kap'})`}
                  hint={`İsteğe bağlı. En fazla ${kalanKap} ${item.kapCinsi ?? 'kap'}.`}
                >
                  <DecimalInput
                    value={kapAdedi}
                    onValueChange={(val) => { setKapAdedi(val); setError(null) }}
                    placeholder={`Örn: 1`}
                    className="h-9 tabular-nums"
                  />
                </FormField>
              )}
            </div>
          )}

          {/* Tarih ve Not alanları */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <FormField label="Çıkış Tarihi">
              <Input
                type="date"
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
                className="h-9 text-xs"
              />
            </FormField>

            <FormField label="Not / Araç Plakası" hint="İsteğe bağlı (örn: 34 AB 1234)">
              <Input
                value={not}
                onChange={(e) => setNot(e.target.value)}
                placeholder="Plaka veya teslim notu"
                className="h-9 text-xs"
              />
            </FormField>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive font-medium border border-destructive/20 animate-in fade-in-50">
              {error}
            </div>
          )}

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="h-10"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              loading={loading}
              className="h-10 px-5 gap-1.5 font-semibold"
            >
              <span>Çıkışı Kaydet</span>
              <CornerDownLeft className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
