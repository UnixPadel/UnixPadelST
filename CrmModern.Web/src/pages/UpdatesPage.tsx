import { Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CHANGELOG, CURRENT_VERSION } from '@/data/changelog'

/**
 * Faz 7 — "Neler Yeni" sayfası.
 * WinForms Yenilik.cs formunun modern UI karşılığı; içerik statik
 * `data/changelog.ts` dosyasından okunur.
 */
export function UpdatesPage() {
  return (
    <div>
      <PageHeader
        title="Neler Yeni"
        description={`Şu anki sürüm: v${CURRENT_VERSION}`}
      />
      <div className="p-6 space-y-4 max-w-3xl">
        {CHANGELOG.map((entry) => {
          const isCurrent = entry.versiyon === CURRENT_VERSION
          return (
            <Card key={entry.versiyon} className={isCurrent ? 'border-amber-300 dark:border-amber-700' : ''}>
              <CardHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  {isCurrent && <Sparkles className="h-4 w-4 text-amber-500" />}
                  <CardTitle className="text-base">{entry.baslik}</CardTitle>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    v{entry.versiyon}
                  </span>
                  <span className="text-xs text-muted-foreground">{entry.tarih}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {entry.maddeler.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
