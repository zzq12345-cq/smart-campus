import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockAuthService = vi.hoisted(() => ({
  isLoggedIn: vi.fn(),
  getStoredUser: vi.fn(),
  getStoredDbUser: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  resetPassword: vi.fn(),
  logout: vi.fn(),
  refreshProfile: vi.fn(),
  updateProfile: vi.fn()
}))

vi.mock('@/services/auth', () => ({
  default: mockAuthService
}))

import { useAuthStore } from '@/stores/auth'

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    ;(globalThis as any).uni = {
      getStorageSync: vi.fn((key: string) => {
        if (key === 'session') {
          return { $id: 'session-local' }
        }
        return null
      })
    }
  })

  it('init restores auth state from storage service', async () => {
    mockAuthService.isLoggedIn.mockReturnValue(true)
    mockAuthService.getStoredUser.mockReturnValue({ $id: 'u1', email: 'a@b.com', name: 'Alice' })
    mockAuthService.getStoredDbUser.mockReturnValue({ $id: 'u1', email: 'a@b.com', name: 'Alice' })

    const store = useAuthStore()
    await store.init()

    expect(store.isLoggedIn).toBe(true)
    expect(store.user?.$id).toBe('u1')
    expect(store.dbUser?.$id).toBe('u1')
    expect(store.session?.$id).toBe('session-local')
  })

  it('login and logout update reactive state', async () => {
    const store = useAuthStore()
    mockAuthService.login.mockResolvedValue({
      session: { $id: 's1' },
      user: { $id: 'u1', email: 'a@b.com', name: 'Alice' },
      dbUser: { $id: 'u1', email: 'a@b.com', name: 'Alice' }
    })

    await store.login('a@b.com', 'secret')
    expect(store.isLoggedIn).toBe(true)
    expect(store.session?.$id).toBe('s1')
    expect(store.userName).toBe('Alice')

    mockAuthService.logout.mockResolvedValue(undefined)
    await store.logout()
    expect(store.isLoggedIn).toBe(false)
    expect(store.user).toBeNull()
    expect(store.dbUser).toBeNull()
    expect(store.session).toBeNull()
  })

  it('resetPassword delegates to auth service', async () => {
    const store = useAuthStore()
    mockAuthService.resetPassword.mockResolvedValue(true)

    await expect(store.resetPassword('reset@example.com')).resolves.toBe(true)
    expect(mockAuthService.resetPassword).toHaveBeenCalledWith('reset@example.com')
    expect(store.loading).toBe(false)
  })
})
