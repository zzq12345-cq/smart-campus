<template>
  <view :class="['messages-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ t(I18N_KEYS.messagesCenter, locale) }}</text>
      </view>
    </view>

    <view class="tabs">
      <view
        v-for="item in tabs"
        :key="item.key"
        :class="['tab-item', { active: activeTab === item.key }]"
        @tap="switchTab(item.key)"
      >
        <text>{{ item.label }}</text>
      </view>
    </view>

    <view v-if="activeTab === 'private'" class="content">
      <view v-if="loading" class="state-card">
        <text>{{ t(I18N_KEYS.messagesLoading, locale) }}</text>
      </view>

      <view v-else-if="error" class="state-card error">
        <text>{{ error }}</text>
        <view class="retry-btn" @tap="reloadConversations">
          <text>{{ t(I18N_KEYS.chatRetry, locale) }}</text>
        </view>
      </view>

      <view v-else-if="conversations.length === 0" class="state-card">
        <text>{{ t(I18N_KEYS.messagesEmpty, locale) }}</text>
      </view>

      <scroll-view v-else class="list-scroll" scroll-y>
        <view class="conversation-list">
          <ConversationItem
            v-for="conversation in conversations"
            :key="conversation.$id"
            :conversation="conversation"
            :current-user-id="currentUserId"
            @click="openConversation"
            @archive="archiveConversationItem"
          />
        </view>
      </scroll-view>
    </view>

    <view v-else class="content">
      <view v-if="notificationLoading" class="state-card">
        <text>{{ t(I18N_KEYS.notificationLoading, locale) }}</text>
      </view>

      <view v-else-if="notificationError" class="state-card error">
        <text>{{ notificationError }}</text>
        <view class="retry-btn" @tap="reloadNotifications">
          <text>{{ t(I18N_KEYS.chatRetry, locale) }}</text>
        </view>
      </view>

      <view v-else-if="notifications.length === 0" class="state-card">
        <Icon name="notifications" :size="28" color="#94a3b8" />
        <text>{{ t(I18N_KEYS.notificationEmpty, locale) }}</text>
      </view>

      <template v-else>
        <view v-if="notificationUnreadCount > 0" class="mark-all-read" @tap="handleMarkAllRead">
          <text>{{ t(I18N_KEYS.notificationMarkAllRead, locale) }}</text>
        </view>
        <scroll-view class="list-scroll" scroll-y>
          <view class="notification-list">
            <NotificationItem
              v-for="item in notifications"
              :key="item.$id"
              :notification="item"
              @click="handleNotificationTap"
            />
          </view>
        </scroll-view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onHide, onLoad, onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import ConversationItem from '@/components/conversation/ConversationItem.vue'
import NotificationItem from '@/components/notification/NotificationItem.vue'
import { useConversations } from '@/composables/useConversations'
import { useNotifications } from '@/composables/useNotifications'
import postsService from '@/services/posts'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import type { NotificationListItem } from '@/types/notification'

type TabKey = 'private' | 'notification'

const TAB_STORAGE_KEY = 'messages.center.active-tab'

const uiStore = useUiPreferencesStore()
const authStore = useAuthStore()
const { conversations, loading, error, loadConversations, archiveConversation, startAutoRefresh, stopAutoRefresh } =
  useConversations()
const {
  notifications,
  loading: notificationLoading,
  error: notificationError,
  totalUnreadCount: notificationUnreadCount,
  loadNotifications,
  markAsRead: markNotificationAsRead,
  markAllAsRead,
  startAutoRefresh: startNotificationRefresh,
  stopAutoRefresh: stopNotificationRefresh
} = useNotifications()

const locale = computed(() => uiStore.locale)

const activeTab = ref<TabKey>('private')
const tabs = computed(() => [
  { key: 'private' as const, label: t(I18N_KEYS.messagesPrivate, locale.value) },
  { key: 'notification' as const, label: t(I18N_KEYS.messagesNotification, locale.value) }
])

const themeClass = computed(() => `theme-${uiStore.theme}`)
const iconColor = computed(() => (uiStore.theme === 'light' ? '#334155' : '#cbd5e1'))
const currentUserId = computed(() => String(authStore.user?.$id || authStore.dbUser?.$id || '').trim())

const saveActiveTab = () => {
  uni.setStorageSync(TAB_STORAGE_KEY, activeTab.value)
}

const restoreActiveTab = () => {
  const stored = uni.getStorageSync(TAB_STORAGE_KEY)
  if (stored === 'notification' || stored === 'private') {
    activeTab.value = stored
    return
  }
  activeTab.value = 'private'
}

const switchTab = async (tab: TabKey) => {
  activeTab.value = tab
  saveActiveTab()
  if (tab === 'private') {
    stopNotificationRefresh()
    await loadConversations({ silent: true })
    startAutoRefresh(10000)
  } else {
    stopAutoRefresh()
    await loadNotifications({ silent: true })
    startNotificationRefresh(15000)
  }
}

const reloadConversations = async () => {
  await loadConversations()
}

