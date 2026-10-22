// Faz 8.6 — WinForms grid renkleri; QW-2 ile soft tonlar bu hex'lerden türetildi
// (index.css --*-soft). Onaylandı yeşil, Muhasebe/Ön mavi, Reddedildi kırmızı,
// Bekliyor / diğer sarı — eşleme lib/status.ts 'purchase' bağlamında.
import { StatusBadge } from '@/components/StatusBadge'

interface Props { value?: string | null }

export function PurchaseStatusBadge({ value }: Props) {
  return <StatusBadge value={value} context="purchase" />
}
