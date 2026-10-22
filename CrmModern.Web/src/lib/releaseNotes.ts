import { readJSON, removeKey, userKey, writeJSON } from '@/lib/storage'
import type { Localized, ReleaseNote } from '@/types'

/** Derlenen uygulama sürümü (package.json `version`, vite define). */
export const APP_VERSION: string = __APP_VERSION__

/** Sayısal SemVer karşılaştırması ("0.10.0" > "0.9.3"); eksik parça 0 sayılır. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0)
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

const MAX_PENDING = 5

/**
 * Kullanıcıya gösterilecek notlar:
 * - hiç not görmemiş (yeni kullanıcı / ilk kurulum) → yalnız güncel sürümün notu;
 * - aksi halde lastSeen < v ≤ current aralığı (atlanan sürümler dahil), yeniden eskiye, en çok 5.
 */
export function pendingNotes(current: string, lastSeen: string | null, notes: ReleaseNote[]): ReleaseNote[] {
  if (!lastSeen) return notes.filter((n) => n.versiyon === current)
  return notes
    .filter((n) => compareVersions(n.versiyon, lastSeen) > 0 && compareVersions(n.versiyon, current) <= 0)
    .sort((a, b) => compareVersions(b.versiyon, a.versiyon))
    .slice(0, MAX_PENDING)
}

// Kullanıcı başına (aynı bilgisayardaki her kullanıcı ayrı görür).
const seenKey = () => userKey('whatsNew', 'lastSeen')
// Eski, makine geneli anahtar (CURRENT_VERSION='2.7.0' dönemi) — bir kez temizlenir.
const LEGACY_KEY = 'lastSeenChangelogVersion'

export function getLastSeenVersion(): string | null {
  removeKey(LEGACY_KEY)
  return readJSON<string | null>(seenKey(), null)
}

export function markReleaseNotesSeen(version: string = APP_VERSION): void {
  writeJSON(seenKey(), version)
}

/** Etkin dile göre metin (en dışındaki her dil → tr). */
export function pickLang<T>(l: Localized<T>, lang: string | undefined): T {
  return lang?.startsWith('en') ? l.en : l.tr
}
