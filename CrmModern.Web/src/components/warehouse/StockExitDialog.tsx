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
  const konumLabel = (value: string) =>
    value === 'Antrepo' ? t('warehouse.location.antrepo') : value === 'Depo' ? t('warehouse.location.depo') : value
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
        setError(t('warehouse.exit.errors.quantityRequired'))
        return
      }
      if (miktar > kalan) {
        setError(t('warehouse.exit.errors.quantityTooHigh', { quantity: kalan, unit: birim }))
        return
      }
      if (kapAdedi !== '' && kapAdedi < 0) {
        setError(t('warehouse.exit.errors.packageNegative'))
        return
      }
      if (kapAdedi !== '' && kalanKap != null && kapAdedi > kalanKap) {
        setError(t('warehouse.exit.errors.packageTooHigh', { max: kalanKap }))
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
                {t('warehouse.exit.title')}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.malAdi} · <Badge variant="outline" className="px-1.5 py-0 text-2xs">{konumLabel(item.konum)}</Badge>
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Kalan stok bilgisi özet şeridi */}
        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-2.5 text-xs">
          <span className="text-muted-foreground font-medium">{t('warehouse.exit.remainingStock')}</span>
          <span className="font-semibold text-foreground text-sm tabular-nums">
            {kalan} {birim}
            {kalanKap != null && (
              <span className="text-xs text-muted-foreground ml-1 font-normal">
                ({kalanKap} {item.kapCinsi ?? t('warehouse.packageUnit', { count: kalanKap })})
              </span>
            )}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Çıkış tipi seçim alanı (Hick's Law - 2 net seçenek) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">
              {t('warehouse.exit.howMuch')}
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
                  <span className="font-semibold text-sm text-foreground">{t('warehouse.exit.allExited')}</span>
                  {tamami && <Check className="h-4 w-4 text-primary" />}
                </div>
                <span className="text-xs text-muted-foreground mt-1 tabular-nums">
                  {t('warehouse.exit.allRemaining', { quantity: kalan, unit: birim })}
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
                  <span className="font-semibold text-sm text-foreground">{t('warehouse.exit.partExited')}</span>
                  {!tamami && <Check className="h-4 w-4 text-primary" />}
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {t('warehouse.exit.partHint')}
                </span>
              </button>
            </div>
          </div>

          {/* Bir kısmı çıktı seçilince açılan miktar alanı */}
          {!tamami && (
            <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/[0.02] space-y-3 animate-in fade-in-50 duration-150">
              <FormField
                label={t('warehouse.exit.quantityLabel', { unit: birim })}
                required
                hint={t('warehouse.exit.quantityHint', { quantity: kalan, unit: birim })}
              >
                <div className="flex gap-2">
                  <DecimalInput
                    ref={miktarInputRef}
                    value={miktar}
                    onValueChange={(val) => { setMiktar(val); setError(null) }}
                    placeholder={t('warehouse.exit.examplePlaceholder', { value: Math.min(2, kalan) })}
                    className="h-10 text-base font-medium tabular-nums"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 h-10 px-3 text-xs"
                    onClick={() => setMiktar(kalan)}
                  >
                    {t('common.all')}
                  </Button>
                </div>
              </FormField>

              {kalanKap != null && kalanKap > 0 && (
                <FormField
                  label={t('warehouse.exit.packageLabel', { unit: item.kapCinsi ?? t('warehouse.packageUnit', { count: kalanKap }) })}
                  hint={t('warehouse.exit.packageHint', { max: kalanKap, unit: item.kapCinsi ?? t('warehouse.packageUnit', { count: kalanKap }) })}
                >
                  <DecimalInput
                    value={kapAdedi}
                    onValueChange={(val) => { setKapAdedi(val); setError(null) }}
                    placeholder={t('warehouse.exit.examplePlaceholder', { value: 1 })}
                    className="tabular-nums"
                  />
                </FormField>
              )}
            </div>
          )}

          {/* Tarih ve Not alanları */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <FormField label={t('warehouse.exit.date')}>
              <Input
                type="date"
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
                className="text-xs"
              />
            </FormField>

            <FormField label={t('warehouse.exit.noteLabel')} hint={t('warehouse.exit.noteHint')}>
              <Input
                value={not}
                onChange={(e) => setNot(e.target.value)}
                placeholder={t('warehouse.exit.notePlaceholder')}
                className="text-xs"
              />
            </FormField>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-danger font-medium border border-destructive/20 animate-in fade-in-50">
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
              <span>{t('warehouse.exit.save')}</span>
              <CornerDownLeft className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
