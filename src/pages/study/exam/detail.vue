<template>
  <view :class="['exam-detail-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">考试详情</text>
      </view>
    </view>

    <view v-if="!exam" class="state-card">
      <text class="state-text">加载中...</text>
    </view>

    <template v-else>
      <view class="countdown-banner">
        <view class="countdown-inner">
          <text class="countdown-label">距离考试还有</text>
          <view class="countdown-big">
            <text class="countdown-number">{{ countdownDays }}</text>
            <text class="countdown-day-text">天</text>
          </view>
          <text class="countdown-date">{{ formattedDate }}</text>
        </view>
      </view>

      <view class="info-card">
        <text class="subject-title">{{ exam.subject }}</text>
        <view class="info-row">
          <view :class="['type-badge', exam.examType]">
            <text class="badge-text">{{ examTypeLabel }}</text>
          </view>
        </view>
        <view v-if="exam.location" class="info-row">
          <Icon name="location_on" :size="16" :color="metaIconColor" />
          <text class="info-text">{{ exam.location }}</text>
        </view>
        <view v-if="exam.notes" class="notes-section">
          <text class="notes-label">备注</text>
          <text class="notes-content">{{ exam.notes }}</text>
        </view>
      </view>

      <view v-if="tasks.length" class="tasks-card">
        <view class="tasks-header">
          <text class="tasks-title">复习任务</text>
          <text class="tasks-progress">{{ doneCount }}/{{ tasks.length }}</text>
        </view>
        <view class="progress-bar-wrapper">
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: progressPercent + '%' }" />
          </view>
        </view>
        <view
          v-for="(task, idx) in tasks"
          :key="idx"
          class="task-item"
          @tap="toggleTask(idx)"
        >
          <view :class="['task-checkbox', { checked: task.done }]">
            <Icon v-if="task.done" name="check" :size="14" color="#ffffff" />
          </view>
          <text :class="['task-text', { done: task.done }]">{{ task.title }}</text>
        </view>
      </view>

      <view v-if="isAuthor" class="action-bar">
        <view class="action-btn edit" @tap="goEdit">
          <Icon name="edit" :size="18" color="#4A90E2" />
          <text class="action-text edit-text">编辑</text>
        </view>
        <view class="action-btn delete" @tap="confirmDelete">
          <Icon name="delete" :size="18" color="#ef4444" />
          <text class="action-text delete-text">删除</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import examPlansService from '@/services/exam-plans'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { ExamPlan, ExamTask, ExamType } from '@/types/exam-plan'

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#475569' : '#cbd5e1'))
const metaIconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#94a3b8' : '#64748b'))

const exam = ref<ExamPlan | null>(null)
const tasks = ref<ExamTask[]>([])
const examId = ref('')

const isAuthor = computed(() =>
  authStore.isLoggedIn && exam.value?.authorId === authStore.user?.$id
)

const countdownDays = computed(() => {
  if (!exam.value) return 0
  const diff = new Date(exam.value.examDate).getTime() - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / 86400000)
})

const formattedDate = computed(() => {
  if (!exam.value) return ''
  try {
    const d = new Date(exam.value.examDate)
    const datePart = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
    const startTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    if (exam.value.examEndDate) {
      const ed = new Date(exam.value.examEndDate)
      const endTime = `${String(ed.getHours()).padStart(2, '0')}:${String(ed.getMinutes()).padStart(2, '0')}`
      return `${datePart} ${startTime}-${endTime}`
    }
    return `${datePart} ${startTime}`
  } catch { return exam.value.examDate }
})

const examTypeLabel = computed(() => {
  const m: Record<ExamType, string> = { midterm: '期中考试', final: '期末考试', quiz: '小测' }
  return exam.value ? m[exam.value.examType] || '小测' : ''
})

const doneCount = computed(() => tasks.value.filter(t => t.done).length)
const progressPercent = computed(() => {
  if (!tasks.value.length) return 0
  return Math.round((doneCount.value / tasks.value.length) * 100)
})

const toggleTask = async (idx: number) => {
  tasks.value[idx].done = !tasks.value[idx].done
  try {
    await examPlansService.updateTasks(examId.value, tasks.value)
  } catch {
    tasks.value[idx].done = !tasks.value[idx].done
    uni.showToast({ title: '更新失败', icon: 'none' })
  }
}

const confirmDelete = () => {
  uni.showModal({
    title: '确认删除',
    content: '删除后无法恢复，确定要删除这个考试计划吗？',
    confirmColor: '#ef4444',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await examPlansService.deleteExamPlan(examId.value)
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => {
          uni.redirectTo({ url: '/pages/study/exam/index' })
        }, 200)
      } catch {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    }
  })
}

