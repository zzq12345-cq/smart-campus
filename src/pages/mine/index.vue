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
          <!-- 消息未读绿色通知小圆点 -->
          <view v-if="visibleUnreadCount > 0" class="icon-badge-dot" />
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
            <text class="avatar-mask-text">{{
              avatarUploading ? avatarUploadingText : avatarEditText
            }}</text>
          </view>
          <!-- 亮绿色编辑图标 -->
          <view class="edit-dot" @tap.stop="handleAvatarUpload">
            <Icon name="edit" :size="12" color="#ffffff" />
          </view>
        </view>
        <text class="name">{{ profileName }}</text>
        <text class="meta">{{ profileMeta }}</text>
        <!-- 浅绿学号药丸 -->
        <view class="id-pill">
          <text class="id-text">{{ pageData.idLabel }}: {{ profileId }}</text>
          <Icon name="content_copy" :size="12" color="#64748b" />
        </view>
      </view>

      <view class="stats-card">
        <view
          v-for="(item, index) in statsCards"
          :key="index"
          class="stat-item"
          :class="{ bordered: index === 1 }"
        >
          <text class="stat-value">{{ item.value }}</text>
          <text class="stat-label">{{ item.label }}</text>
        </view>
      </view>

      <!-- 我的服务标题 -->
      <view class="section-title">
        <Icon name="widgets" :size="20" color="#6fde81" />
        <text>{{ pageData.serviceTitle }}</text>
      </view>

      <!-- 2x2 快捷入口卡片网格 -->
      <view class="quick-grid">
        <view
          v-for="item in serviceCards"
          :key="item.key"
          class="quick-card"
          :data-service-key="item.key"
          @tap="handleServiceTap(item)"
        >
          <!-- 圆形背景图标框 -->
          <view class="quick-icon-wrap" :class="'quick-icon-' + item.key">
            <Icon :name="item.icon" :size="24" color="#22c55e" />
          </view>
          <view class="quick-info">
            <text class="quick-title">{{ item.title }}</text>
            <text class="quick-subtitle">{{ item.subtitle }}</text>
          </view>
          <Icon name="chevron_right" :size="16" color="#cbd5e1" />
        </view>
      </view>
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
const { totalUnreadCount, refreshUnreadCount, startAutoRefresh, stopAutoRefresh } =
  useConversations()
const {
  totalUnreadCount: notifUnreadCount,
  startCountPolling,
  stopCountPolling,
} = useNotifications()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const pageData = computed(() => getMinePageData(uiPreferencesStore.locale))
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8'))
const isTabBarVisible = ref(false)
const visibleUnreadCount = computed(() =>
  authStore.isLoggedIn ? totalUnreadCount.value + notifUnreadCount.value : 0,
)
const notificationBadgeText = computed(() =>
  visibleUnreadCount.value > 99 ? '99+' : String(visibleUnreadCount.value),
)
const myPostCount = ref(0)
const myLikeCount = ref(0)
const avatarUploading = ref(false)
const educationAuthSnapshot = ref(educationSessionService.getSnapshot())
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const profileName = computed(() =>
  String(authStore.dbUser?.name || authStore.user?.name || pageData.value.name),
)
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
const statsFollowersLabel = computed(() =>
  t(I18N_KEYS.mineStatsFollowers, uiPreferencesStore.locale),
)
const statsLikesLabel = computed(() => t(I18N_KEYS.mineStatsLikes, uiPreferencesStore.locale))
const avatarEditText = computed(() => (isZh.value ? '更换头像' : 'Change avatar'))
const avatarUploadingText = computed(() => (isZh.value ? '上传中...' : 'Uploading...'))

const myFollowersCount = computed(() => Number(authStore.dbUser?.followersCount || 0))

