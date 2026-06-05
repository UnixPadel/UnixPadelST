import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { login } from '@/api/auth'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldError } from '@/components/FieldError'

export function LoginPage() {
  const navigate = useNavigate()
  const { saveUser } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [form, setForm] = useState({ kullaniciAdi: '', sifre: '' })
  const [submitted, setSubmitted] = useState(false)

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      saveUser({ ...data, token: data.token })
      navigate('/dashboard', { replace: true })
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('login.invalidCredentials'), variant: 'destructive' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    // Boş alan varsa sessiz dönme — submitted=true ile alan altı hata mesajları görünür.
    if (!form.kullaniciAdi.trim() || !form.sifre.trim()) return
    mutation.mutate(form)
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
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? `${t('login.submit')}...` : t('login.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
