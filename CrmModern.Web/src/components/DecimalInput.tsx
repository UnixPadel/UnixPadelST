import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Input, type InputProps } from '@/components/ui/input'
import { formatDecimalInput, localizeNumberPlaceholder, parseDecimal, type NumberLang } from '@/lib/number'

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
 *   otherwise the language-aware parse from lib/number (TR "1,5" and EN "1.5" = 1.5).
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
  ({ value, onValueChange, onKeyDown, onBlur, onFocus, placeholder, ...rest }, ref) => {
    const { i18n } = useTranslation()
    const lang: NumberLang = i18n.language?.toLowerCase().startsWith('en') ? 'en' : 'tr'
    const previousLang = React.useRef(lang)
    const [text, setText] = React.useState<string>(toDisplay(value))

    // Dil değişince yazılı metin eski ayırıcıyla kalırsa "1,125" EN'de 1125 okunur.
    React.useEffect(() => {
      if (previousLang.current === lang) return
      const current = typeof value === 'number' ? value : parseDecimal(text, previousLang.current)
      previousLang.current = lang
      setText(formatDecimalInput(current, lang))
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lang])

    // Keep local text in sync if the bound value changes from outside (e.g. form reset),
    // but only when the parsed view differs — avoids fighting the user mid-edit.
    React.useEffect(() => {
      const parsed = parseDecimal(text, lang)
      if (parsed !== value &&!(parsed === '' && (value === '' || value === undefined || value === null))) {
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
        placeholder={placeholder ? localizeNumberPlaceholder(placeholder, lang) : placeholder}
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
          onValueChange(parseDecimal(cleaned, lang))
        }}
        onBlur={(e) => {
          const parsed = parseDecimal(text, lang)
          const normalized = formatDecimalInput(parsed, lang)
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
