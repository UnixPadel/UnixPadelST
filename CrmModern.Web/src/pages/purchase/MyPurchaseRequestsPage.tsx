import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getMyPurchaseRequests } from '@/api/purchase'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { PurchaseStatusBadge } from '@/components/PurchaseStatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { PurchaseRequestListDto } from '@/types'

// Roles that can create a new purchase request (mirror /purchase/new gate).
const CAN_CREATE_ROLES = new Set(['Yonetici', 'Lojistik', 'Fabrika', 'Gozlemci', 'Temsilci'])

export function MyPurchaseRequestsPage() {
  const nav = useNavigate()
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const user = getUser()
  const canCreate = !!user && CAN_CREATE_ROLES.has(user.yetkiTuru)
  const { data = [], isLoading } = useQuery({ queryKey: ['purchase-mine'], queryFn: getMyPurchaseRequests })

  const cols: Column<PurchaseRequestListDto & Record<string, unknown>>[] = [
    { key: 'talepID',       header: 'ID', sortable: true },
    { key: 'urunAdi',       header: t('common.name') },
    { key: 'urunTuru',      header: t('common.module') },
    { key: 'urunMaliyeti',  header: t('common.amount'), render: (r) => formatCurrency((r.urunMaliyeti as number) ?? 0) },
    { key: 'alinanYer',     header: t('common.address') },
    { key: 'departman',     header: t('users.yetkiTuru') },
    { key: 'talepTarihi',   header: t('common.date'), render: (r) => formatDate(r.talepTarihi as string) },
    { key: 'durum',         header: t('common.status'), render: (r) => <PurchaseStatusBadge value={r.durum as string} /> },
    { key: 'redNotu',       header: t('common.note'), render: (r) => <span className="text-xs text-muted-foreground">{(r.redNotu as string) ?? '—'}</span> },
  ]

  return (
    <div>
      <PageHeader
        title={t('purchase.mineTitle')}
        actions={canCreate ? <Button onClick={() => nav('/purchase/new')}>{t('common.add')}</Button> : undefined}
      />
      <div className="p-6">
        <DataTable columns={cols} data={data as (PurchaseRequestListDto & Record<string, unknown>)[]} keyField="talepID" loading={isLoading} />
      </div>
    </div>
  )
}
