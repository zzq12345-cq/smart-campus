<template>
  <view :class="['mine-collections-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ pageTitle }}</text>
      </view>
      <view class="right">
        <view class="icon-btn" @tap="loadSavedPosts">
          <Icon name="sync" :size="20" :color="iconColor" />
        </view>
      </view>
    </view>

    <view v-if="!authStore.isLoggedIn" class="guest-card">
      <view class="guest-icon">
        <Icon name="bookmark" :size="26" color="#6fde81" />
      </view>
      <text class="guest-title">{{ guestTitle }}</text>
      <text class="guest-subtitle">{{ guestSubtitle }}</text>

      <view class="guest-preview">
        <view
          v-for="item in sectionPreviewItems"
          :key="item.key"
          :class="['guest-preview-card', `guest-preview-card--${item.key}`]"
        >
          <view class="guest-preview-head">
            <Icon :name="item.icon" :size="16" :color="item.color" />
            <text class="guest-preview-title">{{ item.title }}</text>
          </view>
          <text class="guest-preview-subtitle">{{ item.subtitle }}</text>
        </view>
      </view>

      <view class="guest-actions">
        <view class="primary-btn" @tap="navigateToLogin">
          <text class="primary-btn-text">{{ loginLabel }}</text>
        </view>
        <view class="secondary-btn" @tap="navigateToRegister">
          <text class="secondary-btn-text">{{ registerLabel }}</text>
        </view>
      </view>
    </view>

    <template v-else>
      <view class="hero-card">
        <view class="hero-copy">
          <text class="hero-kicker">{{ heroKicker }}</text>
          <text class="hero-title">{{ heroTitle }}</text>
          <text class="hero-subtitle">{{ heroSubtitle }}</text>
        </view>

        <view class="hero-stats">
          <view
            v-for="item in sectionMetrics"
            :key="item.key"
            :class="['zone-pill', `zone-pill--${item.key}`]"
          >
            <view class="zone-pill-head">
              <Icon :name="item.icon" :size="14" :color="item.color" />
              <text class="zone-pill-title">{{ item.title }}</text>
            </view>
            <text class="zone-pill-value">{{ item.count }}</text>
          </view>
        </view>
      </view>

      <view class="stats-card">
        <view
          v-for="(item, index) in statItems"
          :key="item.label"
          class="stat-item"
          :class="{ bordered: index === 1 }"
        >
          <text class="stat-value">{{ item.value }}</text>
          <text class="stat-label">{{ item.label }}</text>
        </view>
      </view>

      <view class="filter-card">
        <text class="filter-label">{{ filterSectionLabel }}</text>
        <view class="chip-row">
          <view
            v-for="item in sectionFilters"
            :key="item.key"
            :class="['filter-chip', { active: sectionFilter === item.key }]"
            @tap="sectionFilter = item.key"
          >
            <text>{{ item.label }}</text>
            <text class="filter-count">{{ item.count }}</text>
          </view>
        </view>
      </view>

      <view class="section-title-row">
        <view class="section-left">
          <Icon name="collections_bookmark" :size="18" color="#6fde81" />
          <text class="section-title">{{ listTitle }}</text>
        </view>
        <text class="section-action" @tap="loadSavedPosts">{{ refreshLabel }}</text>
      </view>

      <view class="feed-list">
        <view v-if="loadingPosts && !savedPosts.length" class="state-card">
          <text class="state-title">{{ loadingText }}</text>
          <text class="state-text">{{ loadingHint }}</text>
        </view>

        <view v-else-if="postsError && !savedPosts.length" class="state-card error">
          <text class="state-title">{{ loadErrorTitle }}</text>
          <text class="state-text">{{ postsError }}</text>
        </view>

        <view v-else-if="!filteredPosts.length" class="state-card">
          <text class="state-title">{{ emptyTitle }}</text>
          <text class="state-text">{{ emptySubtitle }}</text>
        </view>

        <view
          v-for="post in filteredPosts"
          :key="post.id"
          :class="['collection-card', `collection-card--${post.section}`]"
          @tap="goPostDetail(post)"
        >
          <view class="post-meta">
            <view class="post-badges">
              <view :class="['source-badge', `source-badge--${post.section}`]">
                <Icon
                  :name="getSectionMeta(post.section).icon"
                  :size="12"
                  :color="getSectionMeta(post.section).color"
                />
                <text>{{ sectionLabel(post.section) }}</text>
              </view>
              <view class="info-badge">{{ post.topicLabel }}</view>
              <view v-if="post.isAnonymous" class="info-badge">{{ post.anonymousLabel }}</view>
              <view v-if="post.images.length" class="info-badge">{{ post.imageLabel }}</view>
            </view>
            <text class="post-time">{{ post.time }}</text>
          </view>

          <text class="post-content">{{ post.content }}</text>

          <view v-if="post.images.length" :class="['post-images', { single: post.images.length === 1 }]">
            <view
              v-for="(image, index) in post.images.slice(0, 3)"
              :key="`${post.id}-${image}-${index}`"
              class="post-image-wrap"
              @tap.stop="previewPostImages(post.images, image)"
            >
              <image class="post-image" :src="image" mode="aspectFill" lazy-load />
              <view v-if="index === 2 && post.images.length > 3" class="more-mask">
                <text class="more-text">+{{ post.images.length - 3 }}</text>
              </view>
            </view>
          </view>

          <view class="post-footer">
            <view class="author">
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
              <view class="action-item" @tap.stop="goPostDetail(post, true)">
                <Icon name="chat_bubble" :size="16" color="#94a3b8" />
                <text class="footer-text">{{ post.commentCount }}</text>
              </view>
              <view
                class="action-item compact saved"
                :class="{ disabled: post.savePending }"
                @tap.stop="handleUnsave(post)"
              >
                <Icon name="bookmark" :size="16" color="#F59E0B" />
                <text class="footer-text">{{ unsaveLabel }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { Query } from 'appwrite'
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import postInteractionsService from '@/services/post-interactions'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { Post, PostSection } from '@/types/post'
import { tablesDB } from '@/utils/appwrite'
import {
  MINDGUARD_DATABASE_ID,
  POST_INTERACTIONS_TABLE_ID,
  POSTS_TABLE_ID,
  USERS_TABLE_ID
} from '@/utils/appwrite-shared'

type SectionFilter = 'all' | PostSection

interface SaveInteractionRow {
  $id: string
  postId: string
  userId: string
  type: 'save'
  $createdAt?: string
}

interface CollectionPostItem {
  id: string
  section: PostSection
  topicLabel: string
  time: string
  content: string
  user: string
  avatar: string
  isAnonymous: boolean
  anonymousLabel: string
  images: string[]
  imageLabel: string
  likeCount: number
  commentCount: number
  isLiked: boolean
  likeInteractionId: string
  likePending: boolean
  saveInteractionId: string
  savePending: boolean
}

const SECTION_META: Record<PostSection, { icon: string; color: string }> = {
  study: {
    icon: 'school',
    color: '#4A90E2'
  },
  life: {
    icon: 'shopping_bag',
    color: '#F49D25'
  },
  psychology: {
    icon: 'spa',
    color: '#886FDE'
  }
}

const STUDY_TOPICS: Record<string, [string, string]> = {
  course_review: ['课程复盘', 'Course Review'],
  exam_info: ['考试信息', 'Exam Info'],
  learning_material: ['学习资料', 'Materials'],
  competition: ['竞赛', 'Competition']
}

const LIFE_TOPICS: Record<string, [string, string]> = {
  life_help: ['生活互助', 'Life Help'],
  second_hand: ['二手交易', 'Second Hand'],
  activity: ['校园活动', 'Activity'],
  job: ['兼职就业', 'Job'],
  rental: ['租房信息', 'Rental']
}

const PSYCHOLOGY_TOPICS: Record<string, [string, string]> = {
  daily: ['日常', 'Daily'],
  mood: ['心情', 'Mood'],
  relationship: ['关系', 'Relationship'],
  future: ['未来', 'Future'],
  night: ['夜谈', 'Night Talk']
}

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8'))
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')
const savedPosts = ref<CollectionPostItem[]>([])
const loadingPosts = ref(false)
const postsError = ref('')
const sectionFilter = ref<SectionFilter>('all')
const authorNameMap = ref<Record<string, string>>({})
const authorAvatarMap = ref<Record<string, string>>({})

const localeText = (zh: string, en: string) => (isZh.value ? zh : en)

const pageTitle = computed(() => t(I18N_KEYS.mineServiceCollections, uiPreferencesStore.locale))
const guestTitle = computed(() => t(I18N_KEYS.mineGuestTitle, uiPreferencesStore.locale))
const guestSubtitle = computed(() => t(I18N_KEYS.mineGuestSubtitle, uiPreferencesStore.locale))
const loginLabel = computed(() => t(I18N_KEYS.mineLoginAction, uiPreferencesStore.locale))
const registerLabel = computed(() => t(I18N_KEYS.mineRegisterAction, uiPreferencesStore.locale))
const heroKicker = computed(() => localeText('COLLECTION LAB', 'COLLECTION LAB'))
const heroTitle = computed(() => localeText('我的收藏中枢', 'My Saved Hub'))
const heroSubtitle = computed(() =>
  localeText(
    '统一整理学习、生活、心理三个分区收藏，快速回看高价值帖子。',
    'Review saved posts across study, life, and psychology in one place.'
  )
)
const listTitle = computed(() => localeText('收藏帖子列表', 'Saved Posts'))
const filterSectionLabel = computed(() => localeText('来源分区', 'Source Section'))
const refreshLabel = computed(() => localeText('刷新', 'Refresh'))
const loadingHint = computed(() => localeText('正在同步你的收藏记录…', 'Syncing your saved list...'))
const loadErrorTitle = computed(() => localeText('加载失败', 'Load failed'))
const emptyTitle = computed(() => localeText('暂时没有收藏内容', 'No saved posts yet'))
const emptySubtitle = computed(() =>
  localeText(
    '去学习/生活/心理分区点击收藏后，会出现在这里。',
    'Save posts from any section and they will appear here.'
  )
)
const unsaveLabel = computed(() => localeText('取消收藏', 'Unsave'))
const loadingText = computed(() => t(I18N_KEYS.commonLoading, uiPreferencesStore.locale))

const sectionMetrics = computed(() =>
  (Object.keys(SECTION_META) as PostSection[]).map((section) => {
    const meta = SECTION_META[section]
    return {
      key: section,
      icon: meta.icon,
      color: meta.color,
      title: sectionLabel(section),
      count: savedPosts.value.filter((item) => item.section === section).length
    }
  })
)

const filteredPosts = computed(() =>
  sectionFilter.value === 'all'
    ? savedPosts.value
    : savedPosts.value.filter((item) => item.section === sectionFilter.value)
)

const statItems = computed(() => [
  {
    label: localeText('收藏总数', 'Saved Total'),
    value: String(savedPosts.value.length)
  },
  {
    label: localeText('已筛选', 'Filtered'),
    value: String(filteredPosts.value.length)
  },
  {
    label: localeText('学习占比', 'Study Share'),
    value: `${Math.round(
      savedPosts.value.length
        ? (savedPosts.value.filter((item) => item.section === 'study').length / savedPosts.value.length) * 100
        : 0
    )}%`
  }
])

const sectionFilters = computed(() => [
  {
    key: 'all' as const,
    label: localeText('全部', 'All'),
    count: savedPosts.value.length
  },
  ...sectionMetrics.value.map((item) => ({
    key: item.key,
    label: item.title,
    count: item.count
  }))
])

const sectionPreviewItems = computed(() => [
  {
    key: 'study' as PostSection,
    icon: SECTION_META.study.icon,
    color: SECTION_META.study.color,
    title: sectionLabel('study'),
    subtitle: localeText('课程与资料', 'Courses & resources')
  },
  {
    key: 'life' as PostSection,
    icon: SECTION_META.life.icon,
    color: SECTION_META.life.color,
    title: sectionLabel('life'),
    subtitle: localeText('活动与互助', 'Events & help')
  },
  {
    key: 'psychology' as PostSection,
    icon: SECTION_META.psychology.icon,
    color: SECTION_META.psychology.color,
    title: sectionLabel('psychology'),
    subtitle: localeText('树洞与情绪', 'Mood & support')
  }
])

const getSectionMeta = (section: PostSection) => SECTION_META[section]

function normalizeSection(section: unknown): PostSection {
  if (section === 'study' || section === 'life' || section === 'psychology') {
    return section
  }
  return 'psychology'
}

function sectionLabel(section: PostSection): string {
  if (section === 'study') {
    return t(I18N_KEYS.tabStudy, uiPreferencesStore.locale)
  }
  if (section === 'life') {
    return t(I18N_KEYS.tabLife, uiPreferencesStore.locale)
  }
  return t(I18N_KEYS.tabPsychology, uiPreferencesStore.locale)
}

function topicLabel(section: PostSection, topic?: string): string {
  const sectionTopicMap: Record<PostSection, Record<string, [string, string]>> = {
    study: STUDY_TOPICS,
    life: LIFE_TOPICS,
    psychology: PSYCHOLOGY_TOPICS
  }
  const pair = sectionTopicMap[section][String(topic || '').trim()]
  if (pair) {
    return isZh.value ? pair[0] : pair[1]
  }
  return sectionLabel(section)
}

function formatRelativeTime(rawTime?: string): string {
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

async function resolveAuthorProfiles(posts: Post[]) {
  const authorIds = Array.from(
    new Set(
      posts
        .filter((item) => !item.isAnonymous)
        .map((item) => String(item.authorId || '').trim())
        .filter(Boolean)
    )
  )
  if (!authorIds.length) {
    return
  }

  try {
    const result = await tablesDB.listRows(MINDGUARD_DATABASE_ID, USERS_TABLE_ID, [
      Query.equal('$id', authorIds),
      Query.limit(authorIds.length)
    ])

    const nextNameMap: Record<string, string> = {}
    const nextAvatarMap: Record<string, string> = {}

    for (const row of result.rows || []) {
      const userId = String((row as Record<string, unknown>).$id || '').trim()
      if (!userId) {
        continue
      }
      const name = String((row as Record<string, unknown>).name || '').trim()
      const avatar = String((row as Record<string, unknown>).avatar || '').trim()
      nextNameMap[userId] = name || userId
      if (avatar) {
        nextAvatarMap[userId] = avatar
      }
    }

    authorNameMap.value = {
      ...authorNameMap.value,
      ...nextNameMap
    }
    authorAvatarMap.value = {
      ...authorAvatarMap.value,
      ...nextAvatarMap
    }
  } catch (error) {
    console.error('Resolve collection author profiles failed:', error)
  }
}

function mapPostToCollectionItem(
  post: Post,
  saveInteractionId: string,
  likeInteractionId: string
): CollectionPostItem {
  const section = normalizeSection(post.section)
  const anonymousLabel = t(I18N_KEYS.commonAnonymous, uiPreferencesStore.locale)
  const defaultUserLabel = t(I18N_KEYS.commonCampusUser, uiPreferencesStore.locale)
  const authorId = String(post.authorId || '').trim()
  const user = post.isAnonymous
    ? anonymousLabel
    : authorNameMap.value[authorId] || authorId || defaultUserLabel
  const avatar = post.isAnonymous ? '' : authorAvatarMap.value[authorId] || ''
  const images = Array.isArray(post.images)
    ? post.images.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []

  return {
    id: String(post.$id || ''),
    section,
    topicLabel: topicLabel(section, String(post.topic || '')),
    time: formatRelativeTime(post.$updatedAt || post.$createdAt),
    content: String(post.content || ''),
    user,
    avatar,
    isAnonymous: Boolean(post.isAnonymous),
    anonymousLabel: localeText('匿名', 'Anon'),
    images,
    imageLabel: t(I18N_KEYS.commonImages, uiPreferencesStore.locale, { count: images.length }),
    likeCount: Number(post.likeCount || 0),
    commentCount: Number(post.commentCount || 0),
    isLiked: Boolean(likeInteractionId),
    likeInteractionId,
    likePending: false,
    saveInteractionId,
    savePending: false
  }
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error || '')
}

function toast(title: string, icon: 'none' | 'success' = 'none') {
  uni.showToast({
    title,
    icon
  })
}

async function loadSavedPosts() {
  if (loadingPosts.value) {
    return
  }

  loadingPosts.value = true
  postsError.value = ''

  try {
    if (!authStore.isLoggedIn) {
      savedPosts.value = []
      return
    }

    const userId = String(authStore.user?.$id || '').trim()
    if (!userId) {
      throw new Error(localeText('未获取到用户信息', 'User identity not found'))
    }

    const saveResult = await tablesDB.listRows(MINDGUARD_DATABASE_ID, POST_INTERACTIONS_TABLE_ID, [
      Query.equal('userId', userId),
      Query.equal('type', 'save'),
      Query.orderDesc('$createdAt'),
      Query.limit(200)
    ])
    const saveRows = (saveResult.rows || []) as SaveInteractionRow[]

    const postOrder: string[] = []
    const saveInteractionMap = new Map<string, string>()
    saveRows.forEach((row) => {
      const postId = String(row.postId || '').trim()
      const interactionId = String(row.$id || '').trim()
      if (!postId || !interactionId || saveInteractionMap.has(postId)) {
        return
      }
      postOrder.push(postId)
      saveInteractionMap.set(postId, interactionId)
    })

    if (!postOrder.length) {
      savedPosts.value = []
      return
    }

    const postMap = new Map<string, Post>()
    const batchSize = 20
    for (let index = 0; index < postOrder.length; index += batchSize) {
      const batch = postOrder.slice(index, index + batchSize)
      const postResult = await tablesDB.listRows(MINDGUARD_DATABASE_ID, POSTS_TABLE_ID, [
        Query.equal('$id', batch),
        Query.limit(batch.length)
      ])
      ;(postResult.rows || []).forEach((item) => {
        const post = item as Post
        const postId = String(post.$id || '').trim()
        if (!postId) {
          return
        }
        if (post.status === 'deleted') {
          return
        }
        postMap.set(postId, post)
      })
    }

    const orderedPosts = postOrder
      .map((postId) => postMap.get(postId))
      .filter((post): post is Post => Boolean(post))

    if (!orderedPosts.length) {
      savedPosts.value = []
      return
    }

    const likeMap = await postInteractionsService.getMyLikesForPosts(
      orderedPosts.map((item) => item.$id)
    )

    await resolveAuthorProfiles(orderedPosts)

    savedPosts.value = orderedPosts.map((post) =>
      mapPostToCollectionItem(
        post,
        saveInteractionMap.get(post.$id) || '',
        String(likeMap.get(post.$id)?.$id || '')
      )
    )
  } catch (error) {
    console.error('Load saved posts failed:', error)
    postsError.value = extractErrorMessage(error) || t(I18N_KEYS.commonLoadError, uiPreferencesStore.locale)
    toast(postsError.value)
  } finally {
    loadingPosts.value = false
  }
}

function handleCommonAction() {
  toast(t(I18N_KEYS.commonComingSoon, uiPreferencesStore.locale))
}

async function handleLike(post: CollectionPostItem) {
  if (!authStore.isLoggedIn) {
    toast(localeText('请先登录', 'Please login first'))
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

  try {
    const result = await postInteractionsService.setMyLikeState(
      post.id,
      post.isLiked,
      prevInteractionId
    )
    post.isLiked = Boolean(result.liked)
    post.likeInteractionId = String(result.interactionId || '')
    post.likeCount = Number(result.likeCount || 0)
  } catch (error) {
    post.isLiked = prevLiked
    post.likeCount = prevCount
    post.likeInteractionId = prevInteractionId
    toast(extractErrorMessage(error) || localeText('操作失败', 'Operation failed'))
  } finally {
    post.likePending = false
  }
}

async function handleUnsave(post: CollectionPostItem) {
  if (!authStore.isLoggedIn || post.savePending) {
    return
  }

  post.savePending = true
  const prevInteractionId = post.saveInteractionId
  const removedIndex = savedPosts.value.findIndex((item) => item.id === post.id)
  const snapshot = savedPosts.value.slice()

  savedPosts.value = savedPosts.value.filter((item) => item.id !== post.id)
  toast(localeText('已取消收藏', 'Removed from saved'))

  try {
    await postInteractionsService.setMySaveState(post.id, false, prevInteractionId)
  } catch (error) {
    savedPosts.value = snapshot
    toast(extractErrorMessage(error) || localeText('操作失败', 'Operation failed'))
  } finally {
    post.savePending = false
  }
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

function goPostDetail(post: CollectionPostItem, focusComment = false) {
  if (!post.id) {
    return
  }
  const query = [`id=${encodeURIComponent(post.id)}`]
  if (focusComment) {
    query.push('focus=comment')
  }
  uni.navigateTo({
    url: `/pages/${post.section}/post-detail?${query.join('&')}`
  })
}

function navigateToLogin() {
  uni.navigateTo({
    url: '/pages/mine/login?redirect=' + encodeURIComponent('/pages/mine/collections')
  })
}

function navigateToRegister() {
  uni.navigateTo({
    url: '/pages/mine/register?redirect=' + encodeURIComponent('/pages/mine/collections')
  })
}

function goBack() {
  const pageStack = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pageStack.length > 1) {
    uni.navigateBack({
      delta: 1
    })
    return
  }
  uni.switchTab({
    url: '/pages/mine/index'
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
  hideNativeTabBar()
  uiPreferencesStore.initFromSystem()
  uiPreferencesStore.setActiveSection('mine')
  await authStore.init()
  if (authStore.isLoggedIn) {
    await authStore.refreshProfile()
    await loadSavedPosts()
  } else {
    savedPosts.value = []
  }
})
</script>

<style scoped lang="scss">
.mine-collections-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 64rpx;
  background: var(--page-bg);
  color: var(--text-main);
}

.theme-light {
  --page-bg: #f6f8f6;
  --surface: #ffffff;
  --surface-strong: #ffffff;
  --surface-muted: #f8fbf8;
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(111, 222, 129, 0.18);
  --line-strong: rgba(111, 222, 129, 0.26);
  --topbar-bg: rgba(246, 248, 246, 0.9);
}

.theme-dark {
  --page-bg: #131f15;
  --surface: rgba(15, 30, 20, 0.78);
  --surface-strong: rgba(15, 30, 20, 0.92);
  --surface-muted: rgba(20, 38, 26, 0.88);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #64748b;
  --line: rgba(111, 222, 129, 0.3);
  --line-strong: rgba(111, 222, 129, 0.44);
  --topbar-bg: rgba(19, 31, 21, 0.9);
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 88rpx;
  margin-bottom: 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--topbar-bg);
  backdrop-filter: blur(14px);
}

.left,
.right {
  display: flex;
  align-items: center;
}

.left {
  gap: 12rpx;

  &:active {
    opacity: 0.72;
  }
}

.title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-main);
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    opacity: 0.72;
  }
}

