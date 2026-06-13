import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import JournalPage from '@/pages/psychology/journal.vue'

const mockUiStore = {
  theme: 'light',
  locale: 'zh-CN',
  initFromSystem: vi.fn()
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

vi.mock('@/services/journals', () => ({
  default: {
    getMyJournals: vi.fn().mockResolvedValue([])
  }
}))

vi.mock('@/utils/auth-guard', () => ({
  requireAuth: vi.fn(() => true)
}))

vi.mock('@dcloudio/uni-app', () => ({
  onShow: vi.fn()
}))

describe('journal page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as any).uni = {
      navigateTo: vi.fn(),
      navigateBack: vi.fn(),
      switchTab: vi.fn(),
      showToast: vi.fn()
    }
  })

  it('navigates to insights page from the top right action button', async () => {
    const wrapper = mount(JournalPage, {
      global: {
        stubs: {
          Icon: {
            props: ['name'],
            template: '<i class="icon-stub">{{ name }}</i>'
          }
        }
      }
    })

    await wrapper.find('.top-bar .right .icon-btn').trigger('tap')

    expect((globalThis as any).uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/psychology/insights'
    })
  })
})
