<template>
  <view :class="['profile-page', themeClass]">
    <view class="ambient-glow ambient-glow--top"></view>
    <view class="ambient-glow ambient-glow--mid"></view>

    <!-- Top bar -->
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ t(I18N_KEYS.profileTitle, locale) }}</text>
      </view>
    </view>

    <!-- Loading state -->
    <view v-if="loading" class="state-card">
      <view class="spinner"></view>
      <text class="state-text">{{ t(I18N_KEYS.commonLoading, locale) }}</text>
    </view>

    <!-- Error state -->
    <view v-else-if="error === 'not_found'" class="state-card">
      <Icon name="person_off" :size="48" color="#94a3b8" />
      <text class="state-text">{{ t(I18N_KEYS.profileUserNotFound, locale) }}</text>
    </view>

    <view v-else-if="error" class="state-card">
      <text class="state-text">{{ t(I18N_KEYS.profileLoadError, locale) }}</text>
      <view class="retry-pill" @tap="loadProfile">
        <text>{{ isZh ? '重试' : 'Retry' }}</text>
      </view>
    </view>

    <!-- Main content -->
    <template v-else-if="profile">
      <!-- Hero card -->
      <view class="hero-card">
        <view class="hero-deco"></view>
        <view class="hero-content">
          <view class="avatar-ring">
            <image
              class="avatar"
              :src="avatarUrl || '/static/avatar-default.png'"
              mode="aspectFill"
              lazy-load
            />
          </view>
          <view class="hero-info">
            <text class="hero-name">{{ displayName }}</text>
            <view v-if="school" class="hero-meta-row">
              <Icon name="school" :size="14" color="#94a3b8" />
              <text class="hero-meta-text">{{ school }}</text>
            </view>
            <view class="hero-meta-row">
              <view class="level-badge">
                <text>Lv.{{ level }}</text>
              </view>
            </view>
          </view>
        </view>
        <text class="bio-text">{{ bio || t(I18N_KEYS.profileNoBio, locale) }}</text>
      </view>

      <!-- Stats strip -->
      <view class="stats-strip">
        <view class="stat-cell">
          <text class="stat-num">{{ followingCount }}</text>
          <text class="stat-lbl">{{ t(I18N_KEYS.profileFollowing, locale) }}</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-cell">
          <text class="stat-num">{{ followersCount }}</text>
          <text class="stat-lbl">{{ t(I18N_KEYS.profileFollowers, locale) }}</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-cell">
          <text class="stat-num">{{ postsCount }}</text>
          <text class="stat-lbl">{{ t(I18N_KEYS.profilePosts, locale) }}</text>
        </view>
      </view>

      <!-- Action buttons -->
      <view v-if="!isSelf" class="action-row">
        <view
          :class="['action-btn', 'follow-btn', { 'is-following': isFollowing }]"
          @tap="handleToggleFollow"
        >
          <Icon
            :name="isFollowing ? 'person_remove' : 'person_add'"
            :size="16"
            :color="isFollowing ? '#94a3b8' : '#ffffff'"
          />
          <text class="action-btn-text">{{
            isFollowing
              ? t(I18N_KEYS.profileUnfollow, locale)
              : t(I18N_KEYS.profileFollow, locale)
          }}</text>
        </view>
        <view class="action-btn message-btn" @tap="handleMessage">
          <Icon name="mail" :size="16" :color="iconColor" />
          <text class="action-btn-text msg-text">{{ t(I18N_KEYS.profileMessage, locale) }}</text>
        </view>
      </view>

      <!-- Posts section -->
      <view class="section-head">
        <view class="section-line"></view>
        <text class="section-tag">{{ t(I18N_KEYS.profilePosts, locale) }}</text>
        <view class="section-line"></view>
      </view>

      <view v-if="postsLoading && posts.length === 0" class="posts-loading">
        <view class="spinner small"></view>
      </view>

      <view v-else-if="posts.length === 0" class="empty-posts">
        <Icon name="article" :size="36" color="#94a3b8" />
        <text class="empty-text">{{ t(I18N_KEYS.profileEmptyPosts, locale) }}</text>
      </view>

      <view v-else class="post-list">
        <view
          v-for="post in posts"
          :key="post.$id"
          :class="['post-card', `section-${post.section || 'psychology'}`]"
          @tap="navigateToPost(post)"
        >
          <view class="post-meta">
            <view class="post-tags">
              <view class="post-badge section-badge">
                <Icon :name="sectionIcon(post.section)" :size="12" :color="sectionAccent(post.section)" />
                <text>{{ sectionLabel(post.section) }}</text>
              </view>
              <view class="post-badge topic-badge">
                <text>{{ topicLabel(post.topic) }}</text>
              </view>
              <view v-if="post.images && post.images.length > 0" class="post-badge media-badge">
                <Icon name="image" :size="12" :color="sectionAccent(post.section)" />
                <text>{{ post.images.length }}{{ isZh ? '图' : ' img' }}</text>
              </view>
            </view>
            <text class="post-time">{{ formatTime(post.$createdAt) }}</text>
          </view>
          <text class="post-body">{{ post.content }}</text>
          <view
            v-if="post.images && post.images.length > 0"
            :class="['post-images', { single: post.images.length === 1 }]"
          >
            <view
              v-for="(img, idx) in post.images.slice(0, 3)"
              :key="`${post.$id}-${idx}`"
              class="post-image-wrap"
            >
              <image class="post-image" :src="img" mode="aspectFill" lazy-load />
              <view v-if="idx === 2 && post.images.length > 3" class="more-mask">
                <text class="more-text">+{{ post.images.length - 3 }}</text>
              </view>
            </view>
          </view>
          <view class="post-footer">
            <view class="post-actions">
              <view class="post-action" :class="{ liked: likedPostMap[post.$id] }">
                <Icon :name="likedPostMap[post.$id] ? 'favorite' : 'favorite_border'" :size="15" :color="likedPostMap[post.$id] ? '#F43F5E' : '#94a3b8'" />
                <text>{{ post.likeCount || 0 }}</text>
              </view>
              <view class="post-action">
                <Icon name="chat_bubble" :size="15" color="#94a3b8" />
                <text>{{ post.commentCount || 0 }}</text>
              </view>
            </view>
          </view>
        </view>

        <view v-if="posts.length < postsCount" class="load-more-btn" @tap="loadMorePosts">
          <text>{{ postsLoading ? (isZh ? '加载中...' : 'Loading...') : (isZh ? '加载更多' : 'Load more') }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import { useUserProfile } from '@/composables/useUserProfile'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import conversationsService from '@/services/conversations'
import postInteractionsService from '@/services/post-interactions'
import type { Post } from '@/types/post'
import { requireAuth } from '@/utils/auth-guard'

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const locale = computed(() => uiPreferencesStore.locale)
const isZh = computed(() => locale.value === 'zh-CN')
const iconColor = computed(() => (uiPreferencesStore.theme === 'dark' ? '#cbd5e1' : '#64748b'))

const targetUserId = ref('')
const {
  profile,
  posts,
  postsCount,
  isFollowing,
  isSelf,
  loading,
  postsLoading,
  error,
  displayName,
  avatarUrl,
  bio,
  school,
  level,
  followersCount,
  followingCount,
  loadProfile,
  loadPosts,
  toggleFollow
} = useUserProfile(() => targetUserId.value)

const PAGE_SIZE = 20
const likedPostIds = ref<Set<string>>(new Set())

async function enrichLikeStatus() {
  if (!authStore.isLoggedIn || posts.value.length === 0) return
  try {
    const ids = posts.value.map((p) => p.$id)
    const likeMap = await postInteractionsService.getMyLikesForPosts(ids)
    likedPostIds.value = new Set(likeMap.keys())
  } catch {
    // silent fail
  }
}

function isPostLiked(postId: string) {
  return likedPostIds.value.has(postId)
}

const likedPostMap = computed(() => {
  const map: Record<string, boolean> = {}
  for (const post of posts.value) {
    map[post.$id] = likedPostIds.value.has(post.$id)
  }
  return map
})

onLoad(async (options?: Record<string, string>) => {
  const uid = options?.userId || ''
  if (!uid) {
    error.value = 'not_found'
    return
  }
  targetUserId.value = uid
  await loadProfile()
  await loadPosts(PAGE_SIZE, 0)
  await enrichLikeStatus()
})

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/mine/index' })
  }
}

