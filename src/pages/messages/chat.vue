<template>
  <view :class="['chat-page', themeClass]">
    <view class="top-bar">
      <view class="top-bar-left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
      </view>
      <text class="top-bar-title">{{ pageTitle }}</text>
      <view class="top-bar-right" @tap="navigateToPeerProfile">
        <Icon name="more_horiz" :size="20" :color="iconColor" />
      </view>
    </view>

    <view v-if="loading && messages.length === 0" class="state-card">
      <text>{{ t(I18N_KEYS.chatLoadingConversation, locale) }}</text>
    </view>

    <view v-else-if="error && messages.length === 0" class="state-card error">
      <text>{{ error }}</text>
      <view class="retry-btn" @tap="reload">
        <text>{{ t(I18N_KEYS.chatRetry, locale) }}</text>
      </view>
    </view>

    <scroll-view
      v-else
      class="message-scroll"
      scroll-y
      scroll-with-animation
      :scroll-into-view="scrollIntoView"
      @scroll="handleScroll"
    >
      <view class="messages-shell">
        <view class="messages-list">
          <view v-if="loadingMore" class="load-more">
            <text>{{ t(I18N_KEYS.chatLoadingHistory, locale) }}</text>
          </view>

          <MessageBubble
            v-for="(item, index) in messages"
            :id="`message-${item.$id}`"
            :key="item.$id"
            :message="item"
            :current-user-id="currentUserId"
            :show-avatar="true"
            :sender-name="resolveSenderName(item.senderId)"
            :sender-avatar="resolveSenderAvatar(item.senderId)"
            @preview="previewImages"
            @longpress="handleMessageLongPress"
            @avatar-tap="navigateToProfile"
            @retry="handleRetryMessage"
          />

          <view v-if="!loading && messages.length === 0" class="empty-state">
            <view class="empty-icon">
              <Icon name="forum" :size="24" color="#6fde81" />
            </view>
            <text>{{ t(I18N_KEYS.chatEmptyHint, locale) }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <ChatInput
      :conversation-id="conversationId"
      :submitting="sending"
      :placeholder="t(I18N_KEYS.chatInputPlaceholder, locale)"
      @send="handleSend"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import ChatInput from '@/components/message/ChatInput.vue'
import MessageBubble from '@/components/message/MessageBubble.vue'
import { useConversations } from '@/composables/useConversations'
import { useMessages } from '@/composables/useMessages'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { MessageType } from '@/types/message'
import privateMessagingFunctionService from '@/services/private-messaging-function'

const uiStore = useUiPreferencesStore()
const authStore = useAuthStore()
const { markAsRead, refreshUnreadCount } = useConversations()
const locale = computed(() => uiStore.locale)

const pageTitle = ref(t(I18N_KEYS.chatTitle, uiStore.locale))
const peerUserId = ref('')
const senderNameMap = ref<Record<string, string>>({})
const senderAvatarMap = ref<Record<string, string>>({})

const {
  conversationId,
  messages,
  loading,
  loadingMore,
  sending,
  error,
  hasMore,
  latestMessageId,
  scrollIntoView,
  updateScrollAnchor,
  setConversation,
  loadMessages,
  loadMore,
  sendMessage,
  retryMessage,
  recallMessage,
  markCurrentConversationAsRead,
  startRealtimeUpdates,
  stopRealtimeUpdates
} = useMessages('', String(authStore.user?.$id || authStore.dbUser?.$id || '').trim())

const themeClass = computed(() => `theme-${uiStore.theme}`)
const iconColor = computed(() => (uiStore.theme === 'light' ? '#64748b' : '#cbd5e1'))
const currentUserId = computed(() => String(authStore.user?.$id || authStore.dbUser?.$id || '').trim())

const resolveSenderName = (senderId: string) => {
  if (senderId === currentUserId.value) {
    return t(I18N_KEYS.chatMe, locale.value)
  }
  return senderNameMap.value[senderId] || senderId
}

const resolveSenderAvatar = (senderId: string) => {
  if (senderId === currentUserId.value) {
    return String(authStore.dbUser?.avatar || '')
  }
  return senderAvatarMap.value[senderId] || ''
}

const shouldShowAvatar = (index: number) => {
  if (index === 0) {
    return true
  }
  const prev = messages.value[index - 1]
  const current = messages.value[index]
  return prev?.senderId !== current?.senderId
}

const resolveSenderProfiles = async () => {
  const targetIds = Array.from(
    new Set(
      messages.value
        .map((item) => String(item.senderId || '').trim())
        .filter((id) => id && id !== currentUserId.value)
    )
  )
  if (!targetIds.length) {
    return
  }
  try {
    const result = await privateMessagingFunctionService.resolveUsers(targetIds)
    const users = result.users || {}
    const nextNameMap: Record<string, string> = {}
    const nextAvatarMap: Record<string, string> = {}
    Object.entries(users).forEach(([userId, info]) => {
      nextNameMap[userId] = String(info.name || '').trim()
      nextAvatarMap[userId] = String(info.avatar || '').trim()
    })
    senderNameMap.value = { ...senderNameMap.value, ...nextNameMap }
    senderAvatarMap.value = { ...senderAvatarMap.value, ...nextAvatarMap }
  } catch (err) {
    console.error('Load sender profiles failed:', err)
  }
}

const syncReadState = async () => {
  const latestId = latestMessageId.value
  if (!conversationId.value || !latestId) {
    return
  }
  await markCurrentConversationAsRead()
  await markAsRead(conversationId.value, latestId)
}

const reload = async () => {
  await loadMessages({ reset: true })
  await resolveSenderProfiles()
  await syncReadState()
}

const handleSend = (payload: { content: string; attachments: string[]; messageType: MessageType }) => {
  const text = String(payload.content || '').trim()
  const attachments = payload.attachments || []

  const doSend = async () => {
    if (text && attachments.length) {
      await sendMessage({ content: text, attachments: [], messageType: 'text' })
      await sendMessage({ content: '', attachments, messageType: 'image' })
    } else {
      await sendMessage(payload)
    }
  }

  doSend()
    .then(() => Promise.all([resolveSenderProfiles(), refreshUnreadCount(), syncReadState()]))
    .catch(() => undefined)
}

const handleRetryMessage = (messageId: string) => {
  retryMessage(messageId)
}

const handleMessageLongPress = (messageId: string) => {
  const target = messages.value.find((item) => item.$id === messageId)
  if (!target || target.senderId !== currentUserId.value || target.status !== 'sent') {
    return
  }
  uni.showActionSheet({
    itemList: [t(I18N_KEYS.chatRecallAction, locale.value)],
    success: async () => {
      try {
        await recallMessage(messageId)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err || '')
        uni.showToast({
          title: message || t(I18N_KEYS.chatRecallFailed, locale.value),
          icon: 'none'
        })
      }
    }
  })
}

