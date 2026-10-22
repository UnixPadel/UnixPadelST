import { useSyncExternalStore } from 'react'

/**
 * Kullanım Kılavuzu paneli durumu — üst çubuk butonu, Shift+F1, "Neler Yeni"
 * penceresi ve komut paleti aynı paneli açar. `section` verilmezse panel
 * bulunulan ekranın bölümünü seçer (GuideDialog).
 */
type GuideState = { open: boolean; section: string | null }

let state: GuideState = { open: false, section: null }
const listeners = new Set<() => void>()
const emit = (next: GuideState) => { state = next; listeners.forEach((l) => l()) }

export const openGuide = (section: string | null = null) => emit({ open: true, section })
export const closeGuide = () => emit({ ...state, open: false })

export function useGuideState(): GuideState {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => state,
    () => state,
  )
}
