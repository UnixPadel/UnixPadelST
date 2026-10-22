import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Stilli native checkbox (ek bağımlılık yok). Klavye (Space) ve form davranışı
 * tarayıcıdan gelir; `label` verilirse tıklanabilir etiketle sarılır.
 */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  onCheckedChange?: (checked: boolean) => void
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  label?: React.ReactNode
  labelClassName?: string
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, label, labelClassName, ...props }, ref) => {
    const box = (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          'h-4 w-4 shrink-0 cursor-pointer rounded border border-input accent-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        onChange={(e) => { onChange?.(e); onCheckedChange?.(e.target.checked) }}
        {...props}
      />
    )
    if (label == null) return box
    return (
      <label className={cn('inline-flex cursor-pointer select-none items-center gap-2 text-sm', props.disabled && 'cursor-not-allowed opacity-60', labelClassName)}>
        {box}
        <span>{label}</span>
      </label>
    )
  },
)
Checkbox.displayName = 'Checkbox'
