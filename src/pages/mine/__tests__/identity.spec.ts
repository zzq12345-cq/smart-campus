import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const { mockFunctions, mockAccount, mockTablesDB } = vi.hoisted(() => ({
  mockFunctions: {
    createExecution: vi.fn(),
    getExecution: vi.fn()
  },
  mockAccount: {
    get: vi.fn(),
    getSession: vi.fn()
  },
  mockTablesDB: {
    createRow: vi.fn(),
    updateRow: vi.fn(),
    listRows: vi.fn(),
    deleteRow: vi.fn()
  }
}))

vi.mock('@/utils/appwrite', () => ({
  functions: mockFunctions,
  account: mockAccount,
  tablesDB: mockTablesDB
}))

vi.mock('appwrite', () => ({
  Client: class {
    setEndpoint() {
      return this
    }
    setProject() {
      return this
    }
    setSession() {
      return this
    }
  },
  Account: class {},
  Functions: class {
    createExecution = mockFunctions.createExecution
    getExecution = mockFunctions.getExecution
  },
  Storage: class {},
  TablesDB: class {},
  ExecutionMethod: {
    POST: 'POST'
  },
  ID: {
    unique: () => 'unique-id'
  },
  Permission: {
    read: vi.fn(() => 'read'),
    update: vi.fn(() => 'update'),
    delete: vi.fn(() => 'delete')
  },
  Role: {
    user: vi.fn(() => 'user'),
    users: vi.fn(() => 'users')
  }
}))

vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => void | Promise<void>) => callback()
}))

function createSelectorQueryMock() {
  return {
    in() {
      return this
    },
    select() {
      return this
    },
    boundingClientRect(callback: (rect: { left: number; top: number; width: number; height: number }) => void) {
      callback({ left: 0, top: 0, width: 350, height: 200 })
      return this
    },
    exec: vi.fn()
  }
}

function buildExecution(data: unknown, executionId: string) {
  return {
    $id: executionId,
    status: 'completed',
    responseStatusCode: 200,
    responseBody: JSON.stringify({
      ok: true,
      data
    })
  }
}

function extractPayload(index: number) {
  const call = mockFunctions.createExecution.mock.calls[index] || []
  if (typeof call[0] === 'string') {
    return JSON.parse(String(call[1] || '{}')) as Record<string, unknown>
  }
  return JSON.parse(String(call[0]?.body || '{}')) as Record<string, unknown>
}

async function mountPage() {
  const IdentityPage = (await import('@/pages/mine/identity.vue')).default
  return mount(IdentityPage, {
    global: {
      plugins: [createPinia()],
      stubs: {
        Icon: {
          props: ['name'],
          template: '<i class="icon-stub">{{ name }}</i>'
        }
      }
    }
  })
}

