import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Loader2, Clock } from 'lucide-react'
import { unifiedSearch } from '@/api/search'
import type { UnifiedSearchHit } from '@/types'

// Faz 8.11 — Son aramalar (localStorage). Maks 5 girdi, tekrarlanan kaldırılır.
const RECENT_KEY = 'globalSearchRecent'

function loadRecents(): UnifiedSearchHit[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') }
  catch { return [] }
}
function saveRecents(hits: UnifiedSearchHit[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(hits.slice(0, 5))) } catch {}
}

/**
 * Topbar global arama (Faz 7).
 * WinForms'ta yoktu — modern UI özelliği. Ctrl/Cmd+K ile açılır;
 * 300 ms debounce sonrası `/api/search/unified` çağrılır, kategori bazlı gruplanmış dropdown gösterilir.
 */
export function GlobalSearch() {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [loading, setLoading] = useState(false)
  const [hits,    setHits]    = useState<UnifiedSearchHit[]>([])
  const [recents, setRecents] = useState<UnifiedSearchHit[]>(loadRecents())
  const inputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()

  // Ctrl/Cmd+K toggles open + focuses input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 0)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      setLoading(false)
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const result = await unifiedSearch(q)
        setHits(result.sonuclar)
      } catch {
        setHits([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Group by kategori
  const grouped = hits.reduce<Record<string, UnifiedSearchHit[]>>((acc, h) => {
    (acc[h.kategori] ??= []).push(h)
    return acc
  }, {})

  function onPickHit(h: UnifiedSearchHit) {
    // Recents: aynı kategori+id'yi başa al, max 5 tut
    const dedup = recents.filter(r => !(r.kategori === h.kategori && r.id === h.id))
    const next = [h, ...dedup].slice(0, 5)
    setRecents(next)
    saveRecents(next)

    setOpen(false)
    setQuery('')
    setHits([])
    navigate(h.navigateUrl)
  }

  function clearRecents() {
    setRecents([])
    saveRecents([])
  }

  return (
    <div className="relative w-full max-w-xl">
      {/* Top trigger (always visible in topbar) */}
      <button
        type="button"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background text-sm text-muted-foreground hover:bg-accent transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Sipariş, müşteri, bileşen ara…</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setOpen(false)}
          />
          {/* dropdown panel */}
          <div className="absolute left-0 right-0 mt-2 z-50 rounded-lg border bg-popover text-popover-foreground shadow-lg max-h-[70vh] overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="En az 2 karakter yazın…"
                className="flex-1 bg-transparent outline-none text-sm"
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {query.trim().length < 2 && recents.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">
                  Sipariş numarası, müşteri adı, bileşen, kullanıcı ya da satın alma talep adı girin.
                </p>
              )}
              {query.trim().length < 2 && recents.length > 0 && (
                <div className="py-1">
                  <div className="flex items-center justify-between px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/50">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Son Aramalar</span>
                    <button onClick={clearRecents} className="text-[10px] hover:text-foreground normal-case font-normal">Temizle</button>
                  </div>
                  {recents.map((h) => (
                    <button
                      key={`recent-${h.kategori}-${h.id}`}
                      onClick={() => onPickHit(h)}
                      className="w-full text-left px-3 py-2 hover:bg-accent flex flex-col gap-0.5 border-b last:border-b-0"
                    >
                      <span className="text-sm font-medium truncate">{h.baslik}</span>
                      <span className="text-xs text-muted-foreground truncate">{h.kategori}{h.altMetin ? ` • ${h.altMetin}` : ''}</span>
                    </button>
                  ))}
                </div>
              )}
              {query.trim().length >= 2 && !loading && hits.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">Sonuç bulunamadı.</p>
              )}
              {Object.entries(grouped).map(([kategori, items]) => (
                <div key={kategori} className="py-1">
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/50">
                    {kategori}
                  </div>
                  {items.map((h) => (
                    <button
                      key={`${kategori}-${h.id}`}
                      onClick={() => onPickHit(h)}
                      className="w-full text-left px-3 py-2 hover:bg-accent flex flex-col gap-0.5 border-b last:border-b-0"
                    >
                      <span className="text-sm font-medium truncate">{h.baslik}</span>
                      {h.altMetin && (
                        <span className="text-xs text-muted-foreground truncate">{h.altMetin}</span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
