import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useHotkeys } from '@/hooks/useHotkeys'
import { readJSON, userKey, writeJSON } from '@/lib/storage'
import { cn } from '@/lib/utils'

/**
 * Scaling Faz 1 — viewport'u dolduran liste ekranı iskeleti.
 *
 *   <FillPage>
 *     <PageHeader … />                         ← shrink-0
 *     <ResizableTop pageId="qc">…</ResizableTop> ← opsiyonel üst panel + splitter
 *     <FillRegion><DataTable fill … /></FillRegion>  ← kalan yükseklik
 *   </FillPage>
 *
 * Sayfa dikeyde kaymaz (main'in scroll'u kullanılmaz); tablo kendi kabında kayar,
 * başlığı ve toolbar'ı yerinde kalır.
 */
export function FillPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex h-full min-h-0 flex-col overflow-hidden [&>*]:shrink-0', className)}>{children}</div>
}

/** Kalan yüksekliği alan bölge (tipik olarak DataTable fill). */
export function FillRegion({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('!shrink min-h-0 flex-1 px-4 pb-2', className)}>{children}</div>
}

const MIN_TOP = 72
/** Varsayılan üst panel payı (FillPage yüksekliğinin oranı) — tablo ana odak. */
const DEFAULT_SHARE = 0.35
/** Splitter'ın altında tabloya her zaman kalacak en az yükseklik. */
const MIN_BOTTOM = 160

interface SplitState { height: number | null; collapsed: boolean }

/**
 * Üst detay paneli + sürüklenebilir splitter (eski QC splitter'ının genel hali).
 *  • Varsayılan: doğal yükseklik, ama ebeveynin en fazla %35'i (fazlası kendi içinde kayar).
 *  • Sürüklenen yükseklik ve katlı/açık durumu kullanıcı + sayfa bazında hatırlanır.
 *  • Katlıyken `collapsed` (tek satır özet) gösterilir; F7 veya splitter düğmesi açar/katlar.
 *  • className'de `flex` verilirse kartlar kısıtlı yüksekliğe uzar; kart `min-h-0
 *    overflow-y-auto` + aksiyonlar `sticky bottom-0` ile butonlar görünür kalır.
 */
export function ResizableTop({
  pageId, children, collapsed: collapsedContent, className, defaultShare = DEFAULT_SHARE, stable = false,
}: {
  pageId: string
  /** Varsayılan üst pay (0–1); sürüklenince kullanıcının değeri geçerli olur. */
  defaultShare?: number
  /** true → içerik kısa olsa da varsayılan pay kadar sabit yükseklik (satır değişince grid zıplamaz). */
  stable?: boolean
  children: React.ReactNode
  /** Katlıyken gösterilecek tek satırlık özet şerit. */
  collapsed?: React.ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const storageKey = userKey('split', pageId)
  const [state, setState] = useState<SplitState>(() => ({ height: null, collapsed: false, ...readJSON<Partial<SplitState>>(storageKey, {}) }))
  const update = (patch: Partial<SplitState>) => setState((s) => {
    const next = { ...s, ...patch }
    writeJSON(storageKey, next)
    return next
  })

  const topRef = useRef<HTMLDivElement>(null)
  // Ebeveyn (FillPage) yüksekliği — varsayılan pay ve sürükleme sınırları buna göre.
  const [parentH, setParentH] = useState(0)
  useEffect(() => {
    const parent = topRef.current?.parentElement
    if (!parent) return
    const ro = new ResizeObserver(() => setParentH(parent.clientHeight))
    ro.observe(parent)
    setParentH(parent.clientHeight)
    return () => ro.disconnect()
  }, [])

  const maxTop = Math.max(MIN_TOP, parentH - MIN_BOTTOM)
  const clamp = (h: number) => Math.min(Math.max(h, MIN_TOP), maxTop)
  // Kayıtlı yükseklik pencere küçülünce de tabloya yer bıraksın.
  const height = state.height !== null ? clamp(state.height) : null
  const defaultCap = parentH ? Math.max(MIN_TOP, Math.round(parentH * defaultShare)) : undefined

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = topRef.current?.getBoundingClientRect().height ?? 240
    if (state.collapsed) update({ collapsed: false })
    let last = startH
    const onMove = (ev: PointerEvent) => {
      last = clamp(startH + ev.clientY - startY)
      setState((s) => ({ ...s, height: last }))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      update({ height: last })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const toggle = () => update({ collapsed: !state.collapsed })
  useHotkeys({ f7: toggle })

  return (
    <>
      <div
        ref={topRef}
        className={cn('overflow-y-auto', className)}
        style={state.collapsed ? undefined : height !== null ? { height } : stable ? { height: defaultCap } : { maxHeight: defaultCap }}
      >
        {state.collapsed ? collapsedContent : children}
      </div>
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label={t('layout.splitter')}
        aria-expanded={!state.collapsed}
        tabIndex={0}
        title={`${t('layout.splitterHint')} (F7)`}
        className="group relative mx-4 flex h-2 cursor-row-resize items-center justify-center rounded bg-border/60 hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onPointerDown={startDrag}
        onDoubleClick={toggle}
        onKeyDown={(e) => {
          // Klavye: ↑/↓ 24px, Enter/Space katla-aç.
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); return }
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
          e.preventDefault()
          const cur = topRef.current?.getBoundingClientRect().height ?? 240
          update({ collapsed: false, height: clamp(cur + (e.key === 'ArrowDown' ? 24 : -24)) })
        }}
      >
        <div className="h-0.5 w-10 rounded bg-muted-foreground/40" />
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={toggle}
          className="absolute right-0 top-1/2 flex h-5 -translate-y-1/2 items-center gap-1 rounded border bg-background px-1.5 text-[11px] text-muted-foreground shadow-sm hover:text-foreground"
          aria-label={state.collapsed ? t('layout.expandTop') : t('layout.collapseTop')}
        >
          {state.collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          {state.collapsed ? t('layout.expandTop') : t('layout.collapseTop')}
        </button>
      </div>
    </>
  )
}
