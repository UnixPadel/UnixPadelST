import { useEffect, useRef } from 'react'

/**
 * SR-10 / E-2 — uygulama geneli klavye kısayolları (SAP GUI + ETA/LOGO fiş
 * tuşlarından esinlenen standart):
 *
 *   F1 kısayol yardımı · F3 geri/kapat · F4 değer yardımı (alan bazlı)
 *   F5 yenile · F8 filtreyi uygula · Ctrl+S kaydet · Ins yeni satır
 *   Ctrl+Enter dialog onayı · Ctrl+K komut paleti · / filtreye odak
 *
 * Electron menüsü kaldırıldığı için F1–F11 serbesttir (electron/main.cjs; F12
 * DevTools'a bağlı). Tarayıcı varsayılanı (F5 yenile, Ctrl+S sayfayı kaydet)
 * yalnız bir işleyici tuşu üstlenirse engellenir.
 *
 * Kombinasyon biçimi: "ctrl+s", "f8", "shift+enter", "/", "o". Tek harf/"/"
 * kısayolları yazı yazılan alanlarda (input/textarea/contenteditable) tetiklenmez;
 * F-tuşları ve ctrl/alt kombinasyonları her yerde çalışır.
 */
export type HotkeyHandler = (e: KeyboardEvent) => void | boolean

function normalize(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('ctrl')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey && e.key.length > 1) parts.push('shift')
  let key = e.key.toLowerCase()
  if (key === ' ') key = 'space'
  parts.push(key)
  return parts.join('+')
}

export function isTypingTarget(el: EventTarget | null): boolean {
  const n = el as HTMLElement | null
  if (!n) return false
  const tag = n.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || n.isContentEditable
}

export function useHotkeys(
  map: Record<string, HotkeyHandler | undefined | false>,
  opts: { enabled?: boolean } = {},
) {
  const ref = useRef(map)
  ref.current = map
  const enabled = opts.enabled ?? true

  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const combo = normalize(e)
      const handler = ref.current[combo]
      if (!handler) return
      const plain = !combo.includes('+') && !/^f\d{1,2}$/.test(combo) && combo !== 'escape' && combo !== 'insert'
      if (plain && isTypingTarget(e.target)) return
      // Açık bir modal varken sayfa kısayolları çalışmasın (dialog kendi tuşlarını yönetir).
      if (document.querySelector('[role="dialog"][data-state="open"]') && !combo.startsWith('ctrl+k')) {
        const inDialog = (e.target as HTMLElement | null)?.closest?.('[role="dialog"]')
        if (!inDialog) return
      }
      const res = handler(e)
      if (res !== false) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
