import * as React from 'react'
import { Input, type InputProps } from '@/components/ui/input'

/**
 * Decimal-as-text input.
 *
 * PROMPT.md GLOBAL: "Convert every decimal input to TextBox … KDV, Peşin, İndirim,
 * Purchase → New → Cost. Any field accepting a decimal must be a TextBox."
 *
 * - Renders as <input type="text"> (not type="number") so wheel/up-down/spinner
 *   side-effects from browsers disappear.
 * - Keystroke filter: digits, '.' and ',' only. Anything else is blocked.
 * - Emits a numeric value via onValueChange — '' when the field is empty,
 *   otherwise parseFloat with ',' normalized to '.'. NaN never escapes.
 * - Holds a local string so the user can type '12.' or '12,' mid-edit without
 *   the parsed number snapping the caret.
 */
export interface DecimalInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  value: number | string
  onValueChange: (val: number | '') => void
}

const ALLOWED_CHAR = /^[0-9.,]$/

function toDisplay(v: number | string): string {
  if (v === '' || v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  return Number.isFinite(v) ? String(v) : ''
}

function toNumber(text: string): number | '' {
  const trimmed = text.trim()
  if (trimmed === '') return ''
  const n = parseFloat(trimmed.replace(',', '.'))
  return Number.isFinite(n) ? n : ''
}

export const DecimalInput = React.forwardRef<HTMLInputElement, DecimalInputProps>(
  ({ value, onValueChange, onKeyDown, onBlur, ...rest }, ref) => {
    const [text, setText] = React.useState<string>(toDisplay(value))

    // Keep local text in sync if the bound value changes from outside (e.g. form reset),
    // but only when the parsed view differs — avoids fighting the user mid-edit.
    React.useEffect(() => {
      const parsed = toNumber(text)
      if (parsed !== value && !(parsed === '' && (value === '' || value === undefined || value === null))) {
        setText(toDisplay(value))
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={text}
        onKeyDown={(e) => {
          // Allow control keys; block any other non-allowed character.
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            if (!ALLOWED_CHAR.test(e.key)) e.preventDefault()
          }
          onKeyDown?.(e)
        }}
        onChange={(e) => {
          // Defensive: strip anything not allowed even from paste.
          const cleaned = e.target.value.replace(/[^0-9.,]/g, '')
          setText(cleaned)
          onValueChange(toNumber(cleaned))
        }}
        onBlur={(e) => {
          // Normalize trailing separators on blur ('12,' -> '12').
          const cleaned = text.replace(/[.,]+$/g, '')
          if (cleaned !== text) {
            setText(cleaned)
            onValueChange(toNumber(cleaned))
          }
          onBlur?.(e)
        }}
        {...rest}
      />
    )
  },
)
DecimalInput.displayName = 'DecimalInput'
