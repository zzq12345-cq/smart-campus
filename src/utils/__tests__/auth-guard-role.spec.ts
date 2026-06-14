import { describe, expect, it } from 'vitest'
import { roleHomeUrl } from '@/utils/auth-guard'

describe('roleHomeUrl', () => {
  it('教师 → 教学首页', () => {
    expect(roleHomeUrl(true)).toBe('/pages/teaching/index')
  })
  it('学生 → 学习首页', () => {
    expect(roleHomeUrl(false)).toBe('/pages/study/index')
  })
})
