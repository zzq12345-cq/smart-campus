<template>
  <view :class="['psychology-page', themeClass]">
    <view class="top-bar">
      <view class="left">
        <Icon name="spa" :size="22" color="#886fde" />
        <text class="title">{{ t(I18N_KEYS.psychologyHeaderTitle, uiPreferencesStore.locale) }}</text>
      </view>
      <view class="right">
        <view class="icon-btn" @tap="openSearch">
          <Icon name="search" :size="20" :color="iconColor" />
        </view>
        <view class="icon-btn has-badge" @tap="openMessagesCenter">
          <Icon name="notifications" :size="20" :color="iconColor" />
          <!-- 消息未读紫色小圆点 -->
          <view v-if="visibleUnreadCount > 0" class="icon-badge-dot" />
        </view>
      </view>
    </view>

    <!-- Banner 区域 -->
    <view class="hero-card" @tap="navigateToFeature('/pages/psychology/journal', true)">
      <view class="hero-content">
        <text class="hero-title">{{ t(I18N_KEYS.psychologyHeroTitle, uiPreferencesStore.locale) }}</text>
        <text class="hero-subtitle">{{ t(I18N_KEYS.psychologyHeroSubtitle, uiPreferencesStore.locale) }}</text>
        <!-- 圆角紫色按钮，带右箭头 -->
        <view class="hero-button">
          <text class="hero-button-text">{{ t(I18N_KEYS.psychologyHeroAction, uiPreferencesStore.locale) }}</text>
          <Icon name="chevron_right" :size="16" color="#ffffff" style="margin-left: 4rpx;" />
        </view>
      </view>
    </view>

    <!-- 心理快捷入口标题 -->
    <view class="section-title-row">
      <view class="section-left">
        <Icon name="menu_book" :size="18" color="#886fde" />
        <text class="section-title">{{ t(I18N_KEYS.psychologySectionQuick, uiPreferencesStore.locale) }}</text>
      </view>
    </view>

    <!-- 2x2 快捷入口卡片网格 -->
    <view class="quick-grid">
      <view
        v-for="item in quickActions"
        :key="item.route || item.key"
        class="quick-card"
        @tap="navigateToFeature(item.route, item.available)"
      >
        <!-- 圆形背景图标框 -->
        <view class="quick-icon-wrap" :class="'quick-icon-' + item.key">
          <Icon :name="item.icon" :size="24" :color="getQuickIconColor(item.key)" />
        </view>
        <view class="quick-info">
          <text class="quick-title">{{ item.title }}</text>
          <text class="quick-subtitle">{{ item.subtitle }}</text>
        </view>
        <Icon name="chevron_right" :size="16" color="#cbd5e1" />
      </view>
    </view>

    <!-- 树洞时刻标题栏 -->
    <view class="section-title-row">
      <view class="section-left">
        <Icon name="forum" :size="18" color="#886fde" />
        <text class="section-title">{{ t(I18N_KEYS.psychologySectionFeed, uiPreferencesStore.locale) }}</text>
      </view>
      <!-- 匿名发帖按钮 -->
      <view class="section-action anonym-post-btn" @tap="navigateToFeature('/pages/psychology/post-publish', true)">
        <text style="margin-right: 4rpx;">{{ uiPreferencesStore.locale === 'zh-CN' ? '匿名发帖' : 'Anonymous Post' }}</text>
        <Icon name="edit" :size="14" color="#886fde" />
      </view>
    </view>

    <view class="feed-list">
      <view v-if="loadingPosts && !posts.length" class="state-card">
        <text class="state-text">{{ loadingText }}</text>
      </view>

      <view v-else-if="postsError && !posts.length" class="state-card error">
        <text class="state-text">{{ postsError }}</text>
      </view>

      <view v-else-if="!posts.length" class="state-card">
        <text class="state-text">{{ emptyText }}</text>
      </view>

      <view v-for="post in posts" :key="post.id" class="feed-card" @tap="goPostDetail(post.id)">
        <view class="feed-meta">
          <view class="feed-tags">
            <view class="feed-badge topic">{{ post.topicLabel }}</view>
            <view v-if="post.moodLabel" class="feed-badge mood">{{ post.moodLabel }}</view>
            <view class="feed-badge risk" :class="post.riskTone">{{ post.riskLabel }}</view>
            <view v-if="post.isAnonymous" class="feed-badge anonymous">{{ post.anonymousLabel }}</view>
            <view v-if="post.imageCount > 0" class="feed-badge media">
              <Icon name="image" :size="12" color="#7c69c9" />
              <text>{{ post.imageLabel }}</text>
            </view>
          </view>
          <text class="feed-time">{{ post.time }}</text>
        </view>
        <text class="feed-content">{{ post.content }}</text>
        <view v-if="post.images.length" :class="['feed-images', { single: post.images.length === 1 }]">
          <view
            v-for="(image, index) in post.images.slice(0, 3)"
            :key="`${post.id}-${image}-${index}`"
            class="feed-image-wrap"
            @tap.stop="previewPostImages(post.images, image)"
          >
            <image class="feed-image" :src="image" mode="aspectFill" lazy-load />
            <view v-if="index === 2 && post.images.length > 3" class="more-mask">
              <text class="more-text">+{{ post.images.length - 3 }}</text>
            </view>
          </view>
        </view>
        <view class="feed-footer">
          <view class="author" :class="{ clickable: !post.isAnonymous && post.authorId }" @tap.stop="goAuthorProfile(post)">
            <view class="author-avatar">
              <image
                v-if="post.avatar"
                :src="post.avatar"
                class="avatar-image"
                mode="aspectFill"
                lazy-load
              />
              <Icon
                v-else
                name="person"
                :size="14"
                color="#94a3b8"
              />
            </view>
            <text class="author-text">{{ post.user }}</text>
          </view>
          <view class="feed-actions">
            <view class="action-item" :class="{ active: post.isLiked }" @tap.stop="handleLike(post)">
              <Icon name="favorite" :size="16" :color="post.isLiked ? '#F43F5E' : '#94a3b8'" />
              <text class="footer-text">{{ post.likes }}</text>
            </view>
            <view class="action-item" @tap.stop="goPostDetail(post.id, true)">
              <Icon name="chat_bubble" :size="16" color="#94a3b8" />
              <text class="footer-text">{{ post.comments }}</text>
            </view>
            <view class="action-item compact" :class="{ saved: post.isSaved }" @tap.stop="handleSave(post)">
              <Icon name="bookmark" :size="16" :color="post.isSaved ? '#F59E0B' : '#94a3b8'" />
              <text class="footer-text">{{ post.isSaved ? post.savedLabel : post.saveLabel }}</text>
            </view>
            <view class="action-item compact" @tap.stop="handleCommonAction">
              <Icon name="share" :size="16" color="#94a3b8" />
              <text class="footer-text">{{ post.shareLabel }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="posts.length" class="load-more">
      <text class="load-more-text">{{ loadMoreText }}</text>
    </view>

    <FloatingAiButton v-if="isTabBarVisible" />
    <AppTabBar v-if="isTabBarVisible" value="/pages/psychology/index" />
    <SearchOverlay
      :visible="showSearch"
      current-section="psychology"
      accent-color="#886fde"
      @close="showSearch = false"
      @select-post="onSearchSelectPost"
    />
  </view>
</template>

<script setup lang="ts">
import { Query } from 'appwrite'
import { computed, ref } from 'vue'
import { onHide, onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import postsService from '@/services/posts'
import postInteractionsService from '@/services/post-interactions'
import { useConversations } from '@/composables/useConversations'
import { useNotifications } from '@/composables/useNotifications'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import AppTabBar from '@/components/common/AppTabBar.vue'
import FloatingAiButton from '@/components/common/FloatingAiButton.vue'
import SearchOverlay from '@/components/common/SearchOverlay.vue'
import type { Post, PostSection } from '@/types/post'
import { tablesDB } from '@/utils/appwrite'
import { MINDGUARD_DATABASE_ID, USERS_TABLE_ID } from '@/utils/appwrite-shared'
import { moodLabel as moodLabelHelper, riskLabel as riskLabelHelper } from '@/utils/mood-helpers'
import { requireAuth, redirectToLogin } from '@/utils/auth-guard'

interface FeedPostItem {
  id: string
  authorId: string
  user: string
  avatar: string
  isAnonymous: boolean
  anonymousLabel: string
  time: string
  content: string
  likes: number
  comments: number
  images: string[]
  saveLabel: string
  savedLabel: string
  shareLabel: string
  topicLabel: string
  moodLabel: string
  riskLabel: string
  riskTone: 'low' | 'mid' | 'high'
  imageCount: number
  imageLabel: string
  isLiked: boolean
  likeInteractionId: string
  isSaved: boolean
  saveInteractionId: string
  savePending: boolean
}

interface QuickActionItem {
  key: string
  icon: string
  title: string
  subtitle: string
  route: string
  available: boolean
}

const PAGE_SIZE = 10
const PSYCHOLOGY_TOPICS = ['daily', 'mood', 'relationship', 'future', 'night'] as const
type PsychologyTopic = (typeof PSYCHOLOGY_TOPICS)[number]

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()
const { totalUnreadCount, refreshUnreadCount, startAutoRefresh, stopAutoRefresh } = useConversations()
const { totalUnreadCount: notifUnreadCount, startCountPolling, stopCountPolling } = useNotifications()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8'))
const visibleUnreadCount = computed(() => (authStore.isLoggedIn ? totalUnreadCount.value + notifUnreadCount.value : 0))
const notificationBadgeText = computed(() =>
  visibleUnreadCount.value > 99 ? '99+' : String(visibleUnreadCount.value)
)
const posts = ref<FeedPostItem[]>([])
const loadingPosts = ref(false)
const postsError = ref('')
const nextOffset = ref(0)
const hasMore = ref(true)
const authorNameMap = ref<Record<string, string>>({})
const authorAvatarMap = ref<Record<string, string>>({})
const isTabBarVisible = ref(false)
const showSearch = ref(false)

function isPsychologyTopic(topic?: string): topic is PsychologyTopic {
  return Boolean(topic && (PSYCHOLOGY_TOPICS as readonly string[]).includes(topic))
}

const quickActions = computed<QuickActionItem[]>(() => [
  {
    key: 'journal',
    icon: 'edit_note',
    title: uiPreferencesStore.locale === 'zh-CN' ? '日记' : 'Journal',
    subtitle: uiPreferencesStore.locale === 'zh-CN' ? '情绪记录' : 'Mood diary',
    route: '/pages/psychology/journal',
    available: true
  },
  {
    key: 'counseling',
    icon: 'headset_mic',
    title: t(I18N_KEYS.psychologyQuickCounseling, uiPreferencesStore.locale),
    subtitle: uiPreferencesStore.locale === 'zh-CN' ? '专业支持' : 'Professional counseling',
    route: '/pages/psychology/counseling',
    available: true
  },
  {
    key: 'treehole',
    icon: 'forum',
    title: t(I18N_KEYS.psychologyQuickTreeHole, uiPreferencesStore.locale),
    subtitle: uiPreferencesStore.locale === 'zh-CN' ? '匿名倾诉' : 'Confide anonymously',
    route: '/pages/psychology/treehole',
    available: true
  },
  {
    key: 'evaluation',
    icon: 'quiz',
    title: t(I18N_KEYS.psychologyQuickEvaluation, uiPreferencesStore.locale),
    subtitle: uiPreferencesStore.locale === 'zh-CN' ? '自我评估' : 'Self evaluation',
    route: '/pages/psychology/evaluation',
    available: true
  }
])

const getQuickIconColor = (key: string) => {
  const colors: Record<string, string> = {
    journal: '#886fde',
    counseling: '#3b82f6',
    treehole: '#886fde',
    evaluation: '#3b82f6'
  }
  return colors[key] || '#886fde'
}

const loadingText = computed(() => (uiPreferencesStore.locale === 'zh-CN' ? '加载中...' : 'Loading...'))
const emptyText = computed(() => (uiPreferencesStore.locale === 'zh-CN' ? '还没有公开帖子' : 'No public posts yet'))
const loadMoreText = computed(() => {
  if (loadingPosts.value) {
    return loadingText.value
  }
  if (!hasMore.value) {
    return uiPreferencesStore.locale === 'zh-CN' ? '没有更多内容了' : 'No more posts'
  }
  return uiPreferencesStore.locale === 'zh-CN' ? '上拉加载更多' : 'Pull up to load more'
})

function formatRelativeTime(rawTime?: string) {
  if (!rawTime) {
    return uiPreferencesStore.locale === 'zh-CN' ? '刚刚' : 'Just now'
  }
  const createdAt = new Date(rawTime).getTime()
  if (Number.isNaN(createdAt)) {
    return rawTime
  }
  const diffMs = Date.now() - createdAt
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) {
    return uiPreferencesStore.locale === 'zh-CN' ? '刚刚' : 'Just now'
  }
  if (diffMinutes < 60) {
    return uiPreferencesStore.locale === 'zh-CN' ? `${diffMinutes}分钟前` : `${diffMinutes}m ago`
  }
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return uiPreferencesStore.locale === 'zh-CN' ? `${diffHours}小时前` : `${diffHours}h ago`
  }
  const diffDays = Math.floor(diffHours / 24)
  return uiPreferencesStore.locale === 'zh-CN' ? `${diffDays}天前` : `${diffDays}d ago`
}

