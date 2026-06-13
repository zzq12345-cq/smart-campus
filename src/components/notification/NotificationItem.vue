<template>
  <view :class="['notification-item', { unread: !notification.isRead }]" @tap="handleTap">
    <view class="avatar-wrap" @tap.stop="navigateToProfile">
      <image v-if="avatar" class="avatar" :src="avatar" mode="aspectFill" lazy-load />
      <view v-else class="avatar-fallback">
        <Icon :name="iconName" :size="18" color="#94a3b8" />
      </view>
      <view v-if="!notification.isRead" class="unread-dot" />
    </view>

    <view class="main">
      <view class="top">
        <text class="actor-name">{{ actorName }}</text>
        <text class="time">{{ timeText }}</text>
      </view>
      <view class="bottom">
        <text class="action-text">{{ actionText }}</text>
      </view>
      <view v-if="notification.preview" class="preview-wrap">
        <text class="preview-text">{{ notification.preview }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { NotificationListItem } from '@/types/notification'

const uiStore = useUiPreferencesStore()
const locale = computed(() => uiStore.locale)

const props = defineProps<{
  notification: NotificationListItem
}>()

const emit = defineEmits<{
  (event: 'click', notification: NotificationListItem): void
}>()

const avatar = computed(() => String(props.notification.actorAvatar || '').trim())

const actorName = computed(() => {
  const name = String(props.notification.actorName || '').trim()
  if (name) return name
  if (props.notification.type === 'system') return t(I18N_KEYS.notificationSystem, locale.value)
  return t(I18N_KEYS.commonCampusUser, locale.value)
})

const iconName = computed(() => {
  const typeIconMap: Record<string, string> = {
    like: 'favorite',
    comment: 'chat_bubble',
    reply: 'reply',
    follow: 'person_add',
    system: 'notifications'
  }
  return typeIconMap[props.notification.type] || 'notifications'
})

const actionText = computed(() => {
  const typeKeyMap: Record<string, string> = {
    like: I18N_KEYS.notificationLikePost,
    comment: I18N_KEYS.notificationCommentPost,
    reply: I18N_KEYS.notificationReplyComment,
    follow: I18N_KEYS.notificationFollowUser,
    system: I18N_KEYS.notificationSystem
  }
  const key = typeKeyMap[props.notification.type]
  return key ? t(key as any, locale.value) : ''
})

const timeText = computed(() => {
  const rawTime = String(props.notification.$createdAt || '').trim()
  if (!rawTime) return ''
  const timestamp = new Date(rawTime).getTime()
  if (Number.isNaN(timestamp)) return rawTime
  const diffMinutes = Math.floor((Date.now() - timestamp) / 60000)
  if (diffMinutes < 1) return t(I18N_KEYS.commonTimeJustNow, locale.value)
  if (diffMinutes < 60) return t(I18N_KEYS.commonTimeMinutesAgo, locale.value, { count: diffMinutes })
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return t(I18N_KEYS.commonTimeHoursAgo, locale.value, { count: diffHours })
  const diffDays = Math.floor(diffHours / 24)
  return t(I18N_KEYS.commonTimeDaysAgo, locale.value, { count: diffDays })
})

const handleTap = () => {
  emit('click', props.notification)
}

const navigateToProfile = () => {
  const actorId = String(props.notification.actorId || '').trim()
  if (!actorId || props.notification.type === 'system') return
  uni.navigateTo({ url: `/pages/profile/index?userId=${actorId}` })
}
</script>

<style scoped lang="scss">
.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 22rpx 16rpx;
  border-radius: 20rpx;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: var(--surface);
  transition: background 0.15s;
}

.notification-item.unread {
  background: rgba(74, 144, 226, 0.06);
  border-color: rgba(74, 144, 226, 0.18);
}

.avatar-wrap {
  position: relative;
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
}

.avatar,
.avatar-fallback {
  width: 100%;
  height: 100%;
  border-radius: 999rpx;
  border: 1px solid rgba(148, 163, 184, 0.24);
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(148, 163, 184, 0.14);
}

.unread-dot {
  position: absolute;
  right: 0;
  top: 0;
  width: 16rpx;
  height: 16rpx;
  border-radius: 999rpx;
  background: #4a90e2;
  border: 2rpx solid var(--surface, #ffffff);
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

.actor-name {
  color: var(--text-main);
  font-size: 26rpx;
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time {
  flex-shrink: 0;
  color: var(--text-sub);
  font-size: 20rpx;
}

.bottom {
  margin-top: 6rpx;
}

.action-text {
  color: var(--text-sub);
  font-size: 24rpx;
  line-height: 1.5;
}

.preview-wrap {
  margin-top: 8rpx;
  padding: 10rpx 14rpx;
  border-radius: 10rpx;
  background: rgba(148, 163, 184, 0.08);
}

.preview-text {
  color: var(--text-sub);
  font-size: 22rpx;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
