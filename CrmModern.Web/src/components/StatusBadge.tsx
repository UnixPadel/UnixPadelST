import { Badge } from '@/components/ui/badge'

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
  const variant = stageColors[value] ?? 'outline'
  return <Badge variant={variant}>{value}</Badge>
}
