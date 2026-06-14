<template>
  <view :class="['ai-chat-page', themeClass]">
    <view class="top-bar">
      <view class="top-bar-left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
      </view>
      <text class="top-bar-title">{{ t(I18N_KEYS.aiChatTitle, locale) }}</text>
      <view class="top-bar-right" @tap="handleRightAction">
        <Icon :name="activeTab === 'chat' ? 'delete' : 'done_all'" :size="20" :color="iconColor" />
      </view>
    </view>

    <!-- Tab Navigation -->
    <view class="tab-nav">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab-item', { active: activeTab === tab.value }]"
        @tap="switchTab(tab.value)"
      >
        <text class="tab-label">{{ tab.label }}</text>
        <view v-if="tab.value === 'notifications' && unreadCount > 0" class="tab-badge">
          <text class="badge-text">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
        </view>
      </view>
    </view>

    <view v-if="loading && messages.length === 0" class="state-card">
      <text>{{ t(I18N_KEYS.aiChatLoading, locale) }}</text>
    </view>

    <view v-else-if="error && messages.length === 0" class="state-card error">
      <text>{{ error }}</text>
      <view class="retry-btn" @tap="retry">
        <text>{{ t(I18N_KEYS.chatRetry, locale) }}</text>
      </view>
    </view>

    <!-- Chat Tab Content -->
    <scroll-view
      v-if="activeTab === 'chat'"
      class="message-scroll"
      scroll-y
      scroll-with-animation
      :scroll-into-view="scrollIntoView"
    >
      <view class="messages-shell">
        <view class="messages-list">
          <view
            v-for="(item, index) in messages"
            :id="`message-${index}`"
            :key="index"
            :class="['message-bubble', item.role]"
          >
            <view v-if="item.role === 'assistant'" class="avatar ai-avatar">
              <RobotAvatar :skin-id="pointsStore.equippedSkinId" size="small" />
            </view>
            <view class="bubble-content">
              <text class="bubble-text">{{ item.content }}</text>
              <text class="bubble-time">{{ formatTime(item.timestamp) }}</text>
            </view>
            <view v-if="item.role === 'user'" class="avatar user-avatar">
              <Icon name="person" :size="16" color="#ffffff" />
            </view>
          </view>

          <view v-if="thinking" class="message-bubble assistant thinking-bubble">
            <view class="avatar ai-avatar">
              <RobotAvatar :skin-id="pointsStore.equippedSkinId" size="small" />
            </view>
            <view class="bubble-content">
              <text class="bubble-text thinking-text">{{ t(I18N_KEYS.aiChatThinking, locale) }}</text>
            </view>
          </view>

          <view v-if="!loading && messages.length === 0" class="empty-state">
            <view class="empty-icon">
              <Icon name="psychology" :size="24" color="#886fde" />
            </view>
            <text>{{ t(I18N_KEYS.aiChatEmptyHint, locale) }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- Notifications Tab Content -->
    <scroll-view
      v-else-if="activeTab === 'notifications'"
      class="notification-scroll"
      scroll-y
      refresher-enabled
      :refresher-triggered="notificationsRefreshing"
      @refresherrefresh="refreshNotifications"
    >
      <view class="notifications-shell">
        <!-- Loading State -->
        <view v-if="notificationsLoading && notifications.length === 0" class="state-card">
          <text>{{ t(I18N_KEYS.notificationLoading, locale) }}</text>
        </view>

        <!-- Empty State -->
        <view v-else-if="!notificationsLoading && notifications.length === 0" class="state-card">
          <view class="empty-icon">
            <Icon name="notifications_none" :size="24" color="#886fde" />
          </view>
          <text>{{ t(I18N_KEYS.notificationEmpty, locale) }}</text>
        </view>

        <!-- Notifications List -->
        <view v-else class="notifications-list">
          <view
            v-for="item in notifications"
            :key="item.$id"
            :class="['notification-item', { unread: !item.isRead }]"
            @tap="handleNotificationTap(item)"
          >
            <view class="notification-avatar">
              <image
                v-if="item.actorAvatar"
                class="avatar-img"
                :src="item.actorAvatar"
                mode="aspectFill"
              />
              <Icon v-else name="person" :size="20" color="#94a3b8" />
            </view>
            <view class="notification-content">
              <text class="notification-text">{{ item.preview }}</text>
              <text class="notification-time">{{ formatTime(new Date(item.$createdAt).getTime()) }}</text>
            </view>
            <view v-if="!item.isRead" class="unread-dot" />
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- Chat Input (only show in chat tab) -->
    <view v-if="activeTab === 'chat'" class="chat-input-bar">
      <view class="chat-input-bar__inner">
        <view class="text-input-shell">
          <textarea
            v-model="inputText"
            class="text-input"
            auto-height
            :maxlength="500"
            :placeholder="t(I18N_KEYS.aiChatPlaceholder, locale)"
            @confirm="handleSend"
          />
        </view>
        <view class="send-btn" :class="{ disabled: sendDisabled }" @tap="handleSend">
          <Icon v-if="sending" name="hourglass_top" :size="18" />
          <Icon v-else name="send" :size="18" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import Icon from '@/components/common/Icon.vue'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { useAuthStore } from '@/stores/auth'
import { usePointsStore } from '@/stores/points'
import RobotAvatar from '@/components/common/RobotAvatar.vue'
import aiChatService from '@/services/ai-chat.service'
import notificationsService from '@/services/notifications'
import type { NotificationListItem } from '@/types/notification'

interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

type TabValue = 'chat' | 'notifications'

// Tab configuration
const tabs = computed(() => [
  { value: 'chat' as TabValue, label: t(I18N_KEYS.aiChatTitle, locale.value) },
  { value: 'notifications' as TabValue, label: t(I18N_KEYS.commonNotifications, locale.value) }
])

// Tab state
const activeTab = ref<TabValue>('chat')

// Notifications state
const notifications = ref<NotificationListItem[]>([])
const notificationsLoading = ref(false)
const notificationsRefreshing = ref(false)
const unreadCount = ref(0)

const STORAGE_KEY = 'ai_chat_history'

const uiStore = useUiPreferencesStore()
const authStore = useAuthStore()
const pointsStore = usePointsStore()
const locale = computed(() => uiStore.locale)

const messages = ref<DisplayMessage[]>([])
const inputText = ref('')
const loading = ref(false)
const sending = ref(false)
const thinking = ref(false)
const error = ref('')
const scrollIntoView = ref('')

const themeClass = computed(() => `theme-${uiStore.theme}`)
const iconColor = computed(() => (uiStore.theme === 'light' ? '#64748b' : '#cbd5e1'))

const sendDisabled = computed(() => {
  const text = String(inputText.value || '').trim()
  return sending.value || thinking.value || !text
})

const loadHistory = () => {
  loading.value = true
  error.value = ''
  try {
    const stored = uni.getStorageSync(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        messages.value = parsed
      }
    }
  } catch (err) {
    console.error('Failed to load chat history:', err)
    error.value = t(I18N_KEYS.aiChatError, locale.value)
  } finally {
    loading.value = false
  }
}

