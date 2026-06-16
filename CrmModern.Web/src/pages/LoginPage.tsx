import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { login } from '@/api/auth'
import { useAuth } from '@/hooks/useAuth'
import { getRememberedLogin, saveRememberedLogin, clearRememberedLogin } from '@/lib/authStore'
import { useToast } from '@/components/ToastProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldError } from '@/components/FieldError'

export function LoginPage() {
  const navigate = useNavigate()
  const { saveUser, isLoggedIn } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()
  // Round-11 — "Beni Hatırla" ön-doldurma: saklanan kimlik bilgisi varsa form
  // (kullanıcı adı + şifre) ve checkbox onunla başlatılır (logout / tarayıcı /
  // bilgisayar yeniden başlatmasından sonra da gelir).
  const remembered = getRememberedLogin()
  const [form, setForm] = useState({
    kullaniciAdi: remembered?.kullaniciAdi ?? '',
    sifre:        remembered?.sifre ?? '',
  })
  const [remember, setRemember] = useState(!!remembered)
  const [submitted, setSubmitted] = useState(false)

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      saveUser({ ...data, token: data.token }, remember)
      // Round-11 — başarılı girişte Remember Me işaretliyse son kimlik bilgisini
      // sakla, değilse temizle. Token/JWT/oturum davranışı DEĞİŞMEZ.
      if (remember) saveRememberedLogin(form.kullaniciAdi, form.sifre)
      else clearRememberedLogin()
      navigate('/dashboard', { replace: true })
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('login.invalidCredentials'), variant: 'destructive' })
    },
  })

  // Otomatik giriş: geçerli (hatırlanan ya da oturumluk) token varsa login
  // ekranını hiç gösterme, doğrudan uygulamaya yönlendir.
  if (isLoggedIn()) return <Navigate to="/dashboard" replace />

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    // Boş alan varsa sessiz dönme — submitted=true ile alan altı hata mesajları görünür.
    if (!form.kullaniciAdi.trim() || !form.sifre.trim()) return
    mutation.mutate({ ...form, rememberMe: remember })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-bold">
            UP
          </div>
          <CardTitle className="text-2xl">Unix Padel CRM</CardTitle>
          <CardDescription>{t('login.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kullaniciAdi">{t('login.username')}</Label>
              <Input
                id="kullaniciAdi"
                placeholder="kullanici.adi"
                value={form.kullaniciAdi}
                onChange={(e) => setForm({ ...form, kullaniciAdi: e.target.value })}
                autoFocus
              />
              {submitted && !form.kullaniciAdi.trim() && <FieldError message={t('validation.required')} />}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sifre">{t('login.password')}</Label>
              <Input
                id="sifre"
                type="password"
                placeholder="••••••••"
                value={form.sifre}
                onChange={(e) => setForm({ ...form, sifre: e.target.value })}
              />
              {submitted && !form.sifre.trim() && <FieldError message={t('validation.required')} />}
            </div>
            <div className="flex items-center gap-2">
              <input
                id="rememberMe"
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                checked={remember}
                onChange={(e) => {
                  setRemember(e.target.checked)
                  // Round-11 — Remember Me kapatılınca saklanan kimlik bilgisi hemen silinir.
                  if (!e.target.checked) clearRememberedLogin()
                }}
              />
              <Label htmlFor="rememberMe" className="cursor-pointer text-sm font-normal">
                {t('login.rememberMe')}
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? `${t('login.submit')}...` : t('login.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
