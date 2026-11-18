import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getMyPurchaseRequests } from '@/api/purchase'
import { PageHeader } from '@/components/PageHeader'
import { FillPage, FillRegion } from '@/components/FillPage'
import { FilterBar, FilterField, useFilterState } from '@/components/FilterBar'
import { DataTable, type Column } from '@/components/DataTable'
import { PurchaseStatusBadge } from '@/components/PurchaseStatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { hideMoneyFor } from '@/lib/visibility'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { PurchaseRequestListDto } from '@/types'

import { currencyLabel } from '@/lib/currency'
// Roles that can create a new purchase request (mirror /purchase/new gate).
const CAN_CREATE_ROLES = new Set(['Yonetici', 'Lojistik', 'Fabrika', 'Gozlemci', 'Temsilci'])
const FILTER_DEFAULTS = { talepNo: '' }

export function MyPurchaseRequestsPage() {
  const nav = useNavigate()
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const user = getUser()
  const canCreate = !!user && CAN_CREATE_ROLES.has(user.yetkiTuru)
  // Round-11 §3 — omur.caliskan (Gozlemci) parasal değer görmez.
  const hideMoney = hideMoneyFor(user)
  const { data = [], isLoading } = useQuery({ queryKey: ['purchase-mine'], queryFn: getMyPurchaseRequests })
  // Üst arama kutusundan gelen talep f.talepNo ile açılır; "Sıfırla" tüm listeye döner.
  const { values: f, set, reset } = useFilterState(FILTER_DEFAULTS)
  const rows = f.talepNo ? data.filter((r) => String(r.talepID) === f.talepNo) : data

  const cols: Column<PurchaseRequestListDto & Record<string, unknown>>[] = [
    { key: 'talepID',       header: t('purchase.cols.id'), sortable: true },
    { key: 'urunAdi',       header: t('purchase.cols.urun') },
    { key: 'urunTuru',      header: t('purchase.cols.tur') },
    ...(!hideMoney ? [
      { key: 'paraBirimi',   header: t('purchase.paraBirimi'), render: (r) => currencyLabel(t, r.paraBirimi) || '—' },
      { key: 'urunMaliyeti', header: t('purchase.cols.maliyet'), render: (r) => formatCurrency((r.urunMaliyeti as number) ?? 0, (r.paraBirimi as string) ?? '') },
    ] satisfies Column<PurchaseRequestListDto & Record<string, unknown>>[] : []),
    { key: 'alinanYer',     header: t('purchase.cols.alinanYer') },
    { key: 'departman',     header: t('purchase.cols.departman'), render: (r) => r.departman ? t(`roles.${r.departman as string}`, { defaultValue: r.departman as string }) : '—' },
    { key: 'talepTarihi',   header: t('purchase.cols.tarih'), render: (r) => formatDate(r.talepTarihi as string) },
    { key: 'durum',         header: t('purchase.cols.durum'), render: (r) => <PurchaseStatusBadge value={r.durum as string} /> },
    { key: 'redNotu',       header: t('common.note'), render: (r) => <span className="text-xs text-muted-foreground">{(r.redNotu as string) ?? '—'}</span> },
  ]

  return (
    // Scaling Faz 2 — FillPage: sayfa kaymaz, tablo kalan yüksekliği doldurur
    // (başlık + araç çubuğu yerinde kalır).
    <FillPage>
      <PageHeader density="compact"
        title={t('purchase.mineTitle')}
        actions={canCreate ? <Button onClick={() => nav('/purchase/new')}>{t('common.add')}</Button> : undefined}
      />
      <div className="px-4 pt-2">
        <FilterBar onReset={reset}>
          <FilterField label={t('purchase.filter.talepNo')}>
            <Input inputSize="sm" inputMode="numeric" value={f.talepNo} onChange={(e) => set('talepNo', e.target.value.replace(/\D/g, '').slice(0, 9))} />
          </FilterField>
        </FilterBar>
      </div>
      <FillRegion className="pt-2">
        <DataTable fill columns={cols} data={rows as (PurchaseRequestListDto & Record<string, unknown>)[]} keyField="talepID" loading={isLoading} />
      </FillRegion>
    </FillPage>
  )
}