async function handleMessage() {
  if (!(await ensureAuthenticatedAction())) {
    return
  }
  try {
    uni.showLoading({ title: isZh.value ? '正在创建会话...' : 'Creating chat...' })
    const conversation = await conversationsService.findOrCreateDirectConversation(targetUserId.value)
    uni.hideLoading()
    uni.navigateTo({ url: `/pages/messages/chat?conversationId=${conversation.$id}` })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({
      title: isZh.value ? '发起私信失败' : 'Failed to start chat',
      icon: 'none'
    })
  }
}

function getCurrentProfileUrl() {
  const uid = encodeURIComponent(targetUserId.value || '')
  return `/pages/profile/index?userId=${uid}`
}

async function ensureAuthenticatedAction() {
  await authStore.init()
  if (!authStore.isLoggedIn) {
    return requireAuth(getCurrentProfileUrl())
  }

  const refreshed = await authStore.refreshProfile()
  if (refreshed) {
    return true
  }

  await authStore.logout()
  return requireAuth(getCurrentProfileUrl())
}

function handleToggleFollow() {
  if (!authStore.isLoggedIn) {
    requireAuth(getCurrentProfileUrl())
    return
  }

  toggleFollow().catch(() => {
    uni.showToast({
      title: isZh.value ? '关注操作失败' : 'Follow action failed',
      icon: 'none'
    })
  })
}

