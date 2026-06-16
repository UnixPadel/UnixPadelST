import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@/lib/utils'
import type { PurchaseRequestLine } from '@/api/purchase'

/**
 * Round-11 §9 — onay/detay ekranlarında ortak kalem tablosu.
 * Para birimi belge düzeyinde (paraBirimi). hideMoney true ise (Fabrika /
 * omur.caliskan) parasal sütunlar gizlenir; ürün/miktar/birim operasyonel
 * bilgisi görünmeye devam eder.
 *
 * İndirim 'yuzde' (legacy) ise %, aksi halde tutar olarak para biriminde gösterilir.
 */
export function PurchaseLinesTable({
  kalemler, paraBirimi, grandTotal, hideMoney = false,
}: {
  kalemler: PurchaseRequestLine[]
  paraBirimi?: string | null
  grandTotal: number
  hideMoney?: boolean
}) {
  const { t } = useTranslation()
  const cur = paraBirimi ?? ''
  const money = (n: number | null | undefined) => formatCurrency(n ?? 0, cur)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/30 uppercase">
          <tr>
            <th className="px-2 py-1 text-left">{t('purchase.lines.urunAdi')}</th>
            <th className="px-2 py-1 text-left">{t('purchase.lines.birim')}</th>
            <th className="px-2 py-1 text-right">{t('purchase.lines.miktar')}</th>
            {!hideMoney && <th className="px-2 py-1 text-right">{t('purchase.lines.birimFiyat')}</th>}
            {!hideMoney && <th className="px-2 py-1 text-right">{t('purchase.lines.indirim')}</th>}
            {!hideMoney && <th className="px-2 py-1 text-right">{t('purchase.lines.satirToplam')}</th>}
          </tr>
        </thead>
        <tbody>
          {kalemler.map((k) => (
            <tr key={k.kalemID} className="border-t">
              <td className="px-2 py-1">{k.urunAdi}</td>
              <td className="px-2 py-1">{k.birim}</td>
              <td className="px-2 py-1 text-right tabular-nums">{k.miktar}</td>
              {!hideMoney && (
                <td className="px-2 py-1 text-right tabular-nums">{k.birimFiyat != null ? money(k.birimFiyat) : '—'}</td>
              )}
              {!hideMoney && (
                <td className="px-2 py-1 text-right tabular-nums">
                  {k.indirim != null ? (k.indirimTipi === 'yuzde' ? `%${k.indirim}` : money(k.indirim)) : '—'}
                </td>
              )}
              {!hideMoney && (
                <td className="px-2 py-1 text-right tabular-nums font-medium">{money(k.toplam)}</td>
              )}
            </tr>
          ))}
        </tbody>
        {!hideMoney && (
          <tfoot>
            <tr className="border-t bg-muted/20">
              <td colSpan={5} className="px-2 py-1 text-right font-semibold">{t('purchase.lines.genelToplam')}</td>
              <td className="px-2 py-1 text-right tabular-nums font-bold">{money(grandTotal)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
