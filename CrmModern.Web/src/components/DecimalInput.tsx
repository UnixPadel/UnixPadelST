import * as React from 'react'
import { Input, type InputProps } from '@/components/ui/input'
import { formatDecimalInput, parseDecimalTR } from '@/lib/number'

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
 *   otherwise the TR-aware parse from lib/number (F0-1: "1.234,56" = 1234.56).
 * - Holds a local string so the user can type '12.' or '12,' mid-edit without
 *   the parsed number snapping the caret. On blur the text is normalised to the
 *   parsed value ("1.500" → "1500", "1,50" → "1,5") so the operator sees what
 *   will be saved.
 * - Selects its content on focus (fast overwrite, ETA/LOGO style).
 */
export interface DecimalInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  value: number | string
  onValueChange: (val: number | '') => void
}

const ALLOWED_CHAR = /^[0-9.,]$/

function toDisplay(v: number | string): string {
  if (v === '' || v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  return formatDecimalInput(v)
}

export const DecimalInput = React.forwardRef<HTMLInputElement, DecimalInputProps>(
  ({ value, onValueChange, onKeyDown, onBlur, onFocus, ...rest }, ref) => {
    const [text, setText] = React.useState<string>(toDisplay(value))

    // Keep local text in sync if the bound value changes from outside (e.g. form reset),
    // but only when the parsed view differs — avoids fighting the user mid-edit.
    React.useEffect(() => {
      const parsed = parseDecimalTR(text)
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
        onFocus={(e) => {
          e.currentTarget.select()
          onFocus?.(e)
        }}
        onChange={(e) => {
          // Defensive: strip anything not allowed even from paste.
          const cleaned = e.target.value.replace(/[^0-9.,]/g, '')
          setText(cleaned)
          onValueChange(parseDecimalTR(cleaned))
        }}
        onBlur={(e) => {
          const parsed = parseDecimalTR(text)
          const normalized = formatDecimalInput(parsed)
          if (normalized !== text) {
            setText(normalized)
            onValueChange(parsed)
          }
          onBlur?.(e)
        }}
        {...rest}
      />
    )
  },
)
DecimalInput.displayName = 'DecimalInput'