function navigateToPost(post: Post) {
  const section = post.section || 'psychology'
  uni.navigateTo({ url: `/pages/${section}/post-detail?id=${post.$id}` })
}

async function loadMorePosts() {
  if (postsLoading.value) return
  await loadPosts(PAGE_SIZE, posts.value.length)
  await enrichLikeStatus()
}

const SECTION_CONFIG: Record<string, { accent: string; icon: string }> = {
  study: { accent: '#4A90E2', icon: 'book_2' },
  life: { accent: '#f49d25', icon: 'shopping_bag' },
  psychology: { accent: '#886fde', icon: 'spa' }
}

const TOPIC_LABELS_ZH: Record<string, string> = {
  course_review: '课程', exam_info: '考试', learning_material: '资料', competition: '竞赛',
  life_help: '求助', second_hand: '二手', activity: '活动', job: '兼职', rental: '租房',
  daily: '日常', mood: '心情', relationship: '关系', future: '未来', night: '深夜'
}
const TOPIC_LABELS_EN: Record<string, string> = {
  course_review: 'Course', exam_info: 'Exam', learning_material: 'Material', competition: 'Contest',
  life_help: 'Help', second_hand: 'Market', activity: 'Event', job: 'Jobs', rental: 'Rental',
  daily: 'Daily', mood: 'Mood', relationship: 'Relation', future: 'Future', night: 'Night'
}

const SECTION_LABELS_ZH: Record<string, string> = { study: '学习', life: '生活', psychology: '心理' }
const SECTION_LABELS_EN: Record<string, string> = { study: 'Study', life: 'Life', psychology: 'Psych' }

function topicLabel(topic?: string) {
  if (!topic) return ''
  return isZh.value ? (TOPIC_LABELS_ZH[topic] || topic) : (TOPIC_LABELS_EN[topic] || topic)
}

function sectionLabel(section?: string) {
  if (!section) return ''
  return isZh.value ? (SECTION_LABELS_ZH[section] || section) : (SECTION_LABELS_EN[section] || section)
}

function sectionIcon(section?: string) {
  return SECTION_CONFIG[section || 'psychology']?.icon || 'spa'
}

function sectionAccent(section?: string) {
  return SECTION_CONFIG[section || 'psychology']?.accent || '#886fde'
}

