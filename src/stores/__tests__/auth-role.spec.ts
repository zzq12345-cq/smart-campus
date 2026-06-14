import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { mockAuthService } = vi.hoisted(() => ({
  mockAuthService: {
    isLoggedIn: vi.fn(() => false),
    getStoredUser: vi.fn(() => null),
    getStoredDbUser: vi.fn(() => null),
    updateProfile: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined)
  }
}))

vi.mock('@/services/auth', () => ({ default: mockAuthService }))

import { useAuthStore } from '@/stores/auth'

describe('auth store role', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('缺省（无 role）视为 student', () => {
    const store = useAuthStore()
    expect(store.role).toBe('student')
    expect(store.isTeacher).toBe(false)
  })

  it('dbUser.role=teacher 时为 teacher', () => {
    const store = useAuthStore()
    store.dbUser = { $id: 'u1', email: 'a@b.c', name: 'T', role: 'teacher' }
    expect(store.role).toBe('teacher')
    expect(store.isTeacher).toBe(true)
  })

  it('非法 role 值归一为 student', () => {
    const store = useAuthStore()
    store.dbUser = { $id: 'u1', email: 'a@b.c', name: 'X', role: 'admin' as never }
    expect(store.role).toBe('student')
  })

  it('setRole 写入本地状态并即时反映到 role', () => {
    const store = useAuthStore()
    store.setRole('teacher')
    expect(store.role).toBe('teacher')
    expect(uni.setStorageSync).toHaveBeenCalledWith('user.role', 'teacher')
  })

  it('logout 清除角色，回落为 student', async () => {
    const store = useAuthStore()
    store.setRole('teacher')
    expect(store.role).toBe('teacher')
    await store.logout()
    expect(store.role).toBe('student')
    expect(uni.removeStorageSync).toHaveBeenCalledWith('user.role')
  })
})
