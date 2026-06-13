import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MinePostsPage from '@/pages/mine/posts.vue'

const { mockUiStore, mockAuthStore, mockPostsService, mockUploadPostImage } = vi.hoisted(() => ({
  mockUiStore: {
    theme: 'light',
    locale: 'zh-CN',
    initFromSystem: vi.fn(),
    setActiveSection: vi.fn()
  },
  mockAuthStore: {
    isLoggedIn: true,
    user: { $id: 'user_1234567890' },
    dbUser: {
      name: 'Alex Chen',
      school: 'Computer Science · 2025',
      avatar: '/static/avatars/user1.jpg'
    },
    init: vi.fn().mockResolvedValue(undefined),
    refreshProfile: vi.fn().mockResolvedValue(undefined)
  },
  mockPostsService: {
    getMyPosts: vi.fn(),
    updateMyPost: vi.fn(),
    deleteMyPost: vi.fn()
  },
  mockUploadPostImage: vi.fn()
}))

vi.mock('@/stores/ui-preferences', () => ({
  useUiPreferencesStore: () => mockUiStore
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore
}))

vi.mock('@/services/posts', () => ({
  default: mockPostsService
}))

vi.mock('@/services/storage', () => ({
  uploadPostImage: mockUploadPostImage
}))

vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => void | Promise<void>) => callback(),
  onHide: vi.fn()
}))

function buildPosts() {
  return [
    {
      $id: 'post-study',
      authorId: 'user_1234567890',
      isAnonymous: false,
      content: 'Study notes are ready for review.',
      topic: 'course_review',
      riskLevel: 0,
      status: 'published',
      section: 'study',
      images: ['/static/posts/study-1.jpg', '/static/posts/study-2.jpg'],
      likeCount: 12,
      commentCount: 3,
      $createdAt: '2026-03-05T08:00:00.000Z',
      $updatedAt: '2026-03-05T09:00:00.000Z'
    },
    {
      $id: 'post-life',
      authorId: 'user_1234567890',
      isAnonymous: false,
      content: 'Rental info is still being refined.',
      topic: 'rental',
      riskLevel: 0,
      status: 'draft',
      section: 'life',
      images: [],
      likeCount: 0,
      commentCount: 0,
      $createdAt: '2026-03-04T08:00:00.000Z',
      $updatedAt: '2026-03-04T09:00:00.000Z'
    },
    {
      $id: 'post-psychology',
      authorId: 'user_1234567890',
      isAnonymous: true,
      content: 'This week feels heavy, but I am adjusting slowly.',
      topic: 'mood',
      riskLevel: 1,
      status: 'pending_review',
      section: 'psychology',
      images: [],
      likeCount: 4,
      commentCount: 1,
      $createdAt: '2026-03-03T08:00:00.000Z',
      $updatedAt: '2026-03-03T09:00:00.000Z'
    }
  ]
}

function mountPage() {
  return mount(MinePostsPage, {
    global: {
      stubs: {
        'scroll-view': {
          template: '<div class="scroll-view-stub"><slot /></div>'
        },
        Icon: {
          props: ['name'],
          template: '<i class="icon-stub">{{ name }}</i>'
        }
      }
    }
  })
}

describe('mine posts page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthStore.isLoggedIn = true
    mockAuthStore.user = { $id: 'user_1234567890' }
    mockAuthStore.dbUser = {
      name: 'Alex Chen',
      school: 'Computer Science · 2025',
      avatar: '/static/avatars/user1.jpg'
    }

    mockPostsService.getMyPosts.mockResolvedValue(buildPosts())
    mockPostsService.updateMyPost.mockImplementation(async (id: string, patch: Record<string, unknown>) => ({
      ...buildPosts()[0],
      $id: id,
      ...patch
    }))
    mockPostsService.deleteMyPost.mockResolvedValue(true)
    mockUploadPostImage.mockResolvedValue('/static/posts/upload-default.jpg')

    ;(globalThis as any).uni = {
      showToast: vi.fn(),
      navigateTo: vi.fn(),
      navigateBack: vi.fn(),
      switchTab: vi.fn(),
      hideTabBar: vi.fn(),
      previewImage: vi.fn(),
      chooseImage: vi.fn(({ success }) => success?.({ tempFilePaths: [], tempFiles: [] })),
      showActionSheet: vi.fn(),
      showModal: vi.fn(({ success }) => success?.({ confirm: true, cancel: false }))
    }
  })

  it('renders guest state when user is not logged in', async () => {
    mockAuthStore.isLoggedIn = false
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('.guest-card').exists()).toBe(true)
    expect(mockPostsService.getMyPosts).not.toHaveBeenCalled()
  })

  it('loads posts from study, life and psychology sections', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(mockPostsService.getMyPosts).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.post-card--study').exists()).toBe(true)
    expect(wrapper.find('.post-card--life').exists()).toBe(true)
    expect(wrapper.find('.post-card--psychology').exists()).toBe(true)
  })

  it('updates post content from inline editor', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('.manage-btn.primary').trigger('tap')
    await wrapper.find('.editor-textarea').setValue('Updated post content')
    await wrapper.find('.editor-btn.solid').trigger('tap')
    await flushPromises()

    expect(mockPostsService.updateMyPost).toHaveBeenCalledWith('post-study', {
      content: 'Updated post content',
      images: ['/static/posts/study-1.jpg', '/static/posts/study-2.jpg']
    })
    expect(mockUploadPostImage).not.toHaveBeenCalled()
  })

  it('supports adding and removing images during inline editing', async () => {
    mockUploadPostImage.mockResolvedValueOnce('/static/posts/uploaded-new.jpg')
    ;(globalThis as any).uni.chooseImage.mockImplementationOnce(({ success }) =>
      success?.({
        tempFilePaths: ['/tmp/new-image.jpg'],
        tempFiles: [{ path: '/tmp/new-image.jpg' }]
      })
    )

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('.manage-btn.primary').trigger('tap')
    await flushPromises()

    expect(wrapper.findAll('.editor-remove-btn')).toHaveLength(2)

    await wrapper.find('.editor-add-item').trigger('tap')
    await flushPromises()
    expect(wrapper.findAll('.editor-remove-btn')).toHaveLength(3)

    await wrapper.findAll('.editor-remove-btn')[0].trigger('tap')
    await flushPromises()
    expect(wrapper.findAll('.editor-remove-btn')).toHaveLength(2)

    await wrapper.find('.editor-btn.solid').trigger('tap')
    await flushPromises()

    expect(mockUploadPostImage).toHaveBeenCalledTimes(1)
    expect(mockPostsService.updateMyPost).toHaveBeenCalledWith('post-study', {
      content: 'Study notes are ready for review.',
      images: ['/static/posts/study-2.jpg', '/static/posts/uploaded-new.jpg']
    })
    expect(wrapper.find('.post-card--study').findAll('.post-image-wrap')).toHaveLength(2)
  })

  it('deletes post after confirmation', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('.manage-btn.danger').trigger('tap')
    await flushPromises()

    expect((globalThis as any).uni.showModal).toHaveBeenCalledTimes(1)
    expect(mockPostsService.deleteMyPost).toHaveBeenCalledWith('post-study')
  })
})
