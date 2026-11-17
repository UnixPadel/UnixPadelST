import { useState, useRef, useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/DecimalInput'
import { FormField } from '@/components/ui/form-field'
import {
  UploadCloud,
  FileText,
  Plus,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  FileCheck2,
  Sparkles,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import { analyzeDeclaration } from '@/api/warehouseStock'
import { cn } from '@/lib/utils'
import type { CreateStockRequest, CreateStockItemRequest } from '@/types'

interface AddStockDialogProps {
  open: boolean
  initialMode?: 'upload' | 'manual'
  onClose: () => void
  onSave: (data: CreateStockRequest, file?: File | null) => Promise<void>
  saving?: boolean
}

/** Yapay zekânın doldurabildiği başlık alanları — "YZ doldurdu" işareti için. */
type HeaderKey = 'konum' | 'beyannameNo' | 'tescilTarihi' | 'rejimKodu' | 'gumrukIdaresi' | 'gonderici' | 'alici' | 'fatura' | 'kur'

const emptyItem = (): CreateStockItemRequest => ({ malAdi: '', miktar: 1, birim: 'ADET', kapAdedi: null, kapCinsi: '' })

/**
 * Antrepo/depo stok girişi. 4.4 (40+ ergonomi) — sistem "kara kutu" olmasın:
 * yapay zekânın doldurduğu her alan işaretlenir (kullanıcı düzeltince işaret
 * kalkar), okuma uyarıları madde madde listelenir ve yüklenen belge alanların
 * yanında açık durur; kullanıcı ekranlar arasında gidip gelmeden karşılaştırır.
 */
export function AddStockDialog({
  open,
  initialMode = 'upload',
  onClose,
  onSave,
  saving = false,
}: AddStockDialogProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisWarnings, setAnalysisWarnings] = useState<string[]>([])
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Form alanları
  const [konum, setKonum] = useState<'Antrepo' | 'Depo'>('Antrepo')
  const [beyannameNo, setBeyannameNo] = useState('')
  const [tescilTarihi, setTescilTarihi] = useState('')
  const [rejimKodu, setRejimKodu] = useState('')
  const [gumrukIdaresi, setGumrukIdaresi] = useState('')
  const [gonderici, setGonderici] = useState('')
  const [alici, setAlici] = useState('')
  const [doviz, setDoviz] = useState('')
  const [faturaTutari, setFaturaTutari] = useState<number | ''>('')
  const [kur, setKur] = useState<number | ''>('')
  const [hamJson, setHamJson] = useState<string | null>(null)
  const [kaynak, setKaynak] = useState<'Otomatik' | 'Elle'>('Elle')

  const [kalemler, setKalemler] = useState<CreateStockItemRequest[]>([emptyItem()])

  // YZ işaretleri: başlık alanları + kalem başına bayrak (kalemlerle aynı sırada).
  const [aiHeader, setAiHeader] = useState<Set<HeaderKey>>(new Set())
  const [aiItems, setAiItems] = useState<boolean[]>([false])

  const [showExtra, setShowExtra] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setAttachedFile(null)
      setAnalysisWarnings([])
      setFormError(null)
      setShowExtra(false)
      setKaynak('Elle')
      setKonum('Antrepo')
      setBeyannameNo('')
      setTescilTarihi('')
      setRejimKodu('')
      setGumrukIdaresi('')
      setGonderici('')
      setAlici('')
      setDoviz('')
      setFaturaTutari('')
      setKur('')
      setHamJson(null)
      setKalemler([emptyItem()])
      setAiHeader(new Set())
      setAiItems([false])
      setStep(initialMode === 'manual' ? 'review' : 'upload')
    }
  }, [open, initialMode])

  // Belge önizlemesi (PDF/görsel) için yerel adres.
  useEffect(() => {
    if (!attachedFile) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(attachedFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [attachedFile])

  const clearAi = (key: HeaderKey) => setAiHeader((s) => {
    if (!s.has(key)) return s
    const n = new Set(s); n.delete(key); return n
  })

  const handleFileSelected = async (file: File) => {
    setAttachedFile(file)
    setAnalyzing(true)
    setAnalysisWarnings([])
    setFormError(null)

    try {
      const res = await analyzeDeclaration(file)
      if (res.basarili && res.taslak) {
        const d = res.taslak
        const filled = new Set<HeaderKey>()
        const mark = (key: HeaderKey, value: unknown) => { if (value !== null && value !== undefined && value !== '') filled.add(key) }
        setKaynak('Otomatik')
        setHamJson(d.hamJson)
        setBeyannameNo(d.beyannameNo ?? ''); mark('beyannameNo', d.beyannameNo)
        if (d.tescilTarihi) { setTescilTarihi(d.tescilTarihi.slice(0, 10)); filled.add('tescilTarihi') }
        setRejimKodu(d.rejimKodu ?? ''); mark('rejimKodu', d.rejimKodu)
        setGumrukIdaresi(d.gumrukIdaresi ?? ''); mark('gumrukIdaresi', d.gumrukIdaresi)
        setGonderici(d.gonderici ?? ''); mark('gonderici', d.gonderici)
        setAlici(d.alici ?? ''); mark('alici', d.alici)
        setDoviz(d.doviz ?? '')
        setFaturaTutari(d.faturaTutari ?? ''); mark('fatura', d.faturaTutari ?? d.doviz)
        setKur(d.kur ?? ''); mark('kur', d.kur)

        if (d.onerilenKonum === 'Depo' || d.onerilenKonum === 'Antrepo') {
          setKonum(d.onerilenKonum)
          filled.add('konum')
        }

        if (d.kalemler && d.kalemler.length > 0) {
          setKalemler(
            d.kalemler.map((k, idx) => ({
              kalemNo: k.kalemNo ?? idx + 1,
              malAdi: k.malAdi ?? t('addStock.itemN', { n: idx + 1 }),
              ticariTanim: k.ticariTanim ?? '',
              miktar: k.miktar ?? 1,
              birim: k.birim ?? 'ADET',
              kapAdedi: k.kapAdedi ?? null,
              kapCinsi: k.kapCinsi ?? '',
              gtip: k.gtip ?? '',
              menseUlke: k.menseUlke ?? '',
              brutKg: k.brutKg ?? null,
              netKg: k.netKg ?? null,
              kalemFiyati: k.kalemFiyati ?? null,
            })),
          )
          setAiItems(d.kalemler.map(() => true))
        }

        setAiHeader(filled)
        // Ek alanlardan biri doluysa bölüm açık gelir: kullanıcı neyin dolduğunu görür.
        if (['tescilTarihi', 'rejimKodu', 'gumrukIdaresi', 'gonderici', 'alici', 'fatura', 'kur'].some((k) => filled.has(k as HeaderKey))) {
          setShowExtra(true)
        }

        if (d.uyarilar && d.uyarilar.length > 0) {
          setAnalysisWarnings(d.uyarilar.map((u) => u.mesaj))
        }
      } else {
        setKaynak('Elle')
        setAnalysisWarnings([res.hataMesaji || t('addStock.aiUnavailable')])
      }
    } catch {
      setKaynak('Elle')
      setAnalysisWarnings([t('addStock.aiFailed')])
    } finally {
      setAnalyzing(false)
      setStep('review')
    }
  }

  const addKalem = () => {
    setKalemler((prev) => [...prev, emptyItem()])
    setAiItems((prev) => [...prev, false])
  }

  const removeKalem = (index: number) => {
    if (kalemler.length <= 1) return
    setKalemler((prev) => prev.filter((_, i) => i !== index))
    setAiItems((prev) => prev.filter((_, i) => i !== index))
  }

  const updateKalem = (index: number, patch: Partial<CreateStockItemRequest>) => {
    setKalemler((prev) => prev.map((k, i) => (i === index ? { ...k, ...patch } : k)))
    setAiItems((prev) => prev.map((v, i) => (i === index ? false : v)))
  }

  const handleSave = async () => {
    setFormError(null)

    if (!kalemler.length) {
      setFormError(t('addStock.errNoItems'))
      return
    }

    for (let i = 0; i < kalemler.length; i++) {
      const k = kalemler[i]
      if (!k.malAdi.trim()) {
        setFormError(t('addStock.errMalAdi', { n: i + 1 }))
        return
      }
      if (!k.miktar || k.miktar <= 0) {
        setFormError(t('addStock.errMiktar', { n: i + 1 }))
        return
      }
    }

    const payload: CreateStockRequest = {
      konum,
      beyannameNo: beyannameNo.trim() || null,
      tescilTarihi: tescilTarihi || null,
      rejimKodu: rejimKodu.trim() || null,
      gumrukIdaresi: gumrukIdaresi.trim() || null,
      gonderici: gonderici.trim() || null,
      alici: alici.trim() || null,
      doviz: doviz.trim() || null,
      faturaTutari: faturaTutari === '' ? null : (faturaTutari as number),
      kur: kur === '' ? null : (kur as number),
      kaynak,
      hamJson,
      kalemler: kalemler.map((k) => ({
        ...k,
        kapAdedi: kaynak === 'Otomatik' ? k.kapAdedi : null,
        kapCinsi: kaynak === 'Otomatik' ? k.kapCinsi : null,
      })),
    }

    await onSave(payload, attachedFile)
  }

  const aiChip = (
    <span className="inline-flex items-center gap-1 rounded bg-progress-soft px-1.5 py-0.5 text-2xs font-semibold text-progress-soft-foreground">
      <Sparkles className="h-3 w-3" aria-hidden />{t('addStock.aiChip')}
    </span>
  )
  /** Etiket + (varsa) YZ işareti. */
  const label = (key: HeaderKey, text: string): ReactNode =>
    aiHeader.has(key) ? <span className="inline-flex flex-wrap items-center gap-1.5">{text}{aiChip}</span> : text

  const aiCount = aiHeader.size + aiItems.filter(Boolean).length
  const isImage = attachedFile?.type.startsWith('image/')
  const isPdf = attachedFile?.type === 'application/pdf' || attachedFile?.name.toLowerCase().endsWith('.pdf')
  const showPreview = step === 'review' && !!previewUrl && (isImage || isPdf)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving && !analyzing) onClose() }}>
      <DialogContent size={showPreview ? 'full' : 'xl'} className="flex max-h-[92vh] flex-col p-6">
        <DialogHeader className="shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  {step === 'upload' ? t('addStock.titleUpload') : t('addStock.titleReview')}
                </DialogTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {step === 'upload' ? t('addStock.subUpload') : t('addStock.subReview')}
                </p>
              </div>
            </div>

            {attachedFile && (
              <span className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm">
                <FileCheck2 className="h-4 w-4 text-success" aria-hidden />
                <span className="max-w-[180px] truncate">{attachedFile.name}</span>
                {/* H5 — önceden adı olmayan bir X ikonuydu. */}
                <Button type="button" size="xs" variant="ghost" onClick={() => setAttachedFile(null)}>
                  <X className="h-4 w-4" aria-hidden /> {t('addStock.removeFile')}
                </Button>
              </span>
            )}
          </div>
        </DialogHeader>

        {/* ADIM 1: YÜKLEME */}
        {step === 'upload' && (
          <div className="space-y-4 py-6">
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files?.[0]
                if (f) void handleFileSelected(f)
              }}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-strong p-8 text-center transition-colors hover:border-primary hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg,image/webp,image/heic"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleFileSelected(f)
                }}
              />

              {analyzing ? (
                <div className="flex flex-col items-center space-y-3 py-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
                  <p className="text-base font-semibold text-foreground">{t('addStock.analyzing')}</p>
                  <p className="max-w-sm text-sm text-muted-foreground">{t('addStock.analyzingHint')}</p>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UploadCloud className="h-6 w-6" aria-hidden />
                  </div>
                  <p className="text-base font-semibold text-foreground">{t('addStock.dropTitle')}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t('addStock.dropHint')}</p>
                  <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary">
                    <Sparkles className="h-4 w-4" aria-hidden />
                    <span>{t('addStock.aiNote')}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setKaynak('Elle')
                  setStep('review')
                }}
              >
                {t('addStock.manualEntry')}
              </Button>
            </div>
          </div>
        )}

        {/* ADIM 2: KONTROL / ELLE GİRİŞ */}
        {step === 'review' && (
          <div className={cn('min-h-0 flex-1 pt-2', showPreview && 'grid gap-4 lg:grid-cols-2')}>
            {showPreview && (
              <section aria-label={t('addStock.previewTitle')} className="flex min-h-[40vh] flex-col overflow-hidden rounded-lg border bg-muted lg:min-h-0">
                <p className="border-b bg-card px-3 py-2 text-sm font-semibold">{t('addStock.previewTitle')}</p>
                {isImage
                  ? <div className="flex flex-1 items-center justify-center overflow-auto p-2"><img src={previewUrl!} alt={attachedFile?.name ?? ''} className="max-w-full object-contain" /></div>
                  : <iframe src={previewUrl!} title={attachedFile?.name ?? t('addStock.previewTitle')} className="h-full w-full flex-1 border-0 bg-white" />}
              </section>
            )}

            <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
              {aiCount > 0 && (
                <div className="flex items-start gap-2.5 rounded-lg border border-progress/30 bg-progress-soft p-3 text-sm text-progress-soft-foreground">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <p>{t(showPreview ? 'addStock.aiFilledBanner' : 'addStock.aiFilledBannerNoPreview', { count: aiCount })}</p>
                </div>
              )}

              {analysisWarnings.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-warning-soft-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <div className="flex-1">
                    <p className="font-semibold">{t('addStock.warningsTitle')}</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {analysisWarnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              {/* Üst ayarlar: konum ve beyanname no */}
              <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-3.5 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 block text-sm font-semibold text-field-label">
                    {label('konum', t('addStock.konum'))} <span className="text-danger" aria-hidden>*</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('addStock.konum')}>
                    {(['Antrepo', 'Depo'] as const).map((k) => (
                      <Button key={k} type="button" variant={konum === k ? 'default' : 'outline'} aria-pressed={konum === k}
                        onClick={() => { setKonum(k); clearAi('konum') }}>
                        {k === 'Antrepo' ? t('addStock.antrepo') : t('addStock.depo')}
                      </Button>
                    ))}
                  </div>
                </div>

                <FormField label={label('beyannameNo', t('addStock.beyannameNo'))} hint={t('addStock.beyannameNoHint')}>
                  <Input
                    value={beyannameNo}
                    onChange={(e) => { setBeyannameNo(e.target.value); clearAi('beyannameNo') }}
                    placeholder={t('addStock.beyannameNoPh')}
                    className="font-mono uppercase"
                  />
                </FormField>
              </div>

              {/* Kalemler */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('addStock.items', { count: kalemler.length })}
                  </h3>
                  <Button type="button" variant="outline" size="sm" onClick={addKalem}>
                    <Plus className="h-4 w-4" aria-hidden /> {t('addStock.addItem')}
                  </Button>
                </div>

                <div className="space-y-3">
                  {kalemler.map((kalem, idx) => (
                    <div key={idx} className="space-y-3 rounded-lg border bg-card p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                        <span className="inline-flex flex-wrap items-center gap-2 text-sm font-bold text-foreground">
                          {t('addStock.itemN', { n: idx + 1 })}
                          {aiItems[idx] && aiChip}
                        </span>
                        {kalemler.length > 1 && (
                          // H5 — önceden yalnız `title`'ı olan çöp kutusu ikonuydu.
                          <Button type="button" size="xs" variant="ghost" className="text-danger" onClick={() => removeKalem(idx)}>
                            <Trash2 className="h-4 w-4" aria-hidden /> {t('addStock.removeItem')}
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                        <div className="sm:col-span-5">
                          <FormField label={t('addStock.malAdi')} required>
                            <Input
                              value={kalem.malAdi}
                              onChange={(e) => updateKalem(idx, { malAdi: e.target.value })}
                              placeholder={t('addStock.malAdiPh')}
                              className="font-medium"
                            />
                          </FormField>
                        </div>

                        <div className="sm:col-span-3">
                          <FormField label={t('addStock.miktar')} required>
                            <DecimalInput
                              value={kalem.miktar}
                              onValueChange={(val) => updateKalem(idx, { miktar: val as number })}
                              className="font-semibold tabular-nums"
                            />
                          </FormField>
                        </div>

                        <div className="sm:col-span-4">
                          <FormField label={t('addStock.birim')} required>
                            <Input
                              value={kalem.birim}
                              onChange={(e) => updateKalem(idx, { birim: e.target.value.toUpperCase() })}
                              placeholder={t('addStock.birimPh')}
                              className="uppercase"
                            />
                          </FormField>
                        </div>
                      </div>

                      {/* Otomatik okumada kap bilgisi kutu 6/31'den gelir; elle girişte kap alanları yok. */}
                      {kaynak === 'Otomatik' ? (
                        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-12">
                          <div className="sm:col-span-3">
                            <FormField label={t('addStock.kapAdedi')} hint={t('addStock.optional')}>
                              <DecimalInput
                                value={kalem.kapAdedi ?? ''}
                                onValueChange={(val) => updateKalem(idx, { kapAdedi: val === '' ? null : (val as number) })}
                                className="tabular-nums"
                              />
                            </FormField>
                          </div>

                          <div className="sm:col-span-3">
                            <FormField label={t('addStock.kapCinsi')}>
                              <Input
                                value={kalem.kapCinsi ?? ''}
                                onChange={(e) => updateKalem(idx, { kapCinsi: e.target.value.toUpperCase() })}
                                placeholder={t('addStock.kapCinsiPh')}
                                className="uppercase"
                              />
                            </FormField>
                          </div>

                          <div className="sm:col-span-6">
                            <FormField label={t('addStock.ticariTanim')}>
                              <Input
                                value={kalem.ticariTanim ?? ''}
                                onChange={(e) => updateKalem(idx, { ticariTanim: e.target.value })}
                                placeholder={t('addStock.ticariTanimPh')}
                              />
                            </FormField>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-1">
                          <FormField label={t('addStock.aciklama')} hint={t('addStock.optional')}>
                            <Input
                              value={kalem.ticariTanim ?? ''}
                              onChange={(e) => updateKalem(idx, { ticariTanim: e.target.value })}
                              placeholder={t('addStock.aciklamaPh')}
                            />
                          </FormField>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* İsteğe bağlı ek bilgiler */}
              <div className="rounded-lg border bg-card p-3">
                <button
                  type="button"
                  aria-expanded={showExtra}
                  onClick={() => setShowExtra(!showExtra)}
                  className="flex min-h-[var(--ctl-sm,2.25rem)] w-full items-center justify-between text-sm font-semibold text-foreground"
                >
                  <span>{t('addStock.extraTitle')}</span>
                  {showExtra ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
                </button>

                {showExtra && (
                  <div className="mt-2 grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-3">
                    <FormField label={label('tescilTarihi', t('addStock.tescilTarihi'))}>
                      <Input type="date" value={tescilTarihi} onChange={(e) => { setTescilTarihi(e.target.value); clearAi('tescilTarihi') }} />
                    </FormField>

                    <FormField label={label('gumrukIdaresi', t('addStock.gumrukIdaresi'))}>
                      <Input value={gumrukIdaresi} onChange={(e) => { setGumrukIdaresi(e.target.value); clearAi('gumrukIdaresi') }}
                        placeholder={t('addStock.gumrukIdaresiPh')} />
                    </FormField>

                    <FormField label={label('rejimKodu', t('addStock.rejimKodu'))}>
                      <Input value={rejimKodu} onChange={(e) => { setRejimKodu(e.target.value); clearAi('rejimKodu') }}
                        placeholder="AN 7, IM 4" className="uppercase" />
                    </FormField>

                    <FormField label={label('gonderici', t('addStock.gonderici'))}>
                      <Input value={gonderici} onChange={(e) => { setGonderici(e.target.value); clearAi('gonderici') }}
                        placeholder={t('addStock.gondericiPh')} />
                    </FormField>

                    <FormField label={label('alici', t('addStock.alici'))}>
                      <Input value={alici} onChange={(e) => { setAlici(e.target.value); clearAi('alici') }}
                        placeholder={t('addStock.aliciPh')} />
                    </FormField>

                    <FormField label={label('fatura', t('addStock.fatura'))}>
                      <div className="flex gap-1.5">
                        <DecimalInput value={faturaTutari} onValueChange={(val) => { setFaturaTutari(val); clearAi('fatura') }} placeholder="5.500" />
                        <Input value={doviz} onChange={(e) => { setDoviz(e.target.value.toUpperCase()); clearAi('fatura') }}
                          placeholder="USD" className="w-20 uppercase" aria-label={t('addStock.fatura')} />
                      </div>
                    </FormField>

                    {/* Kur önceden yalnız yapay zekâ ile doluyor, ekranda hiç görünmüyordu. */}
                    <FormField label={label('kur', t('addStock.kur'))}>
                      <DecimalInput value={kur} onValueChange={(val) => { setKur(val); clearAi('kur') }} />
                    </FormField>
                  </div>
                )}
              </div>

              {formError && (
                <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft p-2.5 text-sm font-medium text-danger-soft-foreground">
                  {formError}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 gap-2 border-t pt-3 sm:justify-between sm:gap-0">
          {step === 'review' && initialMode === 'upload' ? (
            <Button type="button" variant="ghost" onClick={() => setStep('upload')} disabled={saving}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> {t('addStock.otherDoc')}
            </Button>
          ) : <span />}

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving || analyzing}>
              {t('common.cancel')}
            </Button>
            {step === 'review' && (
              <Button type="button" loading={saving} onClick={handleSave} className="px-5 font-semibold">
                {t('addStock.save')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
