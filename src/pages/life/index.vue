<template>
  <view :class="['life-page', themeClass]">
    <!-- 顶部状态栏 -->
    <view class="top-bar">
      <view class="left">
        <Icon name="shopping_bag" :size="22" color="#f49d25" />
        <text class="title">{{ pageData.headerTitle }}</text>
      </view>
      <view class="right">
        <view class="icon-btn" @tap="openSearch">
          <Icon name="search" :size="20" :color="iconColor" />
        </view>
        <view class="icon-btn has-badge" @tap="openMessagesCenter">
          <Icon name="notifications" :size="20" :color="iconColor" />
          <!-- 消息未读橘黄色圆点 -->
          <view v-if="visibleUnreadCount > 0" class="icon-badge-dot" />
        </view>
      </view>
    </view>

    <!-- Banner 区域 -->
    <view class="hero-card">
      <view class="hero-content">
        <text class="hero-title">{{ pageData.heroTitle }}</text>
        <text class="hero-subtitle">{{ pageData.heroSubtitle }}</text>
        <view class="hero-decor-line" />
      </view>
    </view>

    <!-- 生活快捷入口 -->
    <view class="section-title-row">
      <view class="section-left">
        <Icon name="menu_book" :size="18" color="#f49d25" />
        <text class="section-title">{{ pageData.quickTitle }}</text>
      </view>
    </view>

    <!-- 2x2 快捷入口网格 -->
    <view class="quick-grid">
      <view
        v-for="(item, index) in pageData.quickActions"
        :key="index"
        class="quick-card"
        @tap="handleQuickAction(item.icon)"
      >
        <view class="quick-icon-wrap" :class="item.icon">
          <Icon :name="item.icon" :size="24" :color="iconAccentColor(item.icon)" />
        </view>
        <view class="quick-info">
          <text class="quick-title">{{ item.title }}</text>
          <text class="quick-subtitle">{{ item.subtitle }}</text>
        </view>
        <Icon name="chevron_right" :size="16" color="#cbd5e1" />
      </view>
    </view>

    <!-- 校园生活动态标题栏 -->
    <view class="section-title-row">
      <view class="section-left">
        <Icon name="forum" :size="18" color="#f49d25" />
        <text class="section-title">{{ pageData.feedTitle }}</text>
      </view>
      <view class="section-action-btn section-action" @tap="goPublishPage">
        <text class="section-action-text">{{ pageData.feedAction }}</text>
        <Icon name="chevron_right" :size="14" color="#f49d25" />
      </view>
    </view>

    <!-- 动态列表 -->
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
            <!-- 话题标签 -->
            <view class="feed-badge topic">{{ post.badge }}</view>
            <!-- 身份/发布方式标签 -->
            <view class="feed-badge context">
              <Icon name="person" :size="12" color="#f49d25" />
              <text>{{ post.contextLabel }}</text>
            </view>
            <!-- 媒体图片标签 -->
            <view v-if="post.imageCount > 0" class="feed-badge media">
              <Icon name="image" :size="12" color="#f49d25" />
              <text>{{ post.imageLabel }}</text>
            </view>
          </view>
          <text class="feed-time">{{ post.time }}</text>
        </view>
        <text class="feed-content">{{ post.content }}</text>
        <!-- 图片展示，支持单张、两张和多张图的网格渲染 -->
        <view 
          v-if="post.images.length" 
          :class="[
            'feed-images', 
            { 
              single: post.images.length === 1, 
              double: post.images.length === 2, 
              triple: post.images.length >= 3 
            }
          ]"
        >
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
        <!-- 卡片底部作者信息与操作 -->
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
              <text class="footer-text">{{ post.likeCount }}</text>
            </view>
            <view class="action-item" @tap.stop="goPostDetail(post.id, true)">
              <Icon name="chat_bubble" :size="16" color="#94a3b8" />
              <text class="footer-text">{{ post.commentCount }}</text>
            </view>
            <view class="action-item compact" :class="{ saved: post.isSaved }" @tap.stop="handleSave(post)">
              <Icon name="bookmark" :size="16" :color="post.isSaved ? '#F59E0B' : '#94a3b8'" />
              <text class="footer-text">{{ post.isSaved ? savedLabel : saveLabel }}</text>
            </view>
            <view class="action-item compact" @tap.stop="handleCommonAction">
              <Icon name="share" :size="16" color="#94a3b8" />
              <text class="footer-text">{{ shareLabel }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 悬浮 AI 助手与底栏 -->
    <FloatingAiButton v-if="isTabBarVisible" />
    <AppTabBar v-if="isTabBarVisible" value="/pages/life/index" />
    <SearchOverlay
      :visible="showSearch"
      current-section="life"
      accent-color="#f49d25"
      @close="showSearch = false"
      @select-post="onSearchSelectPost"
    />
  </view>
</template>

<script setup lang="ts">
import { Query } from 'appwrite'
import { computed, ref } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import { I18N_KEYS } from '@/i18n/keys'
import { t } from '@/i18n'
import { getPageData as getLifePageData } from '@/mocks/pages/life'
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
import { requireAuth, redirectToLogin } from '@/utils/auth-guard'
import { tablesDB } from '@/utils/appwrite'
import { MINDGUARD_DATABASE_ID, USERS_TABLE_ID } from '@/utils/appwrite-shared'
import { getCached, setCache } from '@/utils/posts-cache'

const LIFE_TOPICS = ['life_help', 'second_hand', 'activity', 'job', 'rental'] as const
type LifeTopic = (typeof LIFE_TOPICS)[number]

interface LifeFeedPost {
  id: string
  authorId: string
  isAnonymous: boolean
  badge: string
  time: string
  content: string
  user: string
  avatar: string
  contextLabel: string
  likeCount: number
  commentCount: number
  images: string[]
  imageCount: number
  imageLabel: string
  isLiked: boolean
  likeInteractionId: string
  likePending: boolean
  isSaved: boolean
  saveInteractionId: string
  savePending: boolean
}

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()
const { totalUnreadCount, refreshUnreadCount, startAutoRefresh, stopAutoRefresh } = useConversations()
const { totalUnreadCount: notifUnreadCount, startCountPolling, stopCountPolling } = useNotifications()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const pageData = computed(() => getLifePageData(uiPreferencesStore.locale))
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#334155' : '#cbd5e1'))
const hasQuickOverflow = computed(() => pageData.value.quickActions.length > 4)
const isTabBarVisible = ref(false)
const showSearch = ref(false)
const visibleUnreadCount = computed(() => (authStore.isLoggedIn ? totalUnreadCount.value + notifUnreadCount.value : 0))
const notificationBadgeText = computed(() =>
  visibleUnreadCount.value > 99 ? '99+' : String(visibleUnreadCount.value)
)
const posts = ref<LifeFeedPost[]>([])
const loadingPosts = ref(false)
const postsError = ref('')
const authorNameMap = ref<Record<string, string>>({})
const authorAvatarMap = ref<Record<string, string>>({})
const saveLabel = computed(() => t(I18N_KEYS.commonSave, uiPreferencesStore.locale))
const savedLabel = computed(() => (isZh.value ? '已收藏' : 'Saved'))
const shareLabel = computed(() => t(I18N_KEYS.commonShare, uiPreferencesStore.locale))
const loadingText = computed(() => t(I18N_KEYS.commonLoading, uiPreferencesStore.locale))
const emptyText = computed(() => t(I18N_KEYS.lifeFeedEmpty, uiPreferencesStore.locale))

const isLifeTopic = (topic?: string): topic is LifeTopic =>
  Boolean(topic && (LIFE_TOPICS as readonly string[]).includes(topic))

const formatRelativeTime = (rawTime?: string) => {
  if (!rawTime) {
    return t(I18N_KEYS.commonTimeJustNow, uiPreferencesStore.locale)
  }
  const createdAt = new Date(rawTime).getTime()
  if (Number.isNaN(createdAt)) {
    return rawTime
  }
  const diffMs = Date.now() - createdAt
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) {
    return t(I18N_KEYS.commonTimeJustNow, uiPreferencesStore.locale)
  }
  if (diffMinutes < 60) {
    return t(I18N_KEYS.commonTimeMinutesAgo, uiPreferencesStore.locale, { count: diffMinutes })
  }
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return t(I18N_KEYS.commonTimeHoursAgo, uiPreferencesStore.locale, { count: diffHours })
  }
  const diffDays = Math.floor(diffHours / 24)
  return t(I18N_KEYS.commonTimeDaysAgo, uiPreferencesStore.locale, { count: diffDays })
}

