import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  createOrder, createQuote, getCategories, expandRecipe, uploadAttachment,
} from '@/api/orders'
import { getCustomers, getUlkeler } from '@/api/customers'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/components/ToastProvider'
import type { CreateOrderDto } from '@/types'

const PARA_TIPLERI = ['Euro', 'Dolar', 'TL', 'Sterlin']
const SIRKETLER = ['Unixpadel', 'ArsSport', 'AselCocuk']

const blank = (): CreateOrderDto => ({
  musteriAd: '', siparisNotu: '',
  sTelefon: '', sFax: '', sWeb: '', sE_Mail: '', sVatNumarasi: '', sUlke: '', sAdres: '',
  montajVar: false, montajFiyat: 0, mAdet: 1,
  teslimatVar: false, teslimatFiyat: 0, mTeslimat: 1,
  teslimatCesiti: '', tTeslimAlanAdi: '', tIlgiliKisi: '',
  tTelefon: '', tAltTelefon: '', tE_Mail: '', tVATNumarasi: '', tZipKod: '', tUlke: '', tAdres: '',
  mTelefon: '', mMail: '', mUlke: '', mVATNumarasi: '', mZipKod: '', mAdres: '',
  paraTipi: 'Euro', indirim: 0, kdv: 0, pesinYuzde: 0,
  sets: [], details: [], sirket: 'Unixpadel',
})

