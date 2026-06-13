<template>
  <view :class="['event-card', themeClass]" hover-class="card-hover" @tap="$emit('tap')">
    <view class="cover-wrap">
      <image
        v-if="item.coverImage"
        class="cover-image"
        :src="item.coverImage"
        mode="aspectFill"
        lazy-load
      />
      <view v-else class="cover-gradient" />
      <view class="category-badge">
        <text>{{ categoryLabel }}</text>
      </view>
      <view v-if="isEnded" class="ended-overlay">
        <text>已结束</text>
      </view>
    </view>

    <view class="card-body">
      <text class="event-title">{{ item.title }}</text>

      <view class="info-row">
        <Icon name="event" :size="14" color="#f49d25" />
        <text class="info-text">{{ formattedDate }}</text>
      </view>
      <view class="info-row">
        <Icon name="pin_drop" :size="14" color="#f49d25" />
        <text class="info-text">{{ item.location }}</text>
      </view>

      <view class="card-bottom">
        <view class="reg-info">
          <text class="reg-text">{{ registrationText }}</text>
        </view>
        <view v-if="statusTag" :class="['status-tag', statusTag.type]">
          <text>{{ statusTag.label }}</text>
        </view>
        <text v-else class="deadline-text">{{ deadlineText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CampusEvent, EventCategory } from '@/types/event'

interface Props {
  item: CampusEvent
  themeClass?: string
}

const props = withDefaults(defineProps<Props>(), { themeClass: 'theme-light' })
defineEmits<{ tap: [] }>()

const CATEGORY_LABELS: Record<EventCategory, string> = {
  competition: '竞赛',
  lecture: '讲座',
  club: '社团',
  volunteer: '志愿',
  entertainment: '文娱',
  other: '其他'
}

const categoryLabel = computed(() => CATEGORY_LABELS[props.item.category] || '其他')

const formattedDate = computed(() => {
  try {
    const d = new Date(props.item.eventDate)
    const m = d.getMonth() + 1
    const day = d.getDate()
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    const start = `${m}月${day}日 ${h}:${min}`

    if (!props.item.eventEndDate) return start

    const e = new Date(props.item.eventEndDate)
    const eh = String(e.getHours()).padStart(2, '0')
    const emin = String(e.getMinutes()).padStart(2, '0')

    if (d.getFullYear() === e.getFullYear() && d.getMonth() === e.getMonth() && d.getDate() === e.getDate()) {
      return `${start} ~ ${eh}:${emin}`
    }
    return `${start} ~ ${e.getMonth() + 1}月${e.getDate()}日 ${eh}:${emin}`
  } catch {
    return props.item.eventDate
  }
})

const registrationText = computed(() => {
  const count = props.item.registrationCount || 0
  if (props.item.capacity > 0) {
    return `${count}/${props.item.capacity} 人`
  }
  return `${count} 人已报名`
})

const isEnded = computed(() => props.item.status === 'ended' || props.item.status === 'cancelled')

const isDeadlinePassed = computed(() => {
  try {
    return new Date(props.item.registrationDeadline).getTime() < Date.now()
  } catch {
    return false
  }
})

const isFull = computed(() => props.item.capacity > 0 && props.item.registrationCount >= props.item.capacity)

const statusTag = computed(() => {
  if (props.item.status === 'cancelled') return { label: '已取消', type: 'cancelled' }
  if (props.item.status === 'ended') return { label: '已结束', type: 'ended' }
  if (isFull.value) return { label: '已满', type: 'full' }
  if (isDeadlinePassed.value) return { label: '已截止', type: 'ended' }
  return null
})

const deadlineText = computed(() => {
  try {
    const dl = new Date(props.item.registrationDeadline).getTime()
    const now = Date.now()
    const diff = dl - now
    if (diff <= 0) return '已截止'
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    if (days > 0) return `剩余 ${days}天`
    return `剩余 ${hours}小时`
  } catch {
    return ''
  }
})
</script>

<style scoped lang="scss">
.event-card {
  border-radius: 20rpx;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line);
  margin-bottom: 20rpx;
}

.card-hover {
  transform: scale(0.98);
  opacity: 0.92;
}

.cover-wrap {
  position: relative;
  height: 280rpx;
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
}

.cover-gradient {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f49d25 0%, #f6c97a 50%, #fde8c4 100%);
}

.category-badge {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  background: rgba(244, 157, 37, 0.9);
  border-radius: 12rpx;
  padding: 4rpx 16rpx;

  text {
    color: #fff;
    font-size: 22rpx;
    font-weight: 600;
  }
}

.ended-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    color: #fff;
    font-size: 32rpx;
    font-weight: 700;
    letter-spacing: 4rpx;
  }
}

.card-body {
  padding: 20rpx 22rpx 18rpx;
}

.event-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 10rpx;
}

.info-text {
  font-size: 24rpx;
  color: var(--text-sub);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-bottom {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reg-info {
  display: flex;
  align-items: center;
}

.reg-text {
  font-size: 22rpx;
  color: var(--text-soft);
  font-weight: 600;
}

.deadline-text {
  font-size: 22rpx;
  color: #f49d25;
  font-weight: 600;
}

.status-tag {
  border-radius: 8rpx;
  padding: 2rpx 12rpx;

  text {
    font-size: 20rpx;
    font-weight: 600;
  }
}

.status-tag.ended,
.status-tag.cancelled {
  background: rgba(148, 163, 184, 0.18);
  text { color: #94a3b8; }
}

.status-tag.full {
  background: rgba(239, 68, 68, 0.14);
  text { color: #ef4444; }
}

.theme-light {
  --surface: #ffffff;
  --line: rgba(244, 157, 37, 0.18);
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
}

.theme-dark {
  --surface: rgba(15, 23, 42, 0.78);
  --line: rgba(244, 157, 37, 0.28);
  --text-main: #f1f5f9;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
}
</style>
