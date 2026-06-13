import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PsychologyPage from '@/pages/psychology/index.vue'

const mockUiStore = {
  theme: 'light',
  locale: 'zh-CN',
  initFromSystem: vi.fn(),
  setActiveSection: vi.fn()
}

const mockAuthStore = {
  refreshProfile: vi.fn()
}

vi.mock('@/stores/ui-preferences', () => ({
  useUiPreferencesStore: () => mockUiStore
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore
}))

vi.mock('@/services/posts', () => ({
  default: {
    getPublicPosts: vi.fn().mockResolvedValue([])
  }
}))

vi.mock('@/utils/auth-guard', () => ({
  requireAuth: vi.fn(() => true)
}))

vi.mock('@dcloudio/uni-app', () => ({
  onShow: vi.fn(),
  onHide: vi.fn(),
  onPullDownRefresh: vi.fn(),
  onReachBottom: vi.fn()
}))

function mountPage() {
  return mount(PsychologyPage, {
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

describe('psychology page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as any).uni = {
      showToast: vi.fn(),
      navigateTo: vi.fn(),
      stopPullDownRefresh: vi.fn(),
      hideTabBar: vi.fn()
    }
  })

  it('renders hero and quick actions', () => {
    const wrapper = mountPage()
    expect(wrapper.find('.hero-card').exists()).toBe(true)
    expect(wrapper.findAll('.quick-card').length).toBeGreaterThan(0)
    expect(wrapper.find('.state-card').exists()).toBe(true)
  })

  it('navigates when tapping an available quick action', async () => {
    const wrapper = mountPage()
    await wrapper.find('.quick-card').trigger('tap')
    expect((globalThis as any).uni.navigateTo).toHaveBeenCalledTimes(1)
  })
})
