import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createPurchaseRequest } from '@/api/purchase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/DecimalInput'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FieldError } from '@/components/FieldError'
import { useToast } from '@/components/ToastProvider'
import { formatCurrency } from '@/lib/utils'
import type { CreatePurchaseRequestLine } from '@/types'

// Round-9 §9 — birim dropdown'u + "Diğer" serbest-metin alternatifi.
const UNITS = ['Adet', 'Kg', 'Gram', 'Ton', 'Metre', 'm²', 'm³', 'Litre', 'Paket', 'Kutu', 'Koli', 'Rulo', 'Set'] as const
const OTHER_UNIT = '__other__'

// Round-11 §9 — belge düzeyinde para birimi. Değerler app paraTipi sözlüğüyle
// uyumlu (formatCurrency simgeleri tanır); etiketler ISO koduyla gösterilir.
const PARA_BIRIMLERI = [
  { value: 'Euro',    label: 'EUR (€)' },
  { value: 'Dolar',   label: 'USD ($)' },
  { value: 'TL',      label: 'TRY (₺)' },
  { value: 'Sterlin', label: 'GBP (£)' },
] as const

/**
 * Round-11 §9 — temiz ERP satırı: Ürün / Miktar / Birim / Birim Fiyat / İndirim.
 *   Ara Toplam   = Miktar × Birim Fiyat
 *   Satır Toplamı = Ara Toplam − İndirim   (İndirim, talep para biriminde tutar)
 * Eski fiyatModu (miktar/toplam) geçişi kaldırıldı; backend kalemleri her zaman
 * fiyatModu='miktar', indirimTipi='tutar' olarak alır.
 */
interface LineRow {
  id: number
  urunAdi: string
  birimChoice: string   // UNITS değeri | OTHER_UNIT
  birimOther: string
  miktar: number | null
  birimFiyat: number | null
  indirim: number | null   // tutar (talep para biriminde)
}

let _seq = 1
const blankRow = (): LineRow => ({
  id: _seq++,
  urunAdi: '', birimChoice: 'Adet', birimOther: '',
  miktar: 1, birimFiyat: null, indirim: null,
})

const resolveBirim = (r: LineRow) => (r.birimChoice === OTHER_UNIT ? r.birimOther.trim() : r.birimChoice)
const araToplam = (r: LineRow): number => (r.miktar ?? 0) * (r.birimFiyat ?? 0)
const lineTotal = (r: LineRow): number => Math.max(araToplam(r) - (r.indirim ?? 0), 0)

const lineValid = (r: LineRow): boolean =>
  !!(r.urunAdi.trim() && resolveBirim(r) && (r.miktar ?? 0) > 0 && (r.birimFiyat ?? 0) > 0)

