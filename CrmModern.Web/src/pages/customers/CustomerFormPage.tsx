import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getCustomer, createCustomer, updateCustomer,
  getUlkeler, createUlke,
  type CustomerWriteDto,
} from '@/api/customers'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { useEnterNavigation } from '@/hooks/useEnterNavigation'
import { usePreferences } from '@/lib/preferences'
import { FieldError } from '@/components/FieldError'
import { describeApiError } from '@/lib/axios'

/**
 * PROMPT.md #16 + #19: Müşteri ekle/düzenle — port of MusteriEkle.cs.
 *
 * Add / edit share a single component:
 *   /customers/new          → no `id`         → create
 *   /customers/:id/edit     → has `id`        → load + update
 *
 * Country combobox is sourced from /api/musteri/ulkeler. Legacy WinForms
 * auto-fills a separate phone-prefix (NumaraBirimi) textbox next to phone —
 * mirrored here as a small read-only input pinned left of the Telefon field.
 *
 * Unique-name check is owned by the backend (BusinessException → 400 with
 * message). We do NOT pre-check on the client; the toast surfaces the
 * server message verbatim via describeApiError.
 *
 * Inline "Add country" dialog (legacy 2nd tab) — opens CreateUlkeDto submit,
 * invalidates ulkeler query, auto-selects the new country.
 */

const blank: CustomerWriteDto = {
  musteriAd: '', telefon: '', zipKod: '', e_Mail: '', adres: '', vatNumarasi: '', ulkelerID: 0,
}

