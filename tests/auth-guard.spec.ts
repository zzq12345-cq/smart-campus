import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockAuthStore = vi.hoisted(() => ({
  initialized: true,
  isLoggedIn: false,
  user: null as unknown,
  init: vi.fn(),
  logout: vi.fn()
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore
}))

import { getCurrentUser, logout, requireAuth } from '@/utils/auth-guard'

describe('auth-guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as any).getCurrentPages = vi.fn(() => [{ route: 'pages/psychology/index', options: { from: 'tab' } }])
    ;(globalThis as any).uni = {
      navigateTo: vi.fn(),
      switchTab: vi.fn(),
      showToast: vi.fn()
    }
    mockAuthStore.initialized = true
    mockAuthStore.isLoggedIn = false
    mockAuthStore.user = null
    mockAuthStore.logout.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true when user is already logged in', () => {
    mockAuthStore.isLoggedIn = true
    const allowed = requireAuth('/pages/psychology/index')
    expect(allowed).toBe(true)
    expect((globalThis as any).uni.navigateTo).not.toHaveBeenCalled()
  })

  it('redirects to login when user is not logged in', () => {
    const allowed = requireAuth('/pages/psychology/index')
    expect(allowed).toBe(false)
    expect((globalThis as any).uni.showToast).toHaveBeenCalled()
    expect((globalThis as any).uni.navigateTo).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/pages/mine/login?redirect=')
      })
    )
  })

  it('exposes current user and supports logout redirect', async () => {
    vi.useFakeTimers()
    mockAuthStore.user = { $id: 'u1' }
    expect(getCurrentUser()).toEqual({ $id: 'u1' })

    await logout('/pages/psychology/index')
    expect(mockAuthStore.logout).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(900)
    expect((globalThis as any).uni.navigateTo).toHaveBeenCalled()
  })
})
