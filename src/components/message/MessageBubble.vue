<template>
  <view :class="['message-row', { mine: isMine }]">
    <view v-if="showAvatar && !isMine" class="avatar-wrap" @tap="handleAvatarTap">
      <image v-if="senderAvatar" class="avatar" :src="senderAvatar" mode="aspectFill" lazy-load />
      <view v-else class="avatar-fallback">
        <Icon name="person" :size="16" color="#94a3b8" />
      </view>
    </view>

    <view class="bubble-wrap">
      <view :class="['bubble', statusClass]" @longpress="handleLongPress">
        <text v-if="showRecalled" class="status-text">{{ recalledText }}</text>
        <text v-else-if="showDeleted" class="status-text">{{ deletedText }}</text>
        <text v-if="showTextContent" class="content">{{ message.content }}</text>

        <view v-if="showAttachments" class="attachments">
          <image
            v-for="(item, index) in message.attachments"
            :key="`${message.$id}-${item}-${index}`"
            class="attachment-image"
            :src="item"
            mode="aspectFill"
            lazy-load
            @tap.stop="previewAttachment(item)"
          />
        </view>
      </view>

      <view class="meta-row">
        <text v-if="isPending" class="sending-hint">{{ sendingText }}</text>
        <view v-else-if="isFailed" class="failed-row">
          <text class="failed-hint">{{ failedText }}</text>
          <view class="retry-tap" @tap.stop="handleRetry">
            <text class="retry-text">{{ retryText }}</text>
          </view>
        </view>
        <text v-else class="time">{{ timeText }}</text>
      </view>
    </view>

    <view v-if="showAvatar && isMine" class="avatar-wrap" @tap="handleAvatarTap">
      <image v-if="senderAvatar" class="avatar" :src="senderAvatar" mode="aspectFill" lazy-load />
      <view v-else class="avatar-fallback">
        <Icon name="person" :size="16" color="#94a3b8" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '@/types/message'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import { useUiPreferencesStore } from '@/stores/ui-preferences'

const props = withDefaults(
  defineProps<{
    message: Message
    currentUserId: string
    showAvatar?: boolean
    senderName?: string
    senderAvatar?: string
  }>(),
  {
    showAvatar: true,
    senderName: '',
    senderAvatar: ''
  }
)

const emit = defineEmits<{
  (event: 'preview', current: string, urls: string[]): void
  (event: 'longpress', messageId: string): void
  (event: 'avatarTap', senderId: string): void
  (event: 'retry', messageId: string): void
}>()

const uiStore = useUiPreferencesStore()
const locale = computed(() => uiStore.locale)

const isMine = computed(() => String(props.message.senderId || '').trim() === String(props.currentUserId || '').trim())
const isPending = computed(() => Boolean(props.message._pending))
const isFailed = computed(() => Boolean(props.message._failed))
const showRecalled = computed(() => props.message.status === 'recalled')
const showDeleted = computed(() => props.message.status === 'deleted')
const showTextContent = computed(
  () => !showRecalled.value && !showDeleted.value && Boolean(String(props.message.content || '').trim())
)
const showAttachments = computed(
  () => !showRecalled.value && !showDeleted.value && Array.isArray(props.message.attachments) && props.message.attachments.length > 0
)

const isImageOnly = computed(
  () => showAttachments.value && !showTextContent.value && !showRecalled.value && !showDeleted.value
)

const statusClass = computed(() => {
  if (showRecalled.value || showDeleted.value) {
    return 'is-status'
  }
  if (isImageOnly.value) {
    return 'is-image-only'
  }
  const base = isMine.value ? 'is-mine' : 'is-other'
  if (isPending.value) return `${base} is-pending`
  if (isFailed.value) return `${base} is-failed`
  return base
})

const recalledText = computed(() => t(I18N_KEYS.chatMessageRecalled, locale.value))
const deletedText = computed(() => t(I18N_KEYS.chatMessageDeleted, locale.value))
const sendingText = computed(() => (locale.value === 'zh-CN' ? '发送中...' : 'Sending...'))
const failedText = computed(() => (locale.value === 'zh-CN' ? '发送失败' : 'Failed'))
const retryText = computed(() => (locale.value === 'zh-CN' ? '重试' : 'Retry'))