export function NewOrderPage() {
  const nav = useNavigate()
  const { toast } = useToast()
  const [params] = useSearchParams()
  const reviseFrom = params.get('revise')

  const [form, setForm] = useState<CreateOrderDto>(blank())
  const [createdNo, setCreatedNo] = useState<string | null>(null)

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const { data: ulkeler   = [] } = useQuery({ queryKey: ['ulkeler'],   queryFn: getUlkeler })
  const { data: categories = [] } = useQuery({ queryKey: ['order-categories'], queryFn: getCategories })

  // Müşteri seçilince M* alanları doldur (WinForms ComboBox SelectedIndexChanged)
  const onCustomerSelect = (id: number) => {
    const c = customers.find((x) => x.musteriID === id)
    if (!c) return
    setForm((f) => ({
      ...f,
      musteriAd:    c.musteriAd,
      mTelefon:     c.telefon,
      mMail:        c.e_Mail,
      mUlke:        c.ulkeAdi,
      mVATNumarasi: c.vatNumarasi,
      mZipKod:      c.zipKod,
      mAdres:       c.adres,
    }))
  }

  const orderMut = useMutation({
    mutationFn: () => createOrder(form),
    onSuccess: (no) => { toast({ title: 'Sipariş oluşturuldu', description: no }); setCreatedNo(no) },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })
  const quoteMut = useMutation({
    mutationFn: () => createQuote(form),
    onSuccess: (no) => { toast({ title: 'Teklif oluşturuldu', description: no }); setCreatedNo(no) },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })

  const expandMut = useMutation({
    mutationFn: ({ no, kategoriId, adet }: { no: string; kategoriId: number; adet: number }) =>
      expandRecipe(no, kategoriId, adet),
    onSuccess: () => toast({ title: 'Reçete açıldı' }),
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })

  const uploadMut = useMutation({
    mutationFn: ({ no, file }: { no: string; file: File }) => uploadAttachment(no, 'ek', file),
    onSuccess: () => toast({ title: 'Ek yüklendi' }),
    onError: () => toast({ title: 'Yükleme başarısız', variant: 'destructive' }),
  })

  // 2. sekmedeki "Reçeteden Aç" için lokal state
  const [expandKategori, setExpandKategori] = useState<number | null>(null)
  const [expandAdet, setExpandAdet] = useState(1)

  useEffect(() => {
    if (reviseFrom) toast({ title: 'Revize modu', description: `Kaynak: ${reviseFrom}` })
  }, [reviseFrom])

  return (
    <div>
      <PageHeader
        title="Yeni Sipariş / Teklif"
        description={reviseFrom ? `Revize: ${reviseFrom}` : 'SiparisForm.cs portu (5-sekme wizard)'}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => nav(-1)}>Vazgeç</Button>
            <Button variant="secondary" disabled={quoteMut.isPending} onClick={() => quoteMut.mutate()}>Teklif olarak Kaydet</Button>
            <Button disabled={orderMut.isPending} onClick={() => orderMut.mutate()}>Sipariş Kaydı</Button>
          </div>
        }
      />
      <div className="p-6">
        <Tabs defaultValue="header">
          <TabsList>
            <TabsTrigger value="header">1. Üst Bilgi</TabsTrigger>
            <TabsTrigger value="items">2. Kalemler</TabsTrigger>
            <TabsTrigger value="addresses">3. Teslimat Adresleri</TabsTrigger>
            <TabsTrigger value="attachments" disabled={!createdNo}>4. Ek Dosyalar</TabsTrigger>
            <TabsTrigger value="approval" disabled={!createdNo}>5. Onay</TabsTrigger>
          </TabsList>

          {/* ── 1 ─────────────────────────────────────────────────────────── */}
          <TabsContent value="header" className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-3">
                <Label>Müşteri</Label>
                <Select onValueChange={(v) => onCustomerSelect(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Müşteri seç" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.musteriID} value={String(c.musteriID)}>{c.musteriAd} ({c.ulkeAdi})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Müşteri Adı *</Label><Input value={form.musteriAd} onChange={(e) => setForm((f) => ({ ...f, musteriAd: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Telefon</Label><Input value={form.mTelefon ?? ''} onChange={(e) => setForm((f) => ({ ...f, mTelefon: e.target.value }))} /></div>
              <div className="space-y-1"><Label>E-posta</Label><Input value={form.mMail ?? ''} onChange={(e) => setForm((f) => ({ ...f, mMail: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Ülke</Label>
                <Select value={form.mUlke ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, mUlke: v }))}>
                  <SelectTrigger><SelectValue placeholder="Ülke seç" /></SelectTrigger>
                  <SelectContent>{ulkeler.map((u) => <SelectItem key={u.ulkelerID} value={u.ulkeAdi}>{u.ulkeAdi}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>VAT</Label><Input value={form.mVATNumarasi ?? ''} onChange={(e) => setForm((f) => ({ ...f, mVATNumarasi: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Posta Kodu</Label><Input value={form.mZipKod ?? ''} onChange={(e) => setForm((f) => ({ ...f, mZipKod: e.target.value }))} /></div>
              <div className="space-y-1 col-span-3"><Label>Adres</Label><Input value={form.mAdres ?? ''} onChange={(e) => setForm((f) => ({ ...f, mAdres: e.target.value }))} /></div>

              <div className="space-y-1">
                <Label>Para Tipi</Label>
                <Select value={form.paraTipi} onValueChange={(v) => setForm((f) => ({ ...f, paraTipi: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PARA_TIPLERI.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Şirket</Label>
                <Select value={form.sirket} onValueChange={(v) => setForm((f) => ({ ...f, sirket: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SIRKETLER.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>İndirim %</Label><Input type="number" value={form.indirim} onChange={(e) => setForm((f) => ({ ...f, indirim: Number(e.target.value) }))} /></div>
              <div className="space-y-1"><Label>KDV %</Label><Input type="number" value={form.kdv} onChange={(e) => setForm((f) => ({ ...f, kdv: Number(e.target.value) }))} /></div>
              <div className="space-y-1"><Label>Peşin %</Label><Input type="number" value={form.pesinYuzde} onChange={(e) => setForm((f) => ({ ...f, pesinYuzde: Number(e.target.value) }))} /></div>
              <div className="space-y-1 col-span-3"><Label>Sipariş Notu</Label><Input value={form.siparisNotu ?? ''} onChange={(e) => setForm((f) => ({ ...f, siparisNotu: e.target.value }))} /></div>
            </div>
          </TabsContent>

          {/* ── 2 ─────────────────────────────────────────────────────────── */}
          <TabsContent value="items" className="mt-4 space-y-4">
            <div className="rounded-md border p-3">
              <p className="text-sm text-muted-foreground mb-2">
                Kalemleri sipariş kaydedildikten sonra "Reçeteden Aç" ile kategoriye dayalı olarak ekleyebilirsiniz (SiparisForm.cs anaUrunComboBox port'u).
              </p>
              {createdNo ? (
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <Label>Kategori</Label>
                    <Select onValueChange={(v) => setExpandKategori(Number(v))}>
                      <SelectTrigger><SelectValue placeholder="Kategori seç" /></SelectTrigger>
                      <SelectContent>{categories.map((c) => <SelectItem key={c.kategoriID} value={String(c.kategoriID)}>{c.kategoriAdi}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Adet</Label><Input type="number" value={expandAdet} onChange={(e) => setExpandAdet(Math.max(1, Number(e.target.value)))} min={1} /></div>
                  <Button
                    disabled={!expandKategori || expandMut.isPending}
                    onClick={() => expandMut.mutate({ no: createdNo, kategoriId: expandKategori!, adet: expandAdet })}
                  >Reçeteden Aç</Button>
                </div>
              ) : (
                <p className="text-sm text-orange-600">Kalemleri eklemek için önce siparişi/teklifi kaydedin.</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Detaylar (her satır bir not)</Label>
              <Input value={(form.details ?? []).join('|')} onChange={(e) => setForm((f) => ({ ...f, details: e.target.value.split('|').filter(Boolean) }))} placeholder="Not 1 | Not 2 | ..." />
            </div>
          </TabsContent>

          {/* ── 3 ─────────────────────────────────────────────────────────── */}
          <TabsContent value="addresses" className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Teslim Alan Adı</Label><Input value={form.tTeslimAlanAdi ?? ''} onChange={(e) => setForm((f) => ({ ...f, tTeslimAlanAdi: e.target.value }))} /></div>
              <div className="space-y-1"><Label>İlgili Kişi</Label><Input value={form.tIlgiliKisi ?? ''} onChange={(e) => setForm((f) => ({ ...f, tIlgiliKisi: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Telefon</Label><Input value={form.tTelefon ?? ''} onChange={(e) => setForm((f) => ({ ...f, tTelefon: e.target.value }))} /></div>
              <div className="space-y-1"><Label>E-posta</Label><Input value={form.tE_Mail ?? ''} onChange={(e) => setForm((f) => ({ ...f, tE_Mail: e.target.value }))} /></div>
              <div className="space-y-1"><Label>VAT</Label><Input value={form.tVATNumarasi ?? ''} onChange={(e) => setForm((f) => ({ ...f, tVATNumarasi: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Posta Kodu</Label><Input value={form.tZipKod ?? ''} onChange={(e) => setForm((f) => ({ ...f, tZipKod: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Ülke</Label><Input value={form.tUlke ?? ''} onChange={(e) => setForm((f) => ({ ...f, tUlke: e.target.value }))} /></div>
              <div className="space-y-1 col-span-3"><Label>Adres</Label><Input value={form.tAdres ?? ''} onChange={(e) => setForm((f) => ({ ...f, tAdres: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Teslimat Var?</Label>
                <Select value={form.teslimatVar ? 'true' : 'false'} onValueChange={(v) => setForm((f) => ({ ...f, teslimatVar: v === 'true' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="false">Yok</SelectItem><SelectItem value="true">Var</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Teslimat Fiyat</Label><Input type="number" value={form.teslimatFiyat} onChange={(e) => setForm((f) => ({ ...f, teslimatFiyat: Number(e.target.value) }))} /></div>
              <div className="space-y-1"><Label>Teslimat Adet</Label><Input type="number" value={form.mTeslimat} onChange={(e) => setForm((f) => ({ ...f, mTeslimat: Number(e.target.value) }))} /></div>
            </div>
            <p className="text-xs text-muted-foreground">
              Birden fazla teslimat adresi `SiparisTeslimatTablo`'ya yazılır — Faz 4'te detay UI eklenir. İlk adres üst-tabloya snapshot edilir.
            </p>
          </TabsContent>

          {/* ── 4 ─────────────────────────────────────────────────────────── */}
          <TabsContent value="attachments" className="mt-4 space-y-3">
            {createdNo
              ? <>
                  <Label>Ek Dosya (PDF/JPG vb.)</Label>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadMut.mutate({ no: createdNo, file })
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    `Ek` BLOB kolonuna kaydedilir (SiparisAlTablo.Ek). MuhasebeEk Faz 5'te.
                  </p>
                </>
              : <p>Önce sipariş/teklif kaydedin.</p>}
          </TabsContent>

          {/* ── 5 ─────────────────────────────────────────────────────────── */}
          <TabsContent value="approval" className="mt-4">
            {createdNo
              ? <p className="text-sm">
                  <strong>{createdNo}</strong> kaydedildi. Onay akışı için "Siparişlerim" sayfasından "Onaya Gönder" butonu kullanılır.
                </p>
              : <p>Önce sipariş/teklif kaydedin.</p>}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
