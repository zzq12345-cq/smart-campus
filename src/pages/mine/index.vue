<template>
  <view :class="['mine-page', themeClass]">
    <view class="top-bar">
      <view class="left">
        <Icon name="person" :size="22" color="#6fde81" />
        <text class="title">{{ pageData.headerTitle }}</text>
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

    <view v-if="!authStore.isLoggedIn" class="guest-card">
      <view class="guest-icon">
        <Icon name="person" :size="26" color="#6fde81" />
      </view>
      <text class="guest-title">{{ guestTitle }}</text>
      <text class="guest-subtitle">{{ guestSubtitle }}</text>
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
      <view class="profile-card">
        <view class="avatar-wrap" @tap="handleAvatarUpload">
          <image class="avatar" :src="profileAvatar" mode="aspectFill" lazy-load />
          <view class="avatar-mask" :class="{ visible: avatarUploading }">
            <text class="avatar-mask-text">{{ avatarUploading ? avatarUploadingText : avatarEditText }}</text>
          </view>
          <view class="edit-dot" @tap.stop="handleAvatarUpload">
            <Icon :name="avatarUploading ? 'sync' : 'edit'" :size="12" color="#ffffff" />
          </view>
        </view>
        <text class="name">{{ profileName }}</text>
        <text class="meta">{{ profileMeta }}</text>
        <view class="id-pill">
          <text class="id-text">{{ pageData.idLabel }}: {{ profileId }}</text>
          <Icon name="content_copy" :size="12" :color="iconColor" />
        </view>
      </view>

      <view class="stats-card">
        <view v-for="(item, index) in statsCards" :key="index" class="stat-item" :class="{ bordered: index === 1 }">
          <text class="stat-value">{{ item.value }}</text>
          <text class="stat-label">{{ item.label }}</text>
        </view>
      </view>

      <view class="section-title">
        <Icon name="widgets" :size="20" color="#6fde81" />
        <text>{{ pageData.serviceTitle }}</text>
      </view>
      <scroll-view class="service-scroll" :scroll-x="hasServiceOverflow" show-scrollbar="false">
        <view :class="['service-grid', { 'is-overflow': hasServiceOverflow }]">
          <view
            v-for="(item, index) in serviceCards"
            :key="index"
            class="service-card"
            :data-service-key="item.key"
            @tap="handleServiceTap(item)"
          >
            <view class="service-head">
              <view class="service-icon">
                <Icon :name="item.icon" :size="18" color="#6fde81" />
              </view>
              <text class="service-title">{{ item.title }}</text>
              <view v-if="item.badgeText" class="service-badge">
                <text>{{ item.badgeText }}</text>
              </view>
            </view>
            <text class="service-subtitle">{{ item.subtitle }}</text>
          </view>
        </view>
      </scroll-view>

    </template>

    <view class="section-title">
      <Icon name="settings" :size="20" color="#6fde81" />
      <text>{{ pageData.settingTitle }}</text>
    </view>

    <view class="settings-list">
      <view
        v-for="(setting, index) in settingsWithValue"
        :key="index"
        class="setting-item"
        @tap="handleSettingTap(setting.key)"
      >
        <view class="setting-left">
          <Icon :name="setting.icon" :size="18" :color="iconColor" />
          <text class="setting-title">{{ setting.title }}</text>
        </view>
        <view class="setting-right">
          <text v-if="setting.value" class="setting-value">{{ setting.value }}</text>
          <Icon name="chevron_right" :size="16" :color="iconColor" />
        </view>
      </view>
    </view>

    <view v-if="authStore.isLoggedIn" class="logout-wrap">
      <view class="logout-btn" @tap="handleLogout">
        <text class="logout-text">{{ logoutLabel }}</text>
      </view>
    </view>

    <FloatingAiButton v-if="isTabBarVisible" />
    <AppTabBar v-if="isTabBarVisible" value="/pages/mine/index" />

    <SearchOverlay
      :visible="showSearch"
      current-section="all"
      accent-color="#6fde81"
      @close="showSearch = false"
      @select-post="onSearchSelectPost"
    />

    <RobotSkinSelector
      :visible="showSkinSelector"
      @close="showSkinSelector = false"
      @skin-changed="onSkinChanged"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import { getLocaleLabel, t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import { getPageData as getMinePageData } from '@/mocks/pages/mine'
import educationSessionService from '@/services/education-session'
import postsService from '@/services/posts'
import { uploadAvatarImage } from '@/services/storage'
import { useConversations } from '@/composables/useConversations'
import { useNotifications } from '@/composables/useNotifications'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { usePointsStore } from '@/stores/points'
import AppTabBar from '@/components/common/AppTabBar.vue'
import FloatingAiButton from '@/components/common/FloatingAiButton.vue'
import SearchOverlay from '@/components/common/SearchOverlay.vue'
import RobotSkinSelector from '@/components/common/RobotSkinSelector.vue'
import type { RobotSkinId } from '@/types/points'
import type { Post, PostSection } from '@/types/post'
import { requireAuth } from '@/utils/auth-guard'

interface ChooseImageTempFile {
  path?: string
  tempFilePath?: string
  file?: File
}

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()
const { totalUnreadCount, refreshUnreadCount, startAutoRefresh, stopAutoRefresh } = useConversations()
const { totalUnreadCount: notifUnreadCount, startCountPolling, stopCountPolling } = useNotifications()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const pageData = computed(() => getMinePageData(uiPreferencesStore.locale))
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8'))
const isTabBarVisible = ref(false)
const visibleUnreadCount = computed(() => (authStore.isLoggedIn ? totalUnreadCount.value + notifUnreadCount.value : 0))
const notificationBadgeText = computed(() =>
  visibleUnreadCount.value > 99 ? '99+' : String(visibleUnreadCount.value)
)
const myPostCount = ref(0)
const myLikeCount = ref(0)
const avatarUploading = ref(false)
const educationAuthSnapshot = ref(educationSessionService.getSnapshot())
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const profileName = computed(() => String(authStore.dbUser?.name || authStore.user?.name || pageData.value.name))
const profileMeta = computed(() => {
  const school = String(authStore.dbUser?.school || '').trim()
  return school || pageData.value.meta
})
const profileId = computed(() => {
  const userId = String(authStore.user?.$id || '')
  if (!userId) {
    return pageData.value.idValue
  }
  return userId.length > 12 ? `${userId.slice(0, 6)}...${userId.slice(-4)}` : userId
})
const profileAvatar = computed(() => String(authStore.dbUser?.avatar || pageData.value.avatar))

const guestTitle = computed(() => t(I18N_KEYS.mineGuestTitle, uiPreferencesStore.locale))
const guestSubtitle = computed(() => t(I18N_KEYS.mineGuestSubtitle, uiPreferencesStore.locale))
const loginLabel = computed(() => t(I18N_KEYS.mineLoginAction, uiPreferencesStore.locale))
const registerLabel = computed(() => t(I18N_KEYS.mineRegisterAction, uiPreferencesStore.locale))
const logoutLabel = computed(() => t(I18N_KEYS.mineLogoutAction, uiPreferencesStore.locale))
const statsPostsLabel = computed(() => t(I18N_KEYS.mineStatsPosts, uiPreferencesStore.locale))
const statsFollowersLabel = computed(() => t(I18N_KEYS.mineStatsFollowers, uiPreferencesStore.locale))
const statsLikesLabel = computed(() => t(I18N_KEYS.mineStatsLikes, uiPreferencesStore.locale))
const avatarEditText = computed(() => (isZh.value ? '更换头像' : 'Change avatar'))
const avatarUploadingText = computed(() => (isZh.value ? '上传中...' : 'Uploading...'))

const myFollowersCount = computed(() => Number(authStore.dbUser?.followersCount || 0))

const statsCards = computed(() =>
  pageData.value.stats.map((item) => {
    if (item.label === statsPostsLabel.value) {
      return {
        ...item,
        value: String(myPostCount.value)
      }
    }
    if (item.label === statsFollowersLabel.value) {
      return {
        ...item,
        value: String(myFollowersCount.value)
      }
    }
    if (item.label === statsLikesLabel.value) {
      return {
        ...item,
        value: String(myLikeCount.value)
      }
    }
    return item
  })
)

const getPostsServiceSubtitle = (count: number) => {
  if (count <= 0) {
    return isZh.value ? '还没有帖子，点击去管理' : 'No posts yet, tap to manage'
  }
  return isZh.value ? `共有 ${count} 篇帖子，点击管理` : `${count} posts, tap to manage`
}

const getMessagesServiceSubtitle = (count: number) => {
  if (count <= 0) {
    return isZh.value ? '查看私信与系统通知入口' : 'View private chats and updates'
  }
  return isZh.value ? `当前有 ${count} 条未读私信` : `${count} unread private messages`
}

const getIdentityServiceSubtitle = () =>
  educationAuthSnapshot.value
    ? t(I18N_KEYS.mineServiceIdentityConnectedDesc, uiPreferencesStore.locale)
    : t(I18N_KEYS.mineServiceIdentityDesc, uiPreferencesStore.locale)

const serviceCards = computed(() => {
  const normalizedCards = pageData.value.services.map((item) => {
    if (item.key === 'posts') {
      return {
        ...item,
        subtitle: getPostsServiceSubtitle(myPostCount.value),
        badgeText: ''
      }
    }

    if (item.key === 'identity') {
      return {
        ...item,
        subtitle: getIdentityServiceSubtitle(),
        badgeText: ''
      }
    }

    return {
      ...item,
      badgeText: ''
    }
  })

  return [
    ...normalizedCards.slice(0, 1),
    {
      key: 'messages',
      icon: 'mail',
      title: isZh.value ? '消息中心' : 'Message Center',
      subtitle: getMessagesServiceSubtitle(visibleUnreadCount.value),
      badgeText: visibleUnreadCount.value > 0 ? notificationBadgeText.value : ''
    },
    ...normalizedCards.slice(1)
  ]
})

const hasServiceOverflow = computed(() => serviceCards.value.length > 4)

type MineSettingKey = 'theme' | 'language' | 'robotSkin' | 'help' | 'about'
type RobotSettings = {
  skin: RobotSkinId
}

const ROBOT_SETTINGS_STORAGE_KEY = 'mine.robot-settings'

const robotSkin = ref<RobotSkinId>('default')

const VALID_ROBOT_SKIN_IDS = new Set<string>(['default', 'nebula', 'mint', 'sunset', 'ocean', 'golden'])
const isRobotSkin = (value: unknown): value is RobotSkinId => typeof value === 'string' && VALID_ROBOT_SKIN_IDS.has(value)

const SKIN_NAME_KEYS: Record<RobotSkinId, string> = {
  default: I18N_KEYS.mineRobotSkinDefault,
  nebula: I18N_KEYS.mineRobotSkinNebula,
  mint: I18N_KEYS.mineRobotSkinMint,
  sunset: I18N_KEYS.mineRobotSkinSunset,
  ocean: I18N_KEYS.mineRobotSkinOcean,
  golden: I18N_KEYS.mineRobotSkinGolden
}

const getRobotSkinLabel = (value: RobotSkinId) => {
  return t(SKIN_NAME_KEYS[value] || I18N_KEYS.mineRobotSkinDefault, uiPreferencesStore.locale)
}

const robotSkinLabel = computed(() => getRobotSkinLabel(robotSkin.value))

const loadRobotSettings = () => {
  const stored = uni.getStorageSync(ROBOT_SETTINGS_STORAGE_KEY) as Partial<RobotSettings> | null
  if (!stored || typeof stored !== 'object') {
    return
  }
  if (isRobotSkin(stored.skin)) {
    robotSkin.value = stored.skin
  }
}

const saveRobotSettings = () => {
  const payload: RobotSettings = {
    skin: robotSkin.value
  }
  uni.setStorageSync(ROBOT_SETTINGS_STORAGE_KEY, payload)
}

const settingsWithValue = computed(() =>
  pageData.value.settings.map((item) => {
    if (item.key === 'theme') {
      return {
        ...item,
        value:
          uiPreferencesStore.theme === 'light'
            ? t(I18N_KEYS.themeLight, uiPreferencesStore.locale)
            : t(I18N_KEYS.themeDark, uiPreferencesStore.locale)
      }
    }
    if (item.key === 'language') {
      return {
        ...item,
        value: getLocaleLabel(uiPreferencesStore.locale, uiPreferencesStore.locale)
      }
    }
    if (item.key === 'robotSkin') {
      return {
        ...item,
        value: robotSkinLabel.value
      }
    }
    return {
      ...item,
      value: ''
    }
  })
)

function navigateToLogin() {
  uni.navigateTo({
    url: '/pages/mine/login?redirect=' + encodeURIComponent('/pages/mine/index')
  })
}

function navigateToRegister() {
  uni.navigateTo({
    url: '/pages/mine/register?redirect=' + encodeURIComponent('/pages/mine/index')
  })
}

const showSearch = ref(false)
const showSkinSelector = ref(false)

const openSearch = () => {
  showSearch.value = true
}

const onSearchSelectPost = (payload: { postId: string; section: PostSection }) => {
  showSearch.value = false
  if (!payload.postId) return
  uni.navigateTo({
    url: `/pages/${payload.section}/post-detail?id=${payload.postId}`
  })
}

const pointsStore = usePointsStore()

const onSkinChanged = (skinId: RobotSkinId) => {
  robotSkin.value = skinId
  saveRobotSettings()
  showSkinSelector.value = false
}

const handleCommonAction = () => {
  uni.showToast({
    title: t(I18N_KEYS.commonComingSoon, uiPreferencesStore.locale),
    icon: 'none'
  })
}

const openMessagesCenter = () => {
  if (!authStore.isLoggedIn) {
    navigateToLogin()
    return
  }
  uni.navigateTo({
    url: '/pages/messages/index'
  })
}

const extractErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }
  return String(error || '').trim()
}