.guest-card,
.hero-card,
.stats-card,
.filter-card,
.state-card,
.collection-card {
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: var(--surface);
}

.guest-card {
  margin-top: 18rpx;
  padding: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.guest-icon,
.primary-btn,
.secondary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.guest-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(111, 222, 129, 0.14);
}

.guest-title,
.hero-title,
.section-title,
.state-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-main);
}

.guest-subtitle,
.hero-subtitle,
.state-text {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--text-sub);
}

.guest-preview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16rpx;
}

.guest-preview-card {
  padding: 18rpx;
  border-radius: 20rpx;
  background: var(--surface-muted);
  border: 1px solid var(--line);
}

.guest-preview-card--study {
  box-shadow: inset 0 0 0 1px rgba(74, 144, 226, 0.12);
}

.guest-preview-card--life {
  box-shadow: inset 0 0 0 1px rgba(244, 157, 37, 0.14);
}

.guest-preview-card--psychology {
  box-shadow: inset 0 0 0 1px rgba(136, 111, 222, 0.16);
}

.guest-preview-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 10rpx;
}

.guest-preview-title,
.filter-label {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-main);
}

.guest-preview-subtitle,
.hero-kicker,
.stat-label,
.post-time,
.filter-count {
  font-size: 20rpx;
  color: var(--text-soft);
}

