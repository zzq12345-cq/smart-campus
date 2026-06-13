<template>
  <view :class="['counseling-page', themeClass]">
    <view class="top-bar">
      <view class="top-bar-left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
      </view>
      <text class="top-bar-title">{{ pageTitle }}</text>
      <view class="top-bar-right" @tap="showTransferHuman">
        <text class="transfer-text">{{ transferLabel }}</text>
      </view>
    </view>

    <view v-if="loading && messages.length === 0" class="state-card">
      <text class="state-text">{{ loadingText }}</text>
    </view>

    <scroll-view
      v-else
      class="message-scroll"
      scroll-y
      scroll-with-animation
      :scroll-into-view="scrollIntoView"
    >
      <view class="messages-shell">
        <view class="messages-list">
          <MessageBubble
            v-for="(item, index) in messages"
            :id="`msg-${item.$id}`"
            :key="item.$id"
            :message="item"
            :current-user-id="currentUserId"
            :show-avatar="true"
            :sender-name="item.senderId === BOT_ID ? botName : meLabel"
            :sender-avatar="item.senderId === currentUserId ? userAvatar : ''"
            @preview="() => {}"
          />

          <view v-if="showTyping" id="typing-bubble" class="typing-bubble">
            <view class="typing-dots">
              <text class="dot" />
              <text class="dot" />
              <text class="dot" />
            </view>
          </view>

          <view v-if="!loading && messages.length === 0" class="empty-state">
            <view class="empty-icon">
              <Icon name="psychology" :size="48" color="#886fde" />
            </view>
            <text class="empty-title">{{ emptyTitle }}</text>
            <text class="empty-desc">{{ emptyDesc }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <ChatInput
      conversation-id="counseling"
      accent-theme="psychology"
      :submitting="sending"
      :placeholder="inputPlaceholder"
      @send="handleSend"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ChatInput from '@/components/message/ChatInput.vue'
import MessageBubble from '@/components/message/MessageBubble.vue'
import aiChatService from '@/services/ai-chat.service'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import { useAuthStore } from '@/stores/auth'
import { usePointsStore } from '@/stores/points'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { Message } from '@/types/message'
import { usePsychologyNav } from '@/composables/usePsychologyNav'
import { requireAuth } from '@/utils/auth-guard'

const { goBack } = usePsychologyNav()

const BOT_ID = 'counseling-bot'
const STORAGE_KEY = 'counseling_chat_history'
const MAX_HISTORY_MESSAGES = 20

/** Legacy welcome message content to strip from loaded history (no longer shown) */
const WELCOME_CONTENT_ZH =
  '你好，我是心理助手。你可以在这里聊聊最近的心情或烦恼，我会倾听并陪伴你。如需专业支持，请点击右上角「转人工」。'
const WELCOME_CONTENT_EN =
  "Hi, I'm your mental health assistant. You can share how you've been feeling here; I'm here to listen. For professional support, tap 'Human' above."

const uiStore = useUiPreferencesStore()
const authStore = useAuthStore()
const pointsStore = usePointsStore()
const locale = computed(() => uiStore.locale)

const messages = ref<Message[]>([])
const loading = ref(false)
const sending = ref(false)
const showTyping = ref(false)
const scrollIntoView = ref('')

const themeClass = computed(() => `theme-${uiStore.theme}`)
const iconColor = computed(() => (uiStore.theme === 'light' ? '#64748b' : '#cbd5e1'))
const isZh = computed(() => uiStore.locale === 'zh-CN')
const currentUserId = computed(() => String(authStore.user?.$id || authStore.dbUser?.$id || '').trim())
const userAvatar = computed(() => String(authStore.dbUser?.avatar || ''))

const pageTitle = computed(() => (isZh.value ? '心理咨询' : 'Counseling'))
const transferLabel = computed(() => (isZh.value ? '转人工' : 'Human'))
const loadingText = computed(() => (isZh.value ? '加载中...' : 'Loading...'))
const botName = computed(() => (isZh.value ? '心理助手' : 'Assistant'))
const meLabel = computed(() => (isZh.value ? '我' : 'Me'))
const emptyTitle = computed(() => (isZh.value ? '和心理助手聊聊' : 'Chat with the assistant'))
const emptyDesc = computed(() =>
  isZh.value ? '倾听与陪伴，如需人工客服可点击右上角「转人工」' : 'Here to listen. Tap "Human" for real support.'
)
const inputPlaceholder = computed(() => (isZh.value ? '输入你的想法或感受...' : 'Share your thoughts...'))

function genId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function makeMessage(
  opts: {
    $id: string
    senderId: string
    content: string
    status?: Message['status']
  }
): Message {
  return {
    $id: opts.$id,
    conversationId: 'counseling',
    senderId: opts.senderId,
    content: opts.content,
    attachments: [],
    messageType: 'text',
    status: opts.status ?? 'sent',
    $createdAt: new Date().toISOString()
  }
}

function loadHistory() {
  try {
    const stored = uni.getStorageSync(STORAGE_KEY)
    if (stored && typeof stored === 'string') {
      const parsed = JSON.parse(stored) as unknown
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed
          .filter(
            (m): m is Record<string, unknown> =>
              m != null && typeof m === 'object' && typeof (m as Message).$id === 'string' && typeof (m as Message).senderId === 'string'
          )
          .map((m) => ({
            ...m,
            conversationId: (m as Message).conversationId ?? 'counseling',
            content: typeof (m as Message).content === 'string' ? (m as Message).content : '',
            attachments: Array.isArray((m as Message).attachments) ? (m as Message).attachments : [],
            messageType: ((m as Message).messageType as Message['messageType']) ?? 'text',
            status: ((m as Message).status as Message['status']) ?? 'sent',
            $createdAt: typeof (m as Message).$createdAt === 'string' ? (m as Message).$createdAt : new Date().toISOString()
          })) as Message[]
        const withoutWelcome = valid.filter(
          (m) => !(m.senderId === BOT_ID && (m.content === WELCOME_CONTENT_ZH || m.content === WELCOME_CONTENT_EN))
        )
        messages.value = withoutWelcome
        if (withoutWelcome.length !== valid.length) {
          saveHistory()
        }
      }
    }
  } catch (err) {
    console.error('Load counseling history failed:', err)
  }
}