const isCancelError = (error: unknown) => /cancel/i.test(extractErrorMessage(error))

const normalizeChosenImage = (item: unknown) => {
  const source = item as ChooseImageTempFile
  const localPath = String(source?.path || source?.tempFilePath || '').trim()
  if (!localPath) {
    return null
  }
  return {
    localPath,
    file: typeof File !== 'undefined' && source.file instanceof File ? source.file : undefined
  }
}

async function handleAvatarUpload() {
  if (!authStore.isLoggedIn || avatarUploading.value) {
    return
  }

  try {
    const result = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: reject
      })
    })

    const normalized =
      (Array.isArray(result.tempFiles) ? result.tempFiles.map((item) => normalizeChosenImage(item)).find(Boolean) : null) ||
      (Array.isArray(result.tempFilePaths)
        ? (() => {
            const localPath = String(result.tempFilePaths[0] || '').trim()
            return localPath ? { localPath } : null
          })()
        : null)

    if (!normalized) {
      return
    }

    avatarUploading.value = true
    const avatarUrl = await uploadAvatarImage({
      localPath: normalized.localPath,
      file: normalized.file
    })
    await authStore.updateProfile({
      avatar: avatarUrl
    })
    uni.showToast({
      title: isZh.value ? '头像已更新' : 'Avatar updated',
      icon: 'success'
    })
  } catch (error) {
    if (isCancelError(error)) {
      return
    }
    console.error('upload avatar failed:', error)
    uni.showToast({
      title: extractErrorMessage(error) || (isZh.value ? '头像上传失败' : 'Failed to upload avatar'),
      icon: 'none'
    })
  } finally {
    avatarUploading.value = false
  }
}