const saveHistory = () => {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(messages.value))
  } catch (err) {
    console.error('Failed to save chat history:', err)
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messages.value.length > 0) {
      scrollIntoView.value = `message-${messages.value.length - 1}`
    }
  })
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

const simulateAIResponse = async (userMessage: string): Promise<string> => {
  // Check if AI service is configured
  if (!aiChatService.isConfigured()) {
    // Fallback to demo mode if not logged in
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 800))
    const responses = [
      `请先登录后再使用 AI 助手功能。`,
      `I'm currently in demo mode. Please login to use AI features.`,
      `请登录账号以使用 AI 聊天功能。`
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  // Build message history for context
  const systemPrompt = {
    role: 'system' as const,
    content: `You are UniSmart AI Assistant, a helpful and friendly AI assistant for university students.
You provide support for academic questions, campus life, mental health, and general assistance.
Be concise, helpful, and empathetic. Respond in the same language the user uses.
If the user seems stressed or mentions mental health concerns, be supportive and suggest professional help if needed.`
  }

  const conversationMessages = [
    systemPrompt,
    ...messages.value.slice(-10).map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    { role: 'user' as const, content: userMessage }
  ]

  const result = await aiChatService.sendMessage({
    messages: conversationMessages,
    temperature: 0.7,
    maxTokens: 1000
  })

  if (!result.success || !result.content) {
    throw new Error(result.error || 'AI request failed')
  }

  return result.content
}