const goEdit = () => {
  uni.navigateTo({ url: `/pages/study/exam/edit?id=${examId.value}` })
}

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.navigateTo({ url: '/pages/study/exam/index' })
  }
}

const loadExam = async (id: string) => {
  try {
    const data = await examPlansService.getExamPlan(id)
    exam.value = data
    tasks.value = examPlansService.parseTasks(data.tasks)
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

onLoad((query) => {
  if (query?.id) {
    examId.value = query.id as string
    loadExam(examId.value)
  }
})

onShow(() => {
  uiPreferencesStore.initFromSystem()
  if (examId.value) loadExam(examId.value)
})
</script>

<style scoped lang="scss">
.exam-detail-page {
  min-height: 100vh;
  padding: 0 24rpx 100rpx;
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
}

.theme-dark {
  --page-bg: #151c2a;
  --surface: rgba(15, 23, 42, 0.72);
  --line: rgba(74, 144, 226, 0.24);
  --text-main: #f1f5f9;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(21, 28, 42, 0.92);
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

.state-card {
  padding: 80rpx 0;
  text-align: center;
}

.state-text {
  color: var(--text-soft);
  font-size: 26rpx;
}

.countdown-banner {
  margin-top: 18rpx;
  border: 1px solid var(--line);
  border-radius: 26rpx;
  background: linear-gradient(130deg, rgba(74, 144, 226, 0.22), rgba(74, 144, 226, 0.08));
  padding: 36rpx 24rpx;
  text-align: center;
}

.countdown-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.countdown-label {
  color: var(--text-sub);
  font-size: 24rpx;
}

.countdown-big {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
  margin: 8rpx 0;
}

.countdown-number {
  font-size: 72rpx;
  font-weight: 800;
  color: #4A90E2;
  line-height: 1;
}

.countdown-day-text {
  font-size: 30rpx;
  color: var(--text-sub);
  font-weight: 600;
}

.countdown-date {
  color: var(--text-sub);
  font-size: 24rpx;
}

.info-card {
  margin-top: 16rpx;
  border: 1px solid var(--line);
  border-radius: 22rpx;
  background: var(--surface);
  padding: 24rpx;
}

.subject-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-main);
}

.info-row {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.type-badge {
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(74, 144, 226, 0.16);
}

.type-badge.midterm { background: rgba(59, 130, 246, 0.16); }
.type-badge.final { background: rgba(74, 144, 226, 0.16); }
.type-badge.quiz { background: rgba(34, 197, 94, 0.16); }

.badge-text {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--text-sub);
}

.info-text {
  font-size: 24rpx;
  color: var(--text-sub);
}

.notes-section {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1px solid var(--line);
}

.notes-label {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-sub);
  margin-bottom: 8rpx;
}

.notes-content {
  font-size: 26rpx;
  color: var(--text-main);
  line-height: 1.6;
  word-break: break-all;
}

.tasks-card {
  margin-top: 16rpx;
  border: 1px solid var(--line);
  border-radius: 22rpx;
  background: var(--surface);
  padding: 24rpx;
}

.tasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tasks-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.tasks-progress {
  font-size: 24rpx;
  color: #4A90E2;
  font-weight: 600;
}

.progress-bar-wrapper {
  margin: 14rpx 0 18rpx;
}

.progress-bar {
  height: 10rpx;
  border-radius: 5rpx;
  background: rgba(74, 144, 226, 0.12);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 5rpx;
  background: linear-gradient(90deg, #4A90E2, #3f7dcb);
  transition: width 0.3s;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 14rpx 0;
  border-bottom: 1px solid rgba(74, 144, 226, 0.06);
}

.task-item:last-child {
  border-bottom: none;
}

.task-checkbox {
  width: 40rpx;
  height: 40rpx;
  border-radius: 10rpx;
  border: 2rpx solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.task-checkbox.checked {
  background: linear-gradient(135deg, #4A90E2, #3f7dcb);
  border-color: #4A90E2;
}

.task-text {
  font-size: 26rpx;
  color: var(--text-main);
}

.task-text.done {
  text-decoration: line-through;
  color: var(--text-soft);
}

.action-bar {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.action-btn.edit {
  border: 1px solid rgba(74, 144, 226, 0.4);
  background: rgba(74, 144, 226, 0.08);
}

.action-btn.delete {
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.08);
}

.action-text {
  font-size: 26rpx;
  font-weight: 600;
}

.edit-text { color: #4A90E2; }
.delete-text { color: #ef4444; }
</style>