function topicLabel(topic?: string) {
  const map: Record<PsychologyTopic, string> = uiPreferencesStore.locale === 'zh-CN'
    ? {
        daily: '日常',
        mood: '心情',
        relationship: '关系',
        future: '未来',
        night: '深夜'
      }
    : {
        daily: 'Daily',
        mood: 'Mood',
        relationship: 'Relationship',
        future: 'Future',
        night: 'Night'
      }
  if (!isPsychologyTopic(topic)) {
    return uiPreferencesStore.locale === 'zh-CN' ? '日常' : 'Daily'
  }
  return map[topic]
}

function riskTone(riskLevel?: number): 'low' | 'mid' | 'high' {
  const raw = Number(riskLevel || 1)
  const level = Math.min(3, Math.max(1, raw))
  if (level >= 3) {
    return 'high'
  }
  if (level === 2) {
    return 'mid'
  }
  return 'low'
}

function imageLabel(count: number) {
  if (uiPreferencesStore.locale === 'zh-CN') {
    return `${count} 图`
  }
  return `${count} img`
}

function previewPostImages(images: string[], current: string) {
  if (!images.length) {
    return
  }
  uni.previewImage({
    urls: images,
    current
  })
}

function goAuthorProfile(post: FeedPostItem) {
  if (post.isAnonymous || !post.authorId) return
  uni.navigateTo({
    url: `/pages/profile/index?userId=${encodeURIComponent(post.authorId)}`
  })
}

