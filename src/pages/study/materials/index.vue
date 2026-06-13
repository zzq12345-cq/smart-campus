<template>
  <view :class="['materials-page', themeClass]">
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
          v-for="cat in typeFilters"
          :key="cat.value"
          class="tab-item"
          :class="{ active: activeType === cat.value }"
          @tap="switchType(cat.value)"
        >
          <text>{{ cat.label }}</text>
        </view>
      </view>
    </scroll-view>

    <view v-if="loading && !items.length" class="state-card">
      <text class="state-text">{{ loadingText }}</text>
    </view>

    <view v-else-if="!items.length" class="state-card">
      <Icon name="school" :size="40" color="rgba(74,144,226,0.3)" />
      <text class="state-text">{{ emptyText }}</text>
    </view>

    <view v-else class="item-list">
      <MaterialCard
        v-for="item in items"
        :key="item.$id"
        :item="item"
        :theme-class="themeClass"
        @tap="goDetail(item.$id)"
      />
    </view>

    <view v-if="items.length && hasMore" class="load-more" @tap="loadMore">
      <text class="load-more-text">{{ loadingMore ? loadingText : loadMoreText }}</text>
    </view>

    <view class="fab" @tap="goUpload">
      <Icon name="add" :size="26" color="#ffffff" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import studyMaterialsService from '@/services/study-materials'
import type { StudyMaterial, MaterialType } from '@/types/study-material'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { requireAuth } from '@/utils/auth-guard'
import MaterialCard from '@/components/study/MaterialCard.vue'

type TypeFilter = MaterialType | 'all'
const PAGE_SIZE = 20

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#475569' : '#cbd5e1'))

const items = ref<StudyMaterial[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const activeType = ref<TypeFilter>('all')
const showSearch = ref(false)
const searchKeyword = ref('')
const isSearchMode = ref(false)

const pageTitle = computed(() => (isZh.value ? '学习资料' : 'Study Materials'))
const searchPlaceholder = computed(() => (isZh.value ? '搜索资料...' : 'Search materials...'))
const cancelText = computed(() => (isZh.value ? '取消' : 'Cancel'))
const loadingText = computed(() => (isZh.value ? '加载中...' : 'Loading...'))
const emptyText = computed(() => (isZh.value ? '暂无资料，快来分享第一份吧' : 'No materials yet. Be the first to share!'))
const loadMoreText = computed(() => (isZh.value ? '加载更多' : 'Load more'))

const typeFilters = computed(() => [
  { value: 'all' as TypeFilter, label: isZh.value ? '全部' : 'All' },
  { value: 'notes' as TypeFilter, label: isZh.value ? '笔记' : 'Notes' },
  { value: 'past_exam' as TypeFilter, label: isZh.value ? '历年真题' : 'Past Exams' },
  { value: 'courseware' as TypeFilter, label: isZh.value ? '课件' : 'Courseware' },
  { value: 'lab_report' as TypeFilter, label: isZh.value ? '实验报告' : 'Lab Reports' },
  { value: 'other' as TypeFilter, label: isZh.value ? '其他' : 'Other' }
])

const loadItems = async (reset = true) => {
  if (reset) {
    loading.value = true
    items.value = []
    hasMore.value = true
  } else {
    loadingMore.value = true
  }

  try {
    const offset = reset ? 0 : items.value.length
    const result = await studyMaterialsService.getMaterials({
      materialType: activeType.value,
      limit: PAGE_SIZE,
      offset
    })
    if (reset) {
      items.value = result
    } else {
      items.value = [...items.value, ...result]
    }
    hasMore.value = result.length >= PAGE_SIZE
  } catch (error) {
    console.error('Load study materials failed:', error)
    uni.showToast({
      title: isZh.value ? '加载失败' : 'Load failed',
      icon: 'none'
    })
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const switchType = (type: TypeFilter) => {
  if (activeType.value === type) return
  activeType.value = type
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
  items.value = []
  hasMore.value = false
  try {
    items.value = await studyMaterialsService.searchMaterials(keyword)
  } catch (error) {
    console.error('Search study materials failed:', error)
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
    uni.switchTab({ url: '/pages/study/index' })
  }
}

const goDetail = (id: string) => {
  uni.navigateTo({
    url: `/pages/study/materials/detail?id=${encodeURIComponent(id)}`
  })
}

const goUpload = () => {
  if (!requireAuth('/pages/study/materials/index')) return
  uni.navigateTo({ url: '/pages/study/materials/upload' })
}

onShow(async () => {
  uiPreferencesStore.initFromSystem()
  await authStore.refreshProfile()
  await loadItems()
})
</script>

<style scoped lang="scss">
.materials-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 160rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f0f4fa;
  --surface: #ffffff;
  --text-main: #1e293b;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(74, 144, 226, 0.16);
  --topbar-bg: rgba(240, 244, 250, 0.9);
}

.theme-dark {
  --page-bg: #101827;
  --surface: rgba(15, 23, 42, 0.78);
  --text-main: #f8fafc;
  --text-sub: #d1d5db;
  --text-soft: #94a3af;
  --line: rgba(74, 144, 226, 0.3);
  --topbar-bg: rgba(16, 24, 39, 0.88);
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
  color: #4A90E2;
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
  background: rgba(74, 144, 226, 0.18);
  border-color: rgba(74, 144, 226, 0.36);

  text {
    color: #1d4ed8;
  }
}

.item-list {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
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
  color: #4A90E2;
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
  background: linear-gradient(135deg, #4A90E2, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 28rpx rgba(74, 144, 226, 0.4);
  z-index: 30;

  &:active {
    opacity: 0.85;
    transform: scale(0.95);
  }
}
</style>