export function NewPurchaseRequestPage() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const user = getUser()

  const [rows, setRows] = useState<LineRow[]>([blankRow()])
  const [paraBirimi, setParaBirimi] = useState<string>('Euro')
  const [alinanYer, setAlinanYer] = useState('')
  const [notlar, setNotlar] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const departman = user?.yetkiTuru ?? ''

  const patchRow = (id: number, patch: Partial<LineRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const addRow = () => setRows((rs) => [...rs, blankRow()])
  const removeRow = (id: number) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs))

  const grandTotal = rows.reduce((acc, r) => acc + lineTotal(r), 0)
  const filledRows = rows.filter((r) => r.urunAdi.trim() || (r.miktar ?? 0) > 0 || (r.birimFiyat ?? 0) > 0)
  const valid = !!(alinanYer.trim() && filledRows.length > 0 && filledRows.every(lineValid))

  const createMut = useMutation({
    mutationFn: () => {
      const kalemler: CreatePurchaseRequestLine[] = filledRows.map((r) => ({
        urunAdi: r.urunAdi.trim(),
        birim: resolveBirim(r),
        miktar: r.miktar ?? 0,
        birimFiyat: r.birimFiyat ?? 0,
        toplam: lineTotal(r),
        indirim: r.indirim ?? null,
        indirimTipi: 'tutar',
        fiyatModu: 'miktar',
      }))
      // Parent UrunAdi: ilk kalem + (varsa) "+N kalem" özeti (NOT NULL, ≤500).
      const first = kalemler[0]?.urunAdi ?? ''
      const summary = kalemler.length > 1
        ? `${first} (${t('purchase.summarySuffix', { count: kalemler.length - 1 })})`
        : first
      return createPurchaseRequest({
        urunAdi: summary.slice(0, 500),
        urunMaliyeti: grandTotal,
        paraBirimi,
        alinanYer: alinanYer.trim() || undefined,
        notlar: notlar || undefined,
        talepEdenKullaniciAdi: user!.kullaniciAdi,
        departman,
        talepTipi: 'SatinAlma',
        kalemler,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-mine'] })
      toast({ title: t('purchase.createSuccess') })
      nav('/purchase/mine')
    },
    onError: () => toast({ title: t('purchase.createError'), variant: 'destructive' }),
  })

  const onSubmit = () => {
    setSubmitted(true)
    if (!valid) return
    createMut.mutate()
  }

  return (
    <div>
      <PageHeader title={t('purchase.newTitle')} />
      <div className="p-4 lg:p-6 max-w-5xl space-y-4">

        {/* Para birimi (belge düzeyinde, tek) */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 w-48">
            <Label>{t('purchase.paraBirimi')} *</Label>
            <Select value={paraBirimi} onValueChange={setParaBirimi}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PARA_BIRIMLERI.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground pb-2">{t('purchase.paraBirimiHint')}</p>
        </div>

        {/* Kalemler tablosu */}
        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h3 className="text-sm font-semibold">{t('purchase.lines.title')}</h3>
            <Button size="sm" variant="outline" onClick={addRow}>{t('purchase.lines.ekle')}</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase">
                <tr>
                  <th className="px-2 py-2 text-left min-w-44">{t('purchase.lines.urunAdi')} *</th>
                  <th className="px-2 py-2 text-left w-32">{t('purchase.lines.birim')} *</th>
                  <th className="px-2 py-2 text-right w-24">{t('purchase.lines.miktar')} *</th>
                  <th className="px-2 py-2 text-right w-32">{t('purchase.lines.birimFiyat')} *</th>
                  <th className="px-2 py-2 text-right w-28">{t('purchase.lines.indirim')}</th>
                  <th className="px-2 py-2 text-right w-32">{t('purchase.lines.araToplam')}</th>
                  <th className="px-2 py-2 text-right w-32">{t('purchase.lines.satirToplam')}</th>
                  <th className="px-2 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const invalid = submitted && (r.urunAdi.trim() || (r.miktar ?? 0) > 0) ? !lineValid(r) : false
                  return (
                    <tr key={r.id} className="border-t align-top">
                      <td className="px-2 py-1.5">
                        <Input value={r.urunAdi} onChange={(e) => patchRow(r.id, { urunAdi: e.target.value })} />
                        {invalid && <FieldError message={t('validation.required')} />}
                      </td>
                      <td className="px-2 py-1.5">
                        <Select value={r.birimChoice} onValueChange={(v) => patchRow(r.id, { birimChoice: v })}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            <SelectItem value={OTHER_UNIT}>{t('purchase.lines.birimOther')}</SelectItem>
                          </SelectContent>
                        </Select>
                        {r.birimChoice === OTHER_UNIT && (
                          <Input className="mt-1" value={r.birimOther}
                            onChange={(e) => patchRow(r.id, { birimOther: e.target.value })}
                            placeholder={t('purchase.lines.birim')} />
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <DecimalInput className="text-right" value={r.miktar ?? ''}
                          onValueChange={(v) => patchRow(r.id, { miktar: v === '' ? null : v })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <DecimalInput className="text-right" value={r.birimFiyat ?? ''}
                          onValueChange={(v) => patchRow(r.id, { birimFiyat: v === '' ? null : v })}
                          placeholder={t('purchase.lines.birimFiyat')} />
                      </td>
                      <td className="px-2 py-1.5">
                        <DecimalInput className="text-right" value={r.indirim ?? ''}
                          onValueChange={(v) => patchRow(r.id, { indirim: v === '' ? null : v })}
                          placeholder="0" />
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                        {formatCurrency(araToplam(r), paraBirimi)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-medium whitespace-nowrap">
                        {formatCurrency(lineTotal(r), paraBirimi)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <Button size="sm" variant="ghost" className="text-destructive"
                          disabled={rows.length <= 1} onClick={() => removeRow(r.id)}>
                          {t('purchase.lines.sil')}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/20">
                  <td colSpan={6} className="px-2 py-2 text-right font-semibold">{t('purchase.lines.genelToplam')}</td>
                  <td className="px-2 py-2 text-right tabular-nums font-bold whitespace-nowrap">{formatCurrency(grandTotal, paraBirimi)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          {submitted && filledRows.length === 0 && (
            <div className="px-3 py-2"><FieldError message={t('purchase.lines.enAzBir')} /></div>
          )}
        </div>

        {/* Talep geneli alanlar */}
        <div className="grid gap-3 md:grid-cols-2 max-w-3xl">
          <div className="space-y-1">
            <Label>{t('purchase.alinanYer')} *</Label>
            <Input value={alinanYer} onChange={(e) => setAlinanYer(e.target.value)} />
            {submitted && !alinanYer.trim() && <FieldError message={t('validation.required')} />}
          </div>
          <div className="space-y-1">
            <Label>{t('purchase.departman')} *</Label>
            <Input value={departman} disabled readOnly />
            <p className="text-xs text-muted-foreground">{t('purchase.departmanHint')}</p>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>{t('purchase.notlar')}</Label>
            <Textarea rows={3} value={notlar} onChange={(e) => setNotlar(e.target.value)} />
          </div>
        </div>

        <div className="pt-2 flex gap-2">
          <Button variant="outline" onClick={() => nav(-1)}>{t('purchase.cancel')}</Button>
          <Button disabled={createMut.isPending} onClick={onSubmit}>
            {createMut.isPending ? t('purchase.creating') : t('purchase.create')}
          </Button>
        </div>
      </div>
    </div>
  )
}
