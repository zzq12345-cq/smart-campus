<template>
  <view :class="['study-page', themeClass]">
    <!-- 装饰光斑 -->
    <view class="orb orb-1" />
    <view class="orb orb-2" />

    <view class="top-bar">
      <view class="left">
        <text class="greeting">{{ pageData.headerTitle }}</text>
      </view>
      <view class="right">
        <view class="icon-btn" @tap="openSearch">
          <Icon name="search" :size="20" :color="iconColor" />
        </view>
        <view class="icon-btn has-badge" @tap="openMessagesCenter">
          <Icon name="notifications" :size="20" :color="iconColor" />
          <view v-if="visibleUnreadCount > 0" class="icon-badge">
            <text>{{ notificationBadgeText }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="hero-card" @tap="handleCommonAction">
      <view class="hero-content">
        <text class="hero-label">{{ pageData.heroSubtitle }}</text>
        <text class="hero-title">{{ pageData.heroTitle }}</text>
        <view class="hero-button">
          <text class="hero-button-text">{{ pageData.heroAction }}</text>
        </view>
      </view>
      <view class="hero-icon">
        <Icon name="school" :size="120" color="rgba(255, 255, 255, 0.35)" />
      </view>
    </view>

    <view class="section-title-row">
      <view class="section-left">
        <text class="section-title">{{ pageData.quickTitle }}</text>
      </view>
    </view>

    <view class="quick-grid">
      <view
        v-for="(item, index) in pageData.quickActions"
        :key="index"
        class="quick-item"
        @tap="handleQuickAction(index)"
      >
        <view class="quick-icon">
          <Icon :name="item.icon" :size="18" color="#ffffff" />
        </view>
        <text class="quick-label">{{ item.title }}</text>
      </view>
    </view>

    <view class="section-title-row">
      <view class="section-left">
        <Icon name="forum" :size="18" color="#4A90E2" />
        <text class="section-title">{{ pageData.feedTitle }}</text>
      </view>
      <text class="section-action" @tap="goPublishPage">{{ pageData.feedAction }}</text>
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
            <view class="feed-badge topic">{{ post.badge }}</view>
            <view class="feed-badge context">
              <Icon name="bookmark_added" :size="12" color="#3f7dcb" />
              <text>{{ post.contextLabel }}</text>
            </view>
            <view v-if="post.imageCount > 0" class="feed-badge media">
              <Icon name="image" :size="12" color="#2f6fbc" />
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

    <FloatingAiButton v-if="isTabBarVisible" />
    <AppTabBar v-if="isTabBarVisible" value="/pages/study/index" />
    <SearchOverlay
      :visible="showSearch"
      current-section="study"
      accent-color="#4A90E2"
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
import { getPageData as getStudyPageData } from '@/mocks/pages/study'
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

const STUDY_TOPICS = ['course_review', 'exam_info', 'learning_material', 'competition'] as const
type StudyTopic = (typeof STUDY_TOPICS)[number]

interface StudyFeedPost {
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
const pageData = computed(() => getStudyPageData(uiPreferencesStore.locale))
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8'))
const hasQuickOverflow = computed(() => pageData.value.quickActions.length > 4)
const isTabBarVisible = ref(false)
const showSearch = ref(false)
const visibleUnreadCount = computed(() => (authStore.isLoggedIn ? totalUnreadCount.value + notifUnreadCount.value : 0))
const notificationBadgeText = computed(() =>
  visibleUnreadCount.value > 99 ? '99+' : String(visibleUnreadCount.value)
)
const posts = ref<StudyFeedPost[]>([])
const loadingPosts = ref(false)
const postsError = ref('')
const authorNameMap = ref<Record<string, string>>({})
const authorAvatarMap = ref<Record<string, string>>({})
const saveLabel = computed(() => t(I18N_KEYS.commonSave, uiPreferencesStore.locale))
const savedLabel = computed(() => (isZh.value ? '已收藏' : 'Saved'))
const shareLabel = computed(() => t(I18N_KEYS.commonShare, uiPreferencesStore.locale))
const loadingText = computed(() => t(I18N_KEYS.commonLoading, uiPreferencesStore.locale))
const emptyText = computed(() => t(I18N_KEYS.studyFeedEmpty, uiPreferencesStore.locale))

const isStudyTopic = (topic?: string): topic is StudyTopic =>
  Boolean(topic && (STUDY_TOPICS as readonly string[]).includes(topic))

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
  const map: Record<StudyTopic, I18N_KEYS> = {
    course_review: I18N_KEYS.studyTopicCourseReview,
    exam_info: I18N_KEYS.studyTopicExamInfo,
    learning_material: I18N_KEYS.studyTopicLearningMaterial,
    competition: I18N_KEYS.studyTopicCompetition
  }
  if (!isStudyTopic(topic)) {
    return t(I18N_KEYS.studyTopicDefault, uiPreferencesStore.locale)
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
    console.error('Resolve study author names failed:', error)
  }
}

const mapPostToFeedItem = (post: Post): StudyFeedPost => {
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

const handleCommonAction = () => {
  uni.showToast({
    title: t(I18N_KEYS.commonComingSoon, uiPreferencesStore.locale),
    icon: 'none'
  })
}


const STUDY_QUICK_ROUTES: Record<number, string> = {
  0: '/pages/study/schedule',
  1: '/pages/study/materials/index',
  2: '/pages/study/checkin',
  3: '/pages/study/exam/index'
}

const handleQuickAction = (index: number) => {
  const route = STUDY_QUICK_ROUTES[index]
  if (route) {
    if (!requireAuth('/pages/study/index')) {
      return
    }
    uni.navigateTo({ url: route })
  } else {
    handleCommonAction()
  }
}

const openSearch = () => {
  showSearch.value = true
}

const openMessagesCenter = () => {
  if (!requireAuth('/pages/study/index')) {
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
  if (!requireAuth('/pages/study/index')) {
    return
  }
  uni.navigateTo({
    url: '/pages/study/post-publish'
  })
}

const handleLike = async (post: StudyFeedPost) => {
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

const handleSave = async (post: StudyFeedPost) => {
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

const goAuthorProfile = (post: StudyFeedPost) => {
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
    url: `/pages/study/post-detail?${query.join('&')}`
  })
}

let postsLastFetchedAt = 0
const POSTS_REFETCH_INTERVAL = 10_000

const loadStudyPosts = async (force = false) => {
  if (!force && postsLastFetchedAt && Date.now() - postsLastFetchedAt < POSTS_REFETCH_INTERVAL) {
    return
  }
  const cached = getCached<StudyFeedPost[]>('study-posts')
  if (cached) {
    posts.value = cached
  }
  loadingPosts.value = !cached
  postsError.value = ''
  try {
    const result = await postsService.getPublicPosts({
      section: 'study',
      status: 'published',
      limit: 50
    })
    const visiblePosts = result.filter((post) => isStudyTopic(String(post.topic || '')))

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
    posts.value = feedItems
    setCache('study-posts', feedItems)
    postsLastFetchedAt = Date.now()
  } catch (error) {
    console.error('Load study feed failed:', error)
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
  uiPreferencesStore.setActiveSection('study')
  await authStore.refreshProfile()
  if (authStore.isLoggedIn) {
    await refreshUnreadCount().catch(() => undefined)
    startAutoRefresh(15000)
    startCountPolling(15000)
  } else {
    stopAutoRefresh()
    stopCountPolling()
  }
  await loadStudyPosts()
})

onHide(() => {
  isTabBarVisible.value = false
  stopAutoRefresh()
  stopCountPolling()
})
</script>

<style lang="scss" scoped>
/* ===== 玻璃态主题变量 ===== */
.theme-light {
  --page-bg: linear-gradient(180deg, #eef3fb 0%, #f6f9ff 35%, #ffffff 100%);
  --glass-bg: rgba(255, 255, 255, 0.68);
  --glass-border: rgba(255, 255, 255, 0.78);
  --glass-shadow: 0 4rpx 14rpx rgba(31, 38, 135, 0.05);
  --surface: rgba(255, 255, 255, 0.68);
  --text-main: #1e293b;
  --text-sub: #64748b;
  --text-soft: #64748b;
  --line: rgba(255, 255, 255, 0.78);
}

.theme-dark {
  --page-bg: linear-gradient(180deg, #0f172a 0%, #1e1b2e 35%, #15131f 100%);
  --glass-bg: rgba(30, 41, 59, 0.55);
  --glass-border: rgba(255, 255, 255, 0.10);
  --glass-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.20);
  --surface: rgba(30, 41, 59, 0.55);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --line: rgba(255, 255, 255, 0.10);
}

.study-page {
  min-height: 100vh;
  padding: 16rpx 28rpx 180rpx;
  background: var(--page-bg);
  position: relative;
  overflow: hidden;
}

/* ===== 装饰光斑 ===== */
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  pointer-events: none;
  z-index: 0;
}

.orb-1 {
  top: -60rpx;
  right: -50rpx;
  width: 400rpx;
  height: 400rpx;
  background: rgba(91, 139, 212, 0.20);
}

.orb-2 {
  bottom: 200rpx;
  left: -60rpx;
  width: 320rpx;
  height: 320rpx;
  background: rgba(136, 111, 222, 0.10);
}

/* ===== 顶栏 ===== */
.top-bar {
  position: relative;
  z-index: 10;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;

  .greeting {
    font-size: 36rpx;
    font-weight: 700;
    color: var(--text-main);
  }

  .right {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  .icon-btn {
    width: 72rpx;
    height: 72rpx;
    border-radius: 20rpx;
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease;

    &:active {
      transform: scale(0.94);
    }
  }
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

/* ===== Hero 卡片 ===== */
.hero-card {
  position: relative;
  z-index: 1;
  border-radius: 36rpx;
  padding: 40rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(135deg, #3068b3 0%, #5b8bd4 100%);
  box-shadow: 0 16rpx 36rpx rgba(91, 139, 212, 0.28);
  overflow: hidden;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.98);
  }
}

.hero-content {
  width: 72%;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  position: relative;
  z-index: 2;
}

.hero-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.92);
}

.hero-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.25;
}

.hero-button {
  align-self: flex-start;
  margin-top: 12rpx;
  border-radius: 999rpx;
  padding: 14rpx 28rpx;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(8px);
}

.hero-button-text {
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
}

.hero-icon {
  position: absolute;
  right: -20rpx;
  bottom: -20rpx;
  z-index: 1;
}

/* ===== 区块标题 ===== */
.section-title-row {
  position: relative;
  z-index: 1;
  margin-top: 28rpx;
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
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-main);
}

