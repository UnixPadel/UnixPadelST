import { useSyncExternalStore } from 'react'
import { readJSON, userKey, writeJSON } from '@/lib/storage'

/**
 * E-13 — SAP kullanıcı parametreleri / LOGO kullanıcı tercihleri. Yeni sipariş
 * formu bu varsayılanlarla açılır; görünüm ölçeği ve açılış sayfası da buradan.
 * Kullanıcı başına localStorage'da tutulur (backend değişikliği gerektirmez).
 */
export type UiScale = 'standart' | 'rahat'

export interface UserPreferences {
  /** Şema sürümü — eski kayıtların bir kerelik dönüşümü için (bkz. migrate). */
  version: number
  defaultSirket: string
  defaultParaTipi: string
  defaultOdemeSekli: '' | 'Pesin' | 'Vadeli'
  defaultPesinYuzde: number | null
  /**
   * 40+ ergonomi (K1): yazı boyutu, kontrol yüksekliği ve tablo satır yüksekliği
   * tek ayardan gelir. 'rahat' herkesin varsayılanıdır; 'standart' sıkı görünümdür.
   */
  uiScale: UiScale
  /** 'auto' → rolüne göre (K8): Fabrika/Lojistik/Muhasebe → Bekleyen İşler, diğerleri Ana Sayfa. */
  startPage: string
  showShortcutHints: boolean
  enterNavigation: boolean
}

const PREFS_VERSION = 2

export const DEFAULT_PREFERENCES: UserPreferences = {
  version: PREFS_VERSION,
  defaultSirket: 'Unixpadel',
  defaultParaTipi: 'Euro',
  defaultOdemeSekli: '',
  defaultPesinYuzde: null,
  uiScale: 'rahat',
  startPage: 'auto',
  showShortcutHints: true,
  enterNavigation: true,
}

/**
 * v1 → v2 (40+ ergonomi, 2026-11):
 *  • `tableDensity` kaldırıldı; herkes "Rahat" görünümle başlar (K1).
 *  • v1 her kayıtta tüm nesneyi yazdığı için `startPage: '/dashboard'` eski
 *    varsayılandan ayırt edilemiyor → 'auto' sayılır (K8). Başka bir sayfa
 *    seçmiş kullanıcının tercihi korunur.
 */
function migrate(stored: Partial<UserPreferences> & { tableDensity?: unknown }): Partial<UserPreferences> {
  if ((stored.version ?? 1) >= PREFS_VERSION) return stored
  const { tableDensity: _drop, ...rest } = stored
  void _drop
  return {
    ...rest,
    version: PREFS_VERSION,
    uiScale: 'rahat',
    startPage: !rest.startPage || rest.startPage === '/dashboard' ? 'auto' : rest.startPage,
  }
}

const listeners = new Set<() => void>()
let cache: { key: string; value: UserPreferences } | null = null

export function getPreferences(): UserPreferences {
  const key = userKey('prefs')
  if (cache?.key !== key) {
    cache = { key, value: { ...DEFAULT_PREFERENCES, ...migrate(readJSON<Partial<UserPreferences>>(key, {})) } }
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

/** Tablo yoğunluğu artık görünüm ölçeğinden türetilir. */
export function densityFor(scale: UiScale): 'normal' | 'compact' {
  return scale === 'standart' ? 'compact' : 'normal'
}

/** K8 — iş listesiyle başlayan roller. */
const INBOX_FIRST_ROLES = ['Fabrika', 'Lojistik', 'Muhasebe']

export function roleStartPage(yetkiTuru?: string | null): string {
  return yetkiTuru && INBOX_FIRST_ROLES.includes(yetkiTuru) ? '/inbox' : '/dashboard'
}

/** Girişten ve "/" kökünden sonra gidilecek sayfa (kayıtlı tercih her zaman önce gelir). */
export function resolveStartPage(yetkiTuru?: string | null): string {
  const p = getPreferences().startPage
  return p && p !== 'auto' ? p : roleStartPage(yetkiTuru)
}

/** Görünüm ölçeğini <html data-ui-scale> olarak uygular (CSS değişkenleri buna bağlı). */
export function applyUiScale(scale: UiScale): void {
  document.documentElement.dataset.uiScale = scale
}