const statsCards = computed(() =>
  pageData.value.stats.map((item) => {
    if (item.label === statsPostsLabel.value) {
      return {
        ...item,
        value: String(myPostCount.value),
      }
    }
    if (item.label === statsFollowersLabel.value) {
      return {
        ...item,
        value: String(myFollowersCount.value),
      }
    }
    if (item.label === statsLikesLabel.value) {
      return {
        ...item,
        value: String(myLikeCount.value),
      }
    }
    return item
  }),
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
  const isZh = uiPreferencesStore.locale === 'zh-CN'

  // 找出需要的 3 个基础服务
  const postsCard = pageData.value.services.find((item) => item.key === 'posts')
  const ordersCard = pageData.value.services.find((item) => item.key === 'orders')
  const collectionsCard = pageData.value.services.find((item) => item.key === 'collections')

  const cards: any[] = []

  if (postsCard) {
    cards.push({
      ...postsCard,
      subtitle: getPostsServiceSubtitle(myPostCount.value),
      badgeText: '',
    })
  }

  if (ordersCard) {
    cards.push({
      ...ordersCard,
      subtitle: isZh ? '校园商城记录' : 'Campus store records',
      badgeText: '',
    })
  }

  // 消息中心
  cards.push({
    key: 'messages',
    icon: 'mail',
    title: isZh ? '消息中心' : 'Message Center',
    subtitle: getMessagesServiceSubtitle(visibleUnreadCount.value),
    badgeText: visibleUnreadCount.value > 0 ? notificationBadgeText.value : '',
  })

  if (collectionsCard) {
    cards.push({
      ...collectionsCard,
      subtitle: isZh ? '保存的资源' : 'Saved resources',
      badgeText: '',
    })
  }

  const identityCard = pageData.value.services.find((item) => item.key === 'identity')
  if (identityCard) {
    cards.push({
      ...identityCard,
      subtitle: getIdentityServiceSubtitle(),
      badgeText: '',
    })
  }

  return cards
})

const hasServiceOverflow = computed(() => serviceCards.value.length > 4)

type MineSettingKey = 'theme' | 'language' | 'robotSkin' | 'help' | 'about'
type RobotSettings = {
  skin: RobotSkinId
}

const ROBOT_SETTINGS_STORAGE_KEY = 'mine.robot-settings'

const robotSkin = ref<RobotSkinId>('default')

const VALID_ROBOT_SKIN_IDS = new Set<string>([
  'default',
  'nebula',
  'mint',
  'sunset',
  'ocean',
  'golden',
])
const isRobotSkin = (value: unknown): value is RobotSkinId =>
  typeof value === 'string' && VALID_ROBOT_SKIN_IDS.has(value)

const SKIN_NAME_KEYS: Record<RobotSkinId, string> = {
  default: I18N_KEYS.mineRobotSkinDefault,
  nebula: I18N_KEYS.mineRobotSkinNebula,
  mint: I18N_KEYS.mineRobotSkinMint,
  sunset: I18N_KEYS.mineRobotSkinSunset,
  ocean: I18N_KEYS.mineRobotSkinOcean,
  golden: I18N_KEYS.mineRobotSkinGolden,
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
    skin: robotSkin.value,
  }
  uni.setStorageSync(ROBOT_SETTINGS_STORAGE_KEY, payload)
}

const settingsWithValue = computed(() => {
  const list = pageData.value.settings.filter(
    (item) => item.key === 'theme' || item.key === 'language',
  )
  return list.map((item) => {
    if (item.key === 'theme') {
      return {
        ...item,
        icon: 'light_mode',
        value:
          uiPreferencesStore.theme === 'light'
            ? uiPreferencesStore.locale === 'zh-CN'
              ? '亮'
              : 'Light'
            : uiPreferencesStore.locale === 'zh-CN'
              ? '暗'
              : 'Dark',
      }
    }
    if (item.key === 'language') {
      return {
        ...item,
        icon: 'forum',
        value: getLocaleLabel(uiPreferencesStore.locale, uiPreferencesStore.locale),
      }
    }
    return {
      ...item,
      value: '',
    }
  })
})

function navigateToLogin() {
  uni.navigateTo({
    url: '/pages/mine/login?redirect=' + encodeURIComponent('/pages/mine/index'),
  })
}

function navigateToRegister() {
  uni.navigateTo({
    url: '/pages/mine/register?redirect=' + encodeURIComponent('/pages/mine/index'),
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
    url: `/pages/${payload.section}/post-detail?id=${payload.postId}`,
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
    icon: 'none',
  })
}

