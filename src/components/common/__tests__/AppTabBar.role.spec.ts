import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const { mockAuthService } = vi.hoisted(() => ({
  mockAuthService: {
    isLoggedIn: vi.fn(() => true),
    getStoredUser: vi.fn(() => null),
    getStoredDbUser: vi.fn(() => null),
    updateProfile: vi.fn().mockResolvedValue(undefined)
  }
}))
vi.mock('@/services/auth', () => ({ default: mockAuthService }))

import AppTabBar from '@/components/common/AppTabBar.vue'
import { useAuthStore } from '@/stores/auth'

function mountBar(value: string) {
  return mount(AppTabBar, { props: { value } })
}

describe('AppTabBar 角色过滤', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('学生：含学习、不含教学', () => {
    useAuthStore().setRole('student')
    const wrapper = mountBar('/pages/study/index')
    expect((wrapper.vm as any).list.map((i: { value: string }) => i.value)).toEqual([
      '/pages/study/index',
      '/pages/life/index',
      '/pages/psychology/index',
      '/pages/mine/index'
    ])
  })

  it('教师：含教学、不含学习', () => {
    useAuthStore().setRole('teacher')
    const wrapper = mountBar('/pages/teaching/index')
    expect((wrapper.vm as any).list.map((i: { value: string }) => i.value)).toEqual([
      '/pages/teaching/index',
      '/pages/life/index',
      '/pages/psychology/index',
      '/pages/mine/index'
    ])
  })
})