const loadMyPostCount = async () => {
  if (!authStore.isLoggedIn) {
    myPostCount.value = 0
    return
  }
  try {
    myPostCount.value = await postsService.getMyPostsCount()
  } catch (error) {
    console.error('load my post count failed:', error)
    myPostCount.value = 0
  }
}

const loadMyLikeCount = async () => {
  if (!authStore.isLoggedIn) {
    myLikeCount.value = 0
    return
  }
  try {
    myLikeCount.value = await postsService.getMyPostsLikeCount()
  } catch (error) {
    console.error('load my likes failed:', error)
    myLikeCount.value = 0
  }
}

const handleServiceTap = (item: { key?: string }) => {
  if (item.key === 'posts') {
    uni.navigateTo({
      url: '/pages/mine/posts'
    })
    return
  }

  if (item.key === 'messages') {
    openMessagesCenter()
    return
  }

  if (item.key === 'collections') {
    uni.navigateTo({
      url: '/pages/mine/collections'
    })
    return
  }

  if (item.key === 'identity') {
    uni.navigateTo({
      url: '/pages/mine/identity'
    })
    return
  }

  if (item.key === 'points') {
    uni.navigateTo({
      url: '/pages/mine/points'
    })
    return
  }

  handleCommonAction()
}

async function handleLogout() {
  try {
    await authStore.logout()
    myPostCount.value = 0
    myLikeCount.value = 0
    uni.showToast({
      title: t(I18N_KEYS.mineLogoutSuccess, uiPreferencesStore.locale),
      icon: 'success'
    })
  } catch (error) {
    console.error('logout failed:', error)
    uni.showToast({
      title: t(I18N_KEYS.mineLogoutFailed, uiPreferencesStore.locale),
      icon: 'none'
    })
  }
}

