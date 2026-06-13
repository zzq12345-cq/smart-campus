import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LifePage from '@/pages/life/index.vue'

const mockUiStore = {
  theme: 'light',
  locale: 'zh-CN',
  initFromSystem: vi.fn(),
  setActiveSection: vi.fn()
}

const mockAuthStore = {
  isLoggedIn: false,
  refreshProfile: vi.fn()
}

vi.mock('@/stores/ui-preferences', () => ({
  useUiPreferencesStore: () => mockUiStore
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore
}))

const mockRequireAuth = vi.fn(() => true)

vi.mock('@/utils/auth-guard', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args)
}))

vi.mock('@dcloudio/uni-app', () => ({
  onShow: vi.fn(),
  onHide: vi.fn()
}))

function mountPage() {
  return mount(LifePage, {
    global: {
      stubs: {
        'scroll-view': {
          template: '<div class="scroll-view-stub"><slot /></div>'
        },
        Icon: {
          props: ['name'],
          template: '<i class="icon-stub">{{ name }}</i>'
        },
        AppTabBar: {
          template: '<div class="app-tab-bar-stub"></div>'
        },
        FloatingAiButton: {
          template: '<div class="fab-stub"></div>'
        }
      }
    }
  })
}

describe('life page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as any).uni = {
      showToast: vi.fn(),
      hideTabBar: vi.fn(),
      navigateTo: vi.fn()
    }
  })

  it('renders hero and feed section', () => {
    const wrapper = mountPage()
    expect(wrapper.find('.hero-card').exists()).toBe(true)
    expect(wrapper.findAll('.quick-card')).toHaveLength(4)
    expect(wrapper.find('.feed-list').exists()).toBe(true)
  })

  it('navigates to publish page when feed action is tapped', async () => {
    const wrapper = mountPage()
    await wrapper.find('.section-action').trigger('tap')
    expect(mockRequireAuth).toHaveBeenCalledWith('/pages/life/index')
    expect((globalThis as any).uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/life/post-publish'
    })
  })
})
