import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getUsers, createUser, updateUser, deleteUser, changeUserPassword } from '@/api/users'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import type { UserListDto, CreateUserDto, UpdateUserDto } from '@/types'

const YETKI_TURLERI = ['Yonetici', 'Muhasebe', 'Fabrika', 'Gozlemci', 'Temsilci', 'Lojistik']

const emptyCreate = (): CreateUserDto => ({
  kullaniciAdi: '', sifre: '', ad: '', soyad: '',
  email: '', telefon: '', yetkiTuru: 'Temsilci', durum: 'Aktif',
})

export function UsersPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateUserDto>(emptyCreate())
  const [editUser, setEditUser] = useState<UserListDto | null>(null)
  const [editForm, setEditForm] = useState<UpdateUserDto>({ ad: '', soyad: '', email: '', telefon: '', yetkiTuru: '', durum: '' })
  const [pwUser, setPwUser] = useState<UserListDto | null>(null)
  const [pwValue, setPwValue] = useState('')

  const { data = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers })

  const createMut = useMutation({
    mutationFn: () => createUser(createForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowCreate(false); setCreateForm(emptyCreate()); toast({ title: t('users.createSuccess') }) },
    onError: (e: unknown) => toast({ title: t('common.error'), description: (e as Error).message, variant: 'destructive' }),
  })

  const updateMut = useMutation({
    mutationFn: () => updateUser(editUser!.kullaniciID, editForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditUser(null); toast({ title: t('users.updateSuccess') }) },
    onError: () => toast({ title: t('common.error'), variant: 'destructive' }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast({ title: t('users.deleteSuccess') }) },
    onError: () => toast({ title: t('common.failed'), variant: 'destructive' }),
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
      key: 'actions',
      header: t('common.actions'),
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => {
            setEditUser(r as UserListDto)
            setEditForm({ ad: r.ad as string, soyad: r.soyad as string, email: r.email as string, telefon: r.telefon as string, yetkiTuru: r.yetkiTuru as string, durum: r.durum as string })
          }}>
            {t('common.edit')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setPwUser(r as UserListDto); setPwValue('') }}>
            {t('login.password')}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => {
            if (window.confirm(t('users.deleteConfirm'))) deleteMut.mutate(r.kullaniciID as number)
          }}>
            {t('common.delete')}
          </Button>
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
    <div>
      <PageHeader
        title={t('users.title')}
        description={t('users.subtitle')}
        actions={<Button onClick={() => setShowCreate(true)}>{t('users.newUser')}</Button>}
      />
      <div className="p-6">
        <DataTable columns={columns} data={data as (UserListDto & Record<string, unknown>)[]} keyField="kullaniciID" loading={isLoading} />
      </div>

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
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('users.editUser')} — {editUser?.kullaniciAdi}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {(['ad', 'soyad', 'email', 'telefon'] as const).map((field) => (
              <div key={field} className="space-y-1">
                <Label>{fieldLabel(field)}</Label>
                <Input value={editForm[field]} onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))} />
              </div>
            ))}
            <div className="space-y-1">
              <Label>{t('users.yetkiTuru')}</Label>
              <Select value={editForm.yetkiTuru} onValueChange={(v) => setEditForm((f) => ({ ...f, yetkiTuru: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{YETKI_TURLERI.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('common.status')}</Label>
              <Select value={editForm.durum} onValueChange={(v) => setEditForm((f) => ({ ...f, durum: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aktif">{t('common.active')}</SelectItem>
                  <SelectItem value="Pasif">{t('common.passive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>{t('common.cancel')}</Button>
            <Button disabled={updateMut.isPending} onClick={() => updateMut.mutate()}>{t('common.save')}</Button>
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
    </div>
  )
}
