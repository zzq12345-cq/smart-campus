<template>
  <view :class="['job-card', themeClass]" @tap="$emit('tap')">
    <view class="card-header">
      <text class="card-title">{{ item.title }}</text>
      <view class="salary-badge">
        <text class="salary-text">{{ item.salary }}</text>
      </view>
    </view>
    <view class="card-tags">
      <view class="category-chip">
        <text>{{ categoryLabel }}</text>
      </view>
      <view class="status-chip" :class="item.status">
        <text>{{ statusLabel }}</text>
      </view>
    </view>
    <view class="card-info">
      <view class="info-row">
        <Icon name="location_on" :size="14" color="#f49d25" />
        <text class="info-text">{{ item.location }}</text>
      </view>
      <view class="info-row">
        <Icon name="schedule" :size="14" color="#f49d25" />
        <text class="info-text">{{ item.workTime }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { JobListing } from '@/types/job-listing'
import { useUiPreferencesStore } from '@/stores/ui-preferences'

const props = defineProps<{
  item: JobListing
  themeClass: string
}>()

defineEmits<{
  (e: 'tap'): void
}>()

const uiPreferencesStore = useUiPreferencesStore()
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const categoryLabel = computed(() => {
  const map: Record<string, { zh: string; en: string }> = {
    campus_job: { zh: '校内勤工', en: 'Campus Job' },
    part_time: { zh: '校外兼职', en: 'Part-time' },
    internship: { zh: '实习', en: 'Internship' },
    volunteer: { zh: '志愿者', en: 'Volunteer' }
  }
  const entry = map[props.item.category]
  return entry ? (isZh.value ? entry.zh : entry.en) : props.item.category
})

const statusLabel = computed(() => {
  const map: Record<string, { zh: string; en: string }> = {
    recruiting: { zh: '招募中', en: 'Recruiting' },
    filled: { zh: '已招满', en: 'Filled' }
  }
  const entry = map[props.item.status]
  return entry ? (isZh.value ? entry.zh : entry.en) : ''
})
</script>

<style scoped lang="scss">
.job-card {
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  background: var(--surface);
  border: 1px solid rgba(244, 157, 37, 0.16);
  box-shadow: 0 6rpx 16rpx rgba(244, 157, 37, 0.08);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12rpx;
}

.card-title {
  flex: 1;
  color: var(--text-main);
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.salary-badge {
  flex-shrink: 0;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(244, 157, 37, 0.14);
}

.salary-text {
  color: #b45309;
  font-size: 22rpx;
  font-weight: 700;
  white-space: nowrap;
}

.card-tags {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}

.category-chip {
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(244, 157, 37, 0.14);

  text {
    color: #b45309;
    font-size: 20rpx;
    font-weight: 600;
  }
}

.status-chip {
  padding: 2rpx 12rpx;
  border-radius: 999rpx;

  text {
    font-size: 20rpx;
    font-weight: 600;
  }
}

.status-chip.recruiting {
  background: rgba(244, 157, 37, 0.14);

  text {
    color: #b45309;
  }
}

.status-chip.filled {
  background: rgba(148, 163, 184, 0.18);

  text {
    color: #64748b;
  }
}

.card-info {
  margin-top: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.info-text {
  color: var(--text-sub);
  font-size: 22rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