function saveHistory() {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(messages.value))
  } catch (err) {
    console.error('Save counseling history failed:', err)
  }
}

function showTransferHuman() {
  uni.showModal({
    title: isZh.value ? '转人工' : 'Human Support',
    content: isZh.value
      ? '人工客服功能即将开放，敬请期待。如有紧急情况请拨打学校心理热线或前往心理咨询中心。'
      : 'Human support is coming soon. For urgent needs, please contact your campus counseling center.',
    showCancel: false,
    confirmText: isZh.value ? '知道了' : 'OK',
    confirmColor: '#886fde'
  })
}

async function handleSend(payload: { content: string; attachments: string[]; messageType: Message['messageType'] }) {
  const text = String(payload.content || '').trim()
  if (!text) return

  const userId = authStore.dbUser?.$id
  if (userId) {
    const success = await pointsStore.spendForAi(userId, 'counselingMessage', '心理咨询')
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

  const userMsg = makeMessage({
    $id: genId(),
    senderId: currentUserId.value,
    content: text
  })
  messages.value = [...messages.value, userMsg]
  scrollToBottom()

  sending.value = true
  showTyping.value = true
  nextTick(() => {
    scrollIntoView.value = 'typing-bubble'
  })
  const fullHistory = messages.value.map((m) => ({
    role: m.senderId === currentUserId.value ? ('user' as const) : ('assistant' as const),
    content: m.content
  }))
  const history = fullHistory.slice(-MAX_HISTORY_MESSAGES)
  const systemPrompt = isZh.value
    ? '你是一位校园心理支持助手，语气温和、倾听为主。用简短、支持性的语言回复，不要诊断或替代专业咨询。'
    : 'You are a campus mental health support assistant. Be warm and listen. Keep replies brief and supportive; do not diagnose or replace professional care.'

  try {
    const result = await aiChatService.sendMessage({
      messages: [{ role: 'system', content: systemPrompt }, ...history],
      temperature: 0.7,
      maxTokens: 500
    })

    showTyping.value = false
    if (result.success && result.content) {
      const botMsg = makeMessage({
        $id: genId(),
        senderId: BOT_ID,
        content: result.content
      })
      messages.value = [...messages.value, botMsg]
      if (userId) {
        pointsStore.checkAndUnlockAchievement(userId, 'first_counseling')
      }
      scrollToBottom()
    } else {
      const errMsg = makeMessage({
        $id: genId(),
        senderId: BOT_ID,
        content: isZh.value ? '暂时无法回复，请稍后再试。' : 'Unable to reply right now. Please try again later.',
        status: 'sent'
      })
      messages.value = [...messages.value, errMsg]
      scrollToBottom()
    }
  } catch (err) {
    console.error('AI send failed:', err)
    showTyping.value = false
    const errMsg = makeMessage({
      $id: genId(),
      senderId: BOT_ID,
      content: isZh.value ? '发送失败，请检查网络后重试。' : 'Send failed. Please check your connection and try again.',
      status: 'sent'
    })
    messages.value = [...messages.value, errMsg]
    scrollToBottom()
  } finally {
    sending.value = false
  }
}

function scrollToBottom() {
  const list = messages.value
  const last = list[list.length - 1]
  if (last) {
    scrollIntoView.value = `msg-${last.$id}`
  }
}

watch(
  messages,
  () => {
    saveHistory()
  },
  { deep: true }
)

onShow(() => {
  uiStore.initFromSystem()
  uiStore.setActiveSection('psychology')
  if (!requireAuth('/pages/psychology/counseling')) return
  loadHistory()
})
</script>

<style lang="scss" scoped>
@import '@/styles/psychology-vars.scss';
.counseling-page {
  min-height: 100vh;
  padding-bottom: 140rpx;
  background: var(--page-bg);
}

.theme-light {
  @include psychology-theme-light;
}

.theme-dark {
  @include psychology-theme-dark;
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  @include psychology-topbar-safe-area;
  @include psychology-card-glass;
  background: var(--topbar-bg);
}

.top-bar-left {
  display: flex;
  align-items: center;
  min-width: 80rpx;
}

.top-bar-title {
  color: var(--text-main);
  font-size: 34rpx;
  font-weight: 700;
}

.top-bar-right {
  min-width: 80rpx;
  display: flex;
  justify-content: flex-end;
}

.transfer-text {
  color: #886fde;
  font-size: 26rpx;
  font-weight: 600;
}

.state-card {
  margin: 24rpx;
  border-radius: 22rpx;
  border: 1px solid rgba(136, 111, 222, 0.2);
  background: var(--surface);
  padding: 36rpx;
  text-align: center;
}

.state-text {
  color: var(--text-sub);
  font-size: 26rpx;
}

.message-scroll {
  height: calc(100vh - 88rpx - 140rpx);
  box-sizing: border-box;
}

.messages-shell {
  padding: 16rpx 24rpx 24rpx;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
  text-align: center;
}

.empty-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(136, 111, 222, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.empty-title {
  color: var(--text-main);
  font-size: 32rpx;
  font-weight: 700;
  margin-bottom: 12rpx;
}

.empty-desc {
  color: var(--text-sub);
  font-size: 24rpx;
  line-height: 1.5;
  max-width: 480rpx;
}

.typing-bubble {
  align-self: flex-start;
  padding: 16rpx 24rpx;
  border-radius: 20rpx 20rpx 20rpx 6rpx;
  background: rgba(136, 111, 222, 0.12);
  border: 1px solid rgba(136, 111, 222, 0.2);
}

.typing-dots {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.typing-dots .dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #886fde;
  animation: typingDot 1s ease-in-out infinite both;
}

.typing-dots .dot:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dots .dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typingDot {
  0%,
  80%,
  100% {
    opacity: 0.4;
    transform: scale(0.9);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