const topicLabel = (topic?: string) => {
  const map: Record<LifeTopic, I18N_KEYS> = {
    life_help: I18N_KEYS.lifeTopicLifeHelp,
    second_hand: I18N_KEYS.lifeTopicSecondHand,
    activity: I18N_KEYS.lifeTopicActivity,
    job: I18N_KEYS.lifeTopicJob,
    rental: I18N_KEYS.lifeTopicRental
  }
  if (!isLifeTopic(topic)) {
    return t(I18N_KEYS.lifeTopicDefault, uiPreferencesStore.locale)
  }
  return t(map[topic], uiPreferencesStore.locale)
}

const resolveAuthorNames = async (list: Post[]) => {
  const ids = Array.from(
    new Set(
      list
        .filter((item) => !item.isAnonymous)
        .map((item) => String(item.authorId || '').trim())
        .filter(Boolean)
    )
  )
  if (!ids.length) {
    return
  }
  try {
    const result = await tablesDB.listRows(
      MINDGUARD_DATABASE_ID,
      USERS_TABLE_ID,
      [Query.equal('$id', ids), Query.limit(ids.length)]
    )
    const resolvedNameMap: Record<string, string> = {}
    const resolvedAvatarMap: Record<string, string> = {}
    for (const row of result.rows || []) {
      const userId = String((row as Record<string, unknown>).$id || '').trim()
      const name = String((row as Record<string, unknown>).name || '').trim()
      const avatar = String((row as Record<string, unknown>).avatar || '').trim()
      if (userId) {
        resolvedNameMap[userId] = name || userId
        if (avatar) {
          resolvedAvatarMap[userId] = avatar
        }
      }
    }
    authorNameMap.value = {
      ...authorNameMap.value,
      ...resolvedNameMap
    }
    authorAvatarMap.value = {
      ...authorAvatarMap.value,
      ...resolvedAvatarMap
    }
  } catch (error) {
    console.error('Resolve life author names failed:', error)
  }
}