function formatTime(raw?: string) {
  if (!raw) return ''
  const date = new Date(raw)
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return isZh.value ? '刚刚' : 'Just now'
  if (minutes < 60) return `${minutes}${isZh.value ? '分钟前' : 'm ago'}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}${isZh.value ? '小时前' : 'h ago'}`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}${isZh.value ? '天前' : 'd ago'}`
  return date.toLocaleDateString()
}
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  padding: 0 24rpx 64rpx;
  background: var(--page-bg);
  position: relative;
  overflow: hidden;
}

.theme-light {
  --page-bg: #f5f7f5;
  --surface: #ffffff;
  --surface-elevated: rgba(255, 255, 255, 0.92);
  --text-main: #0f172a;
  --text-sub: #475569;
  --text-soft: #94a3b8;
  --accent: #6fde81;
  --accent-muted: rgba(111, 222, 129, 0.14);
  --accent-strong: rgba(111, 222, 129, 0.28);
  --line: rgba(111, 222, 129, 0.16);
  --topbar-bg: rgba(245, 247, 245, 0.88);
  --card-shadow: 0 2rpx 16rpx rgba(15, 23, 42, 0.05);
  --hero-gradient: linear-gradient(145deg, rgba(111, 222, 129, 0.08) 0%, transparent 60%);
  --follow-active-bg: var(--surface);
  --follow-active-border: var(--line);
}

.theme-dark {
  --page-bg: #0f1a12;
  --surface: rgba(20, 38, 25, 0.82);
  --surface-elevated: rgba(25, 48, 32, 0.9);
  --text-main: #f1f5f9;
  --text-sub: #94a3b8;
  --text-soft: #64748b;
  --accent: #6fde81;
  --accent-muted: rgba(111, 222, 129, 0.1);
  --accent-strong: rgba(111, 222, 129, 0.22);
  --line: rgba(111, 222, 129, 0.2);
  --topbar-bg: rgba(15, 26, 18, 0.88);
  --card-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.2);
  --hero-gradient: linear-gradient(145deg, rgba(111, 222, 129, 0.06) 0%, transparent 60%);
  --follow-active-bg: rgba(20, 38, 25, 0.6);
  --follow-active-border: var(--line);
}

/* Ambient lighting */
.ambient-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(120rpx);
  opacity: 0.45;
}

.ambient-glow--top {
  width: 480rpx;
  height: 480rpx;
  top: -140rpx;
  right: -100rpx;
  background: radial-gradient(circle, rgba(111, 222, 129, 0.25), transparent 70%);
}

.ambient-glow--mid {
  width: 320rpx;
  height: 320rpx;
  top: 400rpx;
  left: -80rpx;
  background: radial-gradient(circle, rgba(111, 222, 129, 0.12), transparent 70%);
}

/* Top bar */
.top-bar {
  position: sticky;
  top: 0;
  z-index: 30;
  height: 88rpx;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

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

/* States */
.state-card {
  margin-top: 160rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.state-text {
  color: var(--text-soft);
  font-size: 28rpx;
}

.retry-pill {
  padding: 12rpx 40rpx;
  border-radius: 999rpx;
  border: 1px solid var(--line);
  background: var(--surface);

  text {
    color: var(--text-sub);
    font-size: 26rpx;
    font-weight: 600;
  }
}

.spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid var(--accent-muted);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.75s linear infinite;

  &.small {
    width: 32rpx;
    height: 32rpx;
    border-width: 3rpx;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Hero card */
.hero-card {
  margin-top: 16rpx;
  border-radius: 28rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--card-shadow);
  padding: 36rpx 32rpx 28rpx;
  position: relative;
  overflow: hidden;
}

.hero-deco {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 180rpx;
  background: var(--hero-gradient);
  pointer-events: none;
}

.hero-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 28rpx;
}

.avatar-ring {
  width: 136rpx;
  height: 136rpx;
  min-width: 136rpx;
  border-radius: 50%;
  padding: 5rpx;
  background: linear-gradient(135deg, var(--accent) 0%, rgba(111, 222, 129, 0.3) 100%);
}

.avatar {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4rpx solid var(--surface);
  box-sizing: border-box;
}

.hero-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.hero-name {
  color: var(--text-main);
  font-size: 44rpx;
  font-weight: 800;
  letter-spacing: -0.5rpx;
  line-height: 1.15;
}

.hero-meta-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.hero-meta-text {
  color: var(--text-soft);
  font-size: 24rpx;
}

.level-badge {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: var(--accent-muted);

  text {
    color: var(--accent);
    font-size: 22rpx;
    font-weight: 700;
  }
}

.bio-text {
  position: relative;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1px solid var(--line);
  color: var(--text-sub);
  font-size: 26rpx;
  line-height: 1.6;
  font-style: italic;
}

/* Stats strip */
.stats-strip {
  margin-top: 20rpx;
  border-radius: 22rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--card-shadow);
  padding: 24rpx 16rpx;
  display: flex;
  align-items: center;
}

.stat-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.stat-num {
  color: var(--text-main);
  font-size: 40rpx;
  font-weight: 800;
  letter-spacing: -0.5rpx;
}

.stat-lbl {
  color: var(--text-soft);
  font-size: 22rpx;
  text-transform: uppercase;
  letter-spacing: 1rpx;
  font-weight: 500;
}

.stat-divider {
  width: 1rpx;
  height: 48rpx;
  background: var(--line);
}

/* Action buttons */
.action-row {
  margin-top: 20rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.action-btn {
  height: 80rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  transition: all 0.25s ease;
}

.follow-btn {
  background: var(--accent);
  box-shadow: 0 4rpx 16rpx rgba(111, 222, 129, 0.3);

  .action-btn-text {
    color: #ffffff;
    font-weight: 700;
    font-size: 28rpx;
  }

  &.is-following {
    background: var(--follow-active-bg);
    border: 1px solid var(--follow-active-border);
    box-shadow: none;

    .action-btn-text {
      color: var(--text-soft);
      font-weight: 600;
    }
  }
}

.message-btn {
  background: var(--surface);
  border: 1px solid var(--line);

  .msg-text {
    color: var(--text-main);
    font-weight: 600;
    font-size: 28rpx;
  }
}

/* Section heading */
.section-head {
  margin-top: 36rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.section-line {
  flex: 1;
  height: 1rpx;
  background: var(--line);
}

.section-tag {
  color: var(--text-soft);
  font-size: 22rpx;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 3rpx;
}

/* Posts */
.posts-loading {
  padding: 40rpx;
  display: flex;
  justify-content: center;
}

.empty-posts {
  padding: 60rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.empty-text {
  color: var(--text-soft);
  font-size: 26rpx;
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.post-card {
  --card-accent: var(--accent);
  --card-accent-bg: var(--accent-muted);
  --card-accent-text: var(--accent);
  --card-border: var(--line);
  --card-shadow-color: rgba(0, 0, 0, 0.04);

  border-radius: 26rpx;
  border: 1px solid var(--card-border);
  background: var(--surface);
  padding: 24rpx;
  box-shadow: 0 10rpx 22rpx var(--card-shadow-color);
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.985);
  }
}

.post-card.section-study {
  --card-accent: #4A90E2;
  --card-accent-bg: rgba(74, 144, 226, 0.14);
  --card-accent-text: #3f7dcb;
  --card-border: rgba(74, 144, 226, 0.2);
  --card-shadow-color: rgba(74, 144, 226, 0.08);
}

.post-card.section-life {
  --card-accent: #f49d25;
  --card-accent-bg: rgba(244, 157, 37, 0.14);
  --card-accent-text: #b45309;
  --card-border: rgba(244, 157, 37, 0.22);
  --card-shadow-color: rgba(244, 157, 37, 0.08);
}

.post-card.section-psychology {
  --card-accent: #886fde;
  --card-accent-bg: rgba(136, 111, 222, 0.14);
  --card-accent-text: #7359d3;
  --card-border: rgba(136, 111, 222, 0.2);
  --card-shadow-color: rgba(136, 111, 222, 0.08);
}

.post-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.post-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
}

.post-badge {
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

.section-badge {
  background: var(--card-accent-bg);
  color: var(--card-accent-text);
}

.topic-badge {
  background: var(--card-accent-bg);
  color: var(--card-accent-text);
  opacity: 0.85;
}

.media-badge {
  background: var(--card-accent-bg);
  color: var(--card-accent-text);
  opacity: 0.75;
}

.post-time {
  color: var(--text-soft);
  font-size: 22rpx;
  flex-shrink: 0;
}

.post-body {
  margin-top: 14rpx;
  color: var(--text-main);
  font-size: 27rpx;
  line-height: 1.65;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.post-images {
  margin-top: 14rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10rpx;
}

.post-images.single {
  grid-template-columns: minmax(0, 1fr);
}

.post-image-wrap {
  position: relative;
  height: 176rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: var(--card-accent-bg);
}

.post-images.single .post-image-wrap {
  height: 320rpx;
}

.post-image {
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

.post-footer {
  margin-top: 18rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-top: 14rpx;
  border-top: 1px dashed var(--card-border);
}

.post-actions {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.post-action {
  display: flex;
  align-items: center;
  gap: 6rpx;

  text {
    color: var(--text-soft);
    font-size: 22rpx;
  }

  &.liked text {
    color: #F43F5E;
  }
}

.load-more-btn {
  margin-top: 8rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  border: 1px dashed var(--line);
  display: flex;
  justify-content: center;

  text {
    color: var(--text-soft);
    font-size: 26rpx;
    font-weight: 600;
  }
}
</style>