const timeText = computed(() => {
  const rawTime = String(props.message.$createdAt || props.message.$updatedAt || '').trim()
  if (!rawTime) {
    return ''
  }
  const timestamp = new Date(rawTime).getTime()
  if (Number.isNaN(timestamp)) {
    return rawTime
  }
  const diffMinutes = Math.floor((Date.now() - timestamp) / 60000)
  if (diffMinutes < 1) {
    return t(I18N_KEYS.commonTimeJustNow, locale.value)
  }
  if (diffMinutes < 60) {
    return t(I18N_KEYS.commonTimeMinutesAgo, locale.value, { count: diffMinutes })
  }
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return t(I18N_KEYS.commonTimeHoursAgo, locale.value, { count: diffHours })
  }
  const diffDays = Math.floor(diffHours / 24)
  return t(I18N_KEYS.commonTimeDaysAgo, locale.value, { count: diffDays })
})

const previewAttachment = (current: string) => {
  const urls = (props.message.attachments || []).filter(Boolean)
  if (!urls.length) {
    return
  }
  emit('preview', current, urls)
}

const handleLongPress = () => {
  emit('longpress', props.message.$id)
}

const handleAvatarTap = () => {
  const senderId = String(props.message.senderId || '').trim()
  if (senderId) {
    emit('avatarTap', senderId)
  }
}

const handleRetry = () => {
  emit('retry', props.message.$id)
}
</script>

<style scoped lang="scss">
.message-row {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  box-sizing: border-box;
}

.message-row.mine {
  justify-content: flex-end;
}

.avatar-wrap {
  width: 64rpx;
  height: 64rpx;
  flex-shrink: 0;
}

.avatar,
.avatar-fallback {
  width: 100%;
  height: 100%;
  border-radius: 999rpx;
  border: 1px solid var(--bubble-other-line, rgba(111, 222, 129, 0.18));
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(111, 222, 129, 0.12);
}

.bubble-wrap {
  max-width: 72%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.message-row.mine .bubble-wrap {
  align-items: flex-end;
}

.bubble {
  border-radius: 20rpx;
  padding: 12rpx 22rpx;
  border: 1px solid transparent;
  word-break: break-word;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bubble.is-other {
  background: var(--bubble-other-bg, #ffffff);
  border-color: var(--bubble-other-line, rgba(111, 222, 129, 0.18));
}

.bubble.is-mine {
  background: linear-gradient(135deg, var(--bubble-mine-start, #7ee495), var(--bubble-mine-end, #6fde81));
}

.bubble.is-status {
  background: var(--bubble-status-bg, rgba(111, 222, 129, 0.08));
  border-color: var(--bubble-other-line, rgba(111, 222, 129, 0.18));
}

.bubble.is-image-only {
  background: transparent;
  border-color: transparent;
  padding: 0;
  justify-content: flex-end;
}

.bubble.is-image-only .attachments {
  margin-top: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.content {
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--text-main, #0f172a);
}

.is-mine .content {
  color: #000000;
}

.status-text {
  color: var(--text-sub, #64748b);
  font-size: 24rpx;
}

.attachments {
  margin-top: 12rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10rpx;
}

.attachment-image {
  width: 196rpx;
  height: 196rpx;
  border-radius: 20rpx;
  border: 1px solid var(--bubble-other-line, rgba(111, 222, 129, 0.18));
  background: rgba(111, 222, 129, 0.08);
}

.bubble.is-pending {
  opacity: 0.6;
}

.bubble.is-failed {
  opacity: 0.8;
}

.sending-hint {
  color: var(--text-soft, #94a3b8);
  font-size: 20rpx;
  font-style: italic;
}

.failed-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.failed-hint {
  color: #ef4444;
  font-size: 20rpx;
}

.retry-tap {
  padding: 2rpx 14rpx;
  border-radius: 999rpx;
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.08);
}

.retry-text {
  color: #ef4444;
  font-size: 20rpx;
  font-weight: 600;
}

.meta-row {
  margin-top: 8rpx;
  display: flex;
}

.message-row.mine .meta-row {
  justify-content: flex-end;
}

.message-row:not(.mine) .meta-row {
  justify-content: flex-start;
}

.time {
  color: var(--text-soft, #94a3b8);
  font-size: 20rpx;
}
</style>
