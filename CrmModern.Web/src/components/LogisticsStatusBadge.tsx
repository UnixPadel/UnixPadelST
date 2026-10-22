import { StatusBadge } from '@/components/StatusBadge'

interface Props {
  // Order.SiparisMiTeklifMi — 'Hazir' | 'Lojistik' | 'Tamamlandi' | diğer
  value: string
}

// Paket 3: LojistikTablo'da satırı olan sevkin durumu, Order.SiparisMiTeklifMi'den türetilir.
//   Hazir              → "Muhasebe Onayı Bekliyor"           (warning)
//   Lojistik           → "Sevk Yolda"                        (info)
//   TamamlanmaBekliyor → "Muhasebe Tamamlama Onayı Bekliyor" (warning)
//   Tamamlandi         → "Tamamlandı"                        (success)
// QW-2 — eşleme ve etiketler lib/status.ts 'logistics' bağlamında (i18n).
export function LogisticsStatusBadge({ value }: Props) {
  return <StatusBadge value={value} context="logistics" />
}
