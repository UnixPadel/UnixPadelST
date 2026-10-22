import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Search, Trash2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox, trLower, type ComboOption } from '@/components/ui/combobox'
import { FormField } from '@/components/ui/form-field'
import { DecimalInput } from '@/components/DecimalInput'
import { isoSymbol, type IsoCurrency } from '@/lib/currency'
import { formatNumberTR } from '@/lib/number'
import type { ComponentRow, SetTabState } from '@/lib/orderForm'

/**
 * SR-1 — tek set sekmesinin içeriği (eski NewOrderPage 1201-1366).
 * F0-4: "Çarp" kaldırıldı — kategorisi seçili sekme zaten kayda girer; sekme
 * başlığı bunu gösterir. Kayıttan SONRA reçete açma (expandRecipe) ayrı butondur.
 * F0-7: bileşen satır toplamı BİLGİ amaçlıdır (toplam fiyata girmez) — soluk
 * gösterilir ve başlıkta belirtilir.
 */
export function SetTabPanel({
  index, tab, categoryOptions, sym, viewIso, createdNo, expandPending,
  onCategorySelect, onRemove, onUpdate, onUrunAdetChange, onToggleComponent, onUpdateComponent, shownPrice, priceIn, onExpandRecipe,
}: {
  index: number
  tab: SetTabState
  categoryOptions: ComboOption[]
  sym: string
  viewIso: IsoCurrency
  createdNo: string | null
  expandPending: boolean
  onCategorySelect: (kategoriID: number) => void
  onRemove: () => void
  onUpdate: (patch: Partial<SetTabState>) => void
  onUrunAdetChange: (adet: number) => void
  onToggleComponent: (bilesenID: number, checked: boolean) => void
  onUpdateComponent: (rowIdx: number, patch: Partial<ComponentRow>) => void
  shownPrice: (c: ComponentRow) => number | null
  priceIn: (amount: number, from: IsoCurrency) => number
  onExpandRecipe: () => void
}) {
  const { t } = useTranslation()
  const [checkFilter, setCheckFilter] = useState('')
  const visibleChecklist = useMemo(() => {
    const q = trLower(checkFilter.trim())
    return q ? tab.checklist.filter((c) => trLower(c.bilesenAdi).includes(q) || String(c.bilesenID) === q) : tab.checklist
  }, [tab.checklist, checkFilter])
  const checkedCount = tab.checklist.filter((c) => c.checked).length
  const fieldPrefix = `set${index}`

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_140px_90px_auto] md:items-end">
        <FormField label={t('orders.form.anaUrun')} id={`${fieldPrefix}-cat`}>
          <Combobox
            options={categoryOptions}
            value={tab.kategoriID ? String(tab.kategoriID) : ''}
            onValueChange={(v) => onCategorySelect(Number(v))}
            placeholder={t('orders.form.anaUrunSec')}
          />
        </FormField>
        <FormField label={t('orders.form.tekilFiyatAdet')} prefix={sym}>
          <DecimalInput
            value={tab.kategoriFiyat}
            onValueChange={(v) => onUpdate({ kategoriFiyat: v === '' ? 0 : v })}
            className="text-right"
          />
        </FormField>
        <FormField label={t('orders.form.adet')}>
          <Input
            type="number"
            min={1}
            value={tab.adet}
            className="text-right"
            // PROMPT-v3 §2.3: adet değişince tüm satır Adet'leri defaultAdet × ürünAdedi.
            onChange={(e) => onUrunAdetChange(Math.max(1, Number(e.target.value) || 1))}
          />
        </FormField>
        <div className="flex gap-1.5">
          {tab.kategoriID != null && (
            <Button type="button" variant="outline" size="sm" onClick={onRemove} title={t('orders.form.setRemoveHint')}>
              <Trash2 className="h-4 w-4" /> {t('orders.form.setRemove')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm">
        <span className="text-muted-foreground">{t('orders.form.setFiyati')}</span>
        <span className="font-semibold tabular-nums">{formatNumberTR(tab.kategoriFiyat * tab.adet)} {sym}</span>
        {createdNo && tab.kategoriID != null && (
          // Kayıt sonrası (legacy davranış): reçeteyi siparişe aç.
          <Button type="button" size="xs" variant="outline" loading={expandPending} onClick={onExpandRecipe}>
            <Wand2 className="h-3.5 w-3.5" /> {t('orders.form.receteAc')}
          </Button>
        )}
      </div>

      {/* PROMPT-v3 §2.2: bileşen checklist'i — aranabilir. İşaretlemek tabloya
          ekler, kaldırmak siler. */}
      <div className="rounded-md border">
        <div className="flex items-center gap-2 border-b px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={checkFilter}
            onChange={(e) => setCheckFilter(e.target.value)}
            placeholder={t('orders.form.bilesenAra')}
            aria-label={t('orders.form.bilesenAra')}
            data-enter-skip
            className="flex-1 bg-transparent text-xs outline-none"
            disabled={tab.checklist.length === 0}
          />
          {tab.checklist.length > 0 && (
            <span className="text-[11px] text-muted-foreground tabular-nums">{t('orders.form.checkedCount', { checked: checkedCount, total: tab.checklist.length })}</span>
          )}
        </div>
        <div className="h-36 overflow-y-auto p-1.5">
          {tab.checklist.length === 0
            ? <p className="pt-12 text-center text-xs text-muted-foreground">
                {tab.kategoriID ? t('orders.form.bilesenlerYukleniyor') : t('orders.form.anaUrunSecHint')}
              </p>
            : visibleChecklist.map((c) => (
              <label key={c.bilesenID} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted/40">
                <Checkbox
                  checked={c.checked}
                  onCheckedChange={(v) => onToggleComponent(c.bilesenID, v)}
                  data-enter-skip
                />
                <span className="font-mono text-[10px] text-muted-foreground">{c.bilesenID}</span>
                <span className="flex-1">{c.bilesenAdi}</span>
                <span className="text-muted-foreground tabular-nums">×{c.defaultAdet}</span>
              </label>
            ))}
        </div>
      </div>

      <div className="max-h-72 overflow-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-muted">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">{t('orders.form.bilesenAdiLabel')}</th>
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">{t('orders.form.oznitelik')}</th>
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">{t('orders.form.birim')}</th>
              <th className="w-20 px-2 py-1.5 text-right font-medium text-muted-foreground">{t('orders.form.adet')}</th>
              <th className="w-28 px-2 py-1.5 text-right font-medium text-muted-foreground">{t('orders.form.birimFiyat')} ({isoSymbol(viewIso)})</th>
              <th className="w-28 px-2 py-1.5 text-right font-medium text-muted-foreground" title={t('orders.form.infoOnlyHint')}>
                {t('orders.form.toplam')} <span className="font-normal">({t('orders.form.infoOnly')})</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tab.components.length === 0
              ? <tr><td colSpan={6} className="px-2 py-6 text-center text-muted-foreground">
                  {tab.kategoriID ? t('orders.form.listedenSecin') : t('orders.form.onceAnaUrun')}
                </td></tr>
              : tab.components.map((cmp, k) => {
                const shown = shownPrice(cmp)
                return (
                  <tr key={`${cmp.bilesenID}-${k}`} className="border-t">
                    <td className="px-2 py-1">
                      <span className="mr-1 font-mono text-[10px] text-muted-foreground">{cmp.bilesenID}</span>{cmp.bilesenAdi}
                    </td>
                    <td className="px-2 py-1">
                      {/* §2.4: boş seçim serbest; auto-default seçeneklerde yoksa enjekte edildi. */}
                      {cmp.oznitelikSecenekler.length > 0 ? (
                        <select
                          value={cmp.oznitelikSecili}
                          onChange={(e) => onUpdateComponent(k, { oznitelikSecili: e.target.value })}
                          aria-label={t('orders.form.oznitelik')}
                          className="h-7 w-full rounded-md border border-input bg-background px-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value=""></option>
                          {cmp.oznitelikSecenekler.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : '—'}
                    </td>
                    <td className="px-2 py-1">{cmp.birim || '—'}</td>
                    <td className="px-2 py-1 text-right">
                      <Input
                        type="number" min={1}
                        inputSize="sm"
                        aria-label={t('orders.form.adet')}
                        value={cmp.adet}
                        onChange={(e) => onUpdateComponent(k, { adet: Math.max(1, Number(e.target.value) || 1) })}
                        className="h-7 text-right"
                      />
                    </td>
                    <td className="px-2 py-1 text-right">
                      {/* Gösterim biriminde düzenlenir; girilen değer kaynak olur. Kur yoksa
                          katalog fiyatı çevrilmeden (uyarı ikonu) gösterilir. */}
                      <div className="flex items-center gap-1">
                        {shown == null && (
                          <span role="img" title={`${t('currency.noRate')} (${isoSymbol(cmp.kaynakPara)})`} aria-label={`${t('currency.noRate')} (${isoSymbol(cmp.kaynakPara)})`}>
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
                          </span>
                        )}
                        <DecimalInput
                          inputSize="sm"
                          aria-label={t('orders.form.birimFiyat')}
                          value={shown ?? cmp.kaynakFiyat}
                          onValueChange={(v) => {
                            const n = v === '' ? 0 : v
                            const from = shown == null ? cmp.kaynakPara : viewIso
                            onUpdateComponent(k, { kaynakFiyat: n, kaynakPara: from, birimFiyat: priceIn(n, from) })
                          }}
                          className="h-7 text-right"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                      {formatNumberTR(cmp.adet * (shown ?? cmp.kaynakFiyat))}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
