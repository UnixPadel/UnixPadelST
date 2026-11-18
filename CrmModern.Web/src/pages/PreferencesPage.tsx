import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/PageHeader'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DecimalInput } from '@/components/DecimalInput'
import { FormField } from '@/components/ui/form-field'
import { SectionTitle } from '@/components/ui/section-title'
import { Button } from '@/components/ui/button'
import { SaveStatus } from '@/components/SaveStatus'
import { useAuth } from '@/hooks/useAuth'
import { visibleNavItems } from '@/lib/navigation'
import { DEFAULT_PREFERENCES, applyUiScale, roleStartPage, setPreferences, usePreferences, type UiScale } from '@/lib/preferences'
import { desktop, useDesktopZoom, ZOOM_STEPS } from '@/lib/desktop'

import { currencyLabel } from '@/lib/currency'
/**
 * E-13 — Tercihlerim (SAP kullanıcı parametreleri / LOGO kullanıcı tercihleri).
 * Değişiklik anında kaydedilir; yeni sipariş formu bu varsayılanlarla açılır.
 */
const SIRKETLER = ['Unixpadel', 'ArsSport', 'AselCocuk']
const PARA_TIPLERI = ['Euro', 'Dolar', 'TL', 'Sterlin']

export function PreferencesPage() {
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const user = getUser()
  const prefs = usePreferences()
  const zoom = useDesktopZoom()
  const startOptions = visibleNavItems(user).filter((n) => n.path !== '/preferences')
  const autoTarget = startOptions.find((n) => n.path === roleStartPage(user?.yetkiTuru))
  // K6 — her değişiklikte toast yerine sayfa başında kalıcı "Kaydedildi · 13:25".
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const save = (patch: Parameters<typeof setPreferences>[0]) => {
    setPreferences(patch)
    if (patch.uiScale) applyUiScale(patch.uiScale)
    setSavedAt(new Date())
  }

  return (
    <div>
      <PageHeader title={t('preferences.title')} description={t('preferences.description')}
        actions={<SaveStatus savedAt={savedAt} />} />
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
              <SelectContent>{PARA_TIPLERI.map((p) => <SelectItem key={p} value={p}>{currencyLabel(t, p)}</SelectItem>)}</SelectContent>
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
                <SelectItem value="auto">{t('preferences.startAuto', { page: autoTarget ? t(autoTarget.i18nKey) : '—' })}</SelectItem>
                {startOptions.map((n) => <SelectItem key={n.path} value={n.path}>{t(n.i18nKey)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label={t('preferences.view')} hint={t('preferences.viewHint')}>
            <Select value={prefs.uiScale} onValueChange={(v) => save({ uiScale: v as UiScale })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rahat">{t('preferences.viewOptions.rahat')}</SelectItem>
                <SelectItem value="standart">{t('preferences.viewOptions.standart')}</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          {/* Scaling Faz 1 — yalnız masaüstü uygulamasında (Electron zoomFactor). */}
          {desktop && (
            <FormField label={t('preferences.uiScale')} hint={t('preferences.uiScaleHint', { pct: Math.round((zoom?.factor ?? 1) * 100) })}>
              <Select
                value={zoom ? String(zoom.setting) : 'auto'}
                onValueChange={(v) => { void desktop!.setZoom(v === 'auto' ? 'auto' : Number(v)); setSavedAt(new Date()) }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t('preferences.uiScaleAuto')}</SelectItem>
                  {ZOOM_STEPS.map((s) => <SelectItem key={s} value={String(s)}>%{Math.round(s * 100)}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          )}
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