const handleSend = async () => {
  const text = String(inputText.value || '').trim()
  if (!text || sending.value || thinking.value) {
    return
  }

  const userId = authStore.dbUser?.$id
  if (userId) {
    const success = await pointsStore.spendForAi(userId, 'aiChatMessage', 'AI助手聊天')
    if (!success) {
      uni.showModal({
        title: t(I18N_KEYS.pointsInsufficient, locale.value),
        content: t(I18N_KEYS.pointsInsufficientDesc, locale.value),
        confirmText: t(I18N_KEYS.pointsGoToCenter, locale.value),
        success: (res) => {
          if (res.confirm) uni.navigateTo({ url: '/pages/mine/points' })
        }
      })
      return
    }
  }

  sending.value = true
  const userMessage: DisplayMessage = {
    role: 'user',
    content: text,
    timestamp: Date.now()
  }

  messages.value.push(userMessage)
  inputText.value = ''
  scrollToBottom()

  try {
    thinking.value = true
    scrollToBottom()

    const aiResponse = await simulateAIResponse(text)
    const assistantMessage: DisplayMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: Date.now()
    }

    thinking.value = false
    messages.value.push(assistantMessage)
    saveHistory()
    if (userId) {
      await pointsStore.completeDailyTask(userId, 'ai_chat_message')
      pointsStore.checkAndUnlockAchievement(userId, 'first_ai_chat')
    }
    scrollToBottom()
  } catch (err) {
    thinking.value = false
    const message = err instanceof Error ? err.message : String(err || '')
    uni.showToast({
      title: message || t(I18N_KEYS.aiChatSendFailed, locale.value),
      icon: 'none'
    })
  } finally {
    sending.value = false
  }
}

const clearHistory = () => {
  uni.showModal({
    title: t(I18N_KEYS.aiChatClearHistory, locale.value),
    content: t(I18N_KEYS.aiChatClearConfirm, locale.value),
    success: (res) => {
      if (res.confirm) {
        messages.value = []
        uni.removeStorageSync(STORAGE_KEY)
        uni.showToast({
          title: t(I18N_KEYS.aiChatCleared, locale.value),
          icon: 'success'
        })
      }
    }
  })
}

const retry = () => {
  loadHistory()
}

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/study/index' })
  }
}

// Tab switching
const switchTab = (tab: TabValue) => {
  activeTab.value = tab
  if (tab === 'notifications' && notifications.value.length === 0) {
    loadNotifications()
  }
}

// Load notifications
const loadNotifications = async () => {
  notificationsLoading.value = true
  try {
    const result = await notificationsService.listNotifications()
    if (result.success && result.data) {
      notifications.value = result.data
      unreadCount.value = result.data.filter((n) => !n.isRead).length
    }
  } catch (err) {
    console.error('Failed to load notifications:', err)
  } finally {
    notificationsLoading.value = false
  }
}

// Pull to refresh notifications
const refreshNotifications = async () => {
  notificationsRefreshing.value = true
  try {
    await loadNotifications()
  } finally {
    notificationsRefreshing.value = false
  }
}

// Handle notification tap
const handleNotificationTap = async (item: NotificationListItem) => {
  if (!item.isRead) {
    await notificationsService.markAsRead(item.$id)
    item.isRead = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }
  // TODO: Navigate to related content based on notification type
}

// Handle right action button (delete for chat, mark all read for notifications)
const handleRightAction = () => {
  if (activeTab.value === 'chat') {
    clearHistory()
  } else {
    // Mark all notifications as read
    notificationsService.markAllAsRead()
    notifications.value.forEach((n) => {
      n.isRead = true
    })
    unreadCount.value = 0
    uni.showToast({
      title: t(I18N_KEYS.notificationMarkAllRead, locale.value),
      icon: 'success'
    })
  }
}

onLoad((options) => {
  uiStore.initFromSystem()
  loadHistory()

  // Check URL parameter for tab selection
  if (options?.tab === 'notifications') {
    activeTab.value = 'notifications'
    loadNotifications()
  }

  nextTick(() => scrollToBottom())
})

watch(messages, () => {
  scrollToBottom()
}, { deep: true })
</script>

