import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Loader2, Clock, CornerDownLeft, FileSearch, FilePlus2, PencilLine, Copy } from 'lucide-react'
import { unifiedSearch } from '@/api/search'
import { useAuth } from '@/hooks/useAuth'
import { visibleNavItems, type NavItem } from '@/lib/navigation'
import { readJSON, userKey, writeJSON } from '@/lib/storage'
import { trLower } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import type { UnifiedSearchHit } from '@/types'

/**
 * E-1 — Komut Paleti (Ctrl+K). GlobalSearch'ün yerini alır:
 *  • Kayıt araması (sipariş, müşteri, bileşen…) — 300 ms debounce, önceki istek iptal.
 *  • SAP işlem kodu mantığı: "YS" → Yeni Sipariş, "KK" → Kontrol … (menüdeki kodlar).
 *  • Belge komutları: "SP 2025-0123" sipariş detayını açar, "RV …" revize, "KP …"
 *    kopyala-ile-yeni. Kod ezberi zorunlu değil — ekran adıyla da bulunur.
 *  • ↑/↓ gez, Enter aç, Esc kapat. Son kullanılanlar hatırlanır.
 */
type PaletteItem =
  | { kind: 'nav'; id: string; item: NavItem }
  | { kind: 'doc'; id: string; cmd: 'SP' | 'RV' | 'KP'; no: string }
  | { kind: 'hit'; id: string; hit: UnifiedSearchHit; recent?: boolean }

const RECENT_KEY = 'globalSearchRecent'
const DOC_RE = /^(sp|rv|kp)\s+(\S+)$/i

