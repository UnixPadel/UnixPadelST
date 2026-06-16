import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getMyPurchaseRequests } from '@/api/purchase'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { PurchaseStatusBadge } from '@/components/PurchaseStatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { hideMoneyFor } from '@/lib/visibility'
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
  // Round-11 §3 — omur.caliskan (Gozlemci) parasal değer görmez.
  const hideMoney = hideMoneyFor(user)
  const { data = [], isLoading } = useQuery({ queryKey: ['purchase-mine'], queryFn: getMyPurchaseRequests })

  const cols: Column<PurchaseRequestListDto & Record<string, unknown>>[] = [
    { key: 'talepID',       header: t('purchase.cols.id'), sortable: true },
    { key: 'urunAdi',       header: t('purchase.cols.urun') },
    { key: 'urunTuru',      header: t('purchase.cols.tur') },
    ...(!hideMoney ? [
      { key: 'paraBirimi',   header: t('purchase.paraBirimi'), render: (r) => (r.paraBirimi as string) ?? '—' },
      { key: 'urunMaliyeti', header: t('purchase.cols.maliyet'), render: (r) => formatCurrency((r.urunMaliyeti as number) ?? 0, (r.paraBirimi as string) ?? '') },
    ] satisfies Column<PurchaseRequestListDto & Record<string, unknown>>[] : []),
    { key: 'alinanYer',     header: t('purchase.cols.alinanYer') },
    { key: 'departman',     header: t('purchase.cols.departman'), render: (r) => r.departman ? t(`roles.${r.departman as string}`, { defaultValue: r.departman as string }) : '—' },
    { key: 'talepTarihi',   header: t('purchase.cols.tarih'), render: (r) => formatDate(r.talepTarihi as string) },
    { key: 'durum',         header: t('purchase.cols.durum'), render: (r) => <PurchaseStatusBadge value={r.durum as string} /> },
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
