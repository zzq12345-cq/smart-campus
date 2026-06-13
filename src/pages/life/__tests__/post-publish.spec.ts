import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import LifePostPublishPage from '@/pages/life/post-publish.vue'

const { mockUiStore, mockAuthStore, mockPostsService, mockUploadPostImage, mockRequireAuth } = vi.hoisted(() => ({
  mockUiStore: {
    theme: 'light',
    locale: 'zh-CN',
    initFromSystem: vi.fn()
  },
  mockAuthStore: {
    isLoggedIn: true,
    refreshProfile: vi.fn().mockResolvedValue(undefined)
  },
  mockPostsService: {
    createPost: vi.fn()
  },
  mockUploadPostImage: vi.fn(),
  mockRequireAuth: vi.fn(() => true)
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
  uploadPostImage: (...args: unknown[]) => mockUploadPostImage(...args)
}))

vi.mock('@/utils/auth-guard', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args)
}))

vi.mock('@/stores/points', () => ({
  usePointsStore: () => ({
    addPoints: vi.fn().mockResolvedValue(undefined),
    completeDailyTask: vi.fn().mockResolvedValue(undefined)
  })
}))

vi.mock('@dcloudio/uni-app', () => ({
  onShow: vi.fn()
}))

function mountPage() {
  return mount(LifePostPublishPage, {
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

describe('life post publish page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockPostsService.createPost.mockResolvedValue({ $id: 'post-life-1' })
    mockUploadPostImage.mockResolvedValue('https://img.example.com/life-1.jpg')
    ;(globalThis as any).uni = {
      showToast: vi.fn(),
      navigateTo: vi.fn(),
      navigateBack: vi.fn(),
      switchTab: vi.fn(),
      previewImage: vi.fn(),
      chooseImage: vi.fn(({ success }) => success?.({ tempFilePaths: [], tempFiles: [] }))
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders topic chips and submit button', () => {
    const wrapper = mountPage()
    expect(wrapper.findAll('.chip')).toHaveLength(5)
    expect(wrapper.find('.submit-btn').exists()).toBe(true)
  })

  it('prevents submit when content is empty', async () => {
    const wrapper = mountPage()
    await wrapper.find('.submit-btn').trigger('tap')
    expect(mockPostsService.createPost).not.toHaveBeenCalled()
    expect((globalThis as any).uni.showToast).toHaveBeenCalled()
  })

  it('publishes post and navigates back', async () => {
    const wrapper = mountPage()
    await wrapper.find('.composer-input').setValue('生活区发帖测试内容')
    await wrapper.find('.submit-btn').trigger('tap')
    await flushPromises()
    vi.runAllTimers()

    expect(mockPostsService.createPost).toHaveBeenCalledWith({
      content: '生活区发帖测试内容',
      section: 'life',
      topic: 'life_help',
      isAnonymous: false,
      status: 'published',
      images: []
    })
    expect((globalThis as any).uni.switchTab).toHaveBeenCalled()
  })

  it('uploads selected images before publish', async () => {
    ;(globalThis as any).uni.chooseImage = vi.fn(({ success }) =>
      success?.({
        tempFilePaths: ['/tmp/life-image.jpg'],
        tempFiles: [{ path: '/tmp/life-image.jpg' }]
      })
    )

    const wrapper = mountPage()
    await wrapper.find('.draft-add-item').trigger('tap')
    await flushPromises()

    await wrapper.find('.composer-input').setValue('带图发布')
    await wrapper.find('.submit-btn').trigger('tap')
    await flushPromises()

    expect(mockUploadPostImage).toHaveBeenCalledTimes(1)
    expect(mockPostsService.createPost).toHaveBeenCalledWith({
      content: '带图发布',
      section: 'life',
      topic: 'life_help',
      isAnonymous: false,
      status: 'published',
      images: ['https://img.example.com/life-1.jpg']
    })
  })
})
