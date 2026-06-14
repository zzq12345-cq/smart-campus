import { vi } from 'vitest'
import { defineComponent } from 'vue'

const systemInfo = {
  windowWidth: 375,
  windowHeight: 667,
  screenWidth: 375,
  screenHeight: 667,
  statusBarHeight: 20,
  SDKVersion: '3.0.0',
  version: '3.0.0',
  platform: 'devtools',
  language: 'zh-CN',
  theme: 'light',
  safeAreaInsets: {
    left: 0,
    right: 0,
    top: 20,
    bottom: 0
  }
}

function createObserver() {
  return {
    relativeToViewport: () => ({
      observe: (_selector: string, cb: (res: unknown) => void) => {
        cb({ intersectionRatio: 1 })
      }
    })
  }
}

if (!(globalThis as Record<string, unknown>).uni) {
  ;(globalThis as Record<string, unknown>).uni = {}
}

Object.assign((globalThis as Record<string, any>).uni, {
  getSystemInfoSync: vi.fn(() => systemInfo),
  getWindowInfo: vi.fn(() => systemInfo),
  getAppBaseInfo: vi.fn(() => systemInfo),
  getDeviceInfo: vi.fn(() => systemInfo),
  createIntersectionObserver: vi.fn(() => createObserver()),
  hideTabBar: vi.fn(),
  showTabBar: vi.fn(),
  showToast: vi.fn(),
  switchTab: vi.fn(),
  navigateTo: vi.fn(),
  reLaunch: vi.fn(),
  getStorageSync: vi.fn(() => ''),
  setStorageSync: vi.fn(),
  removeStorageSync: vi.fn()
})

vi.mock('@/uni_modules/tdesign-uniapp/components/tab-bar/tab-bar.vue', () => ({
  default: defineComponent({
    name: 'MockTTabBar',
    props: {
      value: {
        type: String,
        default: ''
      }
    },
    emits: ['change'],
    template: '<div class="mock-t-tab-bar"><slot /></div>'
  })
}))

vi.mock('@/uni_modules/tdesign-uniapp/components/tab-bar-item/tab-bar-item.vue', () => ({
  default: defineComponent({
    name: 'MockTTabBarItem',
    template: '<div class="mock-t-tab-bar-item"><slot /></div>'
  })
}))
