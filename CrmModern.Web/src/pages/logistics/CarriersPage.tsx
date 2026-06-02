import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getCarriers, getCesitler } from '@/api/logistics'
import { PageHeader } from '@/components/PageHeader'

/**
 * LojistikYontim.cs portu — DB'de ayrı tablo yok, taşıyıcı listesi
 * `SELECT DISTINCT FirmaAdi FROM LojistikTablo` ile dinamik üretilir.
 * CRUD eklenmedi (bulgular: docs/faz4-lojistikyontim-bulgular.md).
 */
export function CarriersPage() {
  const { t } = useTranslation()
  const { data: carriers = [], isLoading: carriersLoading } = useQuery({
    queryKey: ['carriers'], queryFn: getCarriers,
  })
  const { data: cesitler = [], isLoading: cesitlerLoading } = useQuery({
    queryKey: ['cesitler'], queryFn: getCesitler,
  })

  return (
    <div>
      <PageHeader title={t('logistics.carriersTitle')} />
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-md border bg-card p-4">
          <h3 className="font-semibold mb-2">Taşıyıcılar (DISTINCT FirmaAdi)</h3>
          {carriersLoading
            ? <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            : carriers.length === 0
              ? <p className="text-sm text-muted-foreground">Henüz kayıt yok.</p>
              : <ul className="text-sm space-y-1">
                  {carriers.map((c) => <li key={c} className="border-b py-1">{c}</li>)}
                </ul>}
        </section>
        <section className="rounded-md border bg-card p-4">
          <h3 className="font-semibold mb-2">Taşıma Türleri (DISTINCT LojistikCesit)</h3>
          {cesitlerLoading
            ? <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            : cesitler.length === 0
              ? <p className="text-sm text-muted-foreground">Henüz kayıt yok.</p>
              : <ul className="text-sm space-y-1">
                  {cesitler.map((c) => <li key={c} className="border-b py-1">{c}</li>)}
                </ul>}
        </section>
      </div>
    </div>
  )
}