function goPostDetail(postId: string, focusComment = false) {
  if (!postId) {
    return
  }
  const query = [`id=${encodeURIComponent(postId)}`]
  if (focusComment) {
    query.push('focus=comment')
  }
  uni.navigateTo({
    url: `/pages/psychology/post-detail?${query.join('&')}`
  })
}

async function resolveAuthorNames(list: Post[]) {
  const missingAuthorIds = Array.from(
    new Set(
      list
        .map((item) => String(item.authorId || '').trim())
        .filter((authorId) => authorId && !authorNameMap.value[authorId])
    )
  )
  if (!missingAuthorIds.length) {
    return
  }

  const resolvedNameMap: Record<string, string> = {}
  const resolvedAvatarMap: Record<string, string> = {}

  try {
    const result = (await tablesDB.listRows(MINDGUARD_DATABASE_ID, USERS_TABLE_ID, [
      Query.limit(Math.max(50, missingAuthorIds.length * 5))
    ])) as { rows?: Array<{ $id?: unknown; name?: unknown; avatar?: unknown }> }

    ;(result?.rows || []).forEach((row) => {
      const userId = String(row?.$id || '').trim()
      const name = typeof row?.name === 'string' ? row.name.trim() : ''
      const avatar = typeof row?.avatar === 'string' ? row.avatar.trim() : ''

      if (userId && missingAuthorIds.includes(userId)) {
        if (name) {
          resolvedNameMap[userId] = name
        }
        if (avatar) {
          resolvedAvatarMap[userId] = avatar
        }
      }
    })
  } catch {
    // ignore and continue with single-row fallback
  }

  const unresolvedAuthorIds = missingAuthorIds.filter(
    (authorId) => !resolvedNameMap[authorId] || !resolvedAvatarMap[authorId]
  )
  if (unresolvedAuthorIds.length) {
    const entries = await Promise.all(
      unresolvedAuthorIds.map(async (authorId) => {
        try {
          const row = (await tablesDB.getRow(MINDGUARD_DATABASE_ID, USERS_TABLE_ID, authorId)) as {
            name?: unknown
            avatar?: unknown
          }
          const name = typeof row?.name === 'string' ? row.name.trim() : ''
          const avatar = typeof row?.avatar === 'string' ? row.avatar.trim() : ''

          return {
            authorId,
            name: name || authorId,
            avatar: avatar || ''
          }
        } catch {
          return {
            authorId,
            name: authorId,
            avatar: ''
          }
        }
      })
    )
    entries.forEach(({ authorId, name, avatar }) => {
      resolvedNameMap[authorId] = name
      if (avatar) {
        resolvedAvatarMap[authorId] = avatar
      }
    })
  }

  if (Object.keys(resolvedNameMap).length || Object.keys(resolvedAvatarMap).length) {
    authorNameMap.value = {
      ...authorNameMap.value,
      ...resolvedNameMap
    }
    authorAvatarMap.value = {
      ...authorAvatarMap.value,
      ...resolvedAvatarMap
    }
  }
}