const handleSettingTap = (key: MineSettingKey) => {
  if (key === 'theme') {
    uiPreferencesStore.toggleTheme()
    return
  }
  if (key === 'language') {
    uiPreferencesStore.setLocale(uiPreferencesStore.locale === 'zh-CN' ? 'en-US' : 'zh-CN')
    return
  }
  if (key === 'robotSkin') {
    if (!authStore.isLoggedIn) {
      navigateToLogin()
      return
    }
    showSkinSelector.value = true
    return
  }
  handleCommonAction()
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
  loadRobotSettings()
  uiPreferencesStore.initFromSystem()
  uiPreferencesStore.setActiveSection('mine')
  await authStore.init()

  if (authStore.isLoggedIn) {
    educationAuthSnapshot.value = educationSessionService.getSnapshot(String(authStore.user?.$id || '').trim())
    await authStore.refreshProfile()
    await Promise.all([loadMyPostCount(), loadMyLikeCount(), refreshUnreadCount().catch(() => undefined)])
    // Initialize points store for robot skin selector
    const userId = String(authStore.user?.$id || '').trim()
    if (userId && !pointsStore.initialized) {
      pointsStore.init(userId).catch(() => undefined)
    }
    startAutoRefresh(15000)
    startCountPolling(15000)
    return
  }

  stopAutoRefresh()
  stopCountPolling()
  myPostCount.value = 0
  myLikeCount.value = 0
  educationAuthSnapshot.value = null
})

