<template>
  <view :class="['exam-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">考试计划</text>
      </view>
    </view>

    <scroll-view class="category-tabs" scroll-x show-scrollbar="false">
      <view class="tabs-inner">
        <view
          v-for="tab in typeTabs"
          :key="tab.value"
          :class="['tab-item', { active: activeType === tab.value }]"
          @tap="activeType = tab.value"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="exam-list">
      <view v-if="loading && !filteredExams.length" class="state-card">
        <text class="state-text">加载中...</text>
      </view>

      <view v-else-if="!filteredExams.length" class="state-card">
        <text class="state-text">暂无考试计划</text>
      </view>

      <view
        v-for="exam in filteredExams"
        :key="exam.$id"
        :class="['exam-card', { past: isPast(exam) }]"
        @tap="goDetail(exam.$id)"
      >
        <view class="card-left">
          <view :class="['type-badge', exam.examType]">
            <text class="badge-text">{{ examTypeLabel(exam.examType) }}</text>
          </view>
          <view class="countdown-circle">
            <text class="countdown-num">{{ countdownDays(exam) }}</text>
            <text class="countdown-unit">天</text>
          </view>
        </view>
        <view class="card-right">
          <text class="exam-subject">{{ exam.subject }}</text>
          <view class="exam-meta">
            <Icon name="calendar_today" :size="14" :color="metaIconColor" />
            <text class="meta-text">{{ formatDate(exam) }}</text>
          </view>
          <view v-if="exam.location" class="exam-meta">
            <Icon name="location_on" :size="14" :color="metaIconColor" />
            <text class="meta-text">{{ exam.location }}</text>
          </view>
          <view class="task-progress" v-if="parseTasks(exam.tasks).length">
            <view class="progress-bar">
              <view class="progress-fill" :style="{ width: taskProgress(exam) + '%' }" />
            </view>
            <text class="progress-text">{{ taskDoneCount(exam) }}/{{ parseTasks(exam.tasks).length }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="fab-btn" @tap="goAdd">
      <Icon name="add" :size="28" color="#ffffff" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import examPlansService from '@/services/exam-plans'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { ExamPlan, ExamTask, ExamType } from '@/types/exam-plan'

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#475569' : '#cbd5e1'))
const metaIconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#94a3b8' : '#64748b'))

const loading = ref(false)
const exams = ref<ExamPlan[]>([])
const activeType = ref<ExamType | 'all'>('all')

const typeTabs: { value: ExamType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'midterm', label: '期中' },
  { value: 'final', label: '期末' },
  { value: 'quiz', label: '小测' }
]

const filteredExams = computed(() => {
  if (activeType.value === 'all') return exams.value
  return exams.value.filter(e => e.examType === activeType.value)
})

const examTypeLabel = (t: ExamType) => {
  const m: Record<ExamType, string> = { midterm: '期中', final: '期末', quiz: '小测' }
  return m[t] || '小测'
}

const isPast = (exam: ExamPlan) => new Date(exam.examDate).getTime() < Date.now()

const countdownDays = (exam: ExamPlan) => {
  const diff = new Date(exam.examDate).getTime() - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / 86400000)
}

const formatDate = (exam: ExamPlan) => {
  try {
    const d = new Date(exam.examDate)
    const datePart = `${d.getMonth() + 1}月${d.getDate()}日`
    const startTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    if (exam.examEndDate) {
      const ed = new Date(exam.examEndDate)
      const endTime = `${String(ed.getHours()).padStart(2, '0')}:${String(ed.getMinutes()).padStart(2, '0')}`
      return `${datePart} ${startTime}-${endTime}`
    }
    return `${datePart} ${startTime}`
  } catch { return exam.examDate }
}

const parseTasks = (raw: string): ExamTask[] => examPlansService.parseTasks(raw)

const taskDoneCount = (exam: ExamPlan) => parseTasks(exam.tasks).filter(t => t.done).length
const taskProgress = (exam: ExamPlan) => {
  const tasks = parseTasks(exam.tasks)
  if (!tasks.length) return 0
  return Math.round((tasks.filter(t => t.done).length / tasks.length) * 100)
}

const fetchExams = async () => {
  loading.value = true
  try {
    exams.value = await examPlansService.getMyExamPlans()
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
    uni.switchTab({ url: '/pages/study/index' })
  }
}

const goDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/study/exam/detail?id=${id}` })
}

const goAdd = () => {
  if (!authStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    uni.navigateTo({ url: '/pages/mine/login' })
    return
  }
  uni.navigateTo({ url: '/pages/study/exam/edit' })
}

onShow(() => {
  uiPreferencesStore.initFromSystem()
  fetchExams()
})
</script>

<style scoped lang="scss">
.exam-page {
  min-height: 100vh;
  padding: 0 24rpx 120rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f6f6f8;
  --surface: #ffffff;
  --line: rgba(74, 144, 226, 0.12);
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(246, 246, 248, 0.92);
  --tab-bg: rgba(74, 144, 226, 0.08);
  --tab-active-bg: rgba(74, 144, 226, 0.22);
}

.theme-dark {
  --page-bg: #151c2a;
  --surface: rgba(15, 23, 42, 0.72);
  --line: rgba(74, 144, 226, 0.24);
  --text-main: #f1f5f9;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(21, 28, 42, 0.92);
  --tab-bg: rgba(74, 144, 226, 0.1);
  --tab-active-bg: rgba(74, 144, 226, 0.28);
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
    color: #4A90E2;
  }
}

.exam-list {
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

.exam-card {
  display: flex;
  gap: 20rpx;
  margin-bottom: 16rpx;
  padding: 24rpx;
  border: 1px solid var(--line);
  border-radius: 22rpx;
  background: var(--surface);
}

.exam-card.past {
  opacity: 0.55;
}

.card-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  min-width: 100rpx;
}

.type-badge {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(74, 144, 226, 0.16);
}

.type-badge.midterm { background: rgba(59, 130, 246, 0.16); }
.type-badge.final { background: rgba(74, 144, 226, 0.16); }
.type-badge.quiz { background: rgba(34, 197, 94, 0.16); }

.badge-text {
  font-size: 20rpx;
  font-weight: 600;
  color: var(--text-sub);
}

.countdown-circle {
  width: 90rpx;
  height: 90rpx;
  border-radius: 50%;
  border: 3rpx solid #4A90E2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.countdown-num {
  font-size: 32rpx;
  font-weight: 800;
  color: #4A90E2;
  line-height: 1.1;
}

.countdown-unit {
  font-size: 18rpx;
  color: var(--text-soft);
}

.card-right {
  flex: 1;
  min-width: 0;
}

.exam-subject {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exam-meta {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.meta-text {
  font-size: 22rpx;
  color: var(--text-sub);
}

.task-progress {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.progress-bar {
  flex: 1;
  height: 8rpx;
  border-radius: 4rpx;
  background: rgba(74, 144, 226, 0.12);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4rpx;
  background: linear-gradient(90deg, #4A90E2, #3f7dcb);
  transition: width 0.3s;
}

.progress-text {
  font-size: 20rpx;
  color: var(--text-soft);
  font-weight: 600;
}

.fab-btn {
  position: fixed;
  right: 40rpx;
  bottom: 120rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4A90E2, #3f7dcb);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(74, 144, 226, 0.4);
  z-index: 30;
}
</style>
