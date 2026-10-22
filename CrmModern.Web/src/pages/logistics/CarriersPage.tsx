import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { getCarriers, getCesitler } from '@/api/logistics'
import { PageHeader } from '@/components/PageHeader'
import { SectionTitle } from '@/components/ui/section-title'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { trLower } from '@/components/ui/combobox'

/**
 * LojistikYontim.cs portu — DB'de ayrı tablo yok, taşıyıcı listesi sevk
 * kayıtlarından dinamik üretilir (CRUD yok). QW-12: başlıklardaki SQL ifadeleri
 * ve sabit Türkçe metinler kaldırıldı; listeler aranabilir.
 */
function ListCard({ title, items, loading }: { title: string; items: string[]; loading: boolean }) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const shown = useMemo(() => items.filter((x) => trLower(x).includes(trLower(q.trim()))), [items, q])
  return (
    <section className="space-y-2 rounded-md border bg-card p-4">
      <SectionTitle actions={!loading ? <Badge variant="neutral">{items.length}</Badge> : undefined}>{title}</SectionTitle>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input inputSize="sm" className="pl-7" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} aria-label={t('common.search')} />
      </div>
      {loading
        ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        : shown.length === 0
          ? <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
          : <ul className="max-h-[60vh] divide-y overflow-y-auto text-sm">
              {shown.map((c) => <li key={c} className="py-1.5">{c}</li>)}
            </ul>}
    </section>
  )
}

export function CarriersPage() {
  const { t } = useTranslation()
  const { data: carriers = [], isLoading: carriersLoading } = useQuery({ queryKey: ['carriers'], queryFn: getCarriers })
  const { data: cesitler = [], isLoading: cesitlerLoading } = useQuery({ queryKey: ['cesitler'], queryFn: getCesitler })

  return (
    <div>
      <PageHeader title={t('logistics.carriersTitle')} description={t('logistics.carriersDescription')} />
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:p-6">
        <ListCard title={t('logistics.carriersList')} items={carriers} loading={carriersLoading} />
        <ListCard title={t('logistics.transportTypes')} items={cesitler} loading={cesitlerLoading} />
      </div>
    </div>
  )
}
