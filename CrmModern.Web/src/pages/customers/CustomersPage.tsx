import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getCustomers, getCustomersIncludingDeleted, deleteCustomer, restoreCustomer } from '@/api/customers'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin } from '@/lib/permissions'
import { PageHeader } from '@/components/PageHeader'
import { FillPage, FillRegion } from '@/components/FillPage'
import { DataTable, type Column } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { toastApiError } from '@/lib/apiError'
import { Checkbox } from '@/components/ui/checkbox'
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
 *   Lojistik  — list (read-only)   // sadece görüntüleme; ekleme/düzenleme/silme YOK
 *
 * Row click → /customers/:id/edit, but only for roles that can edit.
 * Lojistik ADD_ROLES/EDIT_ROLES'te olmadığı için otomatik salt-okunur olur.
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

  const [showDeleted, setShowDeleted] = useState(false)
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', showDeleted ? 'withDeleted' : 'active'],
    queryFn: showDeleted ? getCustomersIncludingDeleted : getCustomers,
  })

  const undoable = useUndoableDelete()
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCustomer(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      const name = deleteTarget?.musteriAd ?? `#${id}`
      setDeleteTarget(null)
      undoable({ title: t('customers.toast.deleted'), name, restore: () => restoreCustomer(id), onRestored: () => qc.invalidateQueries({ queryKey: ['customers'] }) })
    },
    // Siparişi olan müşteride backend BusinessException döner — net mesaj göster.
    onError: (e) => toastApiError(toast, t('customers.toast.deleteFailed'), e),
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
    // 4.5 — görünür "Düzenle" (önceden yalnız satıra tıklamak düzenlemeyi açıyordu).
    // Round-8 §10 — Sil aksiyonu yalnız elshan.rasulov'a render edilir; ayraçla ayrı.
    ...(canEdit || canDelete ? [{
      key: 'actions', pin: 'right',
      header: t('common.actions'),
      render: (r: Musteri & Record<string, unknown>) => r.silindi ? (
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-danger-soft px-1.5 text-xs font-medium text-danger-soft-foreground">{t('undo.deletedBadge')}</span>
          {canDelete && (
            <Button size="xs" variant="outline" onClick={async () => {
              try { await restoreCustomer(r.musteriID as number); await qc.invalidateQueries({ queryKey: ['customers'] }); toast({ title: t('undo.restored'), description: r.musteriAd as string, variant: 'success' }) }
              catch (e) { toastApiError(toast, t('undo.failed'), e) }
            }}>{t('undo.restore')}</Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          {canEdit && (
            <Button size="xs" variant="outline" onClick={() => nav(`/customers/${(r as Musteri).musteriID}/edit`)}>
              {t('common.edit')}
            </Button>
          )}
          {canDelete && (
            <>
              <span className="mx-1 w-px self-stretch bg-border" aria-hidden />
              <Button size="xs" variant="outline" className="text-danger" onClick={() => setDeleteTarget(r as Musteri)}>
                {t('common.delete')}
              </Button>
            </>
          )}
        </div>
      ),
    } as Column<Musteri & Record<string, unknown>>] : []),
  ]

  return (
    // Scaling Faz 2 — FillPage: sayfa kaymaz, tablo kalan yüksekliği doldurur
    // (başlık + araç çubuğu yerinde kalır).
    <FillPage>
      <PageHeader density="compact"
        title={t('customers.title')}
        actions={canAdd ? <Button onClick={() => nav('/customers/new')}>{t('common.add')}</Button> : undefined}
      />
      <div className="space-y-2 px-4 pt-2">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-full max-w-md">
            <Input
              placeholder={t('customers.searchPlaceholder')}
              aria-label={t('customers.searchPlaceholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {canDelete && <Checkbox checked={showDeleted} onCheckedChange={setShowDeleted} label={t('undo.showDeleted')} />}
        </div>
      </div>
      <FillRegion className="pt-2">
        <DataTable
          fill
          columns={cols}
          data={filtered as (Musteri & Record<string, unknown>)[]}
          keyField="musteriID"
          loading={isLoading}
          onRowClick={canEdit ? (r) => nav(`/customers/${(r as Musteri).musteriID}/edit`) : undefined}
        />
      </FillRegion>

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
    </FillPage>
  )
}
