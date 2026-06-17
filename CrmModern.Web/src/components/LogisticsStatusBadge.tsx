import { Badge } from '@/components/ui/badge'

interface Props {
  // Order.SiparisMiTeklifMi — 'Hazir' | 'Lojistik' | 'Tamamlandi' | diğer
  value: string
}

// Paket 3: LojistikTablo'da satırı olan sevkin durumu, Order.SiparisMiTeklifMi'den türetilir.
//   Hazir              → "Muhasebe Onayı Bekliyor"           (warning)
//   Lojistik           → "Sevk Yolda"                        (default)
//   TamamlanmaBekliyor → "Muhasebe Tamamlama Onayı Bekliyor" (warning)
//   Tamamlandi         → "Tamamlandı"                        (success)
// §16: Sevk tamamlanınca Order 'TamamlanmaBekliyor'a geçer (Burcu final maliyet
// girişini bekler); badge bu aşamayı ham enum değeri yerine etiketle göstermeli.
const mapping: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  Hazir:              { label: 'Muhasebe Onayı Bekliyor',           variant: 'warning' },
  Lojistik:           { label: 'Sevk Yolda',                        variant: 'default' },
  TamamlanmaBekliyor: { label: 'Muhasebe Tamamlama Onayı Bekliyor', variant: 'warning' },
  Tamamlandi:         { label: 'Tamamlandı',                        variant: 'success' },
}

export function LogisticsStatusBadge({ value }: Props) {
  const entry = mapping[value] ?? { label: value || '—', variant: 'outline' as const }
  return <Badge variant={entry.variant}>{entry.label}</Badge>
}
