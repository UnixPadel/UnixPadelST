// Faz 8.6 — WinForms grid renkleri BIREBIR Tailwind custom paleti üzerinden.
// Renkler tailwind.config.js içinde `purchase-*` anahtarlarıyla tanımlı.
//   Onaylandı            → #C6EFCE açık yeşil
//   Muhasebe Tamamlandı  → #DDEBF7 açık mavi
//   Ön Onaylandı         → #BDD7EE koyu mavi
//   Reddedildi           → #FFC7CE kırmızı/pembe
//   Bekliyor / diğer     → #FFEB9C sarı
import { useTranslation } from 'react-i18next'
import { purchaseStatusLabel } from '@/lib/status'

interface Props { value?: string | null }

export function PurchaseStatusBadge({ value }: Props) {
  const { t } = useTranslation()
  if (!value) return <span className="text-muted-foreground">—</span>
  const cls =
    value === 'Onaylandı'           ? 'bg-purchase-onay     text-green-900  border-green-700/30' :
    value === 'Muhasebe Tamamlandı' ? 'bg-purchase-muhasebe text-sky-900    border-sky-700/30'   :
    value === 'Ön Onaylandı'        ? 'bg-purchase-on       text-blue-900   border-blue-700/30'  :
    value === 'Reddedildi'          ? 'bg-purchase-red      text-red-900    border-red-700/30'   :
                                      'bg-purchase-bekle    text-yellow-900 border-yellow-700/30'
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded border ${cls}`}>
      {purchaseStatusLabel(t, value)}
    </span>
  )
}