.section-action {
  font-size: 24rpx;
  color: #2c66ad;
  font-weight: 600;
}

/* ===== 快捷入口 4 列网格 ===== */
.quick-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.quick-item {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 24rpx;
  padding: 20rpx 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  box-shadow: var(--glass-shadow);
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.95);
  }
}

.quick-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #5b8bd4, #8ab4e8);
}

.quick-label {
  font-size: 22rpx;
  color: var(--text-sub);
  font-weight: 500;
  text-align: center;
}

/* ===== 帖子列表 ===== */
.feed-list {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.feed-card {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 28rpx;
  padding: 28rpx;
  box-shadow: var(--glass-shadow);
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.98);
  }
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
  padding: 0 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  font-size: 20rpx;
  font-weight: 600;
}

.feed-badge.topic {
  background: rgba(91, 139, 212, 0.16);
  color: #3f7dcb;
}

.feed-badge.context {
  background: rgba(14, 165, 233, 0.14);
  color: #0369a1;
}

.feed-badge.media {
  background: rgba(91, 139, 212, 0.08);
  color: #2f6fbc;
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
  background: rgba(91, 139, 212, 0.08);
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
  border-top: 1px solid var(--line);
}

.author {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.author-avatar {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(91, 139, 212, 0.08);
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

.action-item.compact {
  gap: 4rpx;
}

.action-item.active .footer-text {
  color: #F43F5E;
}

.action-item.saved .footer-text {
  color: #F59E0B;
}

.footer-text {
  color: var(--text-soft);
  font-size: 22rpx;
}

.state-card {
  border: 1px dashed var(--line);
  border-radius: 24rpx;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  padding: 40rpx 24rpx;
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
