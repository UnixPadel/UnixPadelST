import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { statusLabel } from '@/lib/status'

interface StatusBadgeProps {
  value: string
}

const stageColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  Teklif: 'secondary',
  Siparis: 'default',
  Planlama: 'warning',
  Uretim: 'warning',
  Hazir: 'success',
  Lojistik: 'default',
  Tamamlandi: 'success',
  // Kontrol
  Kontrol: 'warning',
  Onay: 'success',
  Reddet: 'destructive',
  // Durum
  'Onay Bekliyor': 'warning',
  'Onaylandı': 'success',
  'Reddedildi': 'destructive',
  // Aktif/Pasif
  Aktif: 'success',
  Pasif: 'secondary',
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const { t } = useTranslation()
  // Renkler TR literal'e göre eşlenir; sadece görünen etiket çevrilir.
  const variant = stageColors[value] ?? 'outline'
  return <Badge variant={variant}>{statusLabel(t, value)}</Badge>
}
