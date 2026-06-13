import { describe, expect, it } from 'vitest'
import { getLocaleLabel, t } from '@/i18n'
import { I18N_KEYS, type I18nKey } from '@/i18n/keys'

describe('i18n', () => {
  it('returns translated tab labels by locale', () => {
    expect(t(I18N_KEYS.tabStudy, 'zh-CN')).toBe('学习')
    expect(t(I18N_KEYS.tabStudy, 'en-US')).toBe('Study')
  })

  it('returns locale labels in display locale', () => {
    expect(getLocaleLabel('zh-CN', 'zh-CN')).toBe('中文')
    expect(getLocaleLabel('en-US', 'zh-CN')).toBe('英文')
    expect(getLocaleLabel('zh-CN', 'en-US')).toBe('Chinese')
    expect(getLocaleLabel('en-US', 'en-US')).toBe('English')
  })

  it('falls back to key string when key is unknown', () => {
    const unknownKey = 'unknown.key' as I18nKey
    expect(t(unknownKey, 'zh-CN')).toBe('unknown.key')
  })
})
