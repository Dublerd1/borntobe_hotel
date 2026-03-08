import { en } from '@data/translations/en'
import { ru } from '@data/translations/ru'
import type { Translations } from '@data/translations/en'

export type Lang = 'en' | 'ru'

const translations: Record<Lang, Translations> = { en, ru }

export function t(lang: Lang): Translations {
  return translations[lang]
}

export function getLangFromUrl(url: URL): Lang {
  const [, firstSegment] = url.pathname.split('/')
  return firstSegment === 'ru' ? 'ru' : 'en'
}

export function getAlternateUrl(currentPath: string, targetLang: Lang): string {
  const cleanPath = currentPath.replace(/^\/ru/, '') || '/'
  return targetLang === 'ru' ? `/ru${cleanPath === '/' ? '/' : cleanPath}` : cleanPath || '/'
}
