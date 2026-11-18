import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import tr from './locales/tr.json'
import en from './locales/en.json'

// Belge dili (ekran okuyucu, tarayıcı) ve Electron penceresi arayüz dilini izler.
const syncLanguage = (language: string) => {
  const lang = language.toLowerCase().startsWith('en') ? 'en' : 'tr'
  document.documentElement.lang = lang
  window.desktop?.setLanguage?.(lang)
}
i18n.on('languageChanged', syncLanguage)

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    fallbackLng: 'tr',
    supportedLngs: ['tr', 'en'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  })

if (i18n.language) syncLanguage(i18n.language)

export default i18n
