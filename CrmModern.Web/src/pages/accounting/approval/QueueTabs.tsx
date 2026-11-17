import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ALL_VIEWS, QUEUE_VIEWS, isQueueView, type QueueView, type ViewId } from './views'

/**
 * "Hangi iş?" — üç iş kuyruğu birincil sekme, "Tüm siparişler" ayraçla ayrılmış
 * ikincil sekme. Önceden altı eş ağırlıklı buton (3 kuyruk + 3 liste filtresi)
 * aynı sıradaydı; ödeme durumu ve tarih filtresi artık yalnız "Tüm siparişler"de.
 *
 * Sayfa başlığının yanında durur (PageHeader meta). Arama ve filtreler yalnız
 * listeyi süzdüğü için `QueueFilters` ile liste sütununun üstündedir: başlık tek
 * satır kalır, sağdaki karar paneli başlığın hemen altından başlar.
 */
export function QueueTabs({
  view, onViewChange, counts,
}: {
  view: ViewId
  onViewChange: (v: ViewId) => void
  counts: Record<QueueView, number>
}) {
  const { t } = useTranslation()
  const allActive = !isQueueView(view)

  const tab = (key: string, active: boolean, onClick: () => void, children: React.ReactNode, secondary = false) => (
    <button
      key={key}
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-ctl-sm items-center gap-2 rounded-md px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary font-semibold text-primary-foreground'
          : secondary ? 'text-muted-foreground hover:bg-accent hover:text-foreground' : 'font-medium text-foreground hover:bg-accent',
      )}
    >
      {children}
    </button>
  )

  return (
    <div role="tablist" aria-label={t('accApproval.tabs.label')} className="ml-3 flex flex-wrap items-center gap-1 rounded-lg border bg-card p-0.5">
      {QUEUE_VIEWS.map((v) => tab(v, view === v, () => onViewChange(v), (
        <>
          {t(`accApproval.tabs.${v}`)}
          <span
            className={cn('min-w-[1.5rem] rounded-full px-1.5 text-center text-xs font-semibold tabular-nums',
              view === v ? 'bg-primary-foreground text-primary'
                : counts[v] > 0 ? 'bg-warning-soft text-warning-soft-foreground' : 'bg-muted text-muted-foreground')}
            aria-label={t('nav.pendingCount', { count: counts[v] })}
          >
            {counts[v]}
          </span>
        </>
      )))}
      <span className="mx-1 w-px self-stretch bg-border" aria-hidden />
      {tab('all', allActive, () => { if (!allActive) onViewChange('hepsi') }, t('accApproval.tabs.all'), true)}
    </div>
  )
}

/** Liste sütununun üstündeki arama (+ "Tüm siparişler"de ödeme durumu ve tarih). */
export function QueueFilters({
  view, onViewChange, search, onSearch, from, to, onFrom, onTo,
}: {
  view: ViewId
  onViewChange: (v: ViewId) => void
  search: string
  onSearch: (v: string) => void
  from: string
  to: string
  onFrom: (v: string) => void
  onTo: (v: string) => void
}) {
  const { t } = useTranslation()
  const allActive = !isQueueView(view)
  // Etiket alanın solunda (satır tek sıra kalsın, dikey yer listeye ve panele kalsın).
  const field = 'flex items-center gap-2'
  const fieldLabel = 'whitespace-nowrap text-sm font-medium text-field-label'

  return (
    <div role="search" className="mb-2 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
      <label className={`${field} min-w-[14rem] flex-1`}>
        <span className={fieldLabel}>{t('accApproval.filter.search')}</span>
        <Input inputSize="sm" value={search} onChange={(e) => onSearch(e.target.value)} className="min-w-0 flex-1" />
      </label>
      {allActive && (
        <>
          <label className={field}>
            <span className={fieldLabel}>{t('accApproval.filter.odemeDurumu')}</span>
            <Select value={view} onValueChange={(v) => onViewChange(v as ViewId)}>
              <SelectTrigger size="sm" className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_VIEWS.map((v) => <SelectItem key={v} value={v}>{t(`accApproval.views.${v}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className={field}>
            <span className={fieldLabel}>{t('common.startDate')}</span>
            <Input inputSize="sm" type="date" value={from} onChange={(e) => onFrom(e.target.value)} className="w-40" />
          </label>
          <label className={field}>
            <span className={fieldLabel}>{t('common.endDate')}</span>
            <Input inputSize="sm" type="date" value={to} onChange={(e) => onTo(e.target.value)} className="w-40" />
          </label>
        </>
      )}
    </div>
  )
}