onHide(() => {
  isTabBarVisible.value = false
  stopAutoRefresh()
  stopCountPolling()
})
</script>

<style lang="scss" scoped>
.mine-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 176rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f6f8f6;
  --surface: #ffffff;
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(111, 222, 129, 0.18);
  --topbar-bg: rgba(246, 248, 246, 0.9);
  --avatar-ring: #ffffff;
}

.theme-dark {
  --page-bg: #131f15;
  --surface: rgba(15, 30, 20, 0.78);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --line: rgba(111, 222, 129, 0.3);
  --topbar-bg: rgba(19, 31, 21, 0.9);
  --avatar-ring: #233728;
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

  .right {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }

  .title {
    color: var(--text-main);
    font-size: 34rpx;
    font-weight: 700;
  }
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
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

.guest-card {
  margin-top: 20rpx;
  border-radius: 26rpx;
  border: 1px solid var(--line);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.78));
  padding: 34rpx 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.theme-dark .guest-card {
  background: linear-gradient(160deg, rgba(18, 30, 20, 0.94), rgba(18, 30, 20, 0.84));
}

.guest-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: rgba(111, 222, 129, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
}

.guest-title {
  color: var(--text-main);
  font-size: 34rpx;
  font-weight: 700;
}

.guest-subtitle {
  color: var(--text-sub);
  font-size: 24rpx;
  text-align: center;
  line-height: 1.5;
}