function mapPostToFeedItem(post: Post): FeedPostItem {
  const anonymousLabel = uiPreferencesStore.locale === 'zh-CN' ? '匿名用户' : 'Anonymous'
  const defaultUserLabel = uiPreferencesStore.locale === 'zh-CN' ? '用户' : 'User'
  const authorId = String(post.authorId || '').trim()
  const displayUser = authorId ? authorNameMap.value[authorId] || authorId : defaultUserLabel
  const displayAvatar = authorId ? authorAvatarMap.value[authorId] || '' : ''
  const images = Array.isArray(post.images)
    ? post.images.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
  const imageCount = images.length

  // 获取点赞状态
  const isLiked = !!(post as any).isLiked
  const likeInteractionId = String((post as any).likeInteractionId || '')
  const isSaved = !!(post as any).isSaved
  const saveInteractionId = String((post as any).saveInteractionId || '')

  return {
    id: String(post.$id || ''),
    authorId,
    user: post.isAnonymous ? anonymousLabel : displayUser,
    avatar: post.isAnonymous ? '' : displayAvatar,
    isAnonymous: Boolean(post.isAnonymous),
    anonymousLabel: uiPreferencesStore.locale === 'zh-CN' ? '匿名' : 'Anon',
    time: formatRelativeTime(post.$createdAt),
    content: String(post.content || ''),
    likes: Number(post.likeCount || 0),
    comments: Number(post.commentCount || 0),
    images,
    saveLabel: uiPreferencesStore.locale === 'zh-CN' ? '收藏' : 'Save',
    savedLabel: uiPreferencesStore.locale === 'zh-CN' ? '已收藏' : 'Saved',
    shareLabel: uiPreferencesStore.locale === 'zh-CN' ? '分享' : 'Share',
    topicLabel: topicLabel(String(post.topic || 'daily')),
    moodLabel: moodLabelHelper(String(post.mood || ''), uiPreferencesStore.locale === 'zh-CN'),
    riskLabel: riskLabelHelper(Number(post.riskLevel || 1), uiPreferencesStore.locale === 'zh-CN'),
    riskTone: riskTone(Number(post.riskLevel || 1)),
    imageCount,
    imageLabel: imageLabel(imageCount),
    isLiked,
    likeInteractionId,
    isSaved,
    saveInteractionId,
    savePending: false
  }
}

