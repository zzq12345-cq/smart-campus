<template>
  <view class="conversation-item" @tap="handleTap">
    <view class="avatar-wrap" @tap.stop="navigateToProfile">
      <image v-if="avatar" class="avatar" :src="avatar" mode="aspectFill" lazy-load />
      <view v-else class="avatar-fallback">
        <Icon name="person" :size="18" color="#94a3b8" />
      </view>
      <view v-if="unreadCount > 0" class="unread-badge">
        <text>{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
      </view>
    </view>

    <view class="main">
      <view class="top">
        <text class="name">{{ displayName }}</text>
        <text class="time">{{ timeText }}</text>
      </view>
      <view class="bottom">
        <text class="preview">{{ previewText }}</text>
      </view>
    </view>

    <view class="actions">
      <view class="archive-btn" @tap.stop="handleArchive">
        <Icon name="archive" :size="16" color="#94a3b8" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { ConversationListItem } from '@/types/conversation'

const uiStore = useUiPreferencesStore()
const locale = computed(() => uiStore.locale)

const props = defineProps<{
  conversation: ConversationListItem
  currentUserId?: string
}>()

const emit = defineEmits<{
  (event: 'click', conversationId: string): void
  (event: 'archive', conversationId: string): void
}>()

const unreadCount = computed(() => Math.max(0, Number(props.conversation.currentMember?.unreadCount || 0)))
const avatar = computed(() => String(props.conversation.peerAvatar || '').trim())

const displayName = computed(() => {
  const peerName = String(props.conversation.peerName || '').trim()
  if (peerName) {
    return peerName
  }
  const peerUserId = String(props.conversation.peerUserId || '').trim()
  if (peerUserId) {
    return peerUserId
  }
  const initiator = String(props.conversation.initiatorId || '').trim()
  return initiator || t(I18N_KEYS.messagesUnknownUser, locale.value)
})

const previewText = computed(() => {
  const preview = String(props.conversation.lastMessagePreview || '').trim()
  if (!preview) {
    return t(I18N_KEYS.messagesNoMessages, locale.value)
  }
  if (preview === '[image]') {
    return t(I18N_KEYS.messagesImagePreview, locale.value)
  }
  return preview
})

const timeText = computed(() => {
  const rawTime = String(props.conversation.lastMessageAt || props.conversation.$updatedAt || '').trim()
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

const handleTap = () => {
  emit('click', props.conversation.$id)
}

const handleArchive = () => {
  emit('archive', props.conversation.$id)
}

const navigateToProfile = () => {
  const peerId = String(props.conversation.peerUserId || '').trim()
  if (!peerId) return
  uni.navigateTo({ url: `/pages/profile/index?userId=${peerId}` })
}
</script>

<style scoped lang="scss">
.conversation-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 22rpx 16rpx;
  border-radius: 20rpx;
  border: 1px solid var(--line, rgba(148, 163, 184, 0.2));
  background: var(--surface, #ffffff);
}

.avatar-wrap {
  position: relative;
  width: 82rpx;
  height: 82rpx;
  flex-shrink: 0;
}

.avatar,
.avatar-fallback {
  width: 100%;
  height: 100%;
  border-radius: 999rpx;
  border: 1px solid var(--line, rgba(148, 163, 184, 0.24));
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(148, 163, 184, 0.14);
}

.unread-badge {
  position: absolute;
  right: -6rpx;
  top: -8rpx;
  min-width: 30rpx;
  height: 30rpx;
  border-radius: 999rpx;
  background: #ef4444;
  padding: 0 8rpx;
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

.main {
  min-width: 0;
  flex: 1;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.name {
  color: var(--text-main, #0f172a);
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time {
  flex-shrink: 0;
  color: #94a3b8;
  font-size: 20rpx;
}

.bottom {
  margin-top: 8rpx;
}

.preview {
  color: var(--text-sub, #64748b);
  font-size: 23rpx;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  flex-shrink: 0;
}

.archive-btn {
  width: 54rpx;
  height: 54rpx;
  border-radius: 14rpx;
  border: 1px solid var(--line, rgba(148, 163, 184, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
