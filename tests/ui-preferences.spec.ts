import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUiPreferencesStore } from '@/stores/ui-preferences'

interface UniMock {
  getStorageSync: ReturnType<typeof vi.fn>
  setStorageSync: ReturnType<typeof vi.fn>
  getSystemInfoSync: ReturnType<typeof vi.fn>
  setTabBarItem: ReturnType<typeof vi.fn>
  setTabBarStyle: ReturnType<typeof vi.fn>
}

function setupUniMock(input?: {
  storage?: Record<string, unknown>
  systemInfo?: Partial<UniApp.GetSystemInfoResult>
}): UniMock {
  const storage = { ...(input?.storage || {}) }
  return {
    getStorageSync: vi.fn((key: string) => storage[key]),
    setStorageSync: vi.fn((key: string, value: unknown) => {
      storage[key] = value
    }),
    getSystemInfoSync: vi.fn(
      () =>
        ({
          theme: 'dark',
          language: 'en-US',
          ...input?.systemInfo
        }) as UniApp.GetSystemInfoResult
    ),
    setTabBarItem: vi.fn(),
    setTabBarStyle: vi.fn()
  }
}

describe('ui-preferences store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes from system values when no cached values exist', () => {
    const uniMock = setupUniMock({
      systemInfo: {
        theme: 'dark',
        language: 'en'
      }
    })
    ;(globalThis as any).uni = uniMock

    const store = useUiPreferencesStore()
    store.initFromSystem()

    expect(store.theme).toBe('dark')
    expect(store.locale).toBe('en-US')
    expect(uniMock.setTabBarItem).toHaveBeenCalledTimes(5)
    expect(uniMock.setTabBarStyle).toHaveBeenCalledTimes(1)
  })

  it('prefers cached values over system values', () => {
    const uniMock = setupUniMock({
      storage: {
        'ui.theme': 'light',
        'ui.locale': 'zh-CN'
      },
      systemInfo: {
        theme: 'dark',
        language: 'en-US'
      }
    })
    ;(globalThis as any).uni = uniMock

    const store = useUiPreferencesStore()
    store.initFromSystem()

    expect(store.theme).toBe('light')
    expect(store.locale).toBe('zh-CN')
  })

  it('toggles theme and persists value', () => {
    const uniMock = setupUniMock({
      systemInfo: {
        theme: 'light',
        language: 'zh-CN'
      }
    })
    ;(globalThis as any).uni = uniMock

    const store = useUiPreferencesStore()
    store.initFromSystem()
    store.toggleTheme()

    expect(store.theme).toBe('dark')
    expect(uniMock.setStorageSync).toHaveBeenCalledWith('ui.theme', 'dark')
    expect(uniMock.setTabBarStyle).toHaveBeenCalled()
  })

  it('updates locale and runtime tabbar labels', () => {
    const uniMock = setupUniMock()
    ;(globalThis as any).uni = uniMock

    const store = useUiPreferencesStore()
    store.initFromSystem()
    store.setLocale('zh-CN')

    expect(store.locale).toBe('zh-CN')
    expect(uniMock.setStorageSync).toHaveBeenCalledWith('ui.locale', 'zh-CN')
    expect(uniMock.setTabBarItem).toHaveBeenLastCalledWith({ index: 4, text: '我的' })
  })

  it('updates active section and tabbar selected color', () => {
    const uniMock = setupUniMock()
    ;(globalThis as any).uni = uniMock

    const store = useUiPreferencesStore()
    store.initFromSystem()
    store.setActiveSection('life')

    const lastStyleCall = uniMock.setTabBarStyle.mock.calls.at(-1)?.[0] as {
      selectedColor: string
    }
    expect(lastStyleCall.selectedColor).toBe('#f49d25')
  })
})
