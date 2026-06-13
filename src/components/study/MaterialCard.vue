<template>
  <view :class="['material-card', themeClass]" @tap="$emit('tap')">
    <view class="card-header">
      <view class="type-icon">
        <Icon :name="typeIcon" :size="22" color="#4A90E2" />
      </view>
      <view class="header-info">
        <text class="card-title">{{ item.title }}</text>
        <view class="badge-row">
          <view class="subject-badge">
            <text>{{ item.subject }}</text>
          </view>
          <view class="type-badge">
            <text>{{ typeLabel }}</text>
          </view>
        </view>
      </view>
    </view>
    <view class="card-bottom">
      <view class="stat-item">
        <Icon name="download" :size="14" color="#94a3b8" />
        <text>{{ item.downloadCount }}</text>
      </view>
      <view class="stat-item">
        <Icon name="thumb_up" :size="14" color="#94a3b8" />
        <text>{{ item.likeCount }}</text>
      </view>
      <view class="stat-item">
        <Icon name="attach_file" :size="14" color="#94a3b8" />
        <text>{{ item.fileIds.length }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StudyMaterial } from '@/types/study-material'
import { useUiPreferencesStore } from '@/stores/ui-preferences'

const props = defineProps<{
  item: StudyMaterial
  themeClass: string
}>()

defineEmits<{
  (e: 'tap'): void
}>()

const uiPreferencesStore = useUiPreferencesStore()
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const typeIconMap: Record<string, string> = {
  notes: 'description',
  past_exam: 'history_edu',
  courseware: 'slideshow',
  lab_report: 'science',
  other: 'folder'
}

const typeIcon = computed(() => typeIconMap[props.item.materialType] || 'folder')

const typeLabel = computed(() => {
  const map: Record<string, { zh: string; en: string }> = {
    notes: { zh: '笔记', en: 'Notes' },
    past_exam: { zh: '真题', en: 'Past Exam' },
    courseware: { zh: '课件', en: 'Courseware' },
    lab_report: { zh: '实验报告', en: 'Lab Report' },
    other: { zh: '其他', en: 'Other' }
  }
  const entry = map[props.item.materialType]
  return entry ? (isZh.value ? entry.zh : entry.en) : props.item.materialType
})
</script>

<style scoped lang="scss">
.material-card {
  border-radius: 20rpx;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid rgba(74, 144, 226, 0.16);
  box-shadow: 0 6rpx 16rpx rgba(74, 144, 226, 0.08);
  padding: 20rpx;
}

.card-header {
  display: flex;
  gap: 16rpx;
}

.type-icon {
  flex-shrink: 0;
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  background: rgba(74, 144, 226, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.card-title {
  color: var(--text-main);
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.badge-row {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}

.subject-badge {
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(74, 144, 226, 0.14);

  text {
    color: #2563eb;
    font-size: 20rpx;
    font-weight: 600;
  }
}

.type-badge {
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(74, 144, 226, 0.08);

  text {
    color: #4A90E2;
    font-size: 20rpx;
    font-weight: 600;
  }
}

.card-bottom {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6rpx;

  text {
    color: var(--text-soft);
    font-size: 22rpx;
  }
}
</style>
