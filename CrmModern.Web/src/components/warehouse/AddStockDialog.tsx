import { useState, useRef, useEffect } from 'react'
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
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import { analyzeDeclaration } from '@/api/warehouseStock'
import type { CreateStockRequest, CreateStockItemRequest } from '@/types'

interface AddStockDialogProps {
  open: boolean
  initialMode?: 'upload' | 'manual'
  onClose: () => void
  onSave: (data: CreateStockRequest, file?: File | null) => Promise<void>
  saving?: boolean
}

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
  const [analysisWarning, setAnalysisWarning] = useState<string | null>(null)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)

  // Form fields
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

  const [kalemler, setKalemler] = useState<CreateStockItemRequest[]>([
    { malAdi: '', miktar: 1, birim: 'ADET', kapAdedi: null, kapCinsi: '' },
  ])

  const [showExtra, setShowExtra] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setAttachedFile(null)
      setAnalysisWarning(null)
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
      setKalemler([{ malAdi: '', miktar: 1, birim: 'ADET', kapAdedi: null, kapCinsi: '' }])

      if (initialMode === 'manual') {
        setStep('review')
      } else {
        setStep('upload')
      }
    }
  }, [open, initialMode])

  const handleFileSelected = async (file: File) => {
    setAttachedFile(file)
    setAnalyzing(true)
    setAnalysisWarning(null)
    setFormError(null)

    try {
      const res = await analyzeDeclaration(file)
      if (res.basarili && res.taslak) {
        const d = res.taslak
        setKaynak('Otomatik')
        setHamJson(d.hamJson)
        setBeyannameNo(d.beyannameNo ?? '')
        if (d.tescilTarihi) setTescilTarihi(d.tescilTarihi.slice(0, 10))
        setRejimKodu(d.rejimKodu ?? '')
        setGumrukIdaresi(d.gumrukIdaresi ?? '')
        setGonderici(d.gonderici ?? '')
        setAlici(d.alici ?? '')
        setDoviz(d.doviz ?? '')
        setFaturaTutari(d.faturaTutari ?? '')
        setKur(d.kur ?? '')

        if (d.onerilenKonum === 'Depo' || d.onerilenKonum === 'Antrepo') {
          setKonum(d.onerilenKonum)
        }

        if (d.kalemler && d.kalemler.length > 0) {
          setKalemler(
            d.kalemler.map((k, idx) => ({
              kalemNo: k.kalemNo ?? idx + 1,
              malAdi: k.malAdi ?? `Kalem ${idx + 1}`,
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
        }

        if (d.uyarilar && d.uyarilar.length > 0) {
          setAnalysisWarning(d.uyarilar.map((u) => u.mesaj).join(' ' ))
        }
      } else {
        setKaynak('Elle')
        setAnalysisWarning(
          res.hataMesaji || 'Otomatik okuma servisi kullanılamadı. Belge eklendi, lütfen kalemleri kontrol ederek giriniz.',
        )
      }
    } catch (err: unknown) {
      setKaynak('Elle')
      setAnalysisWarning('Otomatik okuma başarısız oldu. Belge ekte tutuldu; bilgileri elle girebilirsiniz.')
    } finally {
      setAnalyzing(false)
      setStep('review')
    }
  }

  const addKalem = () => {
    setKalemler((prev) => [
      ...prev,
      { malAdi: '', miktar: 1, birim: 'ADET', kapAdedi: null, kapCinsi: '' },
    ])
  }

  const removeKalem = (index: number) => {
    if (kalemler.length <= 1) return
    setKalemler((prev) => prev.filter((_, i) => i !== index))
  }

  const updateKalem = (index: number, patch: Partial<CreateStockItemRequest>) => {
    setKalemler((prev) =>
      prev.map((k, i) => (i === index ? { ...k, ...patch } : k)),
    )
  }

  const handleSave = async () => {
    setFormError(null)

    if (!kalemler.length) {
      setFormError('En az bir mal kalemi girilmelidir.')
      return
    }

    for (let i = 0; i < kalemler.length; i++) {
      const k = kalemler[i]
      if (!k.malAdi.trim()) {
        setFormError(`${i + 1}. kalemin mal adı boş olamaz.`)
        return
      }
      if (!k.miktar || k.miktar <= 0) {
        setFormError(`${i + 1}. kalemin miktarı 0'dan büyük olmalıdır.`)
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving && !analyzing) onClose() }}>
      <DialogContent size="xl" className="p-6 max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  {step === 'upload' ? 'Beyanname / Stok Belgesi Yükle' : 'Stok Girişini Onayla'}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step === 'upload'
                    ? 'Gümrük beyannamesini (PDF, görsel) yükleyin veya elle girin'
                    : 'Bilgileri kontrol edip antrepo veya depoya kaydedin'}
                </p>
              </div>
            </div>

            {attachedFile && (
              <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs font-normal">
                <FileCheck2 className="h-3.5 w-3.5 text-success" />
                <span className="max-w-[140px] truncate">{attachedFile.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="hover:text-destructive ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* STEP 1: UPLOAD SCREEN */}
        {step === 'upload' && (
          <div className="py-6 space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files?.[0]
                if (f) handleFileSelected(f)
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-primary/[0.02] transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg,image/webp,image/heic"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileSelected(f)
                }}
              />

              {analyzing ? (
                <div className="py-4 space-y-3 flex flex-col items-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm font-semibold text-foreground">
                    Beyanname yapay zekâ ile okunuyor...
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Kutu 41 tamamlayıcı ölçü birimleri, eşya tanımı, kap bilgileri ve tescil numarası taranıyor.
                  </p>
                </div>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Beyanname dosyasını buraya sürükleyin veya tıklayarak seçin
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, Taranmış Belge veya Fotoğraf (JPG/PNG, en fazla 10 MB)
                  </p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-primary font-medium">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Yapay zekâ (Claude / Gemini) ile otomatik alan analizi yapılır</span>
                    </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-center pt-2">
              <Button
                type="button"
                variant="ghost"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setKaynak('Elle')
                  setStep('review')
                }}
              >
                veya doğrudan elle bilgi girmek istiyorum →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW / MANUAL ENTRY */}
        {step === 'review' && (
          <div className="overflow-y-auto flex-1 pr-1 space-y-4 pt-2">
            {analysisWarning && (
              <div className="rounded-lg bg-warning-soft border border-warning/40 p-3 text-xs text-warning-soft-foreground flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-warning" />
                <div className="flex-1">{analysisWarning}</div>
              </div>
            )}

            {/* Üst Ayarlar: Konum ve Beyanname No */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-card border p-3.5">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Malın Konumu <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setKonum('Antrepo')}
                    className={`h-9 rounded-md border text-xs font-semibold transition-all ${
                      konum === 'Antrepo'
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-card hover:bg-accent text-muted-foreground'
                    }`}
                  >
                    Antrepo
                  </button>
                  <button
                    type="button"
                    onClick={() => setKonum('Depo')}
                    className={`h-9 rounded-md border text-xs font-semibold transition-all ${
                      konum === 'Depo'
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-card hover:bg-accent text-muted-foreground'
                    }`}
                  >
                    Kendi Deposu
                  </button>
                </div>
              </div>

              <FormField
                label="Beyanname No"
                hint="Varsa girin (örn: 26341200AN000123), yoksa boş bırakabilirsiniz."
              >
                <Input
                  value={beyannameNo}
                  onChange={(e) => setBeyannameNo(e.target.value)}
                  placeholder="Beyanname No (isteğe bağlı)"
                  className="h-9 font-mono text-xs uppercase"
                />
              </FormField>
            </div>

            {/* Kalemler Tablosu */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Stok Kalemleri ({kalemler.length})
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={addKalem}
                  className="gap-1 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  Kalem Ekle
                </Button>
              </div>

              <div className="space-y-3">
                {kalemler.map((kalem, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border bg-card p-3.5 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-bold text-foreground">
                        {idx + 1}. Kalem
                      </span>
                      {kalemler.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeKalem(idx)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded"
                          title="Kalemi Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Mal Adı */}
                      <div className="sm:col-span-5">
                        <FormField label="Mal Adı (Kısa Tanım)" required>
                          <Input
                            value={kalem.malAdi}
                            onChange={(e) => updateKalem(idx, { malAdi: e.target.value })}
                            placeholder="Örn: Cam 10 mm, Demir Profil 80x80"
                            className="h-9 text-xs font-medium"
                          />
                        </FormField>
                      </div>

                      {/* Miktar */}
                      <div className="sm:col-span-3">
                        <FormField label="Miktar" required>
                          <DecimalInput
                            value={kalem.miktar}
                            onValueChange={(val) => updateKalem(idx, { miktar: val as number })}
                            className="h-9 text-xs tabular-nums font-semibold"
                          />
                        </FormField>
                      </div>

                      {/* Birim */}
                      <div className="sm:col-span-4">
                        <FormField label="Ölçü Birimi" required>
                          <Input
                            value={kalem.birim}
                            onChange={(e) => updateKalem(idx, { birim: e.target.value.toUpperCase() })}
                            placeholder="ADET, KG, KAP, SANDIK, BAĞ... "
                            className="h-9 text-xs uppercase"
                          />
                        </FormField>
                      </div>
                    </div>

                    {/* Kap ve Açıklama: Otomatik analizde kap adedi kutu 6/31'den gelir; manuel girişte kap adedi alanı kaldırılmıştır */}
                    {kaynak === 'Otomatik' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                        <div className="sm:col-span-3">
                          <FormField label="Kap Adedi (isteğe bağlı)">
                            <DecimalInput
                              value={kalem.kapAdedi ?? ''}
                              onValueChange={(val) =>
                                updateKalem(idx, { kapAdedi: val === '' ? null : (val as number) })
                              }
                              placeholder="Örn: 2"
                              className="h-9 text-xs tabular-nums"
                            />
                          </FormField>
                        </div>

                        <div className="sm:col-span-3">
                          <FormField label="Kap Cinsi">
                            <Input
                              value={kalem.kapCinsi ?? ''}
                              onChange={(e) => updateKalem(idx, { kapCinsi: e.target.value.toUpperCase() })}
                              placeholder="KAP, SANDIK, BAĞ"
                              className="h-9 text-xs uppercase"
                            />
                          </FormField>
                        </div>

                        <div className="sm:col-span-6">
                          <FormField label="Ticari Tanım / Detay">
                            <Input
                              value={kalem.ticariTanim ?? ''}
                              onChange={(e) => updateKalem(idx, { ticariTanim: e.target.value })}
                              placeholder="Kutu 31 detaylı eşya tanımı"
                              className="h-9 text-xs text-muted-foreground"
                            />
                          </FormField>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1">
                        <FormField label="Açıklama / Detay (isteğe bağlı)">
                          <Input
                            value={kalem.ticariTanim ?? ''}
                            onChange={(e) => updateKalem(idx, { ticariTanim: e.target.value })}
                            placeholder="Mal hakkında detay, parti no vb."
                            className="h-9 text-xs text-muted-foreground"
                          />
                        </FormField>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* İsteğe Bağlı Ek Bilgiler Bölümü */}
            <div className="border rounded-lg p-3 bg-muted/30">
              <button
                type="button"
                onClick={() => setShowExtra(!showExtra)}
                className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <span>Diğer Beyanname Başlık Bilgileri (İsteğe Bağlı)</span>
                {showExtra ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showExtra && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 mt-2 border-t text-xs">
                  <FormField label="Tescil Tarihi">
                    <Input
                      type="date"
                      value={tescilTarihi}
                      onChange={(e) => setTescilTarihi(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </FormField>

                  <FormField label="Gümrük İdaresi">
                    <Input
                      value={gumrukIdaresi}
                      onChange={(e) => setGumrukIdaresi(e.target.value)}
                      placeholder="Erenköy Gümrük Md."
                      className="h-8 text-xs"
                    />
                  </FormField>

                  <FormField label="Rejim Kodu">
                    <Input
                      value={rejimKodu}
                      onChange={(e) => setRejimKodu(e.target.value)}
                      placeholder="AN 7, IM 4"
                      className="h-8 text-xs uppercase"
                    />
                  </FormField>

                  <FormField label="Gönderici Firma">
                    <Input
                      value={gonderici}
                      onChange={(e) => setGonderici(e.target.value)}
                      placeholder="Gönderici firma unvanı"
                      className="h-8 text-xs"
                    />
                  </FormField>

                  <FormField label="Alıcı Firma">
                    <Input
                      value={alici}
                      onChange={(e) => setAlici(e.target.value)}
                      placeholder="Alıcı firma unvanı"
                      className="h-8 text-xs"
                    />
                  </FormField>

                  <FormField label="Fatura Tutarı & Döviz">
                    <div className="flex gap-1.5">
                      <DecimalInput
                        value={faturaTutari}
                        onValueChange={(val) => setFaturaTutari(val)}
                        placeholder="5.500"
                        className="h-8 text-xs"
                      />
                      <Input
                        value={doviz}
                        onChange={(e) => setDoviz(e.target.value.toUpperCase())}
                        placeholder="USD"
                        className="h-8 w-16 text-xs uppercase"
                      />
                    </div>
                  </FormField>
                </div>
              )}
            </div>

            {formError && (
              <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive font-medium border border-destructive/20">
                {formError}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="shrink-0 pt-3 border-t gap-2 sm:gap-0">
          {step === 'review' && initialMode === 'upload' && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep('upload')}
              disabled={saving}
              className="mr-auto text-xs"
            >
              ← Başka Belge Yükle
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving || analyzing}
          >
            {t('common.cancel')}
          </Button>

          {step === 'review' && (
            <Button
              type="button"
              loading={saving}
              onClick={handleSave}
              className="font-semibold px-5"
            >
              Stoğa Ekle ve Kaydet
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
