import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getCustomers, deleteCustomer } from '@/api/customers'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin } from '@/lib/permissions'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { describeApiError } from '@/lib/axios'
import type { Musteri } from '@/types'

/**
 * PROMPT.md #16 (Gozlemci) + #19 (Temsilci):
 * Müşteri listesi — port of MusteriEkle.cs bottom-grid.
 *
 * Visibility matrix (see App.tsx RoleGuard):
 *   Yonetici  — list / add / edit / delete
 *   Temsilci  — list / add               (add but not edit)
 *   Gozlemci  — list / add / edit
 *   Muhasebe  — list (read-only)
 *
 * Row click → /customers/:id/edit, but only for roles that can edit.
 */

const ADD_ROLES  = new Set(['Yonetici', 'Temsilci', 'Gozlemci'])
const EDIT_ROLES = new Set(['Yonetici', 'Gozlemci'])

export function CustomersPage() {
  const nav = useNavigate()
  const { t } = useTranslation()
  const { toast } = useToast()
  const qc = useQueryClient()
  const { getUser } = useAuth()
  const role = getUser()?.yetkiTuru ?? ''
  const canAdd  = ADD_ROLES.has(role)
  const canEdit = EDIT_ROLES.has(role)
  // Round-8 §10 — müşteri silme YALNIZ elshan.rasulov (kullanıcı adı bazlı).
  const canDelete = getUser()?.kullaniciAdi === 'elshan.rasulov' || isSuperAdmin(getUser())

  const [q, setQ] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Musteri | null>(null)

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCustomer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setDeleteTarget(null)
      toast({ title: t('customers.toast.deleted') })
    },
    // Siparişi olan müşteride backend BusinessException döner — net mesaj göster.
    onError: (e) => toast({ title: t('customers.toast.deleteFailed'), description: describeApiError(e), variant: 'destructive' }),
  })

  // Client-side filter on the canonical columns. Sorting by MusteriAd ascending
  // (legacy default — `ORDER BY MusteriAd` in MusteriEkle.DataGrid).
  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('tr-TR')
    const rows = needle
      ? customers.filter((c) =>
          [c.musteriAd, c.telefon, c.e_Mail, c.vatNumarasi, c.ulkeAdi, c.adres, c.zipKod]
            .some((v) => (v ?? '').toLocaleLowerCase('tr-TR').includes(needle)))
      : customers
    return [...rows].sort((a, b) =>
      a.musteriAd.localeCompare(b.musteriAd, 'tr-TR', { sensitivity: 'base' }))
  }, [customers, q])

  const cols: Column<Musteri & Record<string, unknown>>[] = [
    { key: 'musteriAd',   header: t('customers.fields.musteriAd'),   sortable: true },
    { key: 'telefon',     header: t('customers.fields.telefon') },
    { key: 'zipKod',      header: t('customers.fields.zipKod') },
    { key: 'e_Mail',      header: t('customers.fields.email') },
    { key: 'vatNumarasi', header: t('customers.fields.vat') },
    { key: 'adres',       header: t('customers.fields.adres') },
    { key: 'ulkeAdi',     header: t('customers.fields.ulke'),  sortable: true },
    { key: 'bolge',       header: t('customers.fields.bolge'), render: (r) => (r.bolge as string) ?? '—' },
    // Round-8 §10 — Sil aksiyonu yalnız elshan.rasulov'a render edilir.
    ...(canDelete ? [{
      key: 'actions',
      header: t('common.actions'),
      render: (r: Musteri & Record<string, unknown>) => (
        <Button size="sm" variant="destructive" className="h-7 text-xs"
          onClick={() => setDeleteTarget(r as Musteri)}>
          {t('common.delete')}
        </Button>
      ),
    } as Column<Musteri & Record<string, unknown>>] : []),
  ]

  return (
    <div>
      <PageHeader
        title={t('customers.title')}
        actions={canAdd ? <Button onClick={() => nav('/customers/new')}>{t('common.add')}</Button> : undefined}
      />
      <div className="p-6 space-y-3">
        <div className="max-w-md">
          <Input
            placeholder={t('customers.searchPlaceholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <DataTable
          columns={cols}
          data={filtered as (Musteri & Record<string, unknown>)[]}
          keyField="musteriID"
          loading={isLoading}
          density="compact"
          onRowClick={canEdit ? (r) => nav(`/customers/${(r as Musteri).musteriID}/edit`) : undefined}
        />
      </div>

      {/* Round-8 §10 — elshan-only silme onayı */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('customers.deleteTitle')}</DialogTitle></DialogHeader>
          <p className="text-sm">{t('customers.deleteConfirm', { name: deleteTarget?.musteriAd ?? '' })}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" disabled={deleteMut.isPending}
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.musteriID)}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
