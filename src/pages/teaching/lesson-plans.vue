<template>
  <view :class="['lesson-plans-page', themeClass]">
    <view class="top-bar">
      <view class="icon-btn" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
      </view>
      <text class="title">{{ isZh ? '我的教案' : 'My Plans' }}</text>
      <view class="icon-btn" @tap="goNewPlan">
        <Icon name="add" :size="20" :color="subjectColor" />
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <Icon name="search" :size="16" color="#94a3b8" />
      <input
        v-model="keyword"
        class="search-input"
        :placeholder="isZh ? '搜索教案...' : 'Search plans...'"
        placeholder-class="search-placeholder"
        @confirm="searchPlans"
      />
      <view v-if="keyword" class="clear-btn" @tap="clearSearch">
        <Icon name="close" :size="14" color="#94a3b8" />
      </view>
    </view>

    <!-- 筛选 -->
    <scroll-view class="filter-scroll" scroll-x show-scrollbar="false">
      <view class="filter-tabs">
        <view
          v-for="tab in filterTabs"
          :key="tab.value"
          :class="['filter-tab', { active: currentFilter === tab.value }]"
          :style="currentFilter === tab.value ? { background: subjectColorLight, color: subjectColor, borderColor: subjectColor } : {}"
          @tap="setFilter(tab.value)"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 列表 -->
    <view class="plan-list">
      <view v-if="loading && !plans.length" class="state-card">
        <text class="state-text">{{ isZh ? '加载中...' : 'Loading...' }}</text>
      </view>

      <view v-else-if="!plans.length" class="state-card">
        <Icon name="description" :size="40" color="#94a3b8" />
        <text class="state-text">{{ isZh ? '暂无教案' : 'No plans found' }}</text>
      </view>

      <view v-for="plan in plans" :key="plan.$id" class="plan-card" @tap="goEditPlan(plan.$id)">
        <view class="plan-head">
          <view class="plan-badge" :style="{ background: subjectColorLight, color: subjectColor }">
            <text>{{ plan.subject || subjectLabel }}</text>
          </view>
          <view :class="['status-pill', `status-${plan.status}`]">
            <text>{{ statusLabel(plan.status) }}</text>
          </view>
        </view>
        <text class="plan-title">{{ plan.title }}</text>
        <text v-if="plan.objectives" class="plan-objectives">{{ plan.objectives }}</text>
        <view class="plan-footer">
          <view class="plan-meta-row">
            <Icon name="schedule" :size="14" color="#94a3b8" />
            <text class="plan-meta-text">{{ plan.duration || 45 }}{{ isZh ? '分钟' : 'min' }}</text>
          </view>
          <view class="plan-meta-row">
            <Icon name="calendar_today" :size="14" color="#94a3b8" />
            <text class="plan-meta-text">{{ formatDate(plan.$updatedAt) }}</text>
          </view>
        </view>
        <view class="plan-actions">
          <view v-if="plan.status === 'draft'" class="action-pill publish" @tap.stop="publishPlan(plan)">
            <text>{{ isZh ? '发布' : 'Publish' }}</text>
          </view>
          <view class="action-pill copy" @tap.stop="duplicatePlan(plan)">
            <text>{{ isZh ? '复制' : 'Copy' }}</text>
          </view>
          <view class="action-pill delete" @tap.stop="deletePlan(plan)">
            <text>{{ isZh ? '删除' : 'Delete' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 悬浮新建 -->
    <view class="fab" :style="{ background: subjectColor }" @tap="goNewPlan">
      <Icon name="add" :size="24" color="#ffffff" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { getSubjectConfig, SUBJECT_LIST } from '@/teacher/types/subjects'
import lessonPlansService from '@/teacher/services/lesson-plans'
import type { LessonPlan, LessonPlanStatus } from '@/teacher/types/lesson-plan'

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8')
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const currentSubject = computed(() => {
  return getSubjectConfig(authStore.teacherSubject) || SUBJECT_LIST[3]
})
const subjectColor = computed(() => currentSubject.value.color)
const subjectColorLight = computed(() => currentSubject.value.colorLight)
const subjectLabel = computed(() => isZh.value ? currentSubject.value.name : currentSubject.value.nameEn)

const keyword = ref('')
const currentFilter = ref<LessonPlanStatus | ''>('')
const loading = ref(false)
const plans = ref<LessonPlan[]>([])

const filterTabs = computed(() => [
  { value: '' as const, label: isZh.value ? '全部' : 'All' },
  { value: 'draft' as const, label: isZh.value ? '草稿' : 'Draft' },
  { value: 'published' as const, label: isZh.value ? '已发布' : 'Published' },
  { value: 'archived' as const, label: isZh.value ? '已归档' : 'Archived' }
])

function statusLabel(status: string) {
  if (isZh.value) {
    return status === 'published' ? '已发布' : status === 'archived' ? '已归档' : '草稿'
  }
  return status === 'published' ? 'Published' : status === 'archived' ? 'Archived' : 'Draft'
}

function formatDate(raw?: string) {
  if (!raw) return '--'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadPlans() {
  if (!authStore.isLoggedIn) return
  loading.value = true
  try {
    plans.value = await lessonPlansService.getMyLessonPlans({
      status: currentFilter.value || undefined,
      keyword: keyword.value.trim() || undefined,
      limit: 50
    })
  } catch (e) {
    console.error('Load plans failed:', e)
    uni.showToast({ title: isZh.value ? '加载失败' : 'Load failed', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function setFilter(value: LessonPlanStatus | '') {
  currentFilter.value = value
  loadPlans()
}

function searchPlans() {
  loadPlans()
}

function clearSearch() {
  keyword.value = ''
  loadPlans()
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/teaching/index' })
  }
}

function goNewPlan() {
  uni.navigateTo({ url: '/pages/teaching/lesson-plan-edit' })
}

function goEditPlan(id: string) {
  uni.navigateTo({ url: `/pages/teaching/lesson-plan-detail?id=${encodeURIComponent(id)}` })
}

async function publishPlan(plan: LessonPlan) {
  try {
    await lessonPlansService.publishLessonPlan(plan.$id)
    uni.showToast({ title: isZh.value ? '已发布' : 'Published', icon: 'success' })
    await loadPlans()
  } catch { uni.showToast({ title: isZh.value ? '操作失败' : 'Failed', icon: 'none' }) }
}

async function duplicatePlan(plan: LessonPlan) {
  try {
    await lessonPlansService.duplicateLessonPlan(plan.$id)
    uni.showToast({ title: isZh.value ? '已复制' : 'Copied', icon: 'success' })
    await loadPlans()
  } catch { uni.showToast({ title: isZh.value ? '操作失败' : 'Failed', icon: 'none' }) }
}

async function deletePlan(plan: LessonPlan) {
  uni.showModal({
    title: isZh.value ? '确认删除' : 'Confirm Delete',
    content: isZh.value ? `删除「${plan.title}」？此操作不可撤销。` : `Delete "${plan.title}"? This cannot be undone.`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await lessonPlansService.deleteLessonPlan(plan.$id)
        uni.showToast({ title: isZh.value ? '已删除' : 'Deleted', icon: 'success' })
        await loadPlans()
      } catch { uni.showToast({ title: isZh.value ? '删除失败' : 'Delete failed', icon: 'none' }) }
    }
  })
}

onShow(() => {
  loadPlans()
})
</script>

<style lang="scss" scoped>
.lesson-plans-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 160rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f8f6f6;
  --surface: #ffffff;
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(192, 0, 0, 0.12);
}

.theme-dark {
  --page-bg: #1a1315;
  --surface: rgba(26, 19, 21, 0.78);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --line: rgba(192, 0, 0, 0.24);
}

.top-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .title { color: var(--text-main); font-size: 34rpx; font-weight: 700; }
  .icon-btn {
    width: 64rpx; height: 64rpx; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    &:active { opacity: 0.7; }
  }
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 20rpx;
  border-radius: 16rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  margin-bottom: 16rpx;
}

.search-input {
  flex: 1;
  font-size: 26rpx;
  color: var(--text-main);
  background: transparent;
}

.search-placeholder { color: var(--text-soft); }

.clear-btn {
  width: 36rpx; height: 36rpx; display: flex; align-items: center; justify-content: center;
  &:active { opacity: 0.7; }
}

.filter-scroll { margin-bottom: 16rpx; white-space: nowrap; }
.filter-tabs { display: flex; gap: 12rpx; }
.filter-tab {
  padding: 10rpx 24rpx; border-radius: 999rpx;
  font-size: 24rpx; font-weight: 500; color: var(--text-sub);
  border: 1px solid var(--line); background: var(--surface);
  white-space: nowrap;
  &:active { opacity: 0.7; }
  text { font-size: 24rpx; }
}

.plan-list { display: flex; flex-direction: column; gap: 16rpx; }

.state-card {
  padding: 80rpx 24rpx; border-radius: 20rpx; border: 1px solid var(--line); background: var(--surface);
  display: flex; flex-direction: column; align-items: center; gap: 16rpx;
}

.state-text { font-size: 26rpx; color: var(--text-sub); }

.plan-card {
  padding: 24rpx; border-radius: 20rpx; border: 1px solid var(--line); background: var(--surface);
  &:active { transform: scale(0.98); }
}

.plan-head {
  display: flex; align-items: center; gap: 10rpx; margin-bottom: 12rpx;
}

.plan-badge {
  padding: 4rpx 14rpx; border-radius: 999rpx;
  text { font-size: 20rpx; font-weight: 600; }
}

.status-pill {
  padding: 4rpx 12rpx; border-radius: 999rpx;
  text { font-size: 20rpx; font-weight: 500; }

  &.status-draft { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
  &.status-published { background: rgba(16, 185, 129, 0.15); color: #10b981; }
  &.status-archived { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }
}

.plan-title {
  font-size: 30rpx; font-weight: 600; color: var(--text-main); margin-bottom: 8rpx;
}

.plan-objectives {
  font-size: 24rpx; color: var(--text-sub); line-height: 1.5; margin-bottom: 12rpx;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.plan-footer {
  display: flex; align-items: center; gap: 20rpx; margin-bottom: 12rpx;
}

.plan-meta-row {
  display: flex; align-items: center; gap: 6rpx;
}

.plan-meta-text { font-size: 22rpx; color: var(--text-soft); }

.plan-actions {
  display: flex; gap: 12rpx;
}

.action-pill {
  padding: 6rpx 16rpx; border-radius: 999rpx; font-size: 22rpx;
  text { font-size: 22rpx; }

  &.publish { background: rgba(16, 185, 129, 0.12); color: #10b981; }
  &.copy { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
  &.delete { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
  &:active { opacity: 0.7; }
}

.fab {
  position: fixed;
  right: 40rpx;
  bottom: calc(40rpx + env(safe-area-inset-bottom, 0px));
  width: 100rpx; height: 100rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(192, 0, 0, 0.3);
  &:active { transform: scale(0.92); }
}
</style>
