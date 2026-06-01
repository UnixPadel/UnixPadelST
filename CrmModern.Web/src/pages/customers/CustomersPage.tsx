import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getCustomers, getUlkeler, createCustomer, updateCustomer, deleteCustomer,
  type CustomerWriteDto,
} from '@/api/customers'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import type { Musteri } from '@/types'

const emptyForm = (): CustomerWriteDto => ({
  musteriAd: '', telefon: '', zipKod: '', e_Mail: '', adres: '', vatNumarasi: '', ulkelerID: 0,
})

export function CustomersPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const role = getUser()?.yetkiTuru ?? ''
  const canWrite = role === 'Yonetici' || role === 'Temsilci'
  const canDelete = role === 'Yonetici'

  const [filter, setFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CustomerWriteDto>(emptyForm())
  const [editing, setEditing] = useState<Musteri | null>(null)
  const [editForm, setEditForm] = useState<CustomerWriteDto>(emptyForm())

  const { data = [], isLoading } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const { data: ulkeler = [] } = useQuery({ queryKey: ['ulkeler'], queryFn: getUlkeler })

  // WinForms MusteriEkle: ülke seçilince NumaraBirimi telefon prefix'i olarak otomatik dolar.
  const phonePrefix = (ulkelerID: number) =>
    ulkeler.find((u) => u.ulkelerID === ulkelerID)?.numaraBirimi ?? ''

  const createMut = useMutation({
    mutationFn: () => createCustomer(createForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setCreateOpen(false)
      setCreateForm(emptyForm())
      toast({ title: t('customers.createSuccess') })
    },
    onError: (e: unknown) => toast({ title: t('common.error'), description: (e as Error).message, variant: 'destructive' }),
  })

  const updateMut = useMutation({
    mutationFn: () => updateCustomer(editing!.musteriID, editForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setEditing(null)
      toast({ title: t('customers.updateSuccess') })
    },
    onError: (e: unknown) => toast({ title: t('common.error'), description: (e as Error).message, variant: 'destructive' }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCustomer(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast({ title: t('customers.deleteSuccess') }) },
    onError: () => toast({ title: t('common.failed'), variant: 'destructive' }),
  })

  const filtered = data.filter((c) =>
    !filter ||
    c.musteriAd.toLowerCase().includes(filter.toLowerCase()) ||
    (c.ulkeAdi ?? '').toLowerCase().includes(filter.toLowerCase()) ||
    (c.e_Mail ?? '').toLowerCase().includes(filter.toLowerCase()) ||
    (c.vatNumarasi ?? '').toLowerCase().includes(filter.toLowerCase())
  )

  const startEdit = (c: Musteri) => {
    setEditing(c)
    setEditForm({
      musteriAd: c.musteriAd, telefon: c.telefon, zipKod: c.zipKod,
      e_Mail: c.e_Mail, adres: c.adres, vatNumarasi: c.vatNumarasi, ulkelerID: c.ulkelerID,
    })
  }

  const columns: Column<Musteri & Record<string, unknown>>[] = [
    { key: 'musteriID', header: 'ID', sortable: true },
    { key: 'musteriAd', header: t('customers.columns.musteriAd'), sortable: true },
    { key: 'ulkeAdi',   header: t('customers.columns.ulke'), sortable: true },
    { key: 'telefon',   header: t('customers.columns.telefon') },
    { key: 'e_Mail',    header: t('customers.columns.email') },
    { key: 'vatNumarasi', header: t('customers.columns.vat') },
    {
      key: 'actions',
      header: t('common.actions'),
      render: (r) => (
        <div className="flex gap-2">
          {canWrite && (
            <Button size="sm" variant="outline" onClick={() => startEdit(r as Musteri)}>{t('common.edit')}</Button>
          )}
          {canDelete && (
            <Button size="sm" variant="destructive" onClick={() => {
              if (window.confirm(t('customers.deleteConfirm'))) deleteMut.mutate(r.musteriID as number)
            }}>{t('common.delete')}</Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('customers.title')}
        description={t('customers.subtitle')}
        actions={canWrite && <Button onClick={() => { setCreateForm(emptyForm()); setCreateOpen(true) }}>{t('customers.newCustomer')}</Button>}
      />
      <div className="p-6 space-y-4">
        <Input
          placeholder={t('common.quickFilter')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <DataTable
          columns={columns}
          data={filtered as (Musteri & Record<string, unknown>)[]}
          keyField="musteriID"
          loading={isLoading}
        />
      </div>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('customers.newCustomer')}</DialogTitle></DialogHeader>
          <CustomerForm form={createForm} setForm={setCreateForm} ulkeler={ulkeler} phonePrefix={phonePrefix} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <Button
              disabled={createMut.isPending || !isFormValid(createForm)}
              onClick={() => createMut.mutate()}
            >{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('customers.editCustomer')} — {editing?.musteriAd}</DialogTitle></DialogHeader>
          <CustomerForm form={editForm} setForm={setEditForm} ulkeler={ulkeler} phonePrefix={phonePrefix} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button
              disabled={updateMut.isPending || !isFormValid(editForm)}
              onClick={() => updateMut.mutate()}
            >{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function isFormValid(f: CustomerWriteDto): boolean {
  return !!f.musteriAd && !!f.telefon && !!f.zipKod && !!f.e_Mail && !!f.adres && !!f.vatNumarasi && f.ulkelerID > 0
}

interface FormProps {
  form: CustomerWriteDto
  setForm: React.Dispatch<React.SetStateAction<CustomerWriteDto>>
  ulkeler: { ulkelerID: number; ulkeAdi: string; numaraBirimi: string }[]
  phonePrefix: (id: number) => string
}

function CustomerForm({ form, setForm, ulkeler, phonePrefix }: FormProps) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1 col-span-2">
        <Label>{t('customers.columns.musteriAd')} *</Label>
        <Input value={form.musteriAd} onChange={(e) => setForm((f) => ({ ...f, musteriAd: e.target.value }))} />
      </div>
      <div className="space-y-1 col-span-2">
        <Label>{t('common.country')} *</Label>
        <Select
          value={form.ulkelerID > 0 ? String(form.ulkelerID) : ''}
          onValueChange={(v) => setForm((f) => ({ ...f, ulkelerID: Number(v) }))}
        >
          <SelectTrigger><SelectValue placeholder={t('orders.form.ulkeSec')} /></SelectTrigger>
          <SelectContent>
            {ulkeler.map((u) => (
              <SelectItem key={u.ulkelerID} value={String(u.ulkelerID)}>
                {u.ulkeAdi} ({u.numaraBirimi})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>{t('common.phone')} *</Label>
        <Input
          placeholder={phonePrefix(form.ulkelerID) || '+...'}
          value={form.telefon}
          onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <Label>{t('common.vat')} *</Label>
        <Input value={form.vatNumarasi} onChange={(e) => setForm((f) => ({ ...f, vatNumarasi: e.target.value }))} />
      </div>
      <div className="space-y-1">
        <Label>{t('common.email')} *</Label>
        <Input value={form.e_Mail} onChange={(e) => setForm((f) => ({ ...f, e_Mail: e.target.value }))} />
      </div>
      <div className="space-y-1">
        <Label>{t('common.zipCode')} *</Label>
        <Input value={form.zipKod} onChange={(e) => setForm((f) => ({ ...f, zipKod: e.target.value }))} />
      </div>
      <div className="space-y-1 col-span-2">
        <Label>{t('common.address')} *</Label>
        <Input value={form.adres} onChange={(e) => setForm((f) => ({ ...f, adres: e.target.value }))} />
      </div>
    </div>
  )
}
