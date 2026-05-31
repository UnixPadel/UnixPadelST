import { Badge } from '@/components/ui/badge'

interface Props {
  // Order.SiparisMiTeklifMi — 'Hazir' | 'Lojistik' | 'Tamamlandi' | diğer
  value: string
}

// Paket 3: LojistikTablo'da satırı olan sevkin durumu, Order.SiparisMiTeklifMi'den türetilir.
//   Hazir       → "Muhasebe Onayı Bekliyor"  (warning)
//   Lojistik    → "Sevk Yolda"               (default)
//   Tamamlandi  → "Tamamlandı"               (success)
const mapping: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  Hazir:      { label: 'Muhasebe Onayı Bekliyor', variant: 'warning' },
  Lojistik:   { label: 'Sevk Yolda',              variant: 'default' },
  Tamamlandi: { label: 'Tamamlandı',              variant: 'success' },
}

export function LogisticsStatusBadge({ value }: Props) {
  const entry = mapping[value] ?? { label: value || '—', variant: 'outline' as const }
  return <Badge variant={entry.variant}>{entry.label}</Badge>
}
