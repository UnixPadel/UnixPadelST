import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getUsers, getUsersIncludingDeleted, createUser, updateUser, deleteUser, restoreUser, changeUserPassword } from '@/api/users'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { PageHeader } from '@/components/PageHeader'
import { FillPage, FillRegion } from '@/components/FillPage'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { RowActionsMenu } from '@/components/RowActionsMenu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { toastApiError } from '@/lib/apiError'
import { useConfirm } from '@/components/ui/confirm-dialog'
import type { UserListDto, CreateUserDto, UpdateUserDto } from '@/types'

const YETKI_TURLERI = ['Yonetici', 'Muhasebe', 'Fabrika', 'Gozlemci', 'Temsilci', 'Lojistik']

const emptyCreate = (): CreateUserDto => ({
  kullaniciAdi: '', sifre: '', ad: '', soyad: '',
  email: '', telefon: '', yetkiTuru: 'Temsilci', durum: 'Aktif',
})

export function UsersPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const { t } = useTranslation()
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateUserDto>(emptyCreate())
  const [editUser, setEditUser] = useState<UserListDto | null>(null)
  const [editForm, setEditForm] = useState<UpdateUserDto>({ ad: '', soyad: '', email: '', telefon: '', yetkiTuru: '', durum: '' })
  const [editBaseline, setEditBaseline] = useState('')
  // 3.2 — değişiklik varken pencere kapatılırsa sorulur.
  const closeEdit = async () => {
    if (JSON.stringify(editForm) !== editBaseline && !(await confirm({
      title: t('unsaved.title'), description: t('unsaved.description'),
      confirmLabel: t('unsaved.leave'), cancelLabel: t('unsaved.stay'), destructive: true,
    }))) return
    setEditUser(null)
  }
  const [pwUser, setPwUser] = useState<UserListDto | null>(null)
  const [pwValue, setPwValue] = useState('')
  // §26 — Pasif kullanıcılar varsayılan olarak gizli (uygulamanın geri kalanında
  // hiç görünmezler). Yönetici bu anahtarla yeniden etkinleştirmek için görebilir.
  const [showPassive, setShowPassive] = useState(false)

  const [showDeleted, setShowDeleted] = useState(false)
  const { data = [], isLoading } = useQuery({
    queryKey: ['users', showDeleted ? 'withDeleted' : 'active'],
    queryFn: showDeleted ? getUsersIncludingDeleted : getUsers,
  })
  const restoreMut = useMutation({
    mutationFn: (id: number) => restoreUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast({ title: t('undo.restored'), variant: 'success' }) },
    onError: (e) => toastApiError(toast, t('undo.failed'), e),
  })
  const visibleData = showPassive ? data : data.filter((u) => u.durum !== 'Pasif')

  const createMut = useMutation({
    mutationFn: () => createUser(createForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowCreate(false); setCreateForm(emptyCreate()); toast({ title: t('users.createSuccess') }) },
    onError: (e: unknown) => toastApiError(toast, t('common.error'), e),
  })

  const updateMut = useMutation({
    mutationFn: () => updateUser(editUser!.kullaniciID, editForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditUser(null); toast({ title: t('users.updateSuccess') }) },
    onError: (e) => toastApiError(toast, t('common.error'), e),
  })

  const undoable = useUndoableDelete()
  const deleteMut = useMutation({
    mutationFn: ({ id }: { id: number; name: string }) => deleteUser(id),
    onSuccess: (_d, { id, name }) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      undoable({ title: t('users.deleteSuccess'), name, restore: () => restoreUser(id), onRestored: () => qc.invalidateQueries({ queryKey: ['users'] }) })
    },
    onError: (e) => toastApiError(toast, t('common.failed'), e),
  })

  const pwMut = useMutation({
    mutationFn: () => changeUserPassword(pwUser!.kullaniciID, pwValue),
    onSuccess: () => { setPwUser(null); setPwValue(''); toast({ title: t('users.passwordChanged') }) },
    onError: () => toast({ title: t('common.error'), variant: 'destructive' }),
  })

  const columns: Column<UserListDto & Record<string, unknown>>[] = [
    { key: 'kullaniciID',  header: 'ID',                            sortable: true },
    { key: 'kullaniciAdi', header: t('users.columns.kullaniciAdi'), sortable: true },
    { key: 'ad',           header: t('users.columns.ad'),           sortable: true },
    { key: 'soyad',        header: t('users.columns.soyad'),        sortable: true },
    { key: 'email',        header: t('users.columns.email') },
    { key: 'telefon',      header: t('users.columns.telefon') },
    { key: 'yetkiTuru',    header: t('users.columns.yetki'),        sortable: true },
    { key: 'durum',        header: t('users.columns.durum'),        render: (r) => <StatusBadge value={r.durum as string} /> },
    {
      key: 'actions', pin: 'right',
      header: t('common.actions'),
      render: (r) => r.silindi ? (
        <div className="flex items-center gap-2">
          <span className="rounded bg-danger-soft px-1.5 text-xs font-medium text-danger-soft-foreground">{t('undo.deletedBadge')}</span>
          <Button size="sm" variant="outline" loading={restoreMut.isPending && restoreMut.variables === r.kullaniciID}
            onClick={() => restoreMut.mutate(r.kullaniciID as number)}>
            {t('undo.restore')}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => {
            setEditUser(r as UserListDto)
            const f = { ad: r.ad as string, soyad: r.soyad as string, email: r.email as string, telefon: r.telefon as string, yetkiTuru: r.yetkiTuru as string, durum: r.durum as string }
            setEditForm(f)
            setEditBaseline(JSON.stringify(f))
          }}>
            {t('common.edit')}
          </Button>
          {/* Tek görünür iş "Düzenle"; seyrek ve tehlikeli olanlar menüde (eş ağırlıklı üç buton yerine). */}
          <RowActionsMenu
            row={r}
            label={t('common.moreActions')}
            actions={[
              { key: 'password', label: t('users.changePassword'), onSelect: (u) => { setPwUser(u as UserListDto); setPwValue('') } },
              { key: 'delete', label: t('common.delete'), destructive: true, separatorBefore: true, onSelect: async (u) => {
                if (await confirm({
                  title: t('users.deleteTitle', { name: u.kullaniciAdi as string }),
                  description: `${u.ad ?? ''} ${u.soyad ?? ''} · ${u.yetkiTuru ?? ''}`,
                  impact: [t('users.impact.delete'), t('common.undoHint')],
                  destructive: true, confirmLabel: t('common.delete'),
                }))
                  deleteMut.mutate({ id: u.kullaniciID as number, name: u.kullaniciAdi as string })
              } },
            ]}
          />
        </div>
      ),
    },
  ]

  const fieldLabel = (f: string): string => {
    const map: Record<string, string> = {
      kullaniciAdi: t('users.columns.kullaniciAdi'),
      sifre: t('login.password'),
      ad: t('users.columns.ad'),
      soyad: t('users.columns.soyad'),
      email: t('common.email'),
      telefon: t('common.phone'),
    }
    return map[f] ?? f
  }

  return (
    // Scaling Faz 2 — FillPage: sayfa kaymaz, tablo kalan yüksekliği doldurur
    // (başlık + araç çubuğu yerinde kalır).
    <FillPage>
      <PageHeader density="compact"
        title={t('users.title')}
        description={t('users.subtitle')}
        actions={
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer"
                checked={showPassive}
                onChange={(e) => setShowPassive(e.target.checked)}
              />
              {t('users.showPassive')}
            </label>
            <Checkbox checked={showDeleted} onCheckedChange={setShowDeleted} label={t('undo.showDeleted')} />
            <Button onClick={() => setShowCreate(true)}>{t('users.newUser')}</Button>
          </div>
        }
      />
      <FillRegion className="pt-2">
        <DataTable fill columns={columns} data={visibleData as (UserListDto & Record<string, unknown>)[]} keyField="kullaniciID" loading={isLoading} />
      </FillRegion>

      {/* Create */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('users.newUser')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {(['kullaniciAdi', 'sifre', 'ad', 'soyad', 'email', 'telefon'] as const).map((field) => (
              <div key={field} className="space-y-1">
                <Label>{fieldLabel(field)}</Label>
                <Input
                  type={field === 'sifre' ? 'password' : 'text'}
                  value={createForm[field]}
                  onChange={(e) => setCreateForm((f) => ({ ...f, [field]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label>{t('users.yetkiTuru')}</Label>
              <Select value={createForm.yetkiTuru} onValueChange={(v) => setCreateForm((f) => ({ ...f, yetkiTuru: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{YETKI_TURLERI.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('common.status')}</Label>
              <Select value={createForm.durum} onValueChange={(v) => setCreateForm((f) => ({ ...f, durum: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aktif">{t('common.active')}</SelectItem>
                  <SelectItem value="Pasif">{t('common.passive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button disabled={!createForm.kullaniciAdi || !createForm.sifre || createMut.isPending} onClick={() => createMut.mutate()}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) void closeEdit() }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('users.editUser')} — {editUser?.kullaniciAdi}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {(['ad', 'soyad', 'email', 'telefon'] as const).map((field) => (
              <FormField key={field} label={fieldLabel(field)}>
                <Input value={editForm[field]} onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))} />
              </FormField>
            ))}
            <FormField label={t('users.yetkiTuru')}>
              <Select value={editForm.yetkiTuru} onValueChange={(v) => setEditForm((f) => ({ ...f, yetkiTuru: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{YETKI_TURLERI.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label={t('common.status')}>
              <Select value={editForm.durum} onValueChange={(v) => setEditForm((f) => ({ ...f, durum: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aktif">{t('common.active')}</SelectItem>
                  <SelectItem value="Pasif">{t('common.passive')}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => void closeEdit()}>{t('common.cancel')}</Button>
            <Button loading={updateMut.isPending} onClick={() => updateMut.mutate()}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password reset */}
      <Dialog open={!!pwUser} onOpenChange={() => setPwUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('users.changePassword')} — {pwUser?.kullaniciAdi}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>{t('login.password')}</Label>
            <Input type="password" value={pwValue} onChange={(e) => setPwValue(e.target.value)} maxLength={25} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwUser(null)}>{t('common.cancel')}</Button>
            <Button disabled={!pwValue || pwMut.isPending} onClick={() => pwMut.mutate()}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FillPage>
  )
}