const mapPostToFeedItem = (post: Post): LifeFeedPost => {
  const anonymousLabel = t(I18N_KEYS.commonAnonymous, uiPreferencesStore.locale)
  const defaultUserLabel = t(I18N_KEYS.commonCampusUser, uiPreferencesStore.locale)
  const authorId = String(post.authorId || '').trim()
  const user = post.isAnonymous ? anonymousLabel : authorNameMap.value[authorId] || authorId || defaultUserLabel
  const avatar = post.isAnonymous ? '' : authorAvatarMap.value[authorId] || ''
  const images = Array.isArray(post.images)
    ? post.images.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
  const imageCount = images.length
  const isLiked = Boolean((post as { isLiked?: unknown }).isLiked)
  const likeInteractionId = String((post as { likeInteractionId?: unknown }).likeInteractionId || '')
  const isSaved = Boolean((post as { isSaved?: unknown }).isSaved)
  const saveInteractionId = String((post as { saveInteractionId?: unknown }).saveInteractionId || '')
  return {
    id: String(post.$id || ''),
    authorId,
    isAnonymous: Boolean(post.isAnonymous),
    badge: topicLabel(String(post.topic || '')),
    time: formatRelativeTime(post.$createdAt),
    content: String(post.content || ''),
    user,
    avatar,
    contextLabel: post.isAnonymous
      ? t(I18N_KEYS.commonAnonymousPost, uiPreferencesStore.locale)
      : t(I18N_KEYS.commonNamedPost, uiPreferencesStore.locale),
    likeCount: Number(post.likeCount || 0),
    commentCount: Number(post.commentCount || 0),
    images,
    imageCount,
    imageLabel: t(I18N_KEYS.commonImages, uiPreferencesStore.locale, { count: imageCount }),
    isLiked,
    likeInteractionId,
    likePending: false,
    isSaved,
    saveInteractionId,
    savePending: false
  }
}


const QUICK_ACTION_ROUTES: Record<string, string> = {
  storefront: '/pages/life/market/index',
  celebration: '/pages/life/events/index',
  work: '/pages/life/jobs/index',
  meeting_room: '/pages/life/venues/index'
}

const iconAccentColor = (icon: string) => {
  const colors: Record<string, string> = {
    storefront: '#e28704',
    celebration: '#e2ab04',
    work: '#e28704',
    meeting_room: '#e28704'
  }
  return colors[icon] || '#e28704'
}

