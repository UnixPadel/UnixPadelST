import { GUIDE_SECTIONS, type GuideSection } from '@/data/guide'
import { visibleNavItems } from '@/lib/navigation'
import type { AuthUser } from '@/types'

/** Kullanıcının görebileceği bölümler: `access` ekranlarından en az birine erişim (menü kuralı). */
export function visibleGuideSections(user: AuthUser | null): GuideSection[] {
  const paths = new Set(visibleNavItems(user).map((n) => n.path))
  return GUIDE_SECTIONS.filter((s) => !s.access || s.access.some((p) => paths.has(p)))
}

/** Bulunulan ekrana ait bölüm — en uzun `routes` öneki kazanır (Sidebar aktiflik kuralı); yoksa ilk bölüm. */
export function sectionForPath(pathname: string, sections: GuideSection[]): GuideSection | undefined {
  let best: { s: GuideSection; len: number } | null = null
  for (const s of sections) {
    for (const r of s.routes ?? []) {
      const hit = pathname === r || pathname.startsWith(r + '/')
      if (hit && (!best || r.length > best.len)) best = { s, len: r.length }
    }
  }
  return best?.s ?? sections[0]
}
