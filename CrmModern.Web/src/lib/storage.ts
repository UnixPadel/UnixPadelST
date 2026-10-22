/**
 * Güvenli localStorage erişimi (gizli mod / kota / bozuk JSON → sessizce geri
 * düşer). Kullanıcı bazlı anahtarlar için `userKey` kullanılır.
 */
import { getStoredUser } from '@/lib/authStore'

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    if (value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch { /* yoksay */ }
}

export function removeKey(key: string): void {
  try { localStorage.removeItem(key) } catch { /* yoksay */ }
}

/** Oturumdaki kullanıcıya özel anahtar: "pref:elshan.rasulov:…". */
export function userKey(...parts: string[]): string {
  let who = 'anon'
  try { who = getStoredUser()?.kullaniciAdi ?? 'anon' } catch { /* yoksay */ }
  return ['ups', who, ...parts].join(':')
}
