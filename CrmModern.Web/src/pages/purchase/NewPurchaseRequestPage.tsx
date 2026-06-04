import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createPurchaseRequest } from '@/api/purchase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ToastProvider'

export function NewPurchaseRequestPage() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const user = getUser()
  const [form, setForm] = useState({
    urunAdi: '', urunTuru: '', urunMaliyeti: 0, alinanYer: '', notlar: '',
    departman: user?.yetkiTuru ?? '',
  })

  const createMut = useMutation({
    mutationFn: () => createPurchaseRequest({
      urunAdi:               form.urunAdi,
      urunTuru:              form.urunTuru || undefined,
      urunMaliyeti:          form.urunMaliyeti,
      alinanYer:             form.alinanYer || undefined,
      notlar:                form.notlar || undefined,
      talepEdenKullaniciAdi: user!.kullaniciAdi,
      departman:             form.departman,
      talepTipi:             'SatinAlma',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-mine'] })
      toast({ title: 'Talep oluşturuldu' })
      nav('/purchase/mine')
    },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })

  const valid = form.urunAdi.trim() && form.urunMaliyeti > 0 && form.departman.trim() && form.alinanYer.trim() && form.urunTuru.trim()

  return (
    <div>
      <PageHeader title={t('purchase.newTitle')} />
      <div className="p-6 max-w-2xl space-y-3">
        <div className="space-y-1"><Label>Ürün Adı *</Label><Input value={form.urunAdi} onChange={(e) => setForm((f) => ({ ...f, urunAdi: e.target.value }))} /></div>
        <div className="space-y-1"><Label>Ürün Türü *</Label><Input value={form.urunTuru} onChange={(e) => setForm((f) => ({ ...f, urunTuru: e.target.value }))} /></div>
        <div className="space-y-1"><Label>Maliyet *</Label><Input type="number" step="0.01" value={form.urunMaliyeti} onChange={(e) => setForm((f) => ({ ...f, urunMaliyeti: Number(e.target.value) }))} /></div>
        <div className="space-y-1"><Label>Alınan Yer *</Label><Input value={form.alinanYer} onChange={(e) => setForm((f) => ({ ...f, alinanYer: e.target.value }))} /></div>
        {/* Departman — giriş yapan kullanıcının rolünden otomatik dolar, değiştirilemez. */}
        <div className="space-y-1">
          <Label>Departman *</Label>
          <Input value={form.departman} disabled readOnly />
          <p className="text-xs text-muted-foreground">Rolünüzden otomatik atanır.</p>
        </div>
        <div className="space-y-1"><Label>Notlar</Label><Textarea rows={3} value={form.notlar} onChange={(e) => setForm((f) => ({ ...f, notlar: e.target.value }))} /></div>

        <div className="pt-2 flex gap-2">
          <Button variant="outline" onClick={() => nav(-1)}>Vazgeç</Button>
          <Button disabled={!valid || createMut.isPending} onClick={() => createMut.mutate()}>
            {createMut.isPending ? 'Gönderiliyor...' : 'Talep Oluştur'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Talep "Bekliyor" durumunda kaydedilir, ön onay için omur.caliskan'a düşer.</p>
      </div>
    </div>
  )
}
