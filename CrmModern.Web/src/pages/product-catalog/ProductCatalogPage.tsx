import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getComponents, createComponent, updateComponent, deleteComponent,
  getRecipe, updateRecipe,
  getAttributes, createAttribute, updateAttribute, deleteAttribute,
  type AttributeDto,
} from '@/api/productCatalog'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/utils'
import type { ProductCatalogCategoryDto, ProductCatalogComponentDto } from '@/types'

// WinForms Bilesen.cs birimComboBox değerleri — birebir
const BIRIMLER = ['Set', 'M', 'M2', 'Kg', 'Pcs'] as const

export function ProductCatalogPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const role = getUser()?.yetkiTuru ?? ''
  const canWrite = role === 'Yonetici'   // WinForms Form3.cs: yalnız Yonetici

  // ── Tabs / shared queries ──────────────────────────────────────────────
  const { data: categories = [], isLoading: catLoading } = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const { data: components = [],  isLoading: compLoading } = useQuery({ queryKey: ['components'], queryFn: getComponents })

  return (
    <div>
      <PageHeader title={t('productCatalog.title')} description={t('productCatalog.subtitle')} />
      <div className="p-6">
        <Tabs defaultValue="categories">
          <TabsList>
            <TabsTrigger value="categories">Kategoriler &amp; Reçete</TabsTrigger>
            <TabsTrigger value="components">Bileşenler</TabsTrigger>
            <TabsTrigger value="attributes">Öznitelikler</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-4">
            <CategoriesTab categories={categories} components={components} canWrite={canWrite} loading={catLoading} qc={qc} toast={toast} />
          </TabsContent>

          <TabsContent value="components" className="mt-4">
            <ComponentsTab components={components} canWrite={canWrite} loading={compLoading} qc={qc} toast={toast} />
          </TabsContent>

          <TabsContent value="attributes" className="mt-4">
            <AttributesTab components={components} canWrite={canWrite} qc={qc} toast={toast} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Kategoriler tab + Reçete paneli (Recete.cs zihinsel modeli)
// ─────────────────────────────────────────────────────────────────────────────

interface SharedProps {
  canWrite: boolean
  qc: ReturnType<typeof useQueryClient>
  toast: ReturnType<typeof useToast>['toast']
}

function CategoriesTab({
  categories, components, canWrite, loading, qc, toast,
}: SharedProps & {
  categories: ProductCatalogCategoryDto[]
  components: ProductCatalogComponentDto[]
  loading: boolean
}) {
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<ProductCatalogCategoryDto | null>(null)
  const [editName, setEditName] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const createMut = useMutation({
    mutationFn: () => createCategory(newName),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setShowNew(false); setNewName(''); toast({ title: 'Kategori oluşturuldu' }) },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })
  const updateMut = useMutation({
    mutationFn: () => updateCategory(editing!.kategoriID, editName),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setEditing(null); toast({ title: 'Kategori güncellendi' }) },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast({ title: 'Kategori silindi' })
      setSelectedId((s) => (s === editing?.kategoriID ? null : s))
    },
    onError: () => toast({ title: 'Silinemedi', variant: 'destructive' }),
  })

  const cols: Column<ProductCatalogCategoryDto & Record<string, unknown>>[] = [
    { key: 'kategoriID',  header: 'ID', sortable: true },
    { key: 'kategoriAdi', header: 'Kategori Adı', sortable: true },
    { key: 'fiyat',       header: 'Fiyat', sortable: true, render: (r) => formatCurrency((r.fiyat as number) ?? 0) },
    {
      key: 'actions', header: 'İşlem',
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setSelectedId(r.kategoriID as number)}>Reçete</Button>
          {canWrite && (
            <>
              <Button size="sm" variant="outline" onClick={() => { setEditing(r as ProductCatalogCategoryDto); setEditName(r.kategoriAdi as string) }}>Düzenle</Button>
              <Button size="sm" variant="destructive" onClick={() => {
                if (window.confirm(`${r.kategoriAdi} silinsin mi?`)) deleteMut.mutate(r.kategoriID as number)
              }}>Sil</Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-3">
        {canWrite && <Button onClick={() => setShowNew(true)}>Yeni Kategori</Button>}
        <DataTable columns={cols} data={categories as (ProductCatalogCategoryDto & Record<string, unknown>)[]} keyField="kategoriID" loading={loading} />
      </div>
      <div>
        {selectedId
          ? <RecipePanel kategoriId={selectedId} components={components} canWrite={canWrite} qc={qc} toast={toast} />
          : <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">Soldaki listeden bir kategori seçin — reçetesi burada görünür.</div>}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Kategori</DialogTitle></DialogHeader>
          <div className="space-y-2"><Label>Kategori Adı</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>İptal</Button>
            <Button disabled={!newName || createMut.isPending} onClick={() => createMut.mutate()}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Kategori Düzenle</DialogTitle></DialogHeader>
          <div className="space-y-2"><Label>Kategori Adı</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>İptal</Button>
            <Button disabled={!editName || updateMut.isPending} onClick={() => updateMut.mutate()}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Recete.cs: kategori seçilince fiyat doldurur, tüm bileşenler listelenir, kategoriye
// dahil olanlar checked + "(Adet: X)" formatında gösterilir. Onayla'da DELETE-then-INSERT.
function RecipePanel({
  kategoriId, components, canWrite, qc, toast,
}: SharedProps & { kategoriId: number; components: ProductCatalogComponentDto[] }) {
  const { data: recipe, isLoading } = useQuery({
    queryKey: ['recipe', kategoriId],
    queryFn: () => getRecipe(kategoriId),
  })

  const [fiyat, setFiyat] = useState<number>(0)
  const [items, setItems] = useState<Record<number, number>>({})  // bilesenID -> adet (0 = not in recipe)

  // recipe geldiğinde state'i hidrate et
  useMemo(() => {
    if (!recipe) return
    setFiyat(recipe.fiyat ?? 0)
    const map: Record<number, number> = {}
    for (const c of recipe.components) map[c.bilesenID] = c.adet
    setItems(map)
  }, [recipe?.kategoriID, recipe?.components.length])

  const saveMut = useMutation({
    mutationFn: () => updateRecipe(
      kategoriId,
      fiyat,
      Object.entries(items)
        .filter(([, adet]) => adet > 0)
        .map(([id, adet]) => ({ bilesenID: Number(id), adet }))
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['recipe', kategoriId] })
      toast({ title: 'Reçete güncellendi' })
    },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })

  if (isLoading || !recipe) return <div className="text-sm text-muted-foreground">Yükleniyor...</div>

  return (
    <div className="rounded-md border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Reçete: {recipe.kategoriAdi}</h3>
        {canWrite && (
          <Button size="sm" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
            {saveMut.isPending ? 'Kaydediliyor...' : 'Onayla'}
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <Label>Kategori Fiyatı</Label>
        <Input type="number" value={fiyat} onChange={(e) => setFiyat(Number(e.target.value))} disabled={!canWrite} />
      </div>

      <div>
        <Label>Bileşenler (işaretli olanlar reçeteye dahil)</Label>
        <div className="mt-2 max-h-[420px] overflow-y-auto rounded border divide-y">
          {components.map((c) => {
            const checked = (items[c.bilesenID] ?? 0) > 0
            return (
              <div key={c.bilesenID} className="flex items-center gap-3 px-3 py-2">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!canWrite}
                  onChange={(e) => setItems((m) => ({ ...m, [c.bilesenID]: e.target.checked ? 1 : 0 }))}
                />
                <span className="flex-1 text-sm">{c.bilesenAdi} <span className="text-muted-foreground">({c.birim ?? '—'})</span></span>
                <Input
                  type="number"
                  min={0}
                  className="w-24"
                  value={items[c.bilesenID] ?? 0}
                  disabled={!checked || !canWrite}
                  onChange={(e) => setItems((m) => ({ ...m, [c.bilesenID]: Math.max(0, Number(e.target.value)) }))}
                />
              </div>
            )
          })}
          {components.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">Bileşen yok.</div>}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Bileşenler tab
// ─────────────────────────────────────────────────────────────────────────────

function ComponentsTab({
  components, canWrite, loading, qc, toast,
}: SharedProps & { components: ProductCatalogComponentDto[]; loading: boolean }) {
  const [showNew, setShowNew] = useState(false)
  const [newComp, setNewComp] = useState({ bilesenAdi: '', birim: 'Set' })
  const [editing, setEditing] = useState<ProductCatalogComponentDto | null>(null)
  const [editForm, setEditForm] = useState({ bilesenAdi: '', birim: 'Set', fiyat: 0 })

  const createMut = useMutation({
    mutationFn: () => createComponent(newComp.bilesenAdi, newComp.birim || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['components'] }); setShowNew(false); setNewComp({ bilesenAdi: '', birim: 'Set' }); toast({ title: 'Bileşen oluşturuldu' }) },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })
  const updateMut = useMutation({
    mutationFn: () => updateComponent(editing!.bilesenID, editForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['components'] }); setEditing(null); toast({ title: 'Bileşen güncellendi' }) },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteComponent(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['components'] }); toast({ title: 'Bileşen silindi' }) },
    onError: () => toast({ title: 'Silinemedi (reçetelerde referans olabilir)', variant: 'destructive' }),
  })

  const cols: Column<ProductCatalogComponentDto & Record<string, unknown>>[] = [
    { key: 'bilesenID',  header: 'ID', sortable: true },
    { key: 'bilesenAdi', header: 'Bileşen Adı', sortable: true },
    { key: 'birim',      header: 'Birim', sortable: true },
    { key: 'fiyat',      header: 'Fiyat', sortable: true, render: (r) => formatCurrency((r.fiyat as number) ?? 0) },
    {
      key: 'actions', header: 'İşlem',
      render: (r) => (
        <div className="flex gap-2">
          {canWrite && (
            <>
              <Button size="sm" variant="outline" onClick={() => {
                setEditing(r as ProductCatalogComponentDto)
                setEditForm({ bilesenAdi: r.bilesenAdi as string, birim: ((r.birim as string) ?? 'Set'), fiyat: (r.fiyat as number) ?? 0 })
              }}>Düzenle</Button>
              <Button size="sm" variant="destructive" onClick={() => {
                if (window.confirm(`${r.bilesenAdi} silinsin mi?`)) deleteMut.mutate(r.bilesenID as number)
              }}>Sil</Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {canWrite && <Button onClick={() => setShowNew(true)}>Yeni Bileşen</Button>}
      <DataTable columns={cols} data={components as (ProductCatalogComponentDto & Record<string, unknown>)[]} keyField="bilesenID" loading={loading} />

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Bileşen</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Bileşen Adı *</Label><Input value={newComp.bilesenAdi} onChange={(e) => setNewComp((f) => ({ ...f, bilesenAdi: e.target.value }))} autoFocus /></div>
            <div className="space-y-1">
              <Label>Birim</Label>
              <Select value={newComp.birim} onValueChange={(v) => setNewComp((f) => ({ ...f, birim: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BIRIMLER.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>İptal</Button>
            <Button disabled={!newComp.bilesenAdi || createMut.isPending} onClick={() => createMut.mutate()}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bileşen Düzenle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Bileşen Adı</Label><Input value={editForm.bilesenAdi} onChange={(e) => setEditForm((f) => ({ ...f, bilesenAdi: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>Birim</Label>
              <Select value={editForm.birim} onValueChange={(v) => setEditForm((f) => ({ ...f, birim: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BIRIMLER.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Fiyat</Label><Input type="number" value={editForm.fiyat} onChange={(e) => setEditForm((f) => ({ ...f, fiyat: Number(e.target.value) }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>İptal</Button>
            <Button disabled={updateMut.isPending} onClick={() => updateMut.mutate()}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Öznitelikler tab
// ─────────────────────────────────────────────────────────────────────────────

function AttributesTab({
  components, canWrite, qc, toast,
}: SharedProps & { components: ProductCatalogComponentDto[] }) {
  const [bilesenId, setBilesenId] = useState<number | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newAdı, setNewAdı] = useState('')
  const [editing, setEditing] = useState<AttributeDto | null>(null)
  const [editAdı, setEditAdı] = useState('')

  const { data: attrs = [], isLoading } = useQuery({
    queryKey: ['attributes', bilesenId],
    queryFn: () => getAttributes(bilesenId ?? undefined),
  })

  const createMut = useMutation({
    mutationFn: () => createAttribute(bilesenId!, newAdı),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attributes', bilesenId] }); setShowNew(false); setNewAdı(''); toast({ title: 'Öznitelik eklendi' }) },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })
  const updateMut = useMutation({
    mutationFn: () => updateAttribute(editing!.oznitelikID, editAdı),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attributes'] }); setEditing(null); toast({ title: 'Öznitelik güncellendi' }) },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAttribute(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attributes'] }); toast({ title: 'Öznitelik silindi' }) },
    onError: () => toast({ title: 'Silinemedi', variant: 'destructive' }),
  })

  const cols: Column<AttributeDto & Record<string, unknown>>[] = [
    { key: 'oznitelikID', header: 'ID', sortable: true },
    { key: 'bilesenID',   header: 'Bileşen ID', sortable: true,
      render: (r) => `${r.bilesenID} — ${components.find((c) => c.bilesenID === r.bilesenID)?.bilesenAdi ?? '?'}` },
    { key: 'oznitelikAdı', header: 'Öznitelik Adı', sortable: true },
    {
      key: 'actions', header: 'İşlem',
      render: (r) => (
        <div className="flex gap-2">
          {canWrite && (
            <>
              <Button size="sm" variant="outline" onClick={() => { setEditing(r as AttributeDto); setEditAdı(r.oznitelikAdı as string) }}>Düzenle</Button>
              <Button size="sm" variant="destructive" onClick={() => {
                if (window.confirm('Öznitelik silinsin mi?')) deleteMut.mutate(r.oznitelikID as number)
              }}>Sil</Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label>Bileşen Filtresi</Label>
          <Select value={bilesenId ? String(bilesenId) : 'all'} onValueChange={(v) => setBilesenId(v === 'all' ? null : Number(v))}>
            <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">— Tümü —</SelectItem>
              {components.map((c) => (
                <SelectItem key={c.bilesenID} value={String(c.bilesenID)}>{c.bilesenAdi}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canWrite && (
          <Button disabled={!bilesenId} onClick={() => setShowNew(true)}>
            Yeni Öznitelik {bilesenId ? '' : '(önce bileşen seçin)'}
          </Button>
        )}
      </div>

      <DataTable columns={cols} data={attrs as (AttributeDto & Record<string, unknown>)[]} keyField="oznitelikID" loading={isLoading} />

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Öznitelik</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Öznitelik Adı (örn. "12mm", "Yeşil")</Label>
            <Input value={newAdı} onChange={(e) => setNewAdı(e.target.value)} autoFocus />
            <p className="text-xs text-muted-foreground">Bileşen: {components.find((c) => c.bilesenID === bilesenId)?.bilesenAdi}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>İptal</Button>
            <Button disabled={!newAdı || createMut.isPending} onClick={() => createMut.mutate()}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Öznitelik Düzenle</DialogTitle></DialogHeader>
          <div className="space-y-2"><Label>Öznitelik Adı</Label><Input value={editAdı} onChange={(e) => setEditAdı(e.target.value)} autoFocus /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>İptal</Button>
            <Button disabled={!editAdı || updateMut.isPending} onClick={() => updateMut.mutate()}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