.guest-actions {
  margin-top: 8rpx;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.primary-btn,
.secondary-btn {
  border-radius: 16rpx;
  min-height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
}

.primary-btn {
  background: #6fde81;
}

.primary-btn-text {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
}

.secondary-btn {
  background: transparent;
  border-color: var(--line);
}

.secondary-btn-text {
  color: var(--text-main);
  font-size: 28rpx;
  font-weight: 600;
}

.profile-card {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.avatar-wrap {
  position: relative;
  width: 144rpx;
  height: 144rpx;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 6rpx solid var(--avatar-ring);
}

.avatar-mask {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.36);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.avatar-mask.visible {
  opacity: 1;
}

.avatar-wrap:active .avatar-mask {
  opacity: 1;
}

.avatar-mask-text {
  color: #ffffff;
  font-size: 20rpx;
  font-weight: 700;
}

.edit-dot {
  position: absolute;
  right: 2rpx;
  bottom: 4rpx;
  width: 38rpx;
  height: 38rpx;
  border-radius: 50%;
  background: #6fde81;
  border: 2rpx solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.name {
  color: var(--text-main);
  font-size: 50rpx;
  font-weight: 700;
}

.meta {
  color: var(--text-sub);
  font-size: 24rpx;
}

.id-pill {
  margin-top: 4rpx;
  border-radius: 999rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 10rpx 20rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.id-text {
  color: var(--text-sub);
  font-size: 22rpx;
}

.stats-card {
  margin-top: 22rpx;
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 24rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;

  &.bordered {
    border-left: 1px solid var(--line);
    border-right: 1px solid var(--line);
  }
}

.stat-value {
  color: var(--text-main);
  font-size: 40rpx;
  font-weight: 700;
}

.stat-label {
  color: var(--text-soft);
  font-size: 21rpx;
  text-transform: uppercase;
  letter-spacing: 1rpx;
}

.section-title {
  margin-top: 30rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  color: var(--text-main);
  font-size: 34rpx;
  font-weight: 700;
}

.service-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.service-scroll {
  width: 100%;
}

.service-grid.is-overflow {
  width: max-content;
  grid-template-columns: none;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  grid-auto-flow: column;
  grid-auto-columns: 324rpx;
}

.service-card {
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.service-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.service-icon {
  width: 62rpx;
  height: 62rpx;
  border-radius: 50%;
  background: rgba(111, 222, 129, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-title {
  flex: 1;
  color: var(--text-main);
  font-size: 30rpx;
  font-weight: 700;
}

.service-badge {
  min-width: 34rpx;
  height: 34rpx;
  padding: 0 10rpx;
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

.service-subtitle {
  color: var(--text-soft);
  font-size: 22rpx;
  line-height: 1.4;
}

.logout-wrap {
  margin-top: 18rpx;
}

.logout-btn {
  min-height: 88rpx;
  border-radius: 20rpx;
  border: 1px solid rgba(239, 68, 68, 0.25);
  background: rgba(239, 68, 68, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-text {
  color: #ef4444;
  font-size: 28rpx;
  font-weight: 700;
}

.settings-list {
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  overflow: hidden;
}

.setting-item {
  min-height: 92rpx;
  border-bottom: 1px solid var(--line);
  padding: 0 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &:last-child {
    border-bottom: 0;
  }
}

.setting-left {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.setting-title {
  color: var(--text-main);
  font-size: 28rpx;
}

.setting-right {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.setting-value {
  color: var(--text-soft);
  font-size: 24rpx;
}
</style>
