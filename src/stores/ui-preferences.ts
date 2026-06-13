import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { LocaleCode, TabSection, ThemeMode } from '@/types/ui'
import { syncRuntimeUi as syncRuntimeUiState } from '@/utils/runtime-ui'

const STORAGE_THEME_KEY = 'ui.theme'
const STORAGE_LOCALE_KEY = 'ui.locale'

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

function isLocaleCode(value: unknown): value is LocaleCode {
  return value === 'zh-CN' || value === 'en-US'
}

function getSystemInfo() {
  try {
    if (typeof uni?.getSystemInfoSync === 'function') {
      return uni.getSystemInfoSync()
    }
  } catch (error) {
    console.warn('getSystemInfoSync failed:', error)
  }
  return {} as UniApp.GetSystemInfoResult
}

function inferSystemTheme(info: Partial<UniApp.GetSystemInfoResult>): ThemeMode {
  const theme = String(info.theme || '').toLowerCase()
  return theme === 'dark' ? 'dark' : 'light'
}

function inferSystemLocale(info: Partial<UniApp.GetSystemInfoResult>): LocaleCode {
  const language = String(info.language || '').toLowerCase()
  return language.startsWith('zh') ? 'zh-CN' : 'en-US'
}

function getStoredTheme(): ThemeMode | undefined {
  try {
    const value = uni.getStorageSync(STORAGE_THEME_KEY)
    return isThemeMode(value) ? value : undefined
  } catch (error) {
    console.warn('getStorageSync(theme) failed:', error)
    return undefined
  }
}

function getStoredLocale(): LocaleCode | undefined {
  try {
    const value = uni.getStorageSync(STORAGE_LOCALE_KEY)
    return isLocaleCode(value) ? value : undefined
  } catch (error) {
    console.warn('getStorageSync(locale) failed:', error)
    return undefined
  }
}

function persistTheme(theme: ThemeMode) {
  try {
    uni.setStorageSync(STORAGE_THEME_KEY, theme)
  } catch (error) {
    console.warn('setStorageSync(theme) failed:', error)
  }
}

function persistLocale(locale: LocaleCode) {
  try {
    uni.setStorageSync(STORAGE_LOCALE_KEY, locale)
  } catch (error) {
    console.warn('setStorageSync(locale) failed:', error)
  }
}

export const useUiPreferencesStore = defineStore('ui-preferences', () => {
  const theme = ref<ThemeMode>('light')
  const locale = ref<LocaleCode>('zh-CN')
  const activeSection = ref<TabSection>('study')
  const initialized = ref(false)

  const isDark = computed(() => theme.value === 'dark')

  function initFromSystem() {
    if (initialized.value) {
      return
    }

    const systemInfo = getSystemInfo()
    theme.value = getStoredTheme() || inferSystemTheme(systemInfo)
    locale.value = getStoredLocale() || inferSystemLocale(systemInfo)
    initialized.value = true

    syncRuntimeUi()
  }

  function setActiveSection(section: TabSection) {
    activeSection.value = section
    if (initialized.value) {
      syncRuntimeUi(section)
    }
  }

  function setTheme(nextTheme: ThemeMode) {
    if (!isThemeMode(nextTheme) || theme.value === nextTheme) {
      return
    }
    theme.value = nextTheme
    persistTheme(nextTheme)
    syncRuntimeUi()
  }

  function toggleTheme() {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  function setLocale(nextLocale: LocaleCode) {
    if (!isLocaleCode(nextLocale) || locale.value === nextLocale) {
      return
    }
    locale.value = nextLocale
    persistLocale(nextLocale)
    syncRuntimeUi()
  }

  function syncRuntimeUi(section: TabSection = activeSection.value) {
    activeSection.value = section
    syncRuntimeUiState(locale.value, theme.value, activeSection.value)
  }

  return {
    theme,
    locale,
    activeSection,
    initialized,
    isDark,
    initFromSystem,
    toggleTheme,
    setTheme,
    setLocale,
    setActiveSection,
    syncRuntimeUi
  }
})
