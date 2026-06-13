import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MineCollectionsPage from '@/pages/mine/collections.vue'

const { mockUiStore, mockAuthStore, mockTablesDB, mockPostInteractionsService } = vi.hoisted(() => ({
  mockUiStore: {
    theme: 'light',
    locale: 'zh-CN',
    initFromSystem: vi.fn(),
    setActiveSection: vi.fn()
  },
  mockAuthStore: {
    isLoggedIn: true,
    user: { $id: 'user_1234567890' },
    dbUser: null,
    init: vi.fn().mockResolvedValue(undefined),
    refreshProfile: vi.fn().mockResolvedValue(undefined)
  },
  mockTablesDB: {
    listRows: vi.fn()
  },
  mockPostInteractionsService: {
    getMyLikesForPosts: vi.fn(),
    setMyLikeState: vi.fn(),
    setMySaveState: vi.fn()
  }
}))

vi.mock('@/stores/ui-preferences', () => ({
  useUiPreferencesStore: () => mockUiStore
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore
}))

vi.mock('@/utils/appwrite', () => ({
  tablesDB: mockTablesDB
}))

vi.mock('@/services/post-interactions', () => ({
  default: mockPostInteractionsService
}))

vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => void | Promise<void>) => callback()
}))

function buildInteractions() {
  return {
    rows: [
      { $id: 'save-study', postId: 'post-study', userId: 'user_1234567890', type: 'save' },
      { $id: 'save-life', postId: 'post-life', userId: 'user_1234567890', type: 'save' },
      { $id: 'save-psy', postId: 'post-psychology', userId: 'user_1234567890', type: 'save' }
    ]
  }
}

function buildPosts() {
  return {
    rows: [
      {
        $id: 'post-study',
        authorId: 'user-a',
        isAnonymous: false,
        content: '学习区收藏帖子',
        topic: 'course_review',
        section: 'study',
        status: 'published',
        images: [],
        likeCount: 12,
        commentCount: 3,
        $createdAt: '2026-03-01T08:00:00.000Z',
        $updatedAt: '2026-03-02T08:00:00.000Z'
      },
      {
        $id: 'post-life',
        authorId: 'user-b',
        isAnonymous: false,
        content: '生活区收藏帖子',
        topic: 'activity',
        section: 'life',
        status: 'published',
        images: [],
        likeCount: 5,
        commentCount: 1,
        $createdAt: '2026-03-01T08:00:00.000Z',
        $updatedAt: '2026-03-02T08:00:00.000Z'
      },
      {
        $id: 'post-psychology',
        authorId: 'user-c',
        isAnonymous: true,
        content: '心理区收藏帖子',
        topic: 'mood',
        section: 'psychology',
        status: 'published',
        images: [],
        likeCount: 3,
        commentCount: 2,
        $createdAt: '2026-03-01T08:00:00.000Z',
        $updatedAt: '2026-03-02T08:00:00.000Z'
      }
    ]
  }
}

function buildUsers() {
  return {
    rows: [
      { $id: 'user-a', name: 'Alice', avatar: '/static/avatars/user1.jpg' },
      { $id: 'user-b', name: 'Bob', avatar: '/static/avatars/user2.jpg' }
    ]
  }
}

function mountPage() {
  return mount(MineCollectionsPage, {
    global: {
      stubs: {
        Icon: {
          props: ['name'],
          template: '<i class="icon-stub">{{ name }}</i>'
        }
      }
    }
  })
}

describe('mine collections page', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockAuthStore.isLoggedIn = true
    mockAuthStore.user = { $id: 'user_1234567890' }

    mockTablesDB.listRows.mockImplementation(async (_databaseId: string, tableId: string) => {
      if (tableId === 'post_interactions') {
        return buildInteractions()
      }
      if (tableId === 'posts') {
        return buildPosts()
      }
      if (tableId === 'users') {
        return buildUsers()
      }
      return { rows: [] }
    })

    mockPostInteractionsService.getMyLikesForPosts.mockResolvedValue(new Map())
    mockPostInteractionsService.setMyLikeState.mockResolvedValue({
      liked: true,
      interactionId: 'like-1',
      likeCount: 13
    })
    mockPostInteractionsService.setMySaveState.mockResolvedValue({
      saved: false,
      interactionId: ''
    })

    ;(globalThis as any).uni = {
      showToast: vi.fn(),
      navigateTo: vi.fn(),
      navigateBack: vi.fn(),
      switchTab: vi.fn(),
      hideTabBar: vi.fn(),
      previewImage: vi.fn()
    }
  })

  it('renders guest state when user is not logged in', async () => {
    mockAuthStore.isLoggedIn = false
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('.guest-card').exists()).toBe(true)
    expect(mockTablesDB.listRows).not.toHaveBeenCalled()
  })

  it('loads and renders saved posts from three sections with different card styles', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(mockTablesDB.listRows).toHaveBeenCalled()
    expect(wrapper.find('.collection-card--study').exists()).toBe(true)
    expect(wrapper.find('.collection-card--life').exists()).toBe(true)
    expect(wrapper.find('.collection-card--psychology').exists()).toBe(true)
  })

  it('removes post from list when unsave action is triggered', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.findAll('.collection-card').length).toBe(3)
    await wrapper.find('.action-item.saved').trigger('tap')
    await flushPromises()

    expect(mockPostInteractionsService.setMySaveState).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('.collection-card').length).toBe(2)
  })

  it('navigates to post detail with comment focus when comment button is tapped', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const firstCardActions = wrapper.findAll('.collection-card')[0].findAll('.action-item')
    await firstCardActions[1].trigger('tap')

    expect((globalThis as any).uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/study/post-detail?id=post-study&focus=comment'
    })
  })
})