export function CustomerFormPage() {
  const nav = useNavigate()
  const params = useParams<{ id?: string }>()
  const editId = params.id ? Number(params.id) : undefined
  const isEdit = editId !== undefined

  const qc = useQueryClient()
  const { t } = useTranslation()
  // E-3 — ETA tarzı Enter ile sonraki alan (Tercihlerim'den kapatılabilir).
  const onEnterNav = useEnterNavigation()
  const { enterNavigation } = usePreferences()
  const { toast } = useToast()

  const [form, setForm] = useState<CustomerWriteDto>(blank)
  const [submitted, setSubmitted] = useState(false)
  const [ulkeOpen, setUlkeOpen] = useState(false)
  const [ulkeForm, setUlkeForm] = useState({ ulkeAdi: '', numaraBirimi: '' })
  const [ulkeSubmitted, setUlkeSubmitted] = useState(false)

  const { data: ulkeler = [] } = useQuery({ queryKey: ['ulkeler'], queryFn: getUlkeler })

  // Edit-mode load: only fires when editId is set and ulkeler list is ready
  // (we want the Select to show the matching item rather than empty on first paint).
  const { data: existing } = useQuery({
    queryKey: ['customer', editId],
    queryFn: () => getCustomer(editId!),
    enabled: isEdit,
  })
  useEffect(() => {
    if (existing) {
      setForm({
        musteriAd:   existing.musteriAd,
        telefon:     existing.telefon,
        zipKod:      existing.zipKod,
        e_Mail:      existing.e_Mail,
        adres:       existing.adres,
        vatNumarasi: existing.vatNumarasi,
        ulkelerID:   existing.ulkelerID,
      })
    }
  }, [existing])

  // Phone prefix lookup mirrors MusteriEkle's SelectedIndexChanged handler —
  // pull NumaraBirimi from the chosen country and surface as read-only text.
  const phonePrefix = useMemo(() => {
    const u = ulkeler.find((x) => x.ulkelerID === form.ulkelerID)
    return u?.numaraBirimi ?? ''
  }, [form.ulkelerID, ulkeler])

  // Validation — every field required per legacy form.
  const errors = {
    musteriAd:   !form.musteriAd.trim(),
    ulkelerID:   !form.ulkelerID,
    telefon:     !form.telefon.trim(),
    e_Mail:      !form.e_Mail.trim(),
    adres:       !form.adres.trim(),
    zipKod:      !form.zipKod.trim(),
    vatNumarasi: !form.vatNumarasi.trim(),
  }
  const isValid = !Object.values(errors).some(Boolean)

  const saveMut = useMutation({
    mutationFn: () => (isEdit ? updateCustomer(editId!, form) : createCustomer(form)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      if (isEdit) qc.invalidateQueries({ queryKey: ['customer', editId] })
      toast({ title: isEdit ? t('customers.toast.updated') : t('customers.toast.created') })
      nav('/customers')
    },
    onError: (e: unknown) => toast({
      title: t('customers.toast.saveFailed'),
      description: describeApiError(e),
      variant: 'destructive',
    }),
  })

  const ulkeMut = useMutation({
    mutationFn: () => createUlke(ulkeForm.ulkeAdi.trim(), ulkeForm.numaraBirimi.trim()),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['ulkeler'] })
      // Auto-select the newly created country so the user doesn't have to
      // hunt for it in the dropdown after the modal closes.
      setForm((f) => ({ ...f, ulkelerID: created.ulkelerID }))
      setUlkeOpen(false)
      setUlkeForm({ ulkeAdi: '', numaraBirimi: '' })
      setUlkeSubmitted(false)
      toast({ title: t('customers.toast.ulkeCreated') })
    },
    onError: (e: unknown) => toast({
      title: t('customers.toast.ulkeFailed'),
      description: describeApiError(e),
      variant: 'destructive',
    }),
  })

  const onSubmit = () => {
    setSubmitted(true)
    if (!isValid) return
    saveMut.mutate()
  }

  const onSubmitUlke = () => {
    setUlkeSubmitted(true)
    if (!ulkeForm.ulkeAdi.trim() || !ulkeForm.numaraBirimi.trim()) return
    ulkeMut.mutate()
  }

  return (
    <div>
      <PageHeader title={isEdit ? t('customers.editTitle') : t('customers.addTitle')} />
      <div className="p-6 max-w-3xl space-y-4" onKeyDown={enterNavigation ? onEnterNav : undefined}>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2">
            <Label>{t('customers.fields.musteriAd')} *</Label>
            <Input value={form.musteriAd} onChange={(e) => setForm((f) => ({ ...f, musteriAd: e.target.value }))} />
            {submitted && errors.musteriAd && <FieldError message={t('validation.required')} />}
          </div>

          <div className="space-y-1 col-span-2">
            <Label>{t('customers.fields.ulke')} *</Label>
            <div className="flex gap-2">
              <Select
                value={form.ulkelerID ? String(form.ulkelerID) : ''}
                onValueChange={(v) => setForm((f) => ({ ...f, ulkelerID: Number(v) }))}
              >
                <SelectTrigger className="flex-1"><SelectValue placeholder={t('customers.fields.ulkeSec')} /></SelectTrigger>
                <SelectContent>
                  {ulkeler.map((u) => (
                    <SelectItem key={u.ulkelerID} value={String(u.ulkelerID)}>{u.ulkeAdi}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={() => setUlkeOpen(true)}>
                {t('customers.addCountry')}
              </Button>
            </div>
            {submitted && errors.ulkelerID && <FieldError message={t('validation.required')} />}
          </div>

          <div className="space-y-1 col-span-2">
            <Label>{t('customers.fields.telefon')} *</Label>
            <div className="flex gap-2">
              {/* Read-only phone prefix mirrors MusteriEkle.musteriTelefonKodTextBox */}
              <Input className="w-24" value={phonePrefix} readOnly disabled placeholder="+xx" />
              <Input
                className="flex-1"
                value={form.telefon}
                onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
              />
            </div>
            {submitted && errors.telefon && <FieldError message={t('validation.required')} />}
          </div>

          <div className="space-y-1">
            <Label>{t('customers.fields.email')} *</Label>
            <Input value={form.e_Mail} onChange={(e) => setForm((f) => ({ ...f, e_Mail: e.target.value }))} />
            {submitted && errors.e_Mail && <FieldError message={t('validation.required')} />}
          </div>
          <div className="space-y-1">
            <Label>{t('customers.fields.vat')} *</Label>
            <Input value={form.vatNumarasi} onChange={(e) => setForm((f) => ({ ...f, vatNumarasi: e.target.value }))} />
            {submitted && errors.vatNumarasi && <FieldError message={t('validation.required')} />}
          </div>
          <div className="space-y-1">
            <Label>{t('customers.fields.zipKod')} *</Label>
            <Input value={form.zipKod} onChange={(e) => setForm((f) => ({ ...f, zipKod: e.target.value }))} />
            {submitted && errors.zipKod && <FieldError message={t('validation.required')} />}
          </div>
          <div className="space-y-1 col-span-2">
            <Label>{t('customers.fields.adres')} *</Label>
            <Input value={form.adres} onChange={(e) => setForm((f) => ({ ...f, adres: e.target.value }))} />
            {submitted && errors.adres && <FieldError message={t('validation.required')} />}
          </div>
        </div>

        {/* Scaling Faz 3 — kısa pencerede Kaydet görünür kalsın: alta yapışık çubuk. */}
        <div className="sticky bottom-0 -mx-6 flex gap-2 border-t bg-canvas/95 px-6 py-2.5 backdrop-blur">
          <Button variant="outline" onClick={() => nav(-1)}>{t('common.cancel')}</Button>
          <Button disabled={saveMut.isPending} onClick={onSubmit}>
            {saveMut.isPending ? t('common.saving') : (isEdit ? t('common.save') : t('common.add'))}
          </Button>
        </div>
      </div>

      {/* ── Add-country modal (legacy 2nd tab) ─────────────────────────── */}
      <Dialog open={ulkeOpen} onOpenChange={(o) => { if (!o) { setUlkeOpen(false); setUlkeSubmitted(false) } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('customers.addCountryTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t('customers.fields.ulkeAdi')} *</Label>
              <Input value={ulkeForm.ulkeAdi} onChange={(e) => setUlkeForm((f) => ({ ...f, ulkeAdi: e.target.value }))} />
              {ulkeSubmitted && !ulkeForm.ulkeAdi.trim() && <FieldError message={t('validation.required')} />}
            </div>
            <div className="space-y-1">
              <Label>{t('customers.fields.numaraBirimi')} *</Label>
              <Input placeholder="+90" value={ulkeForm.numaraBirimi} onChange={(e) => setUlkeForm((f) => ({ ...f, numaraBirimi: e.target.value }))} />
              {ulkeSubmitted && !ulkeForm.numaraBirimi.trim() && <FieldError message={t('validation.required')} />}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUlkeOpen(false)}>{t('common.cancel')}</Button>
            <Button disabled={ulkeMut.isPending} onClick={onSubmitUlke}>
              {ulkeMut.isPending ? t('common.saving') : t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
