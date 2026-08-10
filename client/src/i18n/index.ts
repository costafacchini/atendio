import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import pt from './locales/pt.json'
import en from './locales/en.json'

const LANGUAGE_KEY = '@atendio-language'

export function saveLanguage(lang: 'pt' | 'en'): void {
  localStorage.setItem(LANGUAGE_KEY, lang)
}

export function loadLanguage(): 'pt' | 'en' {
  const stored = localStorage.getItem(LANGUAGE_KEY)
  return stored === 'en' ? 'en' : 'pt'
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
    },
    lng: loadLanguage(),
    fallbackLng: 'pt',
    interpolation: { escapeValue: false },
  })

i18n.on('languageChanged', (lang) => {
  saveLanguage(lang as 'pt' | 'en')
})

export default i18n