describe('identity page', () => {
  let storage: Map<string, any>
  let mockVisibilityState: 'visible' | 'hidden'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.useRealTimers()
    setActivePinia(createPinia())

    storage = new Map<string, any>([
      ['isLoggedIn', true],
      ['user', { $id: 'user_1234567890', name: 'Test User' }],
      ['dbUser', null]
    ])
    mockVisibilityState = 'visible'
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => mockVisibilityState
    })

    ;(globalThis as any).uni = {
      showToast: vi.fn(),
      navigateTo: vi.fn(),
      navigateBack: vi.fn(),
      switchTab: vi.fn(),
      getStorageSync: vi.fn((key: string) => storage.get(key)),
      setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
      removeStorageSync: vi.fn((key: string) => storage.delete(key)),
      getSystemInfoSync: vi.fn(() => ({ theme: 'light', language: 'zh-CN' })),
      setTabBarItem: vi.fn(),
      setTabBarStyle: vi.fn(),
      setBackgroundColor: vi.fn(),
      setClipboardData: vi.fn(({ success }: { success?: () => void }) => success?.()),
      createSelectorQuery: vi.fn(() => createSelectorQueryMock())
    }

    ;(window as any).open = vi.fn(() => ({}))
    ;(globalThis as any).getCurrentPages = vi.fn(() => [
      {
        route: 'pages/mine/identity',
        options: {}
      }
    ])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls getCaptcha when tapping fetch button with valid credentials', async () => {
    mockFunctions.createExecution.mockResolvedValueOnce(
      buildExecution(
        {
          challengeId: 'jwlc_test',
          captchaImageBase64: 'ZmFrZQ==',
          captchaTextHints: ['red', 'blue'],
          imageWidth: 350,
          imageHeight: 200
        },
        'exec-1'
      )
    )

    const wrapper = await mountPage()
    await flushPromises()

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('20250001')
    await inputs[1].setValue('password123')

    await wrapper.find('.captcha-fetch-btn').trigger('tap')
    await flushPromises()

    expect(mockFunctions.createExecution).toHaveBeenCalledTimes(1)
    expect(extractPayload(0)).toMatchObject({ action: 'getCaptcha' })
  })

  it('shows success state after successful captcha login', async () => {
    mockFunctions.createExecution
      .mockResolvedValueOnce(
        buildExecution(
          {
            challengeId: 'jwlc_test',
            captchaImageBase64: 'ZmFrZQ==',
            captchaTextHints: ['red'],
            imageWidth: 350,
            imageHeight: 200
          },
          'exec-1'
        )
      )
      .mockResolvedValueOnce(
        buildExecution(
          {
            cookieBundle: 'PHPSESSID=abc',
            personalInfo: {
              name: 'Captcha User',
              studentId: '20250001',
              class: 'Class 1',
              major: 'Software Engineering',
              grade: '2025',
              gender: 'M',
              dormitory: '1-101'
            }
          },
          'exec-2'
        )
      )

    const wrapper = await mountPage()
    await flushPromises()

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('20250001')
    await inputs[1].setValue('password123')

    await wrapper.find('.captcha-fetch-btn').trigger('tap')
    await flushPromises()

    await wrapper.find('.captcha-image-panel').trigger('tap', { detail: { x: 100, y: 50 } })
    await flushPromises()

    await wrapper.find('.captcha-submit-btn').trigger('tap')
    await flushPromises()

    expect(mockFunctions.createExecution).toHaveBeenCalledTimes(2)
    expect(extractPayload(1)).toMatchObject({
      action: 'submitLogin',
      challengeId: 'jwlc_test',
      username: '20250001',
      password: 'password123'
    })
    expect(storage.get('educationAuth')).toMatchObject({
      appUserId: 'user_1234567890',
      studentId: '20250001'
    })
    expect(wrapper.find('.success-card').exists()).toBe(true)
  })

  it('navigates back to schedule after successful login when opened from schedule page', async () => {
    ;(globalThis as any).getCurrentPages = vi.fn(() => [
      { route: 'pages/study/schedule', options: {} },
      { route: 'pages/mine/identity', options: { source: 'schedule' } }
    ])

    mockFunctions.createExecution
      .mockResolvedValueOnce(
        buildExecution(
          {
            challengeId: 'jwlc_test',
            captchaImageBase64: 'ZmFrZQ==',
            captchaTextHints: ['red'],
            imageWidth: 350,
            imageHeight: 200
          },
          'exec-return-1'
        )
      )
      .mockResolvedValueOnce(
        buildExecution(
          {
            cookieBundle: 'PHPSESSID=return',
            personalInfo: {
              name: 'Return User',
              studentId: '20250001',
              class: 'Class 1',
              major: 'Software Engineering',
              grade: '2025',
              gender: 'M',
              dormitory: '1-101'
            }
          },
          'exec-return-2'
        )
      )

    const wrapper = await mountPage()
    await flushPromises()

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('20250001')
    await inputs[1].setValue('password123')

    await wrapper.find('.captcha-fetch-btn').trigger('tap')
    await flushPromises()

    await wrapper.find('.captcha-image-panel').trigger('tap', { detail: { x: 100, y: 50 } })
    await flushPromises()

    await wrapper.find('.captcha-submit-btn').trigger('tap')
    await flushPromises()

    expect((globalThis as any).uni.navigateBack).toHaveBeenCalled()
  })

  it('displays existing snapshot on load', async () => {
    storage.set('educationAuth', {
      appUserId: 'user_1234567890',
      studentId: '20250001',
      cookieBundle: 'PHPSESSID=abc',
      authenticatedAt: '2025-03-07T10:00:00.000Z',
      personalInfo: {
        name: 'Snapshot User',
        studentId: '20250001',
        class: 'Class 1',
        major: 'Software Engineering',
        grade: '2025',
        gender: 'M',
        dormitory: '1-101'
      }
    })

    const wrapper = await mountPage()
    await flushPromises()

    expect(wrapper.find('.success-card').exists()).toBe(true)
    expect(wrapper.find('.success-title').exists()).toBe(true)
  })

  it('clears local education cache when reconnecting', async () => {
    storage.set('educationAuth', {
      appUserId: 'user_1234567890',
      studentId: '20250001',
      cookieBundle: 'PHPSESSID=abc',
      authenticatedAt: '2025-03-07T10:00:00.000Z',
      personalInfo: {
        name: 'Snapshot User',
        studentId: '20250001',
        class: 'Class 1',
        major: 'Software Engineering',
        grade: '2025',
        gender: 'M',
        dormitory: '1-101'
      }
    })
    storage.set('educationScheduleCache', {
      appUserId: 'user_1234567890',
      fetchedAt: '2026-03-09T00:00:00.000Z',
      semesters: [
        {
          semesterId: '20252',
          semesterName: '2025-2026学年第二学期',
          startDate: '2026-03-02'
        }
      ],
      semesterSchedules: {}
    })

    const wrapper = await mountPage()
    await flushPromises()

    expect(wrapper.find('.success-card').exists()).toBe(true)

    await wrapper.find('.secondary-btn').trigger('tap')
    await flushPromises()

    expect(storage.get('educationAuth')).toBeUndefined()
    expect(storage.get('educationScheduleCache')).toBeUndefined()
    expect(wrapper.find('.success-card').exists()).toBe(false)
    expect(wrapper.findAll('input')[0].element.value).toBe('20250001')
  })

  it('opens login link and confirms after automatic polling', async () => {
    vi.useFakeTimers()
    mockFunctions.createExecution
      .mockResolvedValueOnce(
        buildExecution(
          {
            challengeId: 'jwll_test',
            loginUrl: 'https://example.com/login',
            ticket: 'ticket_123',
            expiresAt: new Date(Date.now() + 60_000).toISOString()
          },
          'exec-1'
        )
      )
      .mockResolvedValueOnce(buildExecution({ status: 'waiting', message: 'waiting' }, 'exec-2'))
      .mockResolvedValueOnce(buildExecution({ status: 'confirmed', message: 'confirmed' }, 'exec-3'))
      .mockResolvedValueOnce(
        buildExecution(
          {
            cookieBundle: 'PHPSESSID=linked',
            personalInfo: {
              name: 'Linked User',
              studentId: '20250002',
              class: 'Class 2',
              major: 'Computer Science',
              grade: '2025',
              gender: 'F',
              dormitory: '2-202'
            }
          },
          'exec-4'
        )
      )

    const wrapper = await mountPage()
    await flushPromises()

    const modeTabs = wrapper.findAll('.mode-tab')
    await modeTabs[1].trigger('tap')
    await flushPromises()

    await wrapper.find('.link-generate-btn').trigger('tap')
    await flushPromises()

    expect(mockFunctions.createExecution).toHaveBeenCalledTimes(2)
    expect(extractPayload(0)).toMatchObject({ action: 'getLoginLink' })
    expect(extractPayload(1)).toMatchObject({ action: 'checkLoginLink', challengeId: 'jwll_test', ticket: 'ticket_123' })

    await wrapper.find('.link-open-btn').trigger('tap')
    expect(window.open).toHaveBeenCalledWith('https://example.com/login', '_blank', 'noopener,noreferrer')

    await vi.advanceTimersByTimeAsync(2000)
    await flushPromises()

    expect(mockFunctions.createExecution).toHaveBeenCalledTimes(4)
    expect(extractPayload(2)).toMatchObject({ action: 'checkLoginLink', challengeId: 'jwll_test', ticket: 'ticket_123' })
    expect(extractPayload(3)).toMatchObject({ action: 'confirmLoginLink', challengeId: 'jwll_test', ticket: 'ticket_123' })
    expect(storage.get('educationAuth')).toMatchObject({
      appUserId: 'user_1234567890',
      studentId: '20250002'
    })
  })

  it('restores pending link login after remount and continues polling', async () => {
    vi.useFakeTimers()
    storage.set('educationPendingLink', {
      appUserId: 'user_1234567890',
      challengeId: 'jwll_restore',
      loginUrl: 'https://example.com/login',
      ticket: 'ticket_restore',
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    })

    mockFunctions.createExecution
      .mockResolvedValueOnce(buildExecution({ status: 'confirmed', message: 'confirmed' }, 'exec-restore-1'))
      .mockResolvedValueOnce(
        buildExecution(
          {
            cookieBundle: 'PHPSESSID=restored',
            personalInfo: {
              name: 'Restored User',
              studentId: '20250003',
              class: 'Class 1',
              major: 'Software Engineering',
              grade: '2025',
              gender: 'M',
              dormitory: '3-303'
            }
          },
          'exec-restore-2'
        )
      )

    const wrapper = await mountPage()
    await flushPromises()

    expect(mockFunctions.createExecution).toHaveBeenCalledTimes(2)
    expect(extractPayload(0)).toMatchObject({
      action: 'checkLoginLink',
      challengeId: 'jwll_restore',
      ticket: 'ticket_restore'
    })
    expect(extractPayload(1)).toMatchObject({
      action: 'confirmLoginLink',
      challengeId: 'jwll_restore',
      ticket: 'ticket_restore'
    })
    expect(storage.get('educationAuth')).toMatchObject({
      appUserId: 'user_1234567890',
      studentId: '20250003'
    })
    expect(storage.get('educationPendingLink')).toBeUndefined()
    expect(wrapper.find('.success-card').exists()).toBe(true)
  })

  it('does not show open-failed toast when window.open returns null', async () => {
    vi.useFakeTimers()
    mockFunctions.createExecution
      .mockResolvedValueOnce(
        buildExecution(
          {
            challengeId: 'jwll_test',
            loginUrl: 'https://example.com/login',
            ticket: 'ticket_123',
            expiresAt: new Date(Date.now() + 60_000).toISOString()
          },
          'exec-open-1'
        )
      )
      .mockResolvedValueOnce(buildExecution({ status: 'waiting', message: 'waiting' }, 'exec-open-2'))

    ;(window as any).open = vi.fn(() => null)

    const wrapper = await mountPage()
    await flushPromises()

    const modeTabs = wrapper.findAll('.mode-tab')
    await modeTabs[1].trigger('tap')
    await flushPromises()

    await wrapper.find('.link-generate-btn').trigger('tap')
    await flushPromises()

    ;(globalThis as any).uni.showToast.mockClear()

    await wrapper.find('.link-open-btn').trigger('tap')
    await flushPromises()

    expect(window.open).toHaveBeenCalledWith('https://example.com/login', '_blank', 'noopener,noreferrer')
    expect((globalThis as any).uni.showToast).not.toHaveBeenCalled()
  })

  it('triggers link status refresh when page becomes visible again', async () => {
    vi.useFakeTimers()
    mockFunctions.createExecution
      .mockResolvedValueOnce(
        buildExecution(
          {
            challengeId: 'jwll_test',
            loginUrl: 'https://example.com/login',
            ticket: 'ticket_123',
            expiresAt: new Date(Date.now() + 60_000).toISOString()
          },
          'exec-1'
        )
      )
      .mockResolvedValueOnce(buildExecution({ status: 'waiting', message: 'waiting' }, 'exec-2'))
      .mockResolvedValueOnce(buildExecution({ status: 'waiting', message: 'waiting' }, 'exec-3'))

    const wrapper = await mountPage()
    await flushPromises()

    const modeTabs = wrapper.findAll('.mode-tab')
    await modeTabs[1].trigger('tap')
    await flushPromises()

    await wrapper.find('.link-generate-btn').trigger('tap')
    await flushPromises()

    expect(mockFunctions.createExecution).toHaveBeenCalledTimes(2)

    mockFunctions.createExecution.mockClear()

    mockVisibilityState = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()

    expect(mockFunctions.createExecution.mock.calls.length).toBeGreaterThan(0)
    const hasCheckLoginCall = mockFunctions.createExecution.mock.calls.some((_, index) => {
      const payload = extractPayload(index)
      return (
        payload.action === 'checkLoginLink' &&
        payload.challengeId === 'jwll_test' &&
        payload.ticket === 'ticket_123'
      )
    })
    expect(hasCheckLoginCall).toBe(true)
  })

  it('stops polling after link login expires', async () => {
    vi.useFakeTimers()
    mockFunctions.createExecution
      .mockResolvedValueOnce(
        buildExecution(
          {
            challengeId: 'jwll_test',
            loginUrl: 'https://example.com/login',
            ticket: 'ticket_123',
            expiresAt: new Date(Date.now() + 60_000).toISOString()
          },
          'exec-1'
        )
      )
      .mockResolvedValueOnce(buildExecution({ status: 'expired', message: 'expired' }, 'exec-2'))

    const wrapper = await mountPage()
    await flushPromises()

    const modeTabs = wrapper.findAll('.mode-tab')
    await modeTabs[1].trigger('tap')
    await flushPromises()

    await wrapper.find('.link-generate-btn').trigger('tap')
    await flushPromises()

    expect(mockFunctions.createExecution).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(4000)
    await flushPromises()

    expect(mockFunctions.createExecution).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.status-pill').text()).toContain('expired')
  })

  it('cleans link polling when switching back to captcha mode', async () => {
    vi.useFakeTimers()
    mockFunctions.createExecution
      .mockResolvedValueOnce(
        buildExecution(
          {
            challengeId: 'jwll_test',
            loginUrl: 'https://example.com/login',
            ticket: 'ticket_123',
            expiresAt: new Date(Date.now() + 60_000).toISOString()
          },
          'exec-1'
        )
      )
      .mockResolvedValueOnce(buildExecution({ status: 'waiting', message: 'waiting' }, 'exec-2'))

    const wrapper = await mountPage()
    await flushPromises()

    const modeTabs = wrapper.findAll('.mode-tab')
    await modeTabs[1].trigger('tap')
    await flushPromises()

    await wrapper.find('.link-generate-btn').trigger('tap')
    await flushPromises()

    expect(mockFunctions.createExecution).toHaveBeenCalledTimes(2)

    await wrapper.findAll('.mode-tab')[0].trigger('tap')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(4000)
    await flushPromises()

    expect(mockFunctions.createExecution).toHaveBeenCalledTimes(2)
  })
})