const openMessagesCenter = () => {
  if (!authStore.isLoggedIn) {
    navigateToLogin()
    return
  }
  uni.navigateTo({
    url: '/pages/messages/index',
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
    file: typeof File !== 'undefined' && source.file instanceof File ? source.file : undefined,
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
        fail: reject,
      })
    })

    const normalized =
      (Array.isArray(result.tempFiles)
        ? result.tempFiles.map((item) => normalizeChosenImage(item)).find(Boolean)
        : null) ||
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
      file: normalized.file,
    })
    await authStore.updateProfile({
      avatar: avatarUrl,
    })
    uni.showToast({
      title: isZh.value ? '头像已更新' : 'Avatar updated',
      icon: 'success',
    })
  } catch (error) {
    if (isCancelError(error)) {
      return
    }
    console.error('upload avatar failed:', error)
    uni.showToast({
      title:
        extractErrorMessage(error) || (isZh.value ? '头像上传失败' : 'Failed to upload avatar'),
      icon: 'none',
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
      url: '/pages/mine/posts',
    })
    return
  }

  if (item.key === 'messages') {
    openMessagesCenter()
    return
  }

  if (item.key === 'collections') {
    uni.navigateTo({
      url: '/pages/mine/collections',
    })
    return
  }

  if (item.key === 'identity') {
    uni.navigateTo({
      url: '/pages/mine/identity',
    })
    return
  }

  if (item.key === 'points') {
    uni.navigateTo({
      url: '/pages/mine/points',
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
      icon: 'success',
    })
  } catch (error) {
    console.error('logout failed:', error)
    uni.showToast({
      title: t(I18N_KEYS.mineLogoutFailed, uiPreferencesStore.locale),
      icon: 'none',
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
    animation: false,
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
    educationAuthSnapshot.value = educationSessionService.getSnapshot(
      String(authStore.user?.$id || '').trim(),
    )
    await authStore.refreshProfile()
    await Promise.all([
      loadMyPostCount(),
      loadMyLikeCount(),
      refreshUnreadCount().catch(() => undefined),
    ])
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
  padding: 16rpx 28rpx 240rpx;
  background-image: url('/static/mine_bg.png');
  background-size: 100% auto;
  background-position: top center;
  background-repeat: no-repeat;
  background-color: var(--page-bg);
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
  background: #ef4444; /* 红色未读指示点 */
  border: 2rpx solid #ffffff;
}

.theme-light {
  --page-bg: #ffffff;
  --glass-bg: rgba(255, 255, 255, 0.68);
  --glass-border: rgba(255, 255, 255, 0.78);
  --glass-shadow: 0 4rpx 14rpx rgba(31, 38, 135, 0.05);
  --surface: rgba(255, 255, 255, 0.68);
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #64748b;
  --line: rgba(255, 255, 255, 0.78);
  --topbar-bg: transparent;
  --avatar-ring: #ffffff;
}

.theme-dark {
  --page-bg: linear-gradient(180deg, #131f15 0%, #15251a 35%, #15131f 100%);
  --glass-bg: rgba(30, 41, 59, 0.55);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.2);
  --surface: rgba(30, 41, 59, 0.55);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --line: rgba(255, 255, 255, 0.1);
  --topbar-bg: transparent;
  --avatar-ring: rgba(30, 41, 59, 0.55);
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

  &:active {
    opacity: 0.7;
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
  background: #22c55e;
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
  margin-top: 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.avatar-wrap {
  position: relative;
  width: 160rpx;
  height: 160rpx;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 6rpx solid #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(74, 222, 128, 0.15);
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
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #22c55e; /* 绿色编辑小按钮 */
  border: 4rpx solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.name {
  color: var(--text-main);
  font-size: 44rpx;
  font-weight: 700;
}

.meta {
  color: var(--text-sub);
  font-size: 24rpx;
}

.id-pill {
  margin-top: 4rpx;
  border-radius: 999rpx;
  background: rgba(74, 222, 128, 0.08);
  padding: 10rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.id-text {
  color: #166534;
  font-size: 22rpx;
  font-weight: 600;
}

.stats-card {
  margin-top: 52rpx;
  border-radius: 32rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 30rpx 24rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  box-shadow: var(--glass-shadow);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;

  &.bordered {
    border-left: 1px solid rgba(0, 0, 0, 0.05);
    border-right: 1px solid rgba(0, 0, 0, 0.05);
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
  margin-top: 34rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  color: var(--text-main);
  font-size: 34rpx;
  font-weight: 700;
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
  padding: 22rpx;
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
  background: rgba(74, 222, 128, 0.12); /* 浅绿底 */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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

.logout-wrap {
  margin-top: 24rpx;
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
  box-shadow: var(--glass-shadow);
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
