<template>
  <view :class="['jobs-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ pageTitle }}</text>
      </view>
      <view class="right">
        <view class="icon-btn" @tap="toggleSearch">
          <Icon name="search" :size="20" :color="iconColor" />
        </view>
      </view>
    </view>

    <view v-if="showSearch" class="search-bar">
      <input
        v-model="searchKeyword"
        class="search-input"
        :placeholder="searchPlaceholder"
        confirm-type="search"
        @confirm="doSearch"
      />
      <view class="search-cancel" @tap="cancelSearch">
        <text>{{ cancelText }}</text>
      </view>
    </view>

    <scroll-view class="category-tabs" scroll-x show-scrollbar="false">
      <view class="tabs-inner">
        <view
          v-for="cat in categories"
          :key="cat.value"
          class="tab-item"
          :class="{ active: activeCategory === cat.value }"
          @tap="switchCategory(cat.value)"
        >
          <text>{{ cat.label }}</text>
        </view>
      </view>
    </scroll-view>

    <view v-if="loading && !recruitingItems.length" class="state-card">
      <text class="state-text">{{ loadingText }}</text>
    </view>

    <view v-else-if="!recruitingItems.length && !filledItems.length" class="state-card">
      <Icon name="work" :size="40" color="rgba(244,157,37,0.3)" />
      <text class="state-text">{{ emptyText }}</text>
    </view>

    <view v-else class="job-list">
      <JobCard
        v-for="item in recruitingItems"
        :key="item.$id"
        :item="item"
        :theme-class="themeClass"
        @tap="goDetail(item.$id)"
      />

      <view v-if="filledItems.length" class="filled-divider">
        <text class="filled-divider-text">{{ filledLabel }}</text>
      </view>

      <view v-for="item in filledItems" :key="item.$id" class="filled-wrap">
        <JobCard
          :item="item"
          :theme-class="themeClass"
          @tap="goDetail(item.$id)"
        />
      </view>
    </view>

    <view v-if="allItems.length && hasMore" class="load-more" @tap="loadMore">
      <text class="load-more-text">{{ loadingMore ? loadingText : loadMoreText }}</text>
    </view>

    <view class="fab" @tap="goPublish">
      <Icon name="add" :size="26" color="#ffffff" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import jobListingsService from '@/services/job-listings'
import type { JobListing, JobCategory } from '@/types/job-listing'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { requireAuth } from '@/utils/auth-guard'
import JobCard from '@/components/life/JobCard.vue'

type CategoryFilter = JobCategory | 'all'
const PAGE_SIZE = 20

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#475569' : '#cbd5e1'))

