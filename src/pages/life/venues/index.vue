<template>
  <view :class="['venues-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">场地预约</text>
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

    <view class="venues-list">
      <view v-if="loading && !filteredVenues.length" class="state-card">
        <text class="state-text">加载中...</text>
      </view>

      <view v-else-if="!filteredVenues.length" class="state-card">
        <text class="state-text">暂无可用场地</text>
      </view>

      <view
        v-for="venue in filteredVenues"
        :key="venue.$id"
        class="venue-card"
        @tap="goDetail(venue.$id)"
      >
        <view v-if="venue.coverImage" class="card-cover">
          <image :src="venue.coverImage" mode="aspectFill" class="cover-img" />
        </view>
        <view class="card-body">
          <view class="card-top">
            <text class="venue-name">{{ venue.name }}</text>
            <view :class="['status-tag', venue.status]">
              <text class="status-text">{{ venue.status === 'available' ? '可预约' : '不可用' }}</text>
            </view>
          </view>
          <view class="card-meta">
            <Icon name="location_on" :size="14" :color="metaColor" />
            <text class="meta-text">{{ venue.location }}</text>
          </view>
          <view class="card-meta" v-if="venue.capacity">
            <Icon name="people" :size="14" :color="metaColor" />
            <text class="meta-text">容纳 {{ venue.capacity }} 人</text>
          </view>
          <view class="card-meta" v-if="venue.openTime">
            <Icon name="schedule" :size="14" :color="metaColor" />
            <text class="meta-text">{{ venue.openTime }}</text>
          </view>
          <view class="card-tag-row">
            <view class="cat-tag">
              <text class="cat-text">{{ categoryLabel(venue.category) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="fab-btn" @tap="goPublish">
      <Icon name="add" :size="28" color="#ffffff" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import venuesService from '@/services/venues'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { Venue, VenueCategory } from '@/types/venue'

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#475569' : '#cbd5e1'))
const metaColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#94a3b8' : '#64748b'))

const loading = ref(false)
const venues = ref<Venue[]>([])
const activeCategory = ref<VenueCategory | 'all'>('all')

const categoryTabs: { value: VenueCategory | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'classroom', label: '教室' },
  { value: 'meeting_room', label: '会议室' },
  { value: 'sports', label: '运动场' },
  { value: 'lab', label: '实验室' },
  { value: 'auditorium', label: '报告厅' },
  { value: 'other', label: '其他' }
]

const categoryLabel = (c: VenueCategory) => {
  const m: Record<VenueCategory, string> = {
    classroom: '教室', meeting_room: '会议室', sports: '运动场',
    lab: '实验室', auditorium: '报告厅', other: '其他'
  }
  return m[c] || '其他'
}

const filteredVenues = computed(() => {
  if (activeCategory.value === 'all') return venues.value
  return venues.value.filter(v => v.category === activeCategory.value)
})

const fetchVenues = async () => {
  loading.value = true
  try {
    venues.value = await venuesService.getVenues({ limit: 50 })
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
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
  uni.navigateTo({ url: `/pages/life/venues/detail?id=${id}` })
}

const goPublish = () => {
  if (!authStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    uni.navigateTo({ url: '/pages/mine/login' })
    return
  }
  uni.navigateTo({ url: '/pages/life/venues/publish' })
}

onShow(() => {
  uiPreferencesStore.initFromSystem()
  fetchVenues()
})
</script>

<style scoped lang="scss">
.venues-page {
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

  text { color: #f49d25; }
}

.venues-list {
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

.venue-card {
  margin-bottom: 16rpx;
  border: 1px solid var(--line);
  border-radius: 22rpx;
  background: var(--surface);
  overflow: hidden;
}

.card-cover {
  width: 100%;
  height: 240rpx;
}

.cover-img {
  width: 100%;
  height: 100%;
}

.card-body {
  padding: 20rpx 24rpx;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.venue-name {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-main);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-tag {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
  margin-left: 12rpx;
}

.status-tag.available {
  background: rgba(34, 197, 94, 0.16);
}

.status-tag.unavailable {
  background: rgba(239, 68, 68, 0.16);
}

.status-text {
  font-size: 20rpx;
  font-weight: 600;
  color: var(--text-sub);
}

.card-meta {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.meta-text {
  font-size: 22rpx;
  color: var(--text-sub);
}

.card-tag-row {
  margin-top: 10rpx;
  display: flex;
  gap: 8rpx;
}

.cat-tag {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(244, 157, 37, 0.12);
}

.cat-text {
  font-size: 20rpx;
  color: #d48620;
  font-weight: 600;
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