const openConversation = (conversationId: string) => {
  const target = conversations.value.find((item) => item.$id === conversationId)
  const title = encodeURIComponent(target?.peerName || target?.peerUserId || t(I18N_KEYS.messagesPrivate, locale.value))
  const peerId = encodeURIComponent(target?.peerUserId || '')
  uni.navigateTo({
    url: `/pages/messages/chat?conversationId=${encodeURIComponent(conversationId)}&title=${title}&peerUserId=${peerId}`
  })
}

const archiveConversationItem = (conversationId: string) => {
  uni.showModal({
    title: t(I18N_KEYS.messagesArchiveTitle, locale.value),
    content: t(I18N_KEYS.messagesArchiveContent, locale.value),
    success: async (res) => {
      if (!res.confirm) {
        return
      }
      try {
        await archiveConversation(conversationId)
        uni.showToast({
          title: t(I18N_KEYS.messagesArchived, locale.value),
          icon: 'success'
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err || '')
        uni.showToast({
          title: message || t(I18N_KEYS.messagesArchiveFailed, locale.value),
          icon: 'none'
        })
      }
    }
  })
}

const reloadNotifications = async () => {
  await loadNotifications()
}

const navigateToPost = async (postId: string, focusComment = false) => {
  try {
    const post = await postsService.getPost(postId)
    const section = post?.section || 'study'
    const query = [`id=${encodeURIComponent(postId)}`]
    if (focusComment) {
      query.push('focus=comment')
    }
    uni.navigateTo({ url: `/pages/${section}/post-detail?${query.join('&')}` })
  } catch {
    uni.showToast({ title: t(I18N_KEYS.commonLoadError, locale.value), icon: 'none' })
  }
}

const handleNotificationTap = async (notification: NotificationListItem) => {
  if (!notification.isRead) {
    markNotificationAsRead(notification.$id).catch(() => undefined)
  }

  const targetId = String(notification.targetId || '').trim()
  if (!targetId) return

  if (notification.type === 'follow') {
    uni.navigateTo({ url: `/pages/profile/index?userId=${notification.actorId}` })
    return
  }

  const focusComment = notification.type === 'comment' || notification.type === 'reply'
  await navigateToPost(targetId, focusComment)
}

const handleMarkAllRead = () => {
  uni.showToast({
    title: t(I18N_KEYS.notificationAllRead, locale.value),
    icon: 'success'
  })
  markAllAsRead().catch(() => undefined)
}

const goBack = () => {

  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/mine/index' })
  }
}

onLoad((query) => {
  uiStore.initFromSystem()
  restoreActiveTab()
  const tab = String(query?.tab || '').trim()
  if (tab === 'notification' || tab === 'private') {
    activeTab.value = tab
    saveActiveTab()
  }
})

onShow(async () => {
  uiStore.setActiveSection('mine')
  await authStore.refreshProfile()
  if (activeTab.value === 'private') {
    await loadConversations({ silent: true })
    startAutoRefresh(10000)
  } else {
    await loadNotifications({ silent: true })
    startNotificationRefresh(15000)
  }
})

onHide(() => {
  stopAutoRefresh()
  stopNotificationRefresh()
})

onPullDownRefresh(async () => {
  try {
    if (activeTab.value === 'private') {
      await loadConversations()
    } else {
      await loadNotifications()
    }
  } finally {
    uni.stopPullDownRefresh()
  }
})
</script>

<style scoped lang="scss">
.messages-page {
  min-height: 100vh;
  background: var(--page-bg);
  padding: 16rpx 24rpx 30rpx;
}

.theme-light {
  --page-bg: #f6f8fb;
  --surface: #ffffff;
  --line: rgba(148, 163, 184, 0.22);
  --text-main: #0f172a;
  --text-sub: #64748b;
}

.theme-dark {
  --page-bg: #121b2c;
  --surface: rgba(15, 23, 42, 0.86);
  --line: rgba(148, 163, 184, 0.32);
  --text-main: #f1f5f9;
  --text-sub: #94a3b8;
}

.top-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
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

.tabs {
  margin-top: 8rpx;
  padding: 8rpx;
  border-radius: 20rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8rpx;
}

.tab-item {
  min-height: 72rpx;
  border-radius: 14rpx;
  color: var(--text-sub);
  font-size: 26rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-item.active {
  background: #4a90e2;
  color: #ffffff;
}

.content {
  margin-top: 16rpx;
}

.list-scroll {
  height: calc(100vh - 240rpx);
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding-bottom: 20rpx;
}

.state-card,
.notification-placeholder {
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 36rpx 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;

  text {
    color: var(--text-sub);
    font-size: 24rpx;
    text-align: center;
    line-height: 1.6;
  }
}

.state-card.error {
  border-color: rgba(239, 68, 68, 0.32);
}

.retry-btn {
  margin-top: 4rpx;
  border-radius: 999rpx;
  border: 1px solid rgba(74, 144, 226, 0.3);
  background: rgba(74, 144, 226, 0.14);
  padding: 10rpx 20rpx;

  text {
    color: #2f6fbc;
    font-size: 22rpx;
    font-weight: 600;
  }
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding-bottom: 20rpx;
}

.mark-all-read {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12rpx;

  text {
    color: #4a90e2;
    font-size: 24rpx;
    font-weight: 600;
  }
}
</style>
