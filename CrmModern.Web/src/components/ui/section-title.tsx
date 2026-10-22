import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * QW-4 — bölüm başlığı (kart/panel içi). Tek stil: text-sm semibold, sola
 * hizalı; sağda isteğe bağlı aksiyonlar. Önceden 6 farklı stil vardı
 * (ortalı text-base, Label text-xs, text-lg…).
 */
export function SectionTitle({
  children, actions, className, as: Tag = 'h3', id,
}: {
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
  as?: 'h2' | 'h3' | 'h4'
  id?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <Tag id={id} className="text-sm font-semibold">{children}</Tag>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  )
}
