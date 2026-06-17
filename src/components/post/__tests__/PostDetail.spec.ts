import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// ---- mock 依赖 ----
vi.mock('@/services/posts', () => ({
  default: {
    getPostById: vi.fn(),
  },
}))
vi.mock('@/services/post-interactions', () => ({
  default: {
    getMyLikeForPost: vi.fn().mockResolvedValue(null),
    getMySaveForPost: vi.fn().mockResolvedValue(null),
    setMyLikeState: vi.fn(),
    setMySaveState: vi.fn(),
  },
}))
vi.mock('@/services/comments', () => ({
  default: {
    listAllCommentsByPost: vi.fn().mockResolvedValue({ rows: [] }),
    createMyComment: vi.fn(),
    updateMyComment: vi.fn(),
    deleteMyComment: vi.fn(),
    setCommentLikeCount: vi.fn(),
  },
}))
vi.mock('@/services/conversations', () => ({
  default: {
    findOrCreateDirectConversation: vi.fn(),
  },
}))
vi.mock('@/utils/appwrite', () => ({
  tablesDB: { listRows: vi.fn().mockResolvedValue({ rows: [] }) },
}))
vi.mock('@/utils/appwrite-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/appwrite-shared')>()
  return {
    ...actual,
    MINDGUARD_DATABASE_ID: 'mindguard',
    USERS_TABLE_ID: 'users',
  }
})
vi.mock('@/utils/auth-guard', () => ({
  redirectToLogin: vi.fn(),
}))

// uni-app 生命周期 stub：onLoad 直接执行回调，注入 query；onPullDownRefresh 不执行
let onLoadQuery: Record<string, unknown> = {}
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (cb: (q: unknown) => void) => cb(onLoadQuery),
  onPullDownRefresh: vi.fn(),
}))

import postsService from '@/services/posts'
import PostDetail from '@/components/post/PostDetail.vue'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { Post } from '@/types/post'

const basePost = {
  $id: 'post-1',
  authorId: 'user-a',
  isAnonymous: false,
  content: '这是一条测试帖子的正文内容',
  topic: 'course_review',
  mood: undefined,
  riskLevel: 1,
  status: 'published',
  images: [],
  likeCount: 3,
  commentCount: 0,
  $createdAt: new Date(Date.now() - 3600_000).toISOString(),
  section: 'study',
} as unknown as Post

/** 等待组件内所有异步 promise 落定（onLoad → loadDetail → loadComments 链） */
async function flushPromises() {
  for (let index = 0; index < 10; index += 1) {
     
    await Promise.resolve()
  }
}

const globalStubs = {
  stubs: {
    Icon: {
      props: ['name', 'size', 'color'],
      template: '<i class="icon-stub" :data-name="name" :data-color="color"></i>',
    },
    // 用非内置元素名避免 Vue reserved-element 警告
    switch: { template: '<div class="switch-stub" />' },
    textarea: { template: '<div class="textarea-stub" />' },
    image: { template: '<div class="image-stub" :data-src="src" />' },
  },
}

function mountWith(
  module: 'study' | 'life' | 'psychology',
  post = basePost,
  query = { id: 'post-1' },
) {
  onLoadQuery = query
  vi.mocked(postsService.getPostById).mockResolvedValue({ ...post })
  return mount(PostDetail, {
    props: { module },
    global: globalStubs,
  })
}

describe('PostDetail 公共组件', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    ;(globalThis as Record<string, unknown>).uni = {
      showToast: vi.fn(),
      showModal: vi.fn(),
      showActionSheet: vi.fn(),
      navigateTo: vi.fn(),
      navigateBack: vi.fn(),
      switchTab: vi.fn(),
      previewImage: vi.fn(),
      stopPullDownRefresh: vi.fn(),
      getStorageSync: vi.fn(() => null),
      setStorageSync: vi.fn(),
      removeStorageSync: vi.fn(),
      // initFromSystem 读取系统信息推断语言/主题，固定为中文浅色
      getSystemInfoSync: vi.fn(() => ({ language: 'zh-CN', theme: 'light' })),
    }
    vi.clearAllMocks()
  })

  it('按 module 应用主题类与页面底色 class', () => {
    const wrapper = mountWith('life')
    const root = wrapper.find('.post-detail-page')
    expect(root.classes()).toContain('module-life')
    expect(root.classes()).toContain('theme-light')
  })

  it('study 渲染默认 meta-chips（badge + context），不出现 mood/risk', async () => {
    const wrapper = mountWith('study')
    await flushPromises()
    const metaTags = wrapper.find('.meta-tags')
    expect(metaTags.text()).toContain('课程评价') // topicLabel → badge
    expect(metaTags.text()).toContain('实名发布') // contextLabel
    expect(metaTags.find('.meta-chip.mood').exists()).toBe(false)
    expect(metaTags.find('.meta-chip.risk').exists()).toBe(false)
  })

  it('psychology 通过 slot 渲染 mood/risk/anonymous chips', async () => {
    const psychPost = {
      ...basePost,
      section: 'psychology',
      topic: 'mood',
      mood: 'anxious',
      riskLevel: 3,
      isAnonymous: true,
    } as unknown as Post
    onLoadQuery = { id: 'post-1' }
    vi.mocked(postsService.getPostById).mockResolvedValue({ ...psychPost })
    const wrapper = mount(PostDetail, {
      props: { module: 'psychology' },
      slots: {
        'meta-chips': `<view class="meta-chip topic">{{ post.topicLabel }}</view>
          <view v-if="post.moodLabel" class="meta-chip mood">{{ post.moodLabel }}</view>
          <view class="meta-chip risk" :class="post.riskTone">{{ post.riskLabel }}</view>
          <view v-if="post.isAnonymous" class="meta-chip anonymous">{{ post.anonymousLabel }}</view>`,
      },
      global: globalStubs,
    })
    await flushPromises()
    const metaTags = wrapper.find('.meta-tags')
    expect(metaTags.find('.meta-chip.mood').exists()).toBe(true)
    expect(metaTags.find('.meta-chip.risk').exists()).toBe(true)
    expect(metaTags.find('.meta-chip.risk.high').exists()).toBe(true)
    expect(metaTags.text()).toContain('焦虑')
    expect(metaTags.text()).toContain('风险 Lv3')
  })

  it('加载失败时显示错误状态卡片', async () => {
    onLoadQuery = { id: 'post-1' }
    vi.mocked(postsService.getPostById).mockRejectedValue(new Error('网络错误'))
    const wrapper = mount(PostDetail, {
      props: { module: 'study' },
      global: globalStubs,
    })
    await flushPromises()
    const errorCard = wrapper.find('.state-card.error')
    expect(errorCard.exists()).toBe(true)
    expect(errorCard.text()).toContain('加载详情失败')
  })

  it('section 不匹配时按模块给出对应错误', async () => {
    onLoadQuery = { id: 'post-1' }
    // study 配置但帖子 section 是 life → 应报 section mismatch
    vi.mocked(postsService.getPostById).mockResolvedValue({ ...basePost, section: 'life' })
    const wrapper = mount(PostDetail, {
      props: { module: 'study' },
      global: globalStubs,
    })
    await flushPromises()
    expect(wrapper.find('.state-card.error').text()).toContain('学习区')
  })
})
