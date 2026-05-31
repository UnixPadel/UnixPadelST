import { useQuery } from '@tanstack/react-query'
import { getApprovals } from '@/api/orders'
import { formatDate } from '@/lib/utils'

interface Props { siparisNo: string | null }

export function OrderApprovalTimeline({ siparisNo }: Props) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['approvals', siparisNo],
    queryFn: () => getApprovals(siparisNo!),
    enabled: !!siparisNo,
  })

  if (!siparisNo) return null
  if (isLoading) return <div className="text-sm text-muted-foreground">Onay geçmişi yükleniyor...</div>
  if (data.length === 0) return <div className="text-sm text-muted-foreground">Onay kaydı yok.</div>

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Onay Geçmişi</h4>
      <ol className="relative border-l ml-2 pl-4 space-y-3">
        {data.map((a) => (
          <li key={a.onayID} className="text-sm">
            <span
              className={
                'inline-block px-2 py-0.5 text-xs rounded mr-2 ' +
                (a.onayDurumu === 'Onaylandi' ? 'bg-green-100 text-green-700'
                  : a.onayDurumu === 'Reddedildi' ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700')
              }
            >
              {a.onayDurumu}
            </span>
            <span className="text-muted-foreground">{a.kullaniciAdi ?? `#${a.kullaniciID}`}</span>
            {a.onayTarih && <span className="text-muted-foreground"> — {formatDate(a.onayTarih)}</span>}
            {a.aciklama && <p className="mt-1 ml-1 text-xs">{a.aciklama}</p>}
          </li>
        ))}
      </ol>
    </div>
  )
}