const handleQuickAction = (icon: string) => {
  const route = QUICK_ACTION_ROUTES[icon]
  if (route) {
    uni.navigateTo({ url: route })
  } else {
    handleCommonAction()
  }
}

const handleCommonAction = () => {
  uni.showToast({
    title: t(I18N_KEYS.commonComingSoon, uiPreferencesStore.locale),
    icon: 'none'
  })
}

const openSearch = () => {
  showSearch.value = true
}

const openMessagesCenter = () => {
  if (!requireAuth('/pages/life/index')) {
    return
  }
  uni.navigateTo({
    url: '/pages/messages/index'
  })
}

const onSearchSelectPost = (payload: { postId: string; section: PostSection }) => {
  showSearch.value = false
  if (!payload.postId) return
  uni.navigateTo({
    url: `/pages/${payload.section}/post-detail?id=${encodeURIComponent(payload.postId)}`
  })
}

const goPublishPage = () => {
  if (!requireAuth('/pages/life/index')) {
    return
  }
  uni.navigateTo({
    url: '/pages/life/post-publish'
  })
}

const handleLike = async (post: LifeFeedPost) => {
  if (!authStore.isLoggedIn) {
    uni.showToast({
      title: isZh.value ? '请先登录' : 'Please login first',
      icon: 'none'
    })
    redirectToLogin()
    return
  }

  if (post.likePending) {
    return
  }

  const prevLiked = post.isLiked
  const prevCount = post.likeCount
  const prevInteractionId = post.likeInteractionId

  post.likePending = true
  post.isLiked = !prevLiked
  post.likeCount = Math.max(0, prevCount + (post.isLiked ? 1 : -1))

  uni.showToast({
    title: post.isLiked
      ? isZh.value
        ? '温暖 +1'
        : 'Liked'
      : isZh.value
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

    if (typeof result?.liked === 'boolean') {
      post.isLiked = result.liked
    }
    if (typeof result?.interactionId === 'string') {
      post.likeInteractionId = result.interactionId
    }
    if (typeof result?.likeCount === 'number') {
      post.likeCount = result.likeCount
    }

    if (
      result?.counterUpdated === false &&
      (result?.counterErrorCode === 401 || result?.counterErrorCode === 403)
    ) {
      setTimeout(() => {
        uni.showToast({
          title: isZh.value
            ? '点赞已记录，但无权限更新计数'
            : 'Like recorded but no permission to update count',
          icon: 'none'
        })
      }, 350)
    }
  } catch (error) {
    post.isLiked = prevLiked
    post.likeCount = prevCount
    post.likeInteractionId = prevInteractionId

    const errorMessage = error instanceof Error ? error.message : String(error)
    uni.showToast({
      title: errorMessage || (isZh.value ? '操作失败' : 'Operation failed'),
      icon: 'none'
    })
  } finally {
    post.likePending = false
  }
}

const handleSave = async (post: LifeFeedPost) => {
  if (!authStore.isLoggedIn) {
    uni.showToast({
      title: isZh.value ? '请先登录' : 'Please login first',
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
      ? isZh.value
        ? '已收藏'
        : 'Saved'
      : isZh.value
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
      title: errorMessage || (isZh.value ? '操作失败' : 'Operation failed'),
      icon: 'none'
    })
  } finally {
    post.savePending = false
  }
}

const previewPostImages = (images: string[], current: string) => {
  if (!images.length) {
    return
  }
  uni.previewImage({
    urls: images,
    current
  })
}

const goAuthorProfile = (post: LifeFeedPost) => {
  if (post.isAnonymous || !post.authorId) return
  uni.navigateTo({
    url: `/pages/profile/index?userId=${encodeURIComponent(post.authorId)}`
  })
}

const goPostDetail = (postId: string, focusComment = false) => {
  if (!postId) {
    return
  }
  const query = [`id=${encodeURIComponent(postId)}`]
  if (focusComment) {
    query.push('focus=comment')
  }
  uni.navigateTo({
    url: `/pages/life/post-detail?${query.join('&')}`
  })
}

let postsLastFetchedAt = 0
const POSTS_REFETCH_INTERVAL = 10_000

const loadLifePosts = async (force = false) => {
  if (!force && postsLastFetchedAt && Date.now() - postsLastFetchedAt < POSTS_REFETCH_INTERVAL) {
    return
  }
  const cached = getCached<LifeFeedPost[]>('life-posts')
  if (cached) {
    posts.value = cached
  }
  loadingPosts.value = !cached
  postsError.value = ''
  try {
    const result = await postsService.getPublicPosts({
      section: 'life',
      status: 'published',
      limit: 50
    })
    const visiblePosts = result.filter((post) => isLifeTopic(String(post.topic || '')))

    if (authStore.isLoggedIn && visiblePosts.length > 0) {
      const postIds = visiblePosts.map((item) => item.$id)
      const [likeMap, saveMap] = await Promise.all([
        postInteractionsService.getMyLikesForPosts(postIds),
        postInteractionsService.getMySavesForPosts(postIds)
      ])
      visiblePosts.forEach((item) => {
        const like = likeMap.get(item.$id)
        const save = saveMap.get(item.$id)
        if (like) {
          ;(item as { isLiked?: boolean }).isLiked = true
          ;(item as { likeInteractionId?: string }).likeInteractionId = like.$id
        }
        if (save) {
          ;(item as { isSaved?: boolean }).isSaved = true
          ;(item as { saveInteractionId?: string }).saveInteractionId = save.$id
        }
      })
    }

    await resolveAuthorNames(visiblePosts)
    const feedItems = visiblePosts.map(mapPostToFeedItem)
    
    // 注入效果图里的精美 Mock 帖子
    const mockPost: LifeFeedPost = {
      id: 'mock-music-festival-post',
      authorId: 'anonymous-user-id',
      isAnonymous: true,
      badge: isZh.value ? '校园活动' : 'Campus Event',
      time: isZh.value ? '99天前' : '99 days ago',
      content: isZh.value 
        ? '周末草坪音乐夜招募志愿者，负责签到与秩序维护。' 
        : 'Volunteers wanted for the weekend lawn music night, responsible for check-in and order maintenance.',
      user: isZh.value ? '匿名用户' : 'Anonymous User',
      avatar: '',
      contextLabel: isZh.value ? '匿名发布' : 'Anonymous Post',
      likeCount: 33,
      commentCount: 8,
      images: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80'
      ],
      imageCount: 2,
      imageLabel: isZh.value ? '2 图' : '2 Images',
      isLiked: false,
      likeInteractionId: '',
      likePending: false,
      isSaved: false,
      saveInteractionId: '',
      savePending: false
    }

    posts.value = [mockPost, ...feedItems]
    setCache('life-posts', posts.value)
    postsLastFetchedAt = Date.now()
  } catch (error) {
    console.error('Load life feed failed:', error)
    if (!cached) {
      postsError.value = t(I18N_KEYS.commonLoadError, uiPreferencesStore.locale)
      uni.showToast({
        title: postsError.value,
        icon: 'none'
      })
    }
  } finally {
    loadingPosts.value = false
  }
}

