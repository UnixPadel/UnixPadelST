import { useSyncExternalStore } from 'react'
import { readJSON, userKey, writeJSON } from '@/lib/storage'

/**
 * E-13 — SAP kullanıcı parametreleri / LOGO kullanıcı tercihleri. Yeni sipariş
 * formu bu varsayılanlarla açılır; tablo yoğunluğu ve açılış sayfası da buradan.
 * Kullanıcı başına localStorage'da tutulur (backend değişikliği gerektirmez).
 */
export interface UserPreferences {
  defaultSirket: string
  defaultParaTipi: string
  defaultOdemeSekli: '' | 'Pesin' | 'Vadeli'
  defaultPesinYuzde: number | null
  tableDensity: 'normal' | 'compact'
  startPage: string
  showShortcutHints: boolean
  enterNavigation: boolean
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultSirket: 'Unixpadel',
  defaultParaTipi: 'Euro',
  defaultOdemeSekli: '',
  defaultPesinYuzde: null,
  // Scaling Faz 1 — yoğun ERP ekranları için varsayılan compact (kayıtlı tercih korunur).
  tableDensity: 'compact',
  startPage: '/dashboard',
  showShortcutHints: true,
  enterNavigation: true,
}

const listeners = new Set<() => void>()
let cache: { key: string; value: UserPreferences } | null = null

export function getPreferences(): UserPreferences {
  const key = userKey('prefs')
  if (cache?.key !== key) {
    cache = { key, value: { ...DEFAULT_PREFERENCES, ...readJSON<Partial<UserPreferences>>(key, {}) } }
  }
  return cache.value
}

export function setPreferences(patch: Partial<UserPreferences>): void {
  const key = userKey('prefs')
  const next = { ...getPreferences(), ...patch }
  writeJSON(key, next)
  cache = { key, value: next }
  listeners.forEach((l) => l())
}

export function usePreferences(): UserPreferences {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb) } },
    getPreferences,
    getPreferences,
  )
}
