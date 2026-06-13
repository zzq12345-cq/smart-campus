import { computed, ref } from 'vue'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { TabSection, ThemeMode } from '@/types/ui'

export const SECTION_THEME_COLORS: Record<TabSection, string> = {
  study: '#4A90E2',
  life: '#f49d25',
  teaching: '#C00000',
  psychology: '#886fde',
  mine: '#6fde81'
}

function toRgba(hexColor: string, alpha: number) {
  const hex = hexColor.replace('#', '')
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function getThemeColor(section: TabSection) {
  return SECTION_THEME_COLORS[section]
}

export function createThemeCssVars(section: TabSection) {
  const primary = getThemeColor(section)
  return {
    '--primary-color': primary,
    '--primary-light': toRgba(primary, 0.1),
    '--primary-medium': toRgba(primary, 0.2)
  }
}

export function useTheme(defaultSection: TabSection = 'psychology') {
  const uiPreferencesStore = useUiPreferencesStore()
  const currentSection = ref<TabSection>(defaultSection)

  const themeMode = computed<ThemeMode>(() => uiPreferencesStore.theme)
  const isDark = computed(() => themeMode.value === 'dark')
  const pageThemeClass = computed(() => `theme-${themeMode.value}`)
  const sectionColor = computed(() => getThemeColor(currentSection.value))
  const cssVars = computed(() => createThemeCssVars(currentSection.value))

  function setSection(section: TabSection) {
    currentSection.value = section
    uiPreferencesStore.setActiveSection(section)
  }

  function toggleDark() {
    uiPreferencesStore.toggleTheme()
  }

  return {
    themeMode,
    isDark,
    pageThemeClass,
    currentSection,
    sectionColor,
    cssVars,
    setSection,
    toggleDark
  }
}
