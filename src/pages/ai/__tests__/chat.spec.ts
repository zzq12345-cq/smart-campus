import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AiChatPage from '@/pages/ai/chat.vue'

const mockUiStore = {
  theme: 'light',
  locale: 'zh-CN',
  initFromSystem: vi.fn()
}

vi.mock('@/stores/ui-preferences', () => ({
  useUiPreferencesStore: () => mockUiStore
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({})
}))

vi.mock('@/stores/points', () => ({
  usePointsStore: () => ({ equippedSkinId: '' })
}))

vi.mock('@/services/ai-chat.service', () => ({
  default: {
    sendMessage: vi.fn()
  }
}))

vi.mock('@/services/notifications', () => ({
  default: {
    listNotifications: vi.fn().mockResolvedValue({ success: true, data: [] }),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn()
  }
}))

vi.mock('@dcloudio/uni-app', () => ({
  onLoad: vi.fn()
}))

function mountPage() {
  return mount(AiChatPage, {
    global: {
      stubs: {
        'scroll-view': {
          template: '<div class="scroll-view-stub"><slot /></div>'
        },
        Icon: {
          props: ['name'],
          template: '<i class="icon-stub">{{ name }}</i>'
        },
        RobotAvatar: {
          template: '<div class="robot-avatar-stub"></div>'
        }
      }
    }
  })
}

describe('AI chat page navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as any).getCurrentPages = vi.fn(() => [{ route: 'pages/ai/chat', options: {} }])
    ;(globalThis as any).uni = {
      getStorageSync: vi.fn(() => ''),
      setStorageSync: vi.fn(),
      removeStorageSync: vi.fn(),
      showModal: vi.fn(),
      showToast: vi.fn(),
      navigateBack: vi.fn(),
      navigateTo: vi.fn(),
      switchTab: vi.fn()
    }
  })

  it('switches to study tab when going back without page history', async () => {
    const wrapper = mountPage()

    await wrapper.find('.top-bar-left').trigger('tap')

    expect((globalThis as any).uni.switchTab).toHaveBeenCalledWith({
      url: '/pages/study/index'
    })
    expect((globalThis as any).uni.navigateTo).not.toHaveBeenCalledWith({
      url: '/pages/study/index'
    })
  })
})