let postsLastFetchedAt = 0
const POSTS_REFETCH_INTERVAL = 10_000

async function loadPublicPosts(reset = false) {
  if (loadingPosts.value) {
    return
  }
  if (!hasMore.value && !reset) {
    return
  }
  if (reset && postsLastFetchedAt && Date.now() - postsLastFetchedAt < POSTS_REFETCH_INTERVAL && posts.value.length > 0) {
    return
  }

  loadingPosts.value = true
  postsError.value = ''
  if (reset) {
    nextOffset.value = 0
    hasMore.value = true
  }

  try {
    const result = await postsService.getPublicPosts({
      section: 'psychology',
      status: 'published',
      limit: PAGE_SIZE,
      offset: nextOffset.value
    })
    const visibleResult = result.filter((post) => isPsychologyTopic(String(post.topic || '')))

    // 加载点赞状态
    if (authStore.isLoggedIn && visibleResult.length > 0) {
      const postIds = visibleResult.map((p) => p.$id)
      const [likeMap, saveMap] = await Promise.all([
        postInteractionsService.getMyLikesForPosts(postIds),
        postInteractionsService.getMySavesForPosts(postIds)
      ])

      visibleResult.forEach((post) => {
        const like = likeMap.get(post.$id)
        const save = saveMap.get(post.$id)
        if (like) {
          ;(post as any).isLiked = true
          ;(post as any).likeInteractionId = like.$id
        }
        if (save) {
          ;(post as any).isSaved = true
          ;(post as any).saveInteractionId = save.$id
        }
      })
    }

    await resolveAuthorNames(visibleResult)
    const incoming = visibleResult.map(mapPostToFeedItem)
    
    const isZh = uiPreferencesStore.locale === 'zh-CN'
    const mockPost1: FeedPostItem = {
      id: 'mock-psychology-post-1',
      authorId: '',
      user: isZh ? '匿名用户' : 'Anonymous User',
      avatar: '',
      isAnonymous: true,
      anonymousLabel: isZh ? '匿名' : 'Anon',
      time: isZh ? '10天前' : '10d ago',
      content: isZh 
        ? '最近总觉得有些迷茫，不知道未来的方向在哪里。希望能慢慢找到属于自己的节奏。' 
        : 'Lately I always feel a bit lost, not knowing where the future direction is. Hope I can slowly find my own pace.',
      likes: 12,
      comments: 5,
      images: [],
      saveLabel: isZh ? '收藏' : 'Save',
      savedLabel: isZh ? '已收藏' : 'Saved',
      shareLabel: isZh ? '分享' : 'Share',
      topicLabel: isZh ? '日常' : 'Daily',
      moodLabel: isZh ? '平静' : 'Calm',
      riskLabel: isZh ? '平稳' : 'Stable',
      riskTone: 'low',
      imageCount: 0,
      imageLabel: '',
      isLiked: false,
      likeInteractionId: '',
      isSaved: false,
      saveInteractionId: '',
      savePending: false
    }

    const mockPost2: FeedPostItem = {
      id: 'mock-psychology-post-2',
      authorId: '',
      user: isZh ? '匿名用户' : 'Anonymous User',
      avatar: '',
      isAnonymous: true,
      anonymousLabel: isZh ? '匿名' : 'Anon',
      time: isZh ? '10天前' : '10d ago',
      content: isZh 
        ? '今天和朋友聊了很久，感觉轻松了不少。有时候，倾诉真的会让心里亮堂起来。' 
        : 'Talked with a friend for a long time today, felt a lot lighter. Sometimes, confiding in someone really brightens up the heart.',
      likes: 8,
      comments: 2,
      images: [],
      saveLabel: isZh ? '收藏' : 'Save',
      savedLabel: isZh ? '已收藏' : 'Saved',
      shareLabel: isZh ? '分享' : 'Share',
      topicLabel: isZh ? '日常' : 'Daily',
      moodLabel: isZh ? '平静' : 'Calm',
      riskLabel: isZh ? '平稳' : 'Stable',
      riskTone: 'low',
      imageCount: 0,
      imageLabel: '',
      isLiked: false,
      likeInteractionId: '',
      isSaved: false,
      saveInteractionId: '',
      savePending: false
    }

    posts.value = reset ? [mockPost1, mockPost2, ...incoming] : [...posts.value, ...incoming]
    nextOffset.value += result.length
    hasMore.value = result.length >= PAGE_SIZE
    if (reset) postsLastFetchedAt = Date.now()
  } catch (error) {
    console.error('Load psychology feed failed:', error)
    postsError.value =
      uiPreferencesStore.locale === 'zh-CN' ? '加载帖子失败，请稍后重试' : 'Failed to load posts. Please retry.'
    uni.showToast({
      title: postsError.value,
      icon: 'none'
    })
  } finally {
    loadingPosts.value = false
  }
}

