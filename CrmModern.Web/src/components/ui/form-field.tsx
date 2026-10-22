import * as React from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * SR-2 — etiket + kontrol + hata tek bileşende.
 *  • useId ile label `htmlFor` ↔ kontrol `id` bağlanır (önceden hiçbir Label
 *    kontrolüne bağlı değildi; ekran okuyucu ve etikete tıklayıp odaklanma yoktu).
 *  • `error` verilince kontrol `aria-invalid` + `aria-describedby` alır, Input/
 *    Textarea kırmızı çerçeve gösterir; mesaj role="alert" ile okunur.
 *  • `required` yıldızı burada eklenir — i18n metinlerine "*" yazılmaz (QW-8).
 * Tek çocuk element beklenir (Input, DecimalInput, Textarea, Combobox…).
 */
export interface FormFieldProps {
  label: React.ReactNode
  children: React.ReactElement
  required?: boolean
  error?: string | false | null
  hint?: React.ReactNode
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  className?: string
  labelClassName?: string
  /** 'stack' (varsayılan): etiket üstte. 'inline': etiket solda sabit genişlik. */
  layout?: 'stack' | 'inline'
  id?: string
}

export function FormField({
  label, children, required, error, hint, prefix, suffix, className, labelClassName, layout = 'stack', id: idProp,
}: FormFieldProps) {
  const autoId = React.useId()
  const id = idProp ?? (children.props as { id?: string }).id ?? `ff-${autoId}`
  const errId = `${id}-err`
  const hintId = `${id}-hint`
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  const control = React.cloneElement(children, {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    'aria-required': required || undefined,
  } as Record<string, unknown>)

  const labelEl = (
    <Label htmlFor={id} className={cn('text-xs font-medium text-muted-foreground', layout === 'inline' && 'w-28 shrink-0 pt-2', labelClassName)}>
      {label}{required && <span className="text-destructive" aria-hidden> *</span>}
    </Label>
  )

  const body = (
    <div className="min-w-0 flex-1 space-y-0.5">
      <div className="flex items-center gap-1">
        {prefix && <span className="w-5 shrink-0 text-center text-sm text-muted-foreground">{prefix}</span>}
        <div className="min-w-0 flex-1">{control}</div>
        {suffix && <span className="w-5 shrink-0 text-center text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {hint && !error && <p id={hintId} className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p id={errId} role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )

  return layout === 'inline'
    ? <div className={cn('flex items-start gap-2', className)}>{labelEl}{body}</div>
    : <div className={cn('space-y-1', className)} data-field-error={error ? '' : undefined}>{labelEl}{body}</div>
}

/**
 * Fiori Message Popover benzeri "ilk hataya git": kapsayıcı içindeki ilk
 * aria-invalid kontrole kaydırır ve odaklar. Gönderim doğrulamasından sonra çağrılır
 * (React state'in DOM'a yansıması için bir frame beklenir).
 */
export function focusFirstError(container?: HTMLElement | null) {
  requestAnimationFrame(() => {
    const root = container ?? document
    const el = root.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (!el) return
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el.focus({ preventScroll: true })
  })
}
