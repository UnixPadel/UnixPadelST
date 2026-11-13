import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Check,
  ShieldCheck,
  Cpu,
  Zap,
  CheckCircle,
} from 'lucide-react'
import {
  getAiOverview,
  setActiveAiProvider,
  saveClaudeKey,
  testClaudeKey,
  saveGeminiKey,
  testGeminiKey,
} from '@/api/settings'
import { PageHeader } from '@/components/PageHeader'
import { FillPage } from '@/components/FillPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/ui/form-field'
import { useToast } from '@/components/ToastProvider'
import { formatDate } from '@/lib/utils'

const CLAUDE_MODELS = [
  { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5 (Önerilen — En Yüksek OCR Doğruluğu)', desc: 'Gümrük beyannameleri için en yüksek doğruluk ve stabilite' },
  { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5 (Ultra Düşük Maliyet & Yüksek Hız)', desc: 'Ekonomik token tüketimi, hızlı okuma' },
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5 (Maksimum Muhakeme)', desc: 'En karmaşık çok sayfalı belgeler' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Standart)', desc: 'Standart Anthropic API modeli' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Standart)', desc: 'Standart Anthropic Haiku modeli' },
]

export function SystemSettingsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  const { data: overview, isLoading, refetch } = useQuery({
    queryKey: ['system-settings-ai'],
    queryFn: getAiOverview,
  })

  const [activeTab, setActiveTab] = useState<'Claude' | 'Gemini'>('Claude')

  // Claude Form State
  const [claudeKey, setClaudeKey] = useState('')
  const [claudeModel, setClaudeModel] = useState('claude-sonnet-5-5')
  const [claudeShowKey, setClaudeShowKey] = useState(false)
  const [claudeSaving, setClaudeSaving] = useState(false)
  const [claudeTesting, setClaudeTesting] = useState(false)
  const [claudeTestResult, setClaudeTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Gemini Form State
  const [geminiKey, setGeminiKey] = useState('')
  const [geminiShowKey, setGeminiShowKey] = useState(false)
  const [geminiSaving, setGeminiSaving] = useState(false)
  const [geminiTesting, setGeminiTesting] = useState(false)
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const [settingActive, setSettingActive] = useState(false)

  useEffect(() => {
    if (overview) {
      if (overview.aktifSaglayici) {
        setActiveTab(overview.aktifSaglayici)
      }
      if (overview.claude?.model) {
        setClaudeModel(overview.claude.model)
      }
    }
  }, [overview])

  const handleSetActiveProvider = async (provider: 'Claude' | 'Gemini') => {
    setSettingActive(true)
    try {
      await setActiveAiProvider(provider)
      void qc.invalidateQueries({ queryKey: ['system-settings-ai'] })
      toast({
        title: 'Aktif Sağlayıcı Değiştirildi',
        description: `Gümrük beyannameleri artık ${provider} motoru ile taranacak.`,
        variant: 'success',
      })
    } catch {
      toast({
        title: 'Değişiklik Başarısız',
        description: 'Aktif sağlayıcı güncellenirken bir hata oluştu.',
        variant: 'destructive',
      })
    } finally {
      setSettingActive(false)
    }
  }

  // --- Claude Eylemleri ---
  const handleTestClaude = async () => {
    setClaudeTesting(true)
    setClaudeTestResult(null)
    try {
      const res = await testClaudeKey(claudeKey || undefined, claudeModel || undefined)
      setClaudeTestResult({
        success: res.basarili,
        message: res.hataMesaji || 'Claude API bağlantısı başarılı! Model yanıt verdi.',
      })
    } catch {
      setClaudeTestResult({
        success: false,
        message: 'Bağlantı testi sırasında beklenmeyen hata oluştu.',
      })
    } finally {
      setClaudeTesting(false)
    }
  }

  const handleSaveClaude = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!claudeKey.trim()) {
      toast({
        title: 'API Anahtarı Gerekli',
        description: 'Lütfen geçerli bir Claude API anahtarı giriniz.',
        variant: 'destructive',
      })
      return
    }

    setClaudeSaving(true)
    try {
      await saveClaudeKey(claudeKey.trim(), claudeModel)
      setClaudeKey('')
      setClaudeTestResult(null)
      void qc.invalidateQueries({ queryKey: ['system-settings-ai'] })
      toast({
        title: 'Claude API Anahtarı Kaydedildi',
        description: 'Anahtar şifrelendi ve tüm kullanıcı bilgisayarlarında anında aktifleşti.',
        variant: 'success',
      })
    } catch {
      toast({
        title: 'Kaydetme Başarısız',
        description: 'Claude anahtarı kaydedilirken bir hata oluştu.',
        variant: 'destructive',
      })
    } finally {
      setClaudeSaving(false)
    }
  }

  // --- Gemini Eylemleri ---
  const handleTestGemini = async () => {
    setGeminiTesting(true)
    setGeminiTestResult(null)
    try {
      const res = await testGeminiKey(geminiKey || undefined)
      setGeminiTestResult({
        success: res.basarili,
        message: res.hataMesaji || 'Gemini API bağlantısı başarılı!',
      })
    } catch {
      setGeminiTestResult({
        success: false,
        message: 'Bağlantı testi sırasında hata oluştu.',
      })
    } finally {
      setGeminiTesting(false)
    }
  }

  const handleSaveGemini = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!geminiKey.trim()) {
      toast({
        title: 'API Anahtarı Gerekli',
        description: 'Lütfen geçerli bir Gemini API anahtarı giriniz.',
        variant: 'destructive',
      })
      return
    }

    setGeminiSaving(true)
    try {
      await saveGeminiKey(geminiKey.trim())
      setGeminiKey('')
      setGeminiTestResult(null)
      void qc.invalidateQueries({ queryKey: ['system-settings-ai'] })
      toast({
        title: 'Gemini API Anahtarı Kaydedildi',
        description: 'Yeni anahtar kaydedildi ve tüm kullanıcılar için hemen aktifleşti.',
        variant: 'success',
      })
    } catch {
      toast({
        title: 'Kaydetme Başarısız',
        description: 'Gemini anahtarı kaydedilirken bir hata oluştu.',
        variant: 'destructive',
      })
    } finally {
      setGeminiSaving(false)
    }
  }

  const claudeStatus = overview?.claude
  const geminiStatus = overview?.gemini
  const currentProvider = overview?.aktifSaglayici ?? 'Claude'

  return (
    <FillPage>
      <PageHeader
        density="compact"
        title="Sistem Ayarları"
        actions={
          <Button
            variant="outline"
            size="xs"
            onClick={() => refetch()}
            className="gap-1 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Yenile</span>
          </Button>
        }
      />

      <div className="overflow-y-auto flex-1 p-6 max-w-4xl space-y-6">
        {/* Üst Bilgi Kartı & Sağlayıcı Seçici */}
        <div className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  Yapay Zekâ (AI) Belge Tarama Entegrasyonu
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Antrepo modülünde gümrük beyannamelerinin (PDF / Görsel) taranıp otomatik doldurulmasını yönetir.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Aktif Motor:</span>
              <Badge variant="success" className="px-2.5 py-1 text-xs font-bold gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>{currentProvider}</span>
              </Badge>
            </div>
          </div>

          {/* Segmented Provider Tabs */}
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
            <button
              type="button"
              onClick={() => setActiveTab('Claude')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'Claude'
                  ? 'bg-card text-foreground shadow-xs border border-border/80'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Cpu className="h-4 w-4 text-primary" />
              <span>Claude (Anthropic)</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 ml-1 bg-primary/5 text-primary border-primary/20">
                Önerilen
              </Badge>
              {currentProvider === 'Claude' && (
                <span className="h-2 w-2 rounded-full bg-emerald-500 ml-1" title="Aktif Sağlayıcı" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('Gemini')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'Gemini'
                  ? 'bg-card text-foreground shadow-xs border border-border/80'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Gemini (Google)</span>
              {currentProvider === 'Gemini' && (
                <span className="h-2 w-2 rounded-full bg-emerald-500 ml-1" title="Aktif Sağlayıcı" />
              )}
            </button>
          </div>
        </div>

        {/* CLAUDE TAB */}
        {activeTab === 'Claude' && (
          <div className="rounded-xl border bg-card p-6 shadow-xs space-y-6">
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    Anthropic Claude Ayarları
                  </h3>
                  {currentProvider === 'Claude' ? (
                    <Badge variant="success" className="text-[11px]">
                      Şu Anda Kullanılan Motor
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleSetActiveProvider('Claude')}
                      disabled={settingActive}
                      className="text-xs font-semibold gap-1 text-primary border-primary/40 hover:bg-primary/5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Claude'u Aktif Motor Yap
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sonnet 5.5 / Haiku modelleri ile Kutu 31, 41, 40 ve gümrük kalemlerini yüksek doğrulukla analiz eder.
                </p>
              </div>

              {claudeStatus && (
                <Badge
                  variant={claudeStatus.tanimli ? 'success' : 'destructive'}
                  className="px-2.5 py-1 text-xs font-semibold"
                >
                  {claudeStatus.tanimli ? 'Anahtar Tanımlı' : 'Tanımlı Değil'}
                </Badge>
              )}
            </div>

            {/* Claude Durum Kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg bg-muted/40 p-3 border">
                <span className="text-muted-foreground font-medium block">Aktif Anahtar:</span>
                <span className="font-mono font-bold text-foreground text-xs mt-1 block truncate">
                  {claudeStatus?.maske || <span className="text-muted-foreground font-normal">Kayıtlı anahtar yok</span>}
                </span>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 border">
                <span className="text-muted-foreground font-medium block">Model:</span>
                <span className="font-mono font-bold text-foreground text-xs mt-1 block truncate">
                  {claudeStatus?.model || 'claude-sonnet-5-5'}
                </span>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 border">
                <span className="text-muted-foreground font-medium block">Son Güncelleme:</span>
                <span className="text-foreground font-medium text-xs mt-1 block">
                  {claudeStatus?.guncellemeZamani ? formatDate(claudeStatus.guncellemeZamani) : '—'}
                  {claudeStatus?.guncelleyenAd && (
                    <span className="text-muted-foreground block text-[11px] truncate">
                      ({claudeStatus.guncelleyenAd})
                    </span>
                  )}
                </span>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 border">
                <span className="text-muted-foreground font-medium block">Son Başarılı Tarama:</span>
                <span className="text-foreground font-medium text-xs mt-1 block">
                  {claudeStatus?.sonBasariliKullanim ? formatDate(claudeStatus.sonBasariliKullanim) : 'Henüz işlem yapılmadı'}
                </span>
              </div>
            </div>

            {/* Varsa Son Hata */}
            {claudeStatus?.sonHata && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Son İstek Hatası:</p>
                  <p className="mt-0.5">{claudeStatus.sonHata}</p>
                  {claudeStatus.sonHataZamani && (
                    <p className="text-[11px] opacity-75 mt-1">Zaman: {formatDate(claudeStatus.sonHataZamani)}</p>
                  )}
                </div>
              </div>
            )}

            {/* Güvenlik Notu */}
            <div className="rounded-lg bg-primary/[0.03] border border-primary/20 p-3.5 text-xs text-foreground flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <div className="text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Merkezi ve Güvenli Yönetim: </span>
                Claude API anahtarı Clever Cloud veritabanında AES-256 ile şifreli tutulur. Buradan kaydedildiğinde
                şirketteki <strong>tüm kullanıcıların bilgisayarlarında anında aktifleşir</strong>. İstemci tarayıcılarında açık anahtar saklanmaz.
              </div>
            </div>

            {/* Claude Güncelleme Formu */}
            <form onSubmit={handleSaveClaude} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <FormField
                    label="Claude API Anahtarı"
                    hint="sk-ant-usr-... veya sk-ant-api03-... ile başlayan Anthropic API anahtarınız"
                    required
                  >
                    <div className="relative">
                      <Input
                        type={claudeShowKey ? 'text' : 'password'}
                        value={claudeKey}
                        onChange={(e) => {
                          setClaudeKey(e.target.value)
                          setClaudeTestResult(null)
                        }}
                        placeholder={claudeStatus?.maske ? `Mevcut: ${claudeStatus.maske}` : 'sk-ant-usr-...'}
                        className="h-10 pr-10 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setClaudeShowKey(!claudeShowKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {claudeShowKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormField>
                </div>

                <div>
                  <FormField
                    label="Model Seçimi"
                    hint="Gümrük beyannameleri için Sonnet önerilir"
                    required
                  >
                    <select
                      value={claudeModel}
                      onChange={(e) => {
                        setClaudeModel(e.target.value)
                        setClaudeTestResult(null)
                      }}
                      className="h-10 w-full rounded-md border border-input bg-card px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {CLAUDE_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </div>

              {/* Test Sonucu Bildirimi */}
              {claudeTestResult && (
                <div
                  className={`rounded-lg p-3 text-xs flex items-start gap-2.5 border ${
                    claudeTestResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-destructive/10 text-destructive border-destructive/30'
                  }`}
                >
                  {claudeTestResult.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 font-medium">{claudeTestResult.message}</div>
                </div>
              )}

              {/* Butonlar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestClaude}
                  disabled={claudeTesting || (!claudeKey.trim() && !claudeStatus?.tanimli)}
                  className="gap-1.5 text-xs font-semibold"
                >
                  {claudeTesting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Bağlantı Test Ediliyor...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>{claudeKey.trim() ? 'Yeni Anahtarı Test Et' : 'Kayıtlı Anahtarı Test Et'}</span>
                    </>
                  )}
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={claudeSaving || !claudeKey.trim()}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{claudeSaving ? 'Kaydediliyor...' : 'Kaydet ve Aktifleştir'}</span>
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* GEMINI TAB */}
        {activeTab === 'Gemini' && (
          <div className="rounded-xl border bg-card p-6 shadow-xs space-y-6">
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    Google Gemini Ayarları
                  </h3>
                  {currentProvider === 'Gemini' ? (
                    <Badge variant="success" className="text-[11px]">
                      Şu Anda Kullanılan Motor
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleSetActiveProvider('Gemini')}
                      disabled={settingActive}
                      className="text-xs font-semibold gap-1 text-amber-600 border-amber-500/40 hover:bg-amber-500/5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Gemini'yi Aktif Motor Yap
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Google Gemini 3.8 Flash modeli ile beyanname belgelerini analiz eder.
                </p>
              </div>

              {geminiStatus && (
                <Badge
                  variant={geminiStatus.tanimli ? 'success' : 'destructive'}
                  className="px-2.5 py-1 text-xs font-semibold"
                >
                  {geminiStatus.tanimli ? 'Anahtar Tanımlı' : 'Tanımlı Değil'}
                </Badge>
              )}
            </div>

            {/* Gemini Durum Kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-muted/40 p-3 border">
                <span className="text-muted-foreground font-medium block">Aktif Anahtar:</span>
                <span className="font-mono font-bold text-foreground text-xs mt-1 block truncate">
                  {geminiStatus?.maske || <span className="text-muted-foreground font-normal">Kayıtlı anahtar yok</span>}
                </span>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 border">
                <span className="text-muted-foreground font-medium block">Son Güncelleme:</span>
                <span className="text-foreground font-medium text-xs mt-1 block">
                  {geminiStatus?.guncellemeZamani ? formatDate(geminiStatus.guncellemeZamani) : '—'}
                  {geminiStatus?.guncelleyenAd && (
                    <span className="text-muted-foreground block text-[11px] truncate">
                      ({geminiStatus.guncelleyenAd})
                    </span>
                  )}
                </span>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 border">
                <span className="text-muted-foreground font-medium block">Son Başarılı Tarama:</span>
                <span className="text-foreground font-medium text-xs mt-1 block">
                  {geminiStatus?.sonBasariliKullanim ? formatDate(geminiStatus.sonBasariliKullanim) : 'Henüz işlem yapılmadı'}
                </span>
              </div>
            </div>

            {/* Varsa Son Hata */}
            {geminiStatus?.sonHata && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Son İstek Hatası:</p>
                  <p className="mt-0.5">{geminiStatus.sonHata}</p>
                  {geminiStatus.sonHataZamani && (
                    <p className="text-[11px] opacity-75 mt-1">Zaman: {formatDate(geminiStatus.sonHataZamani)}</p>
                  )}
                </div>
              </div>
            )}

            {/* Gemini Güncelleme Formu */}
            <form onSubmit={handleSaveGemini} className="space-y-4 pt-1">
              <FormField
                label="Gemini API Anahtarı"
                hint="Google AI Studio üzerinden temin ettiğiniz API anahtarınız"
                required
              >
                <div className="relative">
                  <Input
                    type={geminiShowKey ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={(e) => {
                      setGeminiKey(e.target.value)
                      setGeminiTestResult(null)
                    }}
                    placeholder={geminiStatus?.maske ? `Mevcut: ${geminiStatus.maske}` : 'AIzaSy...'}
                    className="h-10 pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setGeminiShowKey(!geminiShowKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {geminiShowKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormField>

              {/* Test Sonucu Bildirimi */}
              {geminiTestResult && (
                <div
                  className={`rounded-lg p-3 text-xs flex items-start gap-2.5 border ${
                    geminiTestResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-destructive/10 text-destructive border-destructive/30'
                  }`}
                >
                  {geminiTestResult.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 font-medium">{geminiTestResult.message}</div>
                </div>
              )}

              {/* Butonlar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestGemini}
                  disabled={geminiTesting || (!geminiKey.trim() && !geminiStatus?.tanimli)}
                  className="gap-1.5 text-xs font-semibold"
                >
                  {geminiTesting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Bağlantı Test Ediliyor...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>{geminiKey.trim() ? 'Yeni Anahtarı Test Et' : 'Kayıtlı Anahtarı Test Et'}</span>
                    </>
                  )}
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={geminiSaving || !geminiKey.trim()}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{geminiSaving ? 'Kaydediliyor...' : 'Kaydet ve Aktifleştir'}</span>
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </FillPage>
  )
}
