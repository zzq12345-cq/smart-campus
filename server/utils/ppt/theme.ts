import type { ThemeDefinition } from './types.js'

/** 默认教学主题 */
export const defaultTheme: ThemeDefinition = {
  id: 'mixed-teaching',
  tokenSet: {
    colors: {
      primary: '#C00000',
      secondary: '#8B0000',
      accent: '#D4A574',
      background: '#FFFFFF',
      surface: '#FFF8F0',
      text: '#1A1A1A',
      textSecondary: '#555555',
      border: '#E0D5C5',
      headerBg: '#C00000',
      headerText: '#FFFFFF',
      footerBg: '#F5F0EB',
      footerText: '#888888',
    },
    typography: {
      titleFontSize: 36,
      subtitleFontSize: 24,
      bodyFontSize: 18,
      captionFontSize: 14,
      fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
      lineHeight: 1.6,
    },
    spacing: {
      pageMargin: 60,
      blockGap: 24,
      contentPadding: 40,
    },
  },
}

/** 获取主题 */
export function getTheme(_stylePreset?: string): ThemeDefinition {
  return defaultTheme
}
