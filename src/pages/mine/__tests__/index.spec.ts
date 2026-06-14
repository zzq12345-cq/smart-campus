import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MinePage from '@/pages/mine/index.vue'

const { mockPostsService, mockUploadAvatarImage, mockEducationSessionService } = vi.hoisted(() => ({
  mockPostsService: {
    getMyPostsCount: vi.fn(),
    getMyPostsLikeCount: vi.fn(),
  },
  mockUploadAvatarImage: vi.fn(),
  mockEducationSessionService: {
    getSnapshot: vi.fn(),
    saveSnapshot: vi.fn(),
    clearSnapshot: vi.fn(),
  },
}))

const mockUiStore = {
  theme: 'light',
  locale: 'zh-CN',
  initFromSystem: vi.fn(),
  setActiveSection: vi.fn(),
  toggleTheme: vi.fn(),
  setLocale: vi.fn(),
}

const mockAuthStore = {
  isLoggedIn: false,
  user: null as null | { $id: string; name: string; email?: string; avatar?: string },
  dbUser: null as null | { $id: string; name: string; email?: string; avatar?: string },
  init: vi.fn(),
  refreshProfile: vi.fn(),
  updateProfile: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/stores/ui-preferences', () => ({
  useUiPreferencesStore: () => mockUiStore,
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

vi.mock('@/services/posts', () => ({
  default: mockPostsService,
}))

vi.mock('@/services/storage', () => ({
  uploadAvatarImage: mockUploadAvatarImage,
}))

vi.mock('@/services/education-session', () => ({
  default: mockEducationSessionService,
}))

vi.mock('@/composables/useConversations', () => ({
  useConversations: () => ({
    totalUnreadCount: { value: 0 },
    refreshUnreadCount: vi.fn().mockResolvedValue(undefined),
    startAutoRefresh: vi.fn(),
    stopAutoRefresh: vi.fn(),
  }),
}))

vi.mock('@/composables/useNotifications', () => ({
  useNotifications: () => ({
    totalUnreadCount: { value: 0 },
    startCountPolling: vi.fn(),
    stopCountPolling: vi.fn(),
  }),
}))

vi.mock('@/stores/points', () => ({
  usePointsStore: () => ({
    balance: 0,
    initialized: false,
    init: vi.fn().mockResolvedValue(undefined),
    addPoints: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => void | Promise<void>) => callback(),
  onHide: vi.fn(),
}))

function mountPage() {
  return mount(MinePage, {
    global: {
      stubs: {
        'scroll-view': {
          template: '<div class="scroll-view-stub"><slot /></div>',
        },
        Icon: {
          props: ['name'],
          template: '<i class="icon-stub">{{ name }}</i>',
        },
        AppTabBar: {
          template: '<div class="app-tab-bar-stub"></div>',
        },
        FloatingAiButton: {
          template: '<div class="fab-stub"></div>',
        },
      },
    },
  })
}

describe('mine page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthStore.init.mockResolvedValue(undefined)
    mockAuthStore.refreshProfile.mockResolvedValue(undefined)
    mockAuthStore.updateProfile.mockImplementation(async (input?: { avatar?: string | null }) => {
      mockAuthStore.dbUser = {
        ...(mockAuthStore.dbUser || {
          $id: 'user_1234567890',
          name: 'Test User',
          email: 'test@example.com',
        }),
        avatar: input?.avatar || '',
      }
      return {
        user: mockAuthStore.user,
        dbUser: mockAuthStore.dbUser,
      }
    })
    mockAuthStore.logout.mockResolvedValue(undefined)
    mockPostsService.getMyPostsCount.mockResolvedValue(7)
    mockPostsService.getMyPostsLikeCount.mockResolvedValue(13)
    mockUploadAvatarImage.mockResolvedValue('https://example.com/avatar-new.jpg')
    mockEducationSessionService.getSnapshot.mockReturnValue(null)
    mockEducationSessionService.saveSnapshot.mockReturnValue(true)
    mockEducationSessionService.clearSnapshot.mockReturnValue(true)
    mockAuthStore.isLoggedIn = false
    mockAuthStore.user = null
    mockAuthStore.dbUser = null
    ;(globalThis as any).uni = {
      showToast: vi.fn(),
      navigateTo: vi.fn(),
      hideTabBar: vi.fn(),
      chooseImage: vi.fn(({ success }) =>
        success?.({
          tempFilePaths: ['/tmp/avatar.jpg'],
          tempFiles: [{ path: '/tmp/avatar.jpg' }],
        }),
      ),
      getStorageSync: vi.fn(),
      setStorageSync: vi.fn(),
    }
  })

  it('renders guest card when user is not logged in', async () => {
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.find('.guest-card').exists()).toBe(true)
    expect(wrapper.find('.settings-list').exists()).toBe(true)
  })

  it('toggles theme from settings item', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.findAll('.setting-item')[0].trigger('tap')
    expect(mockUiStore.toggleTheme).toHaveBeenCalledTimes(1)
  })

  it('navigates to post management page from service card', async () => {
    mockAuthStore.isLoggedIn = true
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.find('[data-service-key="posts"]').trigger('tap')
    expect((globalThis as any).uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/mine/posts',
    })
  })

  it('navigates to collections page from collections service card', async () => {
    mockAuthStore.isLoggedIn = true
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.find('[data-service-key="collections"]').trigger('tap')
    expect((globalThis as any).uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/mine/collections',
    })
  })

  it('shows real post count and like count in stats', async () => {
    mockAuthStore.isLoggedIn = true
    const wrapper = mountPage()
    await flushPromises()

    expect(mockPostsService.getMyPostsCount).toHaveBeenCalledTimes(1)
    expect(mockPostsService.getMyPostsLikeCount).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('.stat-value')[0].text()).toBe('7')
    expect(wrapper.findAll('.stat-value')[2].text()).toBe('13')
  })

  it('shows real post count in post service card subtitle', async () => {
    mockAuthStore.isLoggedIn = true
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.findAll('.quick-subtitle')[0].text()).toContain('7')
  })

  it('uploads avatar and updates profile from avatar area', async () => {
    mockAuthStore.isLoggedIn = true
    mockAuthStore.user = { $id: 'user_1234567890', name: 'Test User' }
    mockAuthStore.dbUser = {
      $id: 'user_1234567890',
      name: 'Test User',
      email: 'test@example.com',
      avatar: '/static/avatars/user1.jpg',
    }

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('.avatar-wrap').trigger('tap')
    await flushPromises()

    expect((globalThis as any).uni.chooseImage).toHaveBeenCalledTimes(1)
    expect(mockUploadAvatarImage).toHaveBeenCalledWith({
      localPath: '/tmp/avatar.jpg',
      file: undefined,
    })
    expect(mockAuthStore.updateProfile).toHaveBeenCalledWith({
      avatar: 'https://example.com/avatar-new.jpg',
    })
  })

  it('navigates to identity page from identity service card', async () => {
    mockAuthStore.isLoggedIn = true
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.find('[data-service-key="identity"]').trigger('tap')
    expect((globalThis as any).uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/mine/identity',
    })
  })
})
