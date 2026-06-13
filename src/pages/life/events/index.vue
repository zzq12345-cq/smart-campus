<template>
  <view :class="['events-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">校园活动</text>
      </view>
    </view>

    <scroll-view class="category-tabs" scroll-x show-scrollbar="false">
      <view class="tabs-inner">
        <view
          v-for="tab in categoryTabs"
          :key="tab.value"
          :class="['tab-item', { active: activeCategory === tab.value }]"
          @tap="activeCategory = tab.value"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="events-list">
      <view v-if="loading && !events.length" class="state-card">
        <text class="state-text">加载中...</text>
      </view>

      <view v-else-if="!events.length" class="state-card">
        <text class="state-text">暂无活动</text>
      </view>

      <EventCard
        v-for="event in events"
        :key="event.$id"
        :item="event"
        :theme-class="themeClass"
        :class="{ 'deadline-highlight': isNearDeadline(event) }"
        @tap="goDetail(event.$id)"
      />
    </view>

    <view class="fab-btn" @tap="goPublish">
      <Icon name="add" :size="28" color="#ffffff" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import eventsService from '@/services/events'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { CampusEvent, EventCategory } from '@/types/event'
import EventCard from '@/components/life/EventCard.vue'

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#475569' : '#cbd5e1'))

const loading = ref(false)
const events = ref<CampusEvent[]>([])
const activeCategory = ref<EventCategory | 'all'>('all')

const categoryTabs = [
  { value: 'all' as const, label: '全部' },
  { value: 'competition' as EventCategory, label: '竞赛' },
  { value: 'lecture' as EventCategory, label: '讲座' },
  { value: 'club' as EventCategory, label: '社团' },
  { value: 'entertainment' as EventCategory, label: '文娱' },
  { value: 'other' as EventCategory, label: '其他' }
]

const isNearDeadline = (event: CampusEvent) => {
  if (event.status !== 'upcoming') return false
  try {
    const diff = new Date(event.registrationDeadline).getTime() - Date.now()
    return diff > 0 && diff < 86400000 * 2
  } catch {
    return false
  }
}

const fetchEvents = async () => {
  loading.value = true
  try {
    const category = activeCategory.value === 'all' ? undefined : activeCategory.value
    events.value = await eventsService.getEvents({ category, limit: 50 })
  } catch {
    uni.showToast({ title: '加载活动失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/life/index' })
  }
}

const goDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/life/events/detail?id=${id}` })
}

const goPublish = () => {
  if (!authStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    uni.navigateTo({ url: '/pages/mine/login' })
    return
  }
  uni.navigateTo({ url: '/pages/life/events/publish' })
}

onShow(() => {
  uiPreferencesStore.initFromSystem()
  fetchEvents()
})
</script>

<style scoped lang="scss">
.events-page {
  min-height: 100vh;
  padding: 0 24rpx 120rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f6f6f8;
  --surface: #ffffff;
  --line: rgba(244, 157, 37, 0.18);
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(246, 246, 248, 0.92);
  --tab-bg: rgba(244, 157, 37, 0.08);
  --tab-active-bg: rgba(244, 157, 37, 0.22);
}

.theme-dark {
  --page-bg: #151c2a;
  --surface: rgba(15, 23, 42, 0.78);
  --line: rgba(244, 157, 37, 0.28);
  --text-main: #f1f5f9;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(21, 28, 42, 0.92);
  --tab-bg: rgba(244, 157, 37, 0.1);
  --tab-active-bg: rgba(244, 157, 37, 0.28);
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 88rpx;
  display: flex;
  align-items: center;
  backdrop-filter: blur(14px);
  background: var(--topbar-bg);
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

.category-tabs {
  margin-top: 10rpx;
  white-space: nowrap;
}

.tabs-inner {
  display: flex;
  gap: 12rpx;
  padding: 8rpx 0;
}

.tab-item {
  flex-shrink: 0;
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  background: var(--tab-bg);

  text {
    font-size: 24rpx;
    color: var(--text-sub);
    font-weight: 600;
  }
}

.tab-item.active {
  background: var(--tab-active-bg);

  text {
    color: #f49d25;
  }
}

.events-list {
  margin-top: 18rpx;
}

.state-card {
  padding: 80rpx 0;
  text-align: center;
}

.state-text {
  color: var(--text-soft);
  font-size: 26rpx;
}

.deadline-highlight {
  border-color: #f49d25 !important;
  box-shadow: 0 0 0 2rpx rgba(244, 157, 37, 0.3);
}

.fab-btn {
  position: fixed;
  right: 40rpx;
  bottom: 120rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #f49d25, #e88b15);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(244, 157, 37, 0.4);
  z-index: 30;
}
</style>