<style scoped lang="scss">
.ai-chat-page {
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
  --line: rgba(136, 111, 222, 0.18);
  --topbar-bg: #f7f7f7;
  --bubble-ai-bg: #ffffff;
  --bubble-user-start: #886fde;
  --bubble-user-end: #886fde;
  --send-icon-color: #ffffff;
  --ai-avatar-bg: #886fde;
  --user-avatar-bg: #6fde81;
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
  --bubble-ai-bg: #2c2c2c;
  --bubble-user-start: #6f4bd6;
  --bubble-user-end: #6f4bd6;
  --send-icon-color: #ffffff;
  --ai-avatar-bg: #886fde;
  --user-avatar-bg: #3eb575;
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

.message-bubble {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;

  &.user {
    flex-direction: row-reverse;
  }

  &.assistant {
    flex-direction: row;
  }
}

.avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-avatar {
  background: var(--ai-avatar-bg, #886fde);
}

.user-avatar {
  background: var(--user-avatar-bg, #6fde81);
}

.bubble-content {
  max-width: 70%;
  padding: 16rpx 20rpx;
  border-radius: 18rpx;
  background: var(--bubble-ai-bg, #ffffff);
  border: 1px solid var(--line, rgba(136, 111, 222, 0.18));
}

.user .bubble-content {
  background: linear-gradient(135deg, var(--bubble-user-start, #886fde), var(--bubble-user-end, #886fde));
  border: none;

  .bubble-text {
    color: #ffffff;
  }

  .bubble-time {
    color: rgba(255, 255, 255, 0.7);
  }
}

.bubble-text {
  color: var(--text-main);
  font-size: 28rpx;
  line-height: 1.5;
  word-break: break-word;
}

.bubble-time {
  display: block;
  margin-top: 8rpx;
  color: var(--text-soft);
  font-size: 20rpx;
  text-align: right;
}

.thinking-bubble {
  .thinking-text {
    animation: pulse 1.5s infinite;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
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
  border: 1px solid rgba(136, 111, 222, 0.26);
  background: rgba(136, 111, 222, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    color: #6f4bd6;
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
  background: rgba(136, 111, 222, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-input-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 20;
  padding: 10rpx 24rpx calc(10rpx + env(safe-area-inset-bottom));
  background: var(--topbar-bg, rgba(246, 248, 246, 0.9));
  border-top: 1px solid var(--line, rgba(136, 111, 222, 0.18));
}

.chat-input-bar__inner {
  --composer-height: 64rpx;

  max-width: 860rpx;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 10rpx;
}

.text-input-shell {
  flex: 1 1 auto;
  max-width: 560rpx;
  min-height: var(--composer-height);
  padding: 14rpx 18rpx;
  border-radius: 22rpx;
  border: 1px solid var(--line, rgba(136, 111, 222, 0.16));
  background: var(--surface, rgba(255, 255, 255, 0.96));
  box-sizing: border-box;
}

.text-input {
  width: 100%;
  min-height: 36rpx;
  max-height: 152rpx;
  color: var(--text-main, #0f172a);
  font-size: 28rpx;
  line-height: 36rpx;
}

.send-btn {
  width: var(--composer-height);
  height: var(--composer-height);
  min-height: var(--composer-height);
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--bubble-user-start, #886fde), var(--bubble-user-end, #886fde));
  box-shadow: 0 10rpx 22rpx rgba(136, 111, 222, 0.18);
  color: var(--send-icon-color, #ffffff);
}

.send-btn.disabled {
  opacity: 0.52;
}

// Tab Navigation Styles
.tab-nav {
  display: flex;
  padding: 0 24rpx;
  background: var(--page-bg);
  border-bottom: 1px solid var(--line);
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 0;
  position: relative;
  cursor: pointer;

  &.active {
    .tab-label {
      color: var(--text-main);
      font-weight: 600;
    }

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 48rpx;
      height: 4rpx;
      background: #886fde;
      border-radius: 2rpx;
    }
  }
}

.tab-label {
  color: var(--text-sub);
  font-size: 28rpx;
  transition: color 0.2s;
}

.tab-badge {
  margin-left: 8rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  background: #ef4444;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-text {
  color: #ffffff;
  font-size: 20rpx;
  font-weight: 600;
}

// Notifications Styles
.notification-scroll {
  flex: 1;
  min-height: 0;
  padding: 12rpx 24rpx;
  box-sizing: border-box;
}

.notifications-shell {
  width: 100%;
  max-width: 860rpx;
  margin: 0 auto;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 20rpx;
  border-radius: 20rpx;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  transition: background 0.2s;

  &.unread {
    background: rgba(136, 111, 222, 0.08);
    border-color: rgba(136, 111, 222, 0.2);
  }

  &:active {
    background: rgba(136, 111, 222, 0.12);
  }
}

.notification-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(136, 111, 222, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-text {
  color: var(--text-main);
  font-size: 26rpx;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-time {
  display: block;
  margin-top: 8rpx;
  color: var(--text-soft);
  font-size: 22rpx;
}

.unread-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #886fde;
  flex-shrink: 0;
  margin-top: 8rpx;
}
</style>