function handleCommonAction() {
  uni.showToast({
    title: t(I18N_KEYS.commonComingSoon, uiPreferencesStore.locale),
    icon: 'none'
  })
}

function openSearch() {
  showSearch.value = true
}

function openMessagesCenter() {
  if (!requireAuth('/pages/psychology/index')) {
    return
  }
  uni.navigateTo({
    url: '/pages/messages/index'
  })
}

function onSearchSelectPost(payload: { postId: string; section: PostSection }) {
  showSearch.value = false
  if (!payload.postId) return
  uni.navigateTo({
    url: `/pages/${payload.section}/post-detail?id=${encodeURIComponent(payload.postId)}`
  })
}

async function handleLike(post: FeedPostItem) {
  if (!authStore.isLoggedIn) {
    uni.showToast({
      title: uiPreferencesStore.locale === 'zh-CN' ? '请先登录' : 'Please login first',
      icon: 'none'
    })
    redirectToLogin()
    return
  }

  const prevLiked = post.isLiked
  const prevCount = post.likes
  const prevInteractionId = post.likeInteractionId

  // 乐观更新 UI
  post.isLiked = !prevLiked
  post.likes = Math.max(0, prevCount + (post.isLiked ? 1 : -1))

  uni.showToast({
    title: post.isLiked
      ? uiPreferencesStore.locale === 'zh-CN'
        ? '温暖 +1'
        : 'Liked'
      : uiPreferencesStore.locale === 'zh-CN'
        ? '已取消'
        : 'Unliked',
    icon: 'none'
  })

  try {
    const result = await postInteractionsService.setMyLikeState(
      post.id,
      post.isLiked,
      prevInteractionId
    )

    if (result && typeof result.liked === 'boolean') {
      post.isLiked = result.liked
    }
    if (typeof result?.interactionId === 'string') {
      post.likeInteractionId = result.interactionId
    }
    if (typeof result?.likeCount === 'number') {
      post.likes = result.likeCount
    }

    if (
      result?.counterUpdated === false &&
      (result?.counterErrorCode === 401 || result?.counterErrorCode === 403)
    ) {
      setTimeout(() => {
        uni.showToast({
          title: uiPreferencesStore.locale === 'zh-CN'
            ? '点赞已记录，但无权限更新计数'
            : 'Like recorded but no permission to update count',
          icon: 'none'
        })
      }, 350)
    }
  } catch (error) {
    // 回滚乐观更新
    post.isLiked = prevLiked
    post.likes = prevCount
    post.likeInteractionId = prevInteractionId

    const errorMessage = error instanceof Error ? error.message : String(error)
    uni.showToast({
      title: errorMessage || (uiPreferencesStore.locale === 'zh-CN' ? '操作失败' : 'Operation failed'),
      icon: 'none'
    })
  }
}