const allItems = ref<JobListing[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const activeCategory = ref<CategoryFilter>('all')
const showSearch = ref(false)
const searchKeyword = ref('')
const isSearchMode = ref(false)

const recruitingItems = computed(() => allItems.value.filter((i) => i.status === 'recruiting'))
const filledItems = computed(() => allItems.value.filter((i) => i.status === 'filled'))

const pageTitle = computed(() => (isZh.value ? '就业信息' : 'Job Listings'))
const searchPlaceholder = computed(() => (isZh.value ? '搜索职位...' : 'Search jobs...'))
const cancelText = computed(() => (isZh.value ? '取消' : 'Cancel'))
const loadingText = computed(() => (isZh.value ? '加载中...' : 'Loading...'))
const emptyText = computed(() => (isZh.value ? '暂无就业信息，快来发布第一个吧' : 'No jobs yet. Be the first to post!'))
const loadMoreText = computed(() => (isZh.value ? '加载更多' : 'Load more'))
const filledLabel = computed(() => (isZh.value ? '── 已招满 ──' : '── Filled ──'))

const categories = computed(() => [
  { value: 'all' as CategoryFilter, label: isZh.value ? '全部' : 'All' },
  { value: 'campus_job' as CategoryFilter, label: isZh.value ? '校内勤工' : 'Campus Job' },
  { value: 'part_time' as CategoryFilter, label: isZh.value ? '校外兼职' : 'Part-time' },
  { value: 'internship' as CategoryFilter, label: isZh.value ? '实习' : 'Internship' },
  { value: 'volunteer' as CategoryFilter, label: isZh.value ? '志愿者' : 'Volunteer' }
])

const loadItems = async (reset = true) => {
  if (reset) {
    loading.value = true
    allItems.value = []
    hasMore.value = true
  } else {
    loadingMore.value = true
  }

  try {
    const offset = reset ? 0 : allItems.value.length
    const result = await jobListingsService.getListings({
      category: activeCategory.value,
      limit: PAGE_SIZE,
      offset
    })
    if (reset) {
      allItems.value = result
    } else {
      allItems.value = [...allItems.value, ...result]
    }
    hasMore.value = result.length >= PAGE_SIZE
  } catch (error) {
    console.error('Load job listings failed:', error)
    uni.showToast({
      title: isZh.value ? '加载失败' : 'Load failed',
      icon: 'none'
    })
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const switchCategory = (cat: CategoryFilter) => {
  if (activeCategory.value === cat) return
  activeCategory.value = cat
  isSearchMode.value = false
  searchKeyword.value = ''
  loadItems()
}

const loadMore = () => {
  if (loadingMore.value || !hasMore.value) return
  if (isSearchMode.value) return
  loadItems(false)
}

const toggleSearch = () => {
  showSearch.value = !showSearch.value
  if (!showSearch.value) {
    cancelSearch()
  }
}

const doSearch = async () => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return
  isSearchMode.value = true
  loading.value = true
  allItems.value = []
  hasMore.value = false
  try {
    allItems.value = await jobListingsService.searchListings(keyword)
  } catch (error) {
    console.error('Search job listings failed:', error)
    uni.showToast({
      title: isZh.value ? '搜索失败' : 'Search failed',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

const cancelSearch = () => {
  showSearch.value = false
  searchKeyword.value = ''
  if (isSearchMode.value) {
    isSearchMode.value = false
    loadItems()
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
  uni.navigateTo({
    url: `/pages/life/jobs/detail?id=${encodeURIComponent(id)}`
  })
}

const goPublish = () => {
  if (!requireAuth('/pages/life/jobs/index')) return
  uni.navigateTo({ url: '/pages/life/jobs/publish' })
}

onShow(async () => {
  uiPreferencesStore.initFromSystem()
  await authStore.refreshProfile()
  await loadItems()
})
</script>

<style scoped lang="scss">
.jobs-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 160rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f8f7f5;
  --surface: #ffffff;
  --text-main: #1e293b;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(244, 157, 37, 0.16);
  --topbar-bg: rgba(248, 247, 245, 0.9);
}

.theme-dark {
  --page-bg: #221a10;
  --surface: rgba(30, 23, 15, 0.78);
  --text-main: #f8fafc;
  --text-sub: #d1d5db;
  --text-soft: #94a3af;
  --line: rgba(244, 157, 37, 0.3);
  --topbar-bg: rgba(34, 26, 16, 0.88);
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.right {
  display: flex;
  align-items: center;
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    opacity: 0.7;
  }
}

.search-bar {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.search-input {
  flex: 1;
  height: 68rpx;
  border-radius: 18rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 0 20rpx;
  font-size: 26rpx;
  color: var(--text-main);
}

.search-cancel text {
  color: #f49d25;
  font-size: 26rpx;
  font-weight: 600;
}

.category-tabs {
  margin-top: 14rpx;
  width: 100%;
}

.tabs-inner {
  display: flex;
  gap: 12rpx;
  padding: 4rpx 0;
}

.tab-item {
  flex-shrink: 0;
  min-height: 56rpx;
  border-radius: 999rpx;
  padding: 0 24rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    color: var(--text-sub);
    font-size: 24rpx;
    font-weight: 600;
    white-space: nowrap;
  }
}

.tab-item.active {
  background: rgba(244, 157, 37, 0.18);
  border-color: rgba(244, 157, 37, 0.36);

  text {
    color: #b45309;
  }
}

.job-list {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.filled-divider {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 0;
}

.filled-divider-text {
  color: var(--text-soft);
  font-size: 22rpx;
}

.filled-wrap {
  opacity: 0.55;
}

.state-card {
  margin-top: 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 40rpx 24rpx;
  border: 1px dashed var(--line);
  border-radius: 24rpx;
  background: var(--surface);
}

.state-text {
  color: var(--text-sub);
  font-size: 24rpx;
}

.load-more {
  margin-top: 20rpx;
  display: flex;
  justify-content: center;
  padding: 16rpx;
}

.load-more-text {
  color: #f49d25;
  font-size: 24rpx;
  font-weight: 600;
}

.fab {
  position: fixed;
  right: 36rpx;
  bottom: 120rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #f49d25, #ea580c);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 28rpx rgba(244, 157, 37, 0.4);
  z-index: 30;

  &:active {
    opacity: 0.85;
    transform: scale(0.95);
  }
}
</style>