.guest-actions {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.primary-btn,
.secondary-btn {
  min-height: 80rpx;
  border-radius: 16rpx;
  border: 1px solid transparent;

  &:active {
    opacity: 0.72;
  }
}

.primary-btn {
  background: #6fde81;
  color: #ffffff;
}

.secondary-btn {
  background: transparent;
  border-color: var(--line);
}

.primary-btn-text,
.secondary-btn-text {
  font-size: 28rpx;
  font-weight: 700;
}

.hero-card {
  margin-top: 18rpx;
  margin-bottom: 18rpx;
  padding: 28rpx;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding-bottom: 20rpx;
  border-bottom: 1px solid var(--line);
}

.hero-kicker {
  color: #6fde81;
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.theme-dark .hero-kicker {
  color: #8be59a;
}

.hero-title {
  font-size: 40rpx;
  line-height: 1.28;
}

.hero-subtitle {
  color: var(--text-sub);
  font-size: 24rpx;
  line-height: 1.6;
}

.hero-stats {
  margin-top: 22rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
}

.zone-pill {
  padding: 18rpx;
  border-radius: 18rpx;
  background: var(--surface-muted);
  border: 1px solid var(--line);
}

.zone-pill--study {
  box-shadow: inset 0 0 0 1px rgba(74, 144, 226, 0.16);
}

.zone-pill--life {
  box-shadow: inset 0 0 0 1px rgba(244, 157, 37, 0.18);
}

.zone-pill--psychology {
  box-shadow: inset 0 0 0 1px rgba(136, 111, 222, 0.18);
}

.zone-pill-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.zone-pill-title {
  color: rgba(15, 23, 42, 0.68);
  font-size: 20rpx;
  font-weight: 600;
}

.theme-dark .zone-pill-title {
  color: rgba(248, 250, 252, 0.68);
}

.zone-pill-value,
.stat-value {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-main);
}

.stats-card {
  margin-bottom: 18rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 12rpx 0;
}

.stat-item {
  padding: 20rpx 12rpx;
  text-align: center;
}

.stat-item.bordered {
  border-left: 1px solid var(--line);
  border-right: 1px solid var(--line);
}

.filter-card {
  padding: 24rpx;
  margin-bottom: 18rpx;
}

.chip-row {
  margin-top: 14rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  min-height: 56rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  border: 1px solid var(--line);
  background: var(--surface-muted);
  color: var(--text-sub);
  font-size: 22rpx;
}

.filter-chip.active {
  background: rgba(111, 222, 129, 0.14);
  color: var(--text-main);
  border-color: rgba(111, 222, 129, 0.36);
}

.section-title-row {
  margin: 24rpx 0 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-left {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.section-action {
  font-size: 24rpx;
  color: #6fde81;
  font-weight: 700;
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.state-card {
  padding: 36rpx 28rpx;
  text-align: center;
}

.state-card.error {
  border-color: rgba(239, 68, 68, 0.2);
}

.collection-card {
  position: relative;
  overflow: hidden;
  padding: 24rpx;
}

.collection-card::before {
  content: none;
}

.collection-card--study {
  box-shadow: inset 6rpx 0 0 rgba(74, 144, 226, 0.36);
}

.collection-card--life {
  box-shadow: inset 6rpx 0 0 rgba(244, 157, 37, 0.38);
}

.collection-card--psychology {
  box-shadow: inset 6rpx 0 0 rgba(136, 111, 222, 0.38);
}

.post-meta,
.post-content,
.post-images,
.post-footer {
  position: relative;
  z-index: 1;
}

.post-meta,
.post-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.post-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.source-badge,
.info-badge {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  min-height: 48rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  border: 1px solid transparent;
}

.source-badge {
  background: var(--surface-muted);
  color: var(--text-main);
}

.source-badge--study {
  border-color: rgba(74, 144, 226, 0.22);
}

.source-badge--life {
  border-color: rgba(244, 157, 37, 0.24);
}

.source-badge--psychology {
  border-color: rgba(136, 111, 222, 0.24);
}

.info-badge {
  background: rgba(148, 163, 184, 0.1);
  color: var(--text-sub);
}

.post-content {
  margin: 18rpx 0;
  font-size: 28rpx;
  line-height: 1.75;
  color: var(--text-main);
  white-space: pre-wrap;
}

.post-images {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10rpx;
  margin-bottom: 18rpx;
}

.post-images.single {
  grid-template-columns: minmax(0, 1fr);
}

.post-image-wrap {
  position: relative;
  border-radius: 22rpx;
  overflow: hidden;
  aspect-ratio: 1 / 1;
}

.post-images.single .post-image-wrap {
  aspect-ratio: 16 / 9;
}

.post-image {
  width: 100%;
  height: 100%;
}

.more-mask {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.46);
  display: flex;
  align-items: center;
  justify-content: center;
}

.more-text {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
}

.author {
  display: flex;
  align-items: center;
  gap: 10rpx;
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
  background: rgba(111, 222, 129, 0.12);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.author-text {
  color: var(--text-sub);
  font-size: 22rpx;
}

.feed-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12rpx;
}

.action-item {
  min-height: 60rpx;
  padding: 0 18rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border-radius: 999rpx;
  border: 1px solid var(--line);
  background: var(--surface-muted);
}

.action-item.compact {
  padding: 0 20rpx;
}

.action-item.active .footer-text {
  color: #f43f5e;
}

.action-item.active {
  background: rgba(244, 63, 94, 0.1);
  border-color: rgba(244, 63, 94, 0.18);
}

.action-item.saved .footer-text {
  color: #f59e0b;
}

.action-item.saved {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.24);
}

.action-item.disabled {
  opacity: 0.5;
}

.footer-text {
  color: var(--text-sub);
  font-size: 22rpx;
  font-weight: 600;
}

@media screen and (max-width: 520px) {
  .mine-collections-page {
    padding-bottom: 40rpx;
  }

  .guest-preview,
  .hero-stats,
  .stats-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .post-meta,
  .post-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .post-time {
    margin-top: 4rpx;
  }

  .feed-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
