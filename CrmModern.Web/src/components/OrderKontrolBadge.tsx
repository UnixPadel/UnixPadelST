/**
 * PROMPT.md #20: Siparişlerim "Durum" sütunu — legacy Siparislerim.cs
 * CellFormatting kuralları:
 *   Reddet  → kırmızı arkaplan / beyaz yazı
 *   Onay    → sarı arkaplan / koyu yazı
 *   Kontrol → nötr (varsayılan)
 */
interface Props { value?: string | null }

export function OrderKontrolBadge({ value }: Props) {
  if (!value) return <span className="text-muted-foreground">—</span>
  const cls =
    value === 'Reddet'  ? 'bg-red-600    text-white      border-red-700'   :
    value === 'Onay'    ? 'bg-yellow-300 text-yellow-900 border-yellow-600':
                          'bg-muted      text-foreground border-border'
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded border ${cls}`}>
      {value}
    </span>
  )
}
