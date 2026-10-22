import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/PageHeader'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DecimalInput } from '@/components/DecimalInput'
import { FormField } from '@/components/ui/form-field'
import { SectionTitle } from '@/components/ui/section-title'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { visibleNavItems } from '@/lib/navigation'
import { DEFAULT_PREFERENCES, setPreferences, usePreferences } from '@/lib/preferences'

/**
 * E-13 — Tercihlerim (SAP kullanıcı parametreleri / LOGO kullanıcı tercihleri).
 * Değişiklik anında kaydedilir; yeni sipariş formu bu varsayılanlarla açılır.
 */
const SIRKETLER = ['Unixpadel', 'ArsSport', 'AselCocuk']
const PARA_TIPLERI = ['Euro', 'Dolar', 'TL', 'Sterlin']

export function PreferencesPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { getUser } = useAuth()
  const prefs = usePreferences()
  const startOptions = visibleNavItems(getUser()).filter((n) => n.path !== '/preferences')
  const save = (patch: Parameters<typeof setPreferences>[0]) => {
    setPreferences(patch)
    toast({ title: t('preferences.saved'), variant: 'success' })
  }

  return (
    <div>
      <PageHeader title={t('preferences.title')} description={t('preferences.description')} />
      <div className="grid max-w-4xl gap-6 p-4 lg:p-6 md:grid-cols-2">
        <section className="space-y-3 rounded-md border bg-card p-4">
          <SectionTitle>{t('preferences.orderDefaults')}</SectionTitle>
          <FormField label={t('orders.form.sirket')}>
            <Select value={prefs.defaultSirket} onValueChange={(v) => save({ defaultSirket: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SIRKETLER.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label={t('orders.form.paraTipi')}>
            <Select value={prefs.defaultParaTipi} onValueChange={(v) => save({ defaultParaTipi: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PARA_TIPLERI.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label={t('orders.form.odemeSekli')}>
            <Select value={prefs.defaultOdemeSekli || 'none'} onValueChange={(v) => save({ defaultOdemeSekli: v === 'none' ? '' : (v as 'Pesin' | 'Vadeli') })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="Pesin">{t('orders.form.odemePesin')}</SelectItem>
                <SelectItem value="Vadeli">{t('orders.form.odemeVadeli')}</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label={t('preferences.defaultPesin')} suffix="%" hint={t('preferences.defaultPesinHint')}>
            <DecimalInput value={prefs.defaultPesinYuzde ?? ''} onValueChange={(v) => setPreferences({ defaultPesinYuzde: v === '' ? null : v })} />
          </FormField>
        </section>

        <section className="space-y-3 rounded-md border bg-card p-4">
          <SectionTitle>{t('preferences.workspace')}</SectionTitle>
          <FormField label={t('preferences.startPage')}>
            <Select value={prefs.startPage} onValueChange={(v) => save({ startPage: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {startOptions.map((n) => <SelectItem key={n.path} value={n.path}>{t(n.i18nKey)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label={t('preferences.tableDensity')}>
            <Select value={prefs.tableDensity} onValueChange={(v) => save({ tableDensity: v as 'normal' | 'compact' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">{t('preferences.density.normal')}</SelectItem>
                <SelectItem value="compact">{t('preferences.density.compact')}</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <Checkbox
            label={t('preferences.enterNavigation')}
            checked={prefs.enterNavigation}
            onCheckedChange={(c) => save({ enterNavigation: c })}
          />
          <Checkbox
            label={t('preferences.showShortcutHints')}
            checked={prefs.showShortcutHints}
            onCheckedChange={(c) => save({ showShortcutHints: c })}
          />
          <div className="pt-2">
            <Button size="sm" variant="outline" onClick={() => save(DEFAULT_PREFERENCES)}>{t('preferences.reset')}</Button>
          </div>
        </section>
      </div>
    </div>
  )
}
