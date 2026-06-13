import type { LocaleCode } from '@/types/ui'
import { messages } from './messages'
import type { I18nKey } from './keys'
import { I18N_KEYS } from './keys'

export const DEFAULT_LOCALE: LocaleCode = 'zh-CN'

export function t(key: I18nKey, locale: LocaleCode, params?: Record<string, string | number>): string {
  const localeMessages = messages[locale] || messages[DEFAULT_LOCALE]
  let text = localeMessages[key] || messages[DEFAULT_LOCALE][key] || key

  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value))
    })
  }

  return text
}

export function getLocaleLabel(locale: LocaleCode, displayLocale: LocaleCode): string {
  return locale === 'zh-CN'
    ? t(I18N_KEYS.localeZh, displayLocale)
    : t(I18N_KEYS.localeEn, displayLocale)
}