const previewImages = (current: string, urls: string[]) => {
  if (!urls.length) {
    return
  }
  uni.previewImage({
    urls,
    current
  })
}

let scrollThrottleTimer: ReturnType<typeof setTimeout> | null = null
const handleScroll = (event: { detail?: { scrollTop?: number } }) => {
  if (scrollThrottleTimer || !hasMore.value || loadingMore.value || loading.value) {
    return
  }
  const top = Number(event?.detail?.scrollTop || 0)
  if (top <= 20) {
    scrollThrottleTimer = setTimeout(() => {
      scrollThrottleTimer = null
    }, 200)
    loadMore().catch(() => undefined)
  }
}

const goBack = () => {

  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.navigateTo({ url: '/pages/messages/index' })
  }
}

const navigateToPeerProfile = () => {
  if (!peerUserId.value) return
  uni.navigateTo({ url: `/pages/profile/index?userId=${peerUserId.value}` })
}

const navigateToProfile = (senderId: string) => {
  if (!senderId || senderId === currentUserId.value) return
  uni.navigateTo({ url: `/pages/profile/index?userId=${senderId}` })
}

let syncReadTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => latestMessageId.value,
  (value) => {
    if (!value || !conversationId.value) {
      return
    }
    if (syncReadTimer) clearTimeout(syncReadTimer)
    syncReadTimer = setTimeout(() => {
      syncReadState()
    }, 800)
  }
)

