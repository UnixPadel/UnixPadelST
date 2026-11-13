import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Eye, Inbox, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/StatusBadge'
import { AgeChip } from '@/components/AgeChip'
import { useWorkQueues } from '@/hooks/useWorkQueues'

/**
 * E-10 — Fiori "My Inbox" / Worklist: role göre birleşik Bekleyen İşler. Kuyruk
 * mantığı `useWorkQueues`'ta (Ana Sayfa paneliyle aynı kural). Her kalemde yaş
 * ("3 gün", AgeChip) — eşik aşılınca uyarı tonu — ve satır içi birincil aksiyon:
 * ilgili ekranı o kayıt seçili olarak açar (?sel=NO) ya da detayı (Sipariş
 * Geçmişi dahil) bulunduğu yerde gösterir (?order=NO).
 */
export function WorkInboxPage() {
  const { t } = useTranslation()
  const [, setParams] = useSearchParams()
  const { queues, total, anyLoading, anyError, refetchAll } = useWorkQueues()
  const queryClient = useQueryClient()
  // Yenile: listeler + Ana Sayfa paneli / menü rozeti özeti birlikte.
  const refresh = () => { refetchAll(); void queryClient.invalidateQueries({ queryKey: ['inbox-summary'] }) }

  return (
    <div>
      <PageHeader
        title={t('inbox.title')}
        description={t('inbox.description')}
        meta={!anyLoading && !anyError ? <Badge variant={total ? 'warning' : 'success'}>{t('inbox.total', { count: total })}</Badge> : undefined}
        actions={<Button size="sm" variant="outline" onClick={refresh}><RefreshCw className="h-4 w-4" /> {t('common.refresh')}</Button>}
      />
      <div className="grid gap-4 p-4 lg:p-6 xl:grid-cols-2">
        {queues.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Inbox className="h-10 w-10 opacity-40" />
            <p>{t('inbox.noQueues')}</p>
          </div>
        )}
        {queues.map((q) => (
          <section key={q.id} className="flex flex-col rounded-md border bg-card" aria-labelledby={`q-${q.id}`}>
            <header className="flex items-center gap-2 border-b px-3 py-2">
              <h2 id={`q-${q.id}`} className="text-sm font-semibold">{t(q.titleKey)}</h2>
              {!q.loading && !q.error && <Badge variant={q.items.length ? 'warning' : 'neutral'}>{q.items.length}</Badge>}
              <Link to={q.path} className="ml-auto text-xs text-primary hover:underline">{t('inbox.openScreen')}</Link>
            </header>
            <p className="px-3 pt-2 text-xs text-muted-foreground">{t(q.hintKey)}</p>
            <ul className="max-h-80 divide-y overflow-y-auto p-1">
              {q.loading && Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="px-2 py-2"><div className="h-4 animate-pulse rounded bg-muted" /></li>
              ))}
              {!q.loading && q.error && (
                <li className="px-2 py-4 text-center text-xs text-destructive">{t('inbox.loadError')}</li>
              )}
              {!q.loading && !q.error && q.items.length === 0 && (
                <li className="px-2 py-4 text-center text-xs text-muted-foreground">{t('inbox.empty')}</li>
              )}
              {q.items.map((it) => (
                <li key={it.key} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{it.no}</span>
                      {it.status && <StatusBadge value={it.status.value} context={it.status.context} />}
                    </div>
                    <p className="truncate">{it.title}{it.subtitle ? <span className="text-muted-foreground"> · {it.subtitle}</span> : null}</p>
                  </div>
                  <AgeChip since={it.since} />
                  {it.orderNo && (
                    <Button size="icon-sm" variant="ghost" aria-label={t('common.details')}
                      onClick={() => setParams((p) => { const np = new URLSearchParams(p); np.set('order', it.orderNo!); return np })}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="xs" asChild>
                    <Link to={it.actionPath}>{t('inbox.process')} <ArrowRight className="h-3.5 w-3.5" /></Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
