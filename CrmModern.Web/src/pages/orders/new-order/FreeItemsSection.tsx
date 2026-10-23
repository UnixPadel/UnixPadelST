import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SectionTitle } from '@/components/ui/section-title'
import { FormField } from '@/components/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DecimalInput } from '@/components/DecimalInput'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { formatNumberTR } from '@/lib/number'
import type { FreeItemInput } from '@/types'

const BIRIMLER = ['Adet', 'Set', 'm²', 'kg', 'Metre', 'Paket']

/**
 * SR-1 — Serbest Metin / Özel Kalem bölümü + düzenleme penceresi.
 * F0-7: kalem tutarları bilgi amaçlıdır (toplam fiyata girmez).
 * Silme onaylıdır; pencerede Enter kaydeder.
 */
export function FreeItemsSection({
  items, onChange, sym,
}: {
  items: FreeItemInput[]
  onChange: (next: FreeItemInput[]) => void
  sym: string
}) {
  const { t } = useTranslation()
  const { confirm } = useConfirm()
  const [open, setOpen] = useState(false)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [draft, setDraft] = useState<FreeItemInput>({ bilesenAdi: '', adet: 1, fiyat: 0 })
  const [touched, setTouched] = useState(false)

  const openDialog = (idx?: number) => {
    if (idx !== undefined && items[idx]) { setDraft({ ...items[idx] }); setEditIdx(idx) }
    else { setDraft({ bilesenAdi: '', adet: 1, fiyat: 0 }); setEditIdx(null) }
    setTouched(false)
    setOpen(true)
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.bilesenAdi.trim()) { setTouched(true); return }
    const list = [...items]
    if (editIdx !== null) list[editIdx] = { ...draft }
    else list.push({ ...draft })
    onChange(list)
    setOpen(false)
  }

  const remove = async (idx: number) => {
    if (!(await confirm({ title: t('orders.form.freeItemRemoveTitle'), description: items[idx]?.bilesenAdi, destructive: true, confirmLabel: t('common.delete') }))) return
    onChange(items.filter((_, i) => i !== idx))
  }

  return (
    <section className="space-y-2 rounded-md border bg-card p-3">
      <SectionTitle className="border-b pb-2" actions={
        <Button type="button" variant="outline" size="xs" onClick={() => openDialog()}>
          <Plus className="h-3.5 w-3.5" /> {t('orders.form.ozelKalemEkle')}
        </Button>
      }>
        {t('orders.form.ozelKalemBaslik')}
      </SectionTitle>
      {items.length > 0 && (
        <div className="max-h-48 overflow-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted">
              <tr className="shadow-[inset_0_-1px_0_hsl(var(--border-strong))]">
                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">{t('orders.form.bilesenAdiLabel')}</th>
                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">{t('orders.form.oznitelik')}</th>
                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">{t('orders.form.birim')}</th>
                <th className="w-16 px-2 py-1.5 text-right font-medium text-muted-foreground">{t('orders.form.adet')}</th>
                <th className="w-24 px-2 py-1.5 text-right font-medium text-muted-foreground">{t('orders.form.birimFiyat')}</th>
                <th className="w-24 px-2 py-1.5 text-right font-medium text-muted-foreground" title={t('orders.form.infoOnlyHint')}>{t('orders.form.toplam')} <span className="font-normal">({t('orders.form.infoOnly')})</span></th>
                <th className="w-16 px-2 py-1.5"><span className="sr-only">{t('common.actions')}</span></th>
              </tr>
            </thead>
            <tbody className="[&>tr:nth-child(even)]:bg-muted/40">
              {items.map((fi, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-2 py-1">
                    {fi.bilesenAdi}
                    <Badge variant="warning" className="ml-1 px-1.5 py-0 text-[10px]">{t('orderDetail.ozelBadge')}</Badge>
                  </td>
                  <td className="px-2 py-1">{fi.oznitelikAdi || '—'}</td>
                  <td className="px-2 py-1">{fi.birim || '—'}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{fi.adet}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{formatNumberTR(fi.fiyat ?? 0)} {sym}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{formatNumberTR((fi.adet ?? 0) * (fi.fiyat ?? 0))}</td>
                  <td className="px-1 py-1 text-right">
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={t('common.edit')} onClick={() => openDialog(idx)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" aria-label={t('common.delete')} onClick={() => remove(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <form onSubmit={save} className="space-y-3">
            <DialogHeader>
              <DialogTitle>{t('orders.form.ozelKalemBaslik')}</DialogTitle>
            </DialogHeader>
            <FormField label={t('orders.form.bilesenAdiLabel')} required error={touched && !draft.bilesenAdi.trim() ? t('validation.required') : null}>
              <Input
                autoFocus
                value={draft.bilesenAdi}
                onChange={(e) => setDraft((d) => ({ ...d, bilesenAdi: e.target.value }))}
                placeholder={t('orders.form.bilesenAdiPlaceholder')}
              />
            </FormField>
            <FormField label={t('orders.form.oznitelik')}>
              <Input
                value={draft.oznitelikAdi ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, oznitelikAdi: e.target.value || undefined }))}
                placeholder={t('orders.form.oznitelikPlaceholder')}
              />
            </FormField>
            <div className="grid grid-cols-3 gap-2">
              <FormField label={t('orders.form.birim')}>
                <Select value={draft.birim ?? ''} onValueChange={(v) => setDraft((d) => ({ ...d, birim: v || undefined }))}>
                  <SelectTrigger><SelectValue placeholder={t('orders.form.birimSecin')} /></SelectTrigger>
                  <SelectContent>{BIRIMLER.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label={t('orders.form.adet')}>
                <Input
                  type="number" min={1}
                  value={draft.adet}
                  onChange={(e) => setDraft((d) => ({ ...d, adet: Math.max(1, Number(e.target.value) || 1) }))}
                />
              </FormField>
              <FormField label={t('orders.form.birimFiyat')} suffix={sym}>
                <DecimalInput
                  value={draft.fiyat ?? 0}
                  onValueChange={(v) => setDraft((d) => ({ ...d, fiyat: v === '' ? 0 : v }))}
                />
              </FormField>
            </div>
            <DialogFooter className="items-center gap-2 border-t pt-3 sm:justify-between">
              <span className="text-sm font-medium tabular-nums">
                {t('orders.form.toplam')}: {formatNumberTR((draft.adet ?? 0) * (draft.fiyat ?? 0))} {sym}
              </span>
              <Button type="submit" size="sm">
                {editIdx !== null ? t('common.save') : t('orders.form.ozelKalemEkle')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
