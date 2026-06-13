import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import type { LocaleCode, TabSection, ThemeMode } from '@/types/ui'

const TAB_SECTION_INDEX: Record<TabSection, number> = {
  study: 0,
  life: 1,
  teaching: 2,
  psychology: 3,
  mine: 4
}

const TAB_SECTION_LABEL_KEY = {
  study: I18N_KEYS.tabStudy,
  life: I18N_KEYS.tabLife,
  psychology: I18N_KEYS.tabPsychology,
  mine: I18N_KEYS.tabMine
} as const

const SECTION_ACTIVE_COLOR: Record<TabSection, string> = {
  study: '#4A90E2',
  life: '#f49d25',
  teaching: '#C00000',
  psychology: '#886fde',
  mine: '#6fde81'
}

const SECTION_PAGE_BG: Record<TabSection, { light: string; dark: string }> = {
  study: { light: '#f6f6f8', dark: '#151c2a' },
  life: { light: '#f8f7f5', dark: '#221a10' },
  teaching: { light: '#f8f6f6', dark: '#1a1315' },
  psychology: { light: '#f6f6f8', dark: '#15131f' },
  mine: { light: '#f6f8f6', dark: '#131f15' }
}

function safeSetTabBarItem(index: number, text: string) {
  try {
    if (typeof uni?.setTabBarItem === 'function') {
      const result = uni.setTabBarItem({ index, text })
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        ;(result as Promise<unknown>).catch((error) => {
          console.warn('setTabBarItem async failed:', error)
        })
      }
    }
  } catch (error) {
    console.warn('setTabBarItem failed:', error)
  }
}

function safeSetTabBarStyle(input: {
  color: string
  selectedColor: string
  backgroundColor: string
  borderStyle: 'black' | 'white'
}) {
  try {
    if (typeof uni?.setTabBarStyle === 'function') {
      const result = uni.setTabBarStyle(input)
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        ;(result as Promise<unknown>).catch((error) => {
          console.warn('setTabBarStyle async failed:', error)
        })
      }
    }
  } catch (error) {
    console.warn('setTabBarStyle failed:', error)
  }
}

export function applyTabBarLocale(locale: LocaleCode) {
  safeSetTabBarItem(TAB_SECTION_INDEX.study, t(TAB_SECTION_LABEL_KEY.study, locale))
  safeSetTabBarItem(TAB_SECTION_INDEX.life, t(TAB_SECTION_LABEL_KEY.life, locale))
  safeSetTabBarItem(TAB_SECTION_INDEX.teaching, locale === 'zh-CN' ? '教学' : 'Teaching')
  safeSetTabBarItem(TAB_SECTION_INDEX.psychology, t(TAB_SECTION_LABEL_KEY.psychology, locale))
  safeSetTabBarItem(TAB_SECTION_INDEX.mine, t(TAB_SECTION_LABEL_KEY.mine, locale))
}

export function applyTabBarTheme(theme: ThemeMode, activeSection: TabSection) {
  const isLight = theme === 'light'
  safeSetTabBarStyle({
    color: isLight ? '#8f8f94' : '#8b8ea3',
    selectedColor: SECTION_ACTIVE_COLOR[activeSection],
    backgroundColor: isLight ? '#ffffff' : '#1b1828',
    borderStyle: isLight ? 'black' : 'white'
  })
}

export function applyPageTheme(theme: ThemeMode, section: TabSection) {
  const bg = theme === 'dark'
    ? (SECTION_PAGE_BG[section]?.dark || '#15131f')
    : (SECTION_PAGE_BG[section]?.light || '#f6f6f8')

  if (typeof document !== 'undefined') {
    try {
      document.documentElement.setAttribute('data-theme', theme)
      document.documentElement.style.setProperty('--app-page-bg', bg)
    } catch {}
  }

  try {
    if (typeof uni?.setBackgroundColor === 'function') {
      uni.setBackgroundColor({
        backgroundColor: bg,
        backgroundColorTop: bg,
        backgroundColorBottom: bg
      })
    }
  } catch {}
}

export function syncRuntimeUi(locale: LocaleCode, theme: ThemeMode, activeSection: TabSection) {
  applyTabBarLocale(locale)
  applyTabBarTheme(theme, activeSection)
  applyPageTheme(theme, activeSection)
}