async function handleSave(post: FeedPostItem) {
  if (!authStore.isLoggedIn) {
    uni.showToast({
      title: uiPreferencesStore.locale === 'zh-CN' ? '请先登录' : 'Please login first',
      icon: 'none'
    })
    redirectToLogin()
    return
  }

  if (post.savePending) {
    return
  }

  const prevSaved = post.isSaved
  const prevInteractionId = post.saveInteractionId

  post.savePending = true
  post.isSaved = !prevSaved

  uni.showToast({
    title: post.isSaved
      ? uiPreferencesStore.locale === 'zh-CN'
        ? '已收藏'
        : 'Saved'
      : uiPreferencesStore.locale === 'zh-CN'
        ? '已取消收藏'
        : 'Unsaved',
    icon: 'none'
  })

  try {
    const result = await postInteractionsService.setMySaveState(
      post.id,
      post.isSaved,
      prevInteractionId
    )

    if (typeof result?.saved === 'boolean') {
      post.isSaved = result.saved
    }
    if (typeof result?.interactionId === 'string') {
      post.saveInteractionId = result.interactionId
    }
  } catch (error) {
    post.isSaved = prevSaved
    post.saveInteractionId = prevInteractionId

    const errorMessage = error instanceof Error ? error.message : String(error)
    uni.showToast({
      title: errorMessage || (uiPreferencesStore.locale === 'zh-CN' ? '操作失败' : 'Operation failed'),
      icon: 'none'
    })
  } finally {
    post.savePending = false
  }
}

function navigateToFeature(route: string, available = true) {
  if (!requireAuth('/pages/psychology/index')) {
    return
  }
  if (!available || !route) {
    handleCommonAction()
    return
  }
  uni.navigateTo({
    url: route,
    fail: () => {
      handleCommonAction()
    }
  })
}

function hideNativeTabBar() {
  if (typeof uni?.hideTabBar !== 'function') {
    return
  }
  uni.hideTabBar({
    animation: false
  })
}

onShow(async () => {
  isTabBarVisible.value = true
  hideNativeTabBar()
  uiPreferencesStore.initFromSystem()
  uiPreferencesStore.setActiveSection('psychology')

  if (!requireAuth('/pages/psychology/index')) {
    stopAutoRefresh()
    stopCountPolling()
    return
  }
  await authStore.refreshProfile()
  await refreshUnreadCount().catch(() => undefined)
  startAutoRefresh(15000)
  startCountPolling(15000)
  await loadPublicPosts(true)
})

onPullDownRefresh(async () => {
  if (requireAuth('/pages/psychology/index')) {
    await loadPublicPosts(true)
  }
  uni.stopPullDownRefresh()
})

onReachBottom(async () => {
  await loadPublicPosts(false)
})

onHide(() => {
  isTabBarVisible.value = false
  stopAutoRefresh()
  stopCountPolling()
})
</script>

<style lang="scss" scoped>
.psychology-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 176rpx;
  background: var(--page-bg);
}

.icon-btn.has-badge {
  position: relative;
}

.icon-badge {
  position: absolute;
  top: -8rpx;
  right: -6rpx;
  min-width: 30rpx;
  height: 30rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  background: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    color: #ffffff;
    font-size: 18rpx;
    font-weight: 700;
    line-height: 1;
  }
}

.icon-badge-dot {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #886fde;
  border: 2rpx solid #ffffff;
}

.theme-light {
  --page-bg: linear-gradient(180deg, #f3f0fc 0%, #faf8fe 35%, #ffffff 100%);
  --glass-bg: rgba(255, 255, 255, 0.68);
  --glass-border: rgba(255, 255, 255, 0.78);
  --glass-shadow: 0 4rpx 14rpx rgba(31, 38, 135, 0.05);
  --surface: rgba(255, 255, 255, 0.68);
  --text-main: #1e293b;
  --text-sub: #64748b;
  --text-soft: #64748b;
  --line: rgba(255, 255, 255, 0.78);
  --topbar-bg: transparent;
}

.theme-dark {
  --page-bg: linear-gradient(180deg, #15131f 0%, #1a1525 35%, #15131f 100%);
  --glass-bg: rgba(30, 41, 59, 0.55);
  --glass-border: rgba(255, 255, 255, 0.10);
  --glass-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.20);
  --surface: rgba(30, 41, 59, 0.55);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --line: rgba(255, 255, 255, 0.10);
  --topbar-bg: transparent;
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--topbar-bg);
  backdrop-filter: blur(14px);

  .left {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  .title {
    color: var(--text-main);
    font-size: 34rpx;
    font-weight: 700;
  }

  .right {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    opacity: 0.7;
  }
}

.hero-card {
  margin-top: 12rpx;
  height: 272rpx;
  border-radius: 36rpx;
  padding: 40rpx 40rpx 40rpx 32rpx;
  background-image: url('/static/psychology_banner_full.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-shadow: 0 8rpx 28rpx rgba(136, 111, 222, 0.08);
  overflow: hidden;
  display: flex;
  align-items: center;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.98);
  }
}

.hero-content {
  width: 58%;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  position: relative;
  z-index: 2;
}

.hero-title {
  color: #0f172a;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.24;
  white-space: nowrap;
}

