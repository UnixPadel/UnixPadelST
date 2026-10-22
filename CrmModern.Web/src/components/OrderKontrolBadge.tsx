import { StatusBadge } from '@/components/StatusBadge'

/**
 * PROMPT.md #20: Siparişlerim "Durum" sütunu (legacy Siparislerim.cs).
 * QW-2 — renk/etiket merkezi kayıttan: Reddet → danger, Onay → success,
 * Kontrol → warning. Önceden "Onay" burada sarı, StatusBadge'de yeşildi ve
 * ham enum değeri (çevrilmeden) basılıyordu.
 */
interface Props { value?: string | null }

export function OrderKontrolBadge({ value }: Props) {
  return <StatusBadge value={value} context="kontrol" />
}