let initialLoadDone = false
onLoad(async (query) => {
  uiStore.initFromSystem()
  await authStore.refreshProfile()
  const id = String(query?.conversationId || '').trim()
  const title = decodeURIComponent(String(query?.title || '').trim())
  peerUserId.value = String(query?.peerUserId || '').trim()
  pageTitle.value = title || t(I18N_KEYS.chatTitle, locale.value)
  setConversation(id)
  await reload()
  if (!peerUserId.value) {
    const otherIds = Object.keys(senderNameMap.value).filter((k) => k !== currentUserId.value)
    if (otherIds.length === 1) peerUserId.value = otherIds[0]
  }
  if (peerUserId.value) {
    const peerName = senderNameMap.value[peerUserId.value]
    if (peerName) pageTitle.value = peerName
  }
  startRealtimeUpdates()
  initialLoadDone = true
  setTimeout(() => updateScrollAnchor(), 300)
})

onShow(() => {
  if (initialLoadDone && conversationId.value) {
    startRealtimeUpdates()
  }
})

onHide(() => {
  stopRealtimeUpdates()
})

onUnload(() => {
  stopRealtimeUpdates()
})
</script>

<style scoped lang="scss">
.chat-page {
  min-height: 100vh;
  background: var(--page-bg);
  display: flex;
  flex-direction: column;
}

.theme-light {
  --page-bg: #ededed;
  --surface: #ffffff;
  --surface-soft: rgba(255, 255, 255, 0.92);
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(111, 222, 129, 0.18);
  --topbar-bg: #f7f7f7;
  --composer-surface: rgba(255, 255, 255, 0.96);
  --composer-field: #ffffff;
  --composer-field-line: rgba(111, 222, 129, 0.2);
  --bubble-mine-start: #95ec69;
  --bubble-mine-end: #95ec69;
  --send-icon-color: #000000;
  --bubble-other-bg: #ffffff;
  --bubble-other-line: rgba(111, 222, 129, 0.18);
  --bubble-status-bg: rgba(111, 222, 129, 0.08);
}

.theme-dark {
  --page-bg: #111111;
  --surface: rgba(15, 30, 20, 0.78);
  --surface-soft: rgba(15, 30, 20, 0.88);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --line: transparent;
  --topbar-bg: #1e1e1e;
  --composer-surface: rgba(15, 30, 20, 0.94);
  --composer-field: #292929;
  --composer-field-line: transparent;
  --bubble-mine-start: #3eb575;
  --bubble-mine-end: #3eb575;
  --send-icon-color: #ffffff;
  --bubble-other-bg: #2c2c2c;
  --bubble-other-line: transparent;
  --bubble-status-bg: rgba(111, 222, 129, 0.1);
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 88rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  background: var(--page-bg, #ededed);
}

.top-bar-left,
.top-bar-right {
  width: 60rpx;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.top-bar-left {
  justify-content: flex-start;
}

.top-bar-right {
  justify-content: flex-end;
}

.top-bar-title {
  color: var(--text-main);
  font-size: 34rpx;
  font-weight: 700;
  text-align: center;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-scroll {
  flex: 1;
  min-height: 0;
  padding: 12rpx 24rpx 140rpx;
  box-sizing: border-box;
}

.messages-shell {
  width: 100%;
  display: flex;
  justify-content: center;
  box-sizing: border-box;
}

.messages-list {
  width: 100%;
  max-width: 860rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  padding: 20rpx 18rpx 28rpx;
  border-radius: 28rpx;
  background: var(--page-bg, #ededed);
  box-sizing: border-box;
}

.load-more {
  align-self: center;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(111, 222, 129, 0.12);

  text {
    color: #4fae66;
    font-size: 21rpx;
  }
}

.state-card,
.empty-state {
  width: calc(100% - 48rpx);
  max-width: 860rpx;
  margin: 20rpx auto 0;
  border-radius: 28rpx;
  border: 1px solid var(--line);
  background: var(--surface-soft);
  padding: 38rpx 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;

  text {
    color: var(--text-sub);
    font-size: 24rpx;
    line-height: 1.7;
    text-align: center;
  }
}

.state-card.error {
  border-color: rgba(239, 68, 68, 0.22);
}

.retry-btn {
  min-height: 60rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  border: 1px solid rgba(111, 222, 129, 0.26);
  background: rgba(111, 222, 129, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    color: #4fae66;
    font-size: 22rpx;
    font-weight: 600;
  }
}

.empty-state {
  margin: 0;
  width: 100%;
  max-width: none;
}

.empty-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(111, 222, 129, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