export function CommandPalette() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [, setParams] = useSearchParams()
  const { getUser } = useAuth()
  const user = getUser()
  const navItems = useMemo(() => visibleNavItems(user), [user])
  const canCreate = !!user && (user.yetkiTuru === 'Temsilci' || navItems.some((n) => n.path === '/orders/new'))

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [hits, setHits] = useState<UnifiedSearchHit[]>([])
  const [active, setActive] = useState(0)
  const recentKey = userKey(RECENT_KEY)
  const [recents, setRecents] = useState<UnifiedSearchHit[]>(() => readJSON(recentKey, readJSON(RECENT_KEY, [])))
  const inputRef = useRef<HTMLInputElement>(null)

  const openPalette = () => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }

  // Ctrl/Cmd+K açar; Esc kapatır (açıkken).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette() }
      else if (e.key === 'Escape' && open) setOpen(false)
    }
    const onOpenEvt = () => openPalette()
    window.addEventListener('keydown', onKey)
    window.addEventListener('open-command-palette', onOpenEvt)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('open-command-palette', onOpenEvt)
    }
  }, [open])

  // Debounced + iptal edilebilir kayıt araması
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2 || DOC_RE.test(q) || /^>/.test(q)) { setHits([]); setLoading(false); return }
    setLoading(true)
    const ctrl = new AbortController()
    const h = setTimeout(async () => {
      try {
        const result = await unifiedSearch(q, ctrl.signal)
        setHits(result.sonuclar)
      } catch {
        if (!ctrl.signal.aborted) setHits([])
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    }, 300)
    return () => { clearTimeout(h); ctrl.abort() }
  }, [query])

  const items: PaletteItem[] = useMemo(() => {
    const q = query.trim().replace(/^>\s*/, '')
    const lq = trLower(q)
    const out: PaletteItem[] = []
    const doc = q.match(DOC_RE)
    if (doc) {
      const cmd = doc[1].toUpperCase() as 'SP' | 'RV' | 'KP'
      if (cmd === 'SP' || canCreate) out.push({ kind: 'doc', id: `doc-${cmd}`, cmd, no: doc[2] })
    }
    // İşlem kodu tam eşleşmesi en üstte; ardından ad eşleşmeleri.
    const exact = navItems.filter((n) => lq && trLower(n.code) === lq)
    const byName = lq
      ? navItems.filter((n) => !exact.includes(n) && (trLower(t(n.i18nKey)).includes(lq) || trLower(n.code).startsWith(lq)))
      : (query.trim() === '' ? [] : [])
    for (const n of [...exact, ...byName].slice(0, 8)) out.push({ kind: 'nav', id: `nav-${n.path}`, item: n })
    if (!q) {
      recents.forEach((h) => out.push({ kind: 'hit', id: `r-${h.kategori}-${h.id}`, hit: h, recent: true }))
    } else {
      hits.forEach((h) => out.push({ kind: 'hit', id: `h-${h.kategori}-${h.id}`, hit: h }))
    }
    return out
  }, [query, navItems, hits, recents, t, canCreate])

  useEffect(() => { setActive(0) }, [query, hits.length])

  const close = () => { setOpen(false); setQuery(''); setHits([]) }

  const run = (it: PaletteItem | undefined) => {
    if (!it) return
    if (it.kind === 'nav') navigate(it.item.path)
    else if (it.kind === 'doc') {
      if (it.cmd === 'SP') setParams((p) => { const np = new URLSearchParams(p); np.set('order', it.no); return np })
      else if (it.cmd === 'RV') navigate(`/orders/new?revise=${encodeURIComponent(it.no)}`)
      else navigate(`/orders/new?copyFrom=${encodeURIComponent(it.no)}`)
    } else {
      const h = it.hit
      const next = [h, ...recents.filter((r) => !(r.kategori === h.kategori && r.id === h.id))].slice(0, 6)
      setRecents(next)
      writeJSON(recentKey, next)
      navigate(h.navigateUrl)
    }
    close()
  }

  const clearRecents = () => { setRecents([]); writeJSON(recentKey, []) }

  // Gruplu görünüm için başlıklar
  const section = (it: PaletteItem) =>
    it.kind === 'nav' ? t('palette.screens') : it.kind === 'doc' ? t('palette.commands') : it.recent ? t('palette.recent') : it.hit.kategori

  return (
    <div className="relative w-full max-w-xl">
      <button
        type="button"
        onClick={openPalette}
        className="flex w-full items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
        aria-haspopup="dialog"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 truncate text-left">{t('palette.trigger')}</span>
        <kbd className="hidden items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={close} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('palette.title')}
            className="absolute left-0 right-0 z-50 mt-2 flex max-h-[70vh] flex-col overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg"
          >
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                role="combobox"
                aria-expanded
                aria-controls="palette-list"
                aria-activedescendant={items[active] ? `pal-${active}` : undefined}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('palette.placeholder')}
                className="flex-1 bg-transparent text-sm outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)) }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
                  else if (e.key === 'Enter') { e.preventDefault(); run(items[active]) }
                  else if (e.key === 'Escape') { e.preventDefault(); close() }
                }}
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            <div id="palette-list" role="listbox" className="flex-1 overflow-y-auto py-1">
              {items.length === 0 && !loading && (
                <div className="space-y-2 p-4 text-sm text-muted-foreground">
                  <p>{query.trim().length >= 2 ? t('palette.noResults') : t('palette.help')}</p>
                  <p className="text-xs">{t('palette.codesHint')}</p>
                </div>
              )}
              {items.map((it, i) => {
                const header = i === 0 || section(items[i - 1]) !== section(it) ? section(it) : null
                return (
                  <div key={it.id}>
                    {header && (
                      <div className="flex items-center justify-between bg-muted/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <span className="flex items-center gap-1">{it.kind === 'hit' && it.recent && <Clock className="h-3 w-3" />}{header}</span>
                        {it.kind === 'hit' && it.recent && (
                          <button onClick={clearRecents} className="text-[10px] font-normal normal-case hover:text-foreground">{t('common.clear')}</button>
                        )}
                      </div>
                    )}
                    <button
                      id={`pal-${i}`}
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => run(it)}
                      className={cn('flex w-full items-center gap-3 px-3 py-2 text-left', i === active && 'bg-accent')}
                    >
                      {it.kind === 'nav' && (
                        <>
                          <it.item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate text-sm">{t(it.item.i18nKey)}</span>
                          <kbd className="rounded border bg-muted px-1.5 font-mono text-[10px]">{it.item.code}</kbd>
                        </>
                      )}
                      {it.kind === 'doc' && (
                        <>
                          {it.cmd === 'SP' ? <FileSearch className="h-4 w-4 shrink-0" /> : it.cmd === 'RV' ? <PencilLine className="h-4 w-4 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
                          <span className="flex-1 truncate text-sm">{t(`palette.doc.${it.cmd}`, { no: it.no })}</span>
                        </>
                      )}
                      {it.kind === 'hit' && (
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-sm font-medium">{it.hit.baslik}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {it.recent ? it.hit.kategori : ''}{it.recent && it.hit.altMetin ? ' • ' : ''}{it.hit.altMetin ?? ''}
                          </span>
                        </span>
                      )}
                      {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-3 border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              <span><kbd className="font-mono">↑↓</kbd> {t('palette.navigate')}</span>
              <span><kbd className="font-mono">Enter</kbd> {t('palette.open')}</span>
              <span><kbd className="font-mono">Esc</kbd> {t('common.close')}</span>
              {canCreate && <span className="ml-auto flex items-center gap-1"><FilePlus2 className="h-3 w-3" /> YS · SP/RV/KP &lt;no&gt;</span>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