.hero-subtitle {
  color: #475569;
  font-size: 20rpx;
  line-height: 1.45;
  white-space: nowrap;
  letter-spacing: -0.2rpx;
}

.hero-button {
  align-self: flex-start;
  border-radius: 999rpx;
  padding: 16rpx 28rpx;
  background: #886fde;
  display: flex;
  align-items: center;
  margin-top: 8rpx;
}

.hero-button-text {
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 600;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
  margin-top: 12rpx;
}

.quick-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 24rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
  box-shadow: var(--glass-shadow);
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.98);
  }
}

.quick-icon-wrap {
  width: 76rpx;
  height: 76rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.quick-icon-journal {
    background: rgba(136, 111, 222, 0.12);
  }
  &.quick-icon-counseling {
    background: rgba(37, 99, 235, 0.08);
  }
  &.quick-icon-treehole {
    background: rgba(136, 111, 222, 0.12);
  }
  &.quick-icon-evaluation {
    background: rgba(37, 99, 235, 0.08);
  }
}

.quick-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.quick-title {
  color: var(--text-main);
  font-size: 26rpx;
  font-weight: 700;
}

.quick-subtitle {
  color: var(--text-soft);
  font-size: 20rpx;
}

.section-title-row {
  margin-top: 34rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-left {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.section-title {
  color: var(--text-main);
  font-size: 34rpx;
  font-weight: 700;
}

.anonym-post-btn {
  color: #886fde;
  font-size: 24rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4rpx;

  &:active {
    opacity: 0.7;
  }
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.feed-card {
  border: 1px solid rgba(136, 111, 222, 0.22);
  border-radius: 26rpx;
  background: var(--surface);
  padding: 24rpx;
  box-shadow: 0 10rpx 22rpx rgba(136, 111, 222, 0.08);
}

.feed-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.feed-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
}

.feed-badge {
  min-height: 40rpx;
  border-radius: 999rpx;
  padding: 0 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  font-size: 20rpx;
  font-weight: 600;
}

.feed-badge.topic {
  background: rgba(136, 111, 222, 0.16);
  color: #7359d3;
}

.feed-badge.mood {
  background: rgba(59, 130, 246, 0.14);
  color: #2563eb;
}

.feed-badge.risk.low {
  background: rgba(16, 185, 129, 0.14);
  color: #059669;
}

.feed-badge.risk.mid {
  background: rgba(245, 158, 11, 0.16);
  color: #d97706;
}

.feed-badge.risk.high {
  background: rgba(239, 68, 68, 0.16);
  color: #dc2626;
}

.feed-badge.media {
  background: rgba(136, 111, 222, 0.08);
  color: #7c69c9;
}

.feed-badge.anonymous {
  background: rgba(148, 163, 184, 0.16);
  color: #64748b;
}

.feed-time {
  color: var(--text-soft);
  font-size: 22rpx;
}

.feed-content {
  margin-top: 14rpx;
  display: block;
  color: var(--text-main);
  font-size: 26rpx;
  line-height: 1.6;
}

.feed-images {
  margin-top: 14rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10rpx;
}

.feed-images.single {
  grid-template-columns: minmax(0, 1fr);
}

.feed-image-wrap {
  position: relative;
  height: 176rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: rgba(136, 111, 222, 0.08);
}

.feed-images.single .feed-image-wrap {
  height: 320rpx;
}

.feed-image {
  width: 100%;
  height: 100%;
}

.more-mask {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
}

.more-text {
  color: #f8fafc;
  font-size: 30rpx;
  font-weight: 700;
}

.feed-footer {
  margin-top: 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14rpx;
  border-top: 1px dashed var(--line);
}

.author {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.author-avatar {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(136, 111, 222, 0.08);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.author.clickable {
  &:active {
    opacity: 0.7;
  }
}

.author-text {
  color: var(--text-sub);
  font-size: 22rpx;
}

.feed-actions {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 6rpx;

  &:active {
    opacity: 0.7;
  }
}

.action-item.active .footer-text {
  color: #F43F5E;
}

.action-item.saved .footer-text {
  color: #F59E0B;
}

.action-item.compact {
  gap: 4rpx;
}

.footer-text {
  color: var(--text-soft);
  font-size: 22rpx;
}

.state-card {
  border: 1px dashed var(--line);
  border-radius: 24rpx;
  background: var(--surface);
  padding: 32rpx 24rpx;
  text-align: center;
}

.state-card.error {
  border-color: rgba(239, 68, 68, 0.3);
}

.state-text {
  color: var(--text-sub);
  font-size: 24rpx;
}

.load-more {
  padding: 20rpx 0 10rpx;
  text-align: center;
}

.load-more-text {
  color: var(--text-soft);
  font-size: 22rpx;
}
</style>