const hideNativeTabBar = () => {
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
  uiPreferencesStore.setActiveSection('life')
  await authStore.refreshProfile()
  if (authStore.isLoggedIn) {
    await refreshUnreadCount().catch(() => undefined)
    startAutoRefresh(15000)
    startCountPolling(15000)
  } else {
    stopAutoRefresh()
    stopCountPolling()
  }
  await loadLifePosts()
})

onHide(() => {
  isTabBarVisible.value = false
  stopAutoRefresh()
  stopCountPolling()
})
</script>

<style lang="scss" scoped>
.life-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 176rpx;
  background: var(--page-bg);
}

.icon-btn.has-badge {
  position: relative;
}

.icon-badge-dot {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #f49d25;
  border: 2rpx solid #ffffff;
}

.theme-light {
  --page-bg: linear-gradient(180deg, #fff8ed 0%, #fffcf5 35%, #ffffff 100%);
  --glass-bg: rgba(255, 255, 255, 0.68);
  --glass-border: rgba(255, 255, 255, 0.78);
  --glass-shadow: 0 4rpx 14rpx rgba(31, 38, 135, 0.05);
  --surface: #ffffff;
  --text-main: #1e293b;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(244, 157, 37, 0.08);
  --topbar-bg: transparent;
}

.theme-dark {
  --page-bg: linear-gradient(180deg, #1e1b10 0%, #221a10 35%, #15131f 100%);
  --glass-bg: rgba(30, 41, 59, 0.55);
  --glass-border: rgba(255, 255, 255, 0.10);
  --glass-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.20);
  --surface: rgba(30, 41, 59, 0.75);
  --text-main: #f8fafc;
  --text-sub: #d1d5db;
  --text-soft: #9ca3af;
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
  backdrop-filter: blur(14px);
  background: var(--topbar-bg);

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
  margin-top: 16rpx;
  height: 272rpx;
  border-radius: 36rpx;
  overflow: hidden;
  position: relative;
  background-image: url('/static/life_banner_full.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-shadow: 0 8rpx 28rpx rgba(244, 157, 37, 0.08);
  padding: 40rpx 40rpx 40rpx 32rpx;
  display: flex;
  align-items: center;
}

.hero-content {
  width: 58%;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  z-index: 2;
}

.hero-title {
  color: #1e293b;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.24;
  white-space: nowrap;
}

.hero-subtitle {
  color: #64748b;
  font-size: 22rpx;
  line-height: 1.45;
  white-space: nowrap;
}

.hero-decor-line {
  width: 50rpx;
  height: 6rpx;
  background: #f49d25;
  border-radius: 3rpx;
  margin-top: 8rpx;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
  margin-top: 12rpx;
}

.quick-card {
  background: var(--surface);
  border-radius: 24rpx;
  padding: 24rpx 20rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  border: 1rpx solid var(--line);
  box-shadow: 0 6rpx 18rpx rgba(0, 0, 0, 0.02);
  transition: transform 0.2s ease;
  
  &:active {
    transform: scale(0.98);
  }
}

.quick-icon-wrap {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &.storefront { background: rgba(244, 157, 37, 0.08); }
  &.celebration { background: rgba(234, 179, 8, 0.10); }
  &.work { background: rgba(244, 157, 37, 0.08); }
  &.meeting_room { background: rgba(244, 157, 37, 0.08); }
}

.quick-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.quick-title {
  color: var(--text-main);
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.3;
}

.quick-subtitle {
  color: var(--text-soft);
  font-size: 22rpx;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.section-title-row {
  margin-top: 40rpx;
  margin-bottom: 20rpx;
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

.section-action-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  
  &:active {
    opacity: 0.7;
  }
}

.section-action-text {
  color: #f49d25;
  font-size: 24rpx;
  font-weight: 600;
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.feed-card {
  border-radius: 28rpx;
  border: 1rpx solid var(--line);
  background: var(--surface);
  padding: 24rpx;
  box-shadow: 0 6rpx 20rpx rgba(244, 157, 37, 0.04);
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
  gap: 12rpx;
}

.feed-badge {
  min-height: 40rpx;
  border-radius: 8rpx;
  padding: 0 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  font-size: 20rpx;
  font-weight: 600;
  background: rgba(244, 157, 37, 0.08);
  color: #e28704;
}

.feed-time {
  color: var(--text-soft);
  font-size: 22rpx;
}

.feed-content {
  display: block;
  margin-top: 18rpx;
  color: var(--text-main);
  font-size: 28rpx;
  line-height: 1.6;
}

.feed-images {
  margin-top: 18rpx;
  display: grid;
  gap: 12rpx;
  
  &.single {
    grid-template-columns: minmax(0, 1fr);
    
    .feed-image-wrap {
      height: 320rpx;
    }
  }
  
  &.double {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    
    .feed-image-wrap {
      height: 220rpx;
    }
  }
  
  &.triple {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    
    .feed-image-wrap {
      height: 176rpx;
    }
  }
}

.feed-image-wrap {
  position: relative;
  border-radius: 24rpx;
  overflow: hidden;
  background: rgba(244, 157, 37, 0.04);
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
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx dashed var(--line);
}

.author {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.author-avatar {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(244, 157, 37, 0.08);
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
  gap: 24rpx;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 8rpx;

  &:active {
    opacity: 0.7;
  }
}

.action-item.compact {
  gap: 6rpx;
}

.action-item.active .footer-text {
  color: #F43F5E;
}

.action-item.saved .footer-text {
  color: #f49d25;
}

.footer-text {
  color: var(--text-soft);
  font-size: 22rpx;
}

.state-card {
  border: 1rpx dashed var(--line);
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
</style>
