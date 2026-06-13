import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createThemeCssVars, getThemeColor, SECTION_THEME_COLORS } from '@/composables'

describe('theme integration', () => {
  it('defines all section theme colors', () => {
    expect(SECTION_THEME_COLORS.study).toBe('#4A90E2')
    expect(SECTION_THEME_COLORS.life).toBe('#f49d25')
    expect(SECTION_THEME_COLORS.psychology).toBe('#886fde')
    expect(SECTION_THEME_COLORS.mine).toBe('#6fde81')
  })

  it('creates css vars from section theme', () => {
    const vars = createThemeCssVars('study')
    expect(vars['--primary-color']).toBe('#4A90E2')
    expect(vars['--primary-light']).toContain('rgba(')
    expect(vars['--primary-medium']).toContain('rgba(')
    expect(getThemeColor('mine')).toBe('#6fde81')
  })

  it('keeps global scss palette in sync with theme map', () => {
    const scss = readFileSync(resolve(process.cwd(), 'src/uni.scss'), 'utf8')
    expect(scss).toContain('--study-primary: #4A90E2')
    expect(scss).toContain('--life-primary: #f49d25')
    expect(scss).toContain('--psychology-primary: #886fde')
    expect(scss).toContain('--mine-primary: #6fde81')
  })

  it('contains dark mode rules in common components', () => {
    const quickAccess = readFileSync(resolve(process.cwd(), 'src/components/common/QuickAccessCard.vue'), 'utf8')
    const feedCard = readFileSync(resolve(process.cwd(), 'src/components/common/FeedCard.vue'), 'utf8')
    expect(quickAccess).toContain('@media (prefers-color-scheme: dark)')
    expect(feedCard).toContain('@media (prefers-color-scheme: dark)')
  })
})

