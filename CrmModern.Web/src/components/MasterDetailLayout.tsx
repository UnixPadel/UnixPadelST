import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Maximize2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { readJSON, userKey, writeJSON } from '@/lib/storage'
import { cn } from '@/lib/utils'

const DEFAULT_SHARE = 0.45
const MIN_SHARE = 0.28
const MAX_SHARE = 0.7
/** Bu genişliğin altında panel listenin altına düşer (yan yana sığmaz). */
const STACK_BELOW = 900
/** Bu genişliğin altındaki panelde "Tam ekran" yalnız simge (ipucu + erişilebilir ad korunur). */
const COMPACT_PANEL_BELOW = 600

/**
 * Panel başlık şeridindeki boş yer: içerik (ör. sipariş detayı) durum rozetlerini
 * buraya taşıyabilir (createPortal). Böylece rozetler ayrı bir satır kaplamaz ve
 * sipariş içeriğine daha çok yükseklik kalır.
 */
const PanelHeaderSlot = createContext<HTMLElement | null>(null)
export const usePanelHeaderSlot = () => useContext(PanelHeaderSlot)

/**
 * 40+ ergonomi (4.1, K7) — "Tek ekran, tam bağlam": liste solda, seçili kaydın
 * detayı sağda. Önceden detay modalda açılıyor, liste kapanıyor ve satırlar arası
 * geçiş için kapat-aç gerekiyordu (görev değiştirme maliyeti). Panel genişliği
 * kullanıcı + sayfa bazında hatırlanır; ←/→ ile klavyeden ayarlanır. Dar kapta
 * panel listenin altına iner.
 *
 *   <FillPage>
 *     <PageHeader … />
 *     <MasterDetailLayout pageId="factory" open={!!no} onClose={…} title={no}
 *       list={<DataTable fill … />}
 *       detail={no && <OrderDetailPanel embedded siparisNo={no} />} />
 *   </FillPage>
 */
export function MasterDetailLayout({
  pageId, list, detail, open, onClose, onExpand, title, headerActions, panelLabel, defaultShare = DEFAULT_SHARE,
}: {
  pageId: string
  list: React.ReactNode
  detail: React.ReactNode
  open: boolean
  /** Verilmezse panel kapatılamaz (karar paneli gibi hep açık paneller). */
  onClose?: () => void
  /** Verilirse "Tam ekran" butonu (ör. modalda aç). */
  onExpand?: () => void
  title?: React.ReactNode
  /** Başlık şeridinin sağındaki ek işlemler (bağlantı, menü). */
  headerActions?: React.ReactNode
  /** Panelin erişilebilir adı; varsayılan "Sipariş detayı". */
  panelLabel?: string
  /** Panelin varsayılan genişlik payı (0–1); kullanıcı sürükleyince onun değeri geçerli. */
  defaultShare?: number
}) {
  const { t } = useTranslation()
  const storageKey = userKey('master-detail', pageId)
  const [share, setShare] = useState<number>(() => readJSON<number>(storageKey, defaultShare))
  const clamp = (v: number) => Math.min(MAX_SHARE, Math.max(MIN_SHARE, v))
  const save = (v: number) => { const c = clamp(v); setShare(c); writeJSON(storageKey, c) }

  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const stacked = width > 0 && width < STACK_BELOW
  const panelWidth = stacked ? width : width * share
  const compactHeader = panelWidth > 0 && panelWidth < COMPACT_PANEL_BELOW
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault()
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return
    let last = share
    const onMove = (ev: PointerEvent) => {
      last = clamp((box.right - ev.clientX) / box.width)
      setShare(last)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      save(last)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div ref={boxRef} className={cn('!shrink flex min-h-0 flex-1 gap-0 px-4 pb-2 pt-2', stacked && 'flex-col gap-2')}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{list}</div>
      {open && (
        <>
          {!stacked && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label={t('layout.splitter')}
              aria-valuenow={Math.round(share * 100)}
              aria-valuemin={Math.round(MIN_SHARE * 100)}
              aria-valuemax={Math.round(MAX_SHARE * 100)}
              tabIndex={0}
              title={t('layout.splitterHint')}
              onPointerDown={startDrag}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') { e.preventDefault(); save(share + 0.03) }
                else if (e.key === 'ArrowRight') { e.preventDefault(); save(share - 0.03) }
              }}
              className="mx-1 flex w-3 shrink-0 cursor-col-resize items-center justify-center rounded hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="h-10 w-1 rounded bg-border-strong" />
            </div>
          )}
          <aside
            aria-label={panelLabel ?? t('masterDetail.panel')}
            className={cn('flex min-h-0 flex-col overflow-hidden rounded-md border bg-card', stacked ? 'h-[55%] shrink-0' : 'shrink-0')}
            style={stacked ? undefined : { width: `${share * 100}%` }}
          >
            <div className="flex shrink-0 items-center gap-2 border-b bg-muted px-3 py-1.5">
              <span className="min-w-0 truncate text-sm font-semibold">{title}</span>
              <span ref={setSlot} className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden" />
              {headerActions}
              {onExpand && (
                <Button size="xs" variant="ghost" onClick={onExpand} title={t('masterDetail.expand')} aria-label={t('masterDetail.expand')} className="shrink-0">
                  <Maximize2 className="h-4 w-4" aria-hidden /> {!compactHeader && t('masterDetail.expand')}
                </Button>
              )}
              {onClose && (
                <Button size="xs" variant="ghost" onClick={onClose}>
                  <X className="h-4 w-4" aria-hidden /> {t('masterDetail.close')}
                </Button>
              )}
            </div>
            <PanelHeaderSlot.Provider value={slot}>
              <div className="flex min-h-0 flex-1 flex-col pt-2">{detail}</div>
            </PanelHeaderSlot.Provider>
          </aside>
        </>
      )}
    </div>
  )
}
