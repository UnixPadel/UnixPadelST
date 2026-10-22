import { useCallback } from 'react'

/**
 * E-3 — ETA tarzı "Enter ile sonraki alan". Form kapsayıcısının onKeyDown'una
 * bağlanır:
 *
 *   const onEnterNav = useEnterNavigation({ onSubmit: save })
 *   <div onKeyDown={onEnterNav}> … </div>
 *
 *  • Enter → sonraki odaklanabilir alan; Shift+Enter → önceki.
 *  • Son alanda Enter → onSubmit (varsa).
 *  • Textarea, buton, açık listbox/combobox ve Ctrl/Alt kombinasyonlarında devre dışı.
 *  • Bir alanı atlamak için `data-enter-skip` verilebilir.
 */
const FOCUSABLE = 'input:not([type=hidden]):not([disabled]):not([readonly]):not([data-enter-skip]), select:not([disabled]):not([data-enter-skip]), textarea:not([disabled]):not([readonly]):not([data-enter-skip]), [role="combobox"]:not([aria-disabled="true"]):not([data-enter-skip])'

export function useEnterNavigation(opts: { onSubmit?: () => void } = {}) {
  const { onSubmit } = opts
  return useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Enter' || e.ctrlKey || e.metaKey || e.altKey || e.nativeEvent.isComposing) return
    const target = e.target as HTMLElement
    if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.tagName === 'A') return
    if (target.getAttribute('aria-expanded') === 'true') return
    if ((target as HTMLInputElement).type === 'checkbox' || (target as HTMLInputElement).type === 'radio') return
    const root = e.currentTarget
    const fields = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((el) => el.offsetParent !== null)
    const idx = fields.indexOf(target)
    if (idx === -1) return
    e.preventDefault()
    const next = fields[idx + (e.shiftKey ? -1 : 1)]
    if (next) {
      next.focus()
      if (next instanceof HTMLInputElement) next.select?.()
    } else if (!e.shiftKey) {
      onSubmit?.()
    }
  }, [onSubmit])
}
