import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createPurchaseRequest } from '@/api/purchase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/DecimalInput'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/components/FieldError'
import { useToast } from '@/components/ToastProvider'

export function NewPurchaseRequestPage() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const user = getUser()
  // PROMPT-v2 §4: Maliyet alanı boş başlar; submit guard (urunMaliyeti > 0)
  // sıfırla / NULL ile kayıt açılmasını engeller.
  const [form, setForm] = useState<{
    urunAdi: string
    urunTuru: string
    urunMaliyeti: number | null
    alinanYer: string
    notlar: string
    departman: string
  }>({
    urunAdi: '', urunTuru: '', urunMaliyeti: null, alinanYer: '', notlar: '',
    departman: user?.yetkiTuru ?? '',
  })
  const [submitted, setSubmitted] = useState(false)

  const createMut = useMutation({
    mutationFn: () => createPurchaseRequest({
      urunAdi:               form.urunAdi,
      urunTuru:              form.urunTuru || undefined,
      // PROMPT-v2 §4: valid guard zaten >0 zorunlu; burada non-null garantisi.
      urunMaliyeti:          form.urunMaliyeti ?? 0,
      alinanYer:             form.alinanYer || undefined,
      notlar:                form.notlar || undefined,
      talepEdenKullaniciAdi: user!.kullaniciAdi,
      departman:             form.departman,
      talepTipi:             'SatinAlma',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-mine'] })
      toast({ title: t('purchase.createSuccess') })
      nav('/purchase/mine')
    },
    onError: () => toast({ title: t('purchase.createError'), variant: 'destructive' }),
  })

  // PROMPT-v2 §4: urunMaliyeti null/0 ise valid değil — kullanıcı sıfır
  // maliyetli talep gönderemez. Null karşılaştırması "> 0" ile zaten false.
  const valid = !!(form.urunAdi.trim() && (form.urunMaliyeti ?? 0) > 0 && form.departman.trim() && form.alinanYer.trim() && form.urunTuru.trim())

  const onSubmit = () => {
    setSubmitted(true)
    if (!valid) return
    createMut.mutate()
  }

  return (
    <div>
      <PageHeader title={t('purchase.newTitle')} />
      <div className="p-6 max-w-2xl space-y-3">
        <div className="space-y-1">
          <Label>{t('purchase.urunAdi')} *</Label>
          <Input value={form.urunAdi} onChange={(e) => setForm((f) => ({ ...f, urunAdi: e.target.value }))} />
          {submitted && !form.urunAdi.trim() && <FieldError message={t('validation.required')} />}
        </div>
        <div className="space-y-1">
          <Label>{t('purchase.urunTuru')} *</Label>
          <Input value={form.urunTuru} onChange={(e) => setForm((f) => ({ ...f, urunTuru: e.target.value }))} />
          {submitted && !form.urunTuru.trim() && <FieldError message={t('validation.required')} />}
        </div>
        <div className="space-y-1">
          <Label>{t('purchase.maliyet')} *</Label>
          {/* PROMPT-v2 §4: boş başlar; null gönderilince valid guard tetiklenir. */}
          <DecimalInput value={form.urunMaliyeti ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, urunMaliyeti: v === '' ? null : v }))} />
          {submitted && !((form.urunMaliyeti ?? 0) > 0) && <FieldError message={t('validation.required')} />}
        </div>
        <div className="space-y-1">
          <Label>{t('purchase.alinanYer')} *</Label>
          <Input value={form.alinanYer} onChange={(e) => setForm((f) => ({ ...f, alinanYer: e.target.value }))} />
          {submitted && !form.alinanYer.trim() && <FieldError message={t('validation.required')} />}
        </div>
        {/* Departman — giriş yapan kullanıcının rolünden otomatik dolar, değiştirilemez. */}
        <div className="space-y-1">
          <Label>{t('purchase.departman')} *</Label>
          <Input value={form.departman} disabled readOnly />
          <p className="text-xs text-muted-foreground">{t('purchase.departmanHint')}</p>
        </div>
        <div className="space-y-1"><Label>{t('purchase.notlar')}</Label><Textarea rows={3} value={form.notlar} onChange={(e) => setForm((f) => ({ ...f, notlar: e.target.value }))} /></div>

        <div className="pt-2 flex gap-2">
          <Button variant="outline" onClick={() => nav(-1)}>{t('purchase.cancel')}</Button>
          <Button disabled={createMut.isPending} onClick={onSubmit}>
            {createMut.isPending ? t('purchase.creating') : t('purchase.create')}
          </Button>
        </div>
      </div>
    </div>
  )
}
