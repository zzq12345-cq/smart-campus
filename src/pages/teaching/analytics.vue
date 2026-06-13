<template>
  <view :class="['analytics-page', themeClass]">
    <view class="top-bar">
      <view class="icon-btn" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
      </view>
      <view class="topbar-center">
        <Icon name="bar_chart" :size="20" :color="subjectColor" />
        <text class="title">{{ isZh ? '教学分析' : 'Analytics' }}</text>
      </view>
      <view class="icon-btn" @tap="refreshData">
        <Icon name="refresh" :size="20" :color="iconColor" />
      </view>
    </view>

    <scroll-view class="main-scroll" scroll-y>
      <view class="scroll-inner">
      <!-- 概览统计卡 -->
      <view class="stats-row">
        <view class="stat-card" :style="{ borderColor: subjectColor }">
          <text class="stat-value" :style="{ color: subjectColor }">{{ stats.totalPlans }}</text>
          <text class="stat-label">{{ isZh ? '教案总数' : 'Plans' }}</text>
        </view>
        <view class="stat-card" :style="{ borderColor: '#10b981' }">
          <text class="stat-value" style="color:#10b981">{{ stats.publishedPlans }}</text>
          <text class="stat-label">{{ isZh ? '已发布' : 'Published' }}</text>
        </view>
        <view class="stat-card" :style="{ borderColor: '#3b82f6' }">
          <text class="stat-value" style="color:#3b82f6">{{ stats.totalQuizzes }}</text>
          <text class="stat-label">{{ isZh ? '试卷' : 'Quizzes' }}</text>
        </view>
      </view>

      <!-- 教案状态分布 -->
      <view class="section-card">
        <view class="section-header">
          <Icon name="pie_chart" :size="18" :color="subjectColor" />
          <text class="section-title">{{ isZh ? '教案状态分布' : 'Plan Status' }}</text>
        </view>
        <view v-if="stats.totalPlans > 0" class="bar-chart">
          <view class="bar-item">
            <view class="bar-label-row">
              <view class="bar-dot" style="background:#f59e0b" />
              <text class="bar-name">{{ isZh ? '草稿' : 'Draft' }}</text>
              <text class="bar-count">{{ stats.draftPlans }}</text>
            </view>
            <view class="bar-track">
              <view class="bar-fill" :style="{ width: barPercent(stats.draftPlans), background: '#f59e0b' }" />
            </view>
          </view>
          <view class="bar-item">
            <view class="bar-label-row">
              <view class="bar-dot" style="background:#10b981" />
              <text class="bar-name">{{ isZh ? '已发布' : 'Published' }}</text>
              <text class="bar-count">{{ stats.publishedPlans }}</text>
            </view>
            <view class="bar-track">
              <view class="bar-fill" :style="{ width: barPercent(stats.publishedPlans), background: '#10b981' }" />
            </view>
          </view>
          <view class="bar-item">
            <view class="bar-label-row">
              <view class="bar-dot" style="background:#94a3b8" />
              <text class="bar-name">{{ isZh ? '已归档' : 'Archived' }}</text>
              <text class="bar-count">{{ stats.archivedPlans }}</text>
            </view>
            <view class="bar-track">
              <view class="bar-fill" :style="{ width: barPercent(stats.archivedPlans), background: '#94a3b8' }" />
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text>{{ isZh ? '暂无教案数据' : 'No plan data' }}</text>
        </view>
      </view>

      <!-- 试卷记录 -->
      <view class="section-card">
        <view class="section-header">
          <Icon name="quiz" :size="18" :color="subjectColor" />
          <text class="section-title">{{ isZh ? '试卷记录' : 'Quiz History' }}</text>
          <text v-if="quizzes.length" class="section-badge" :style="{ background: subjectColor }">{{ quizzes.length }}</text>
        </view>
        <view v-if="quizzes.length" class="quiz-list">
          <view v-for="quiz in quizzes.slice(0, 10)" :key="quiz.id" class="quiz-item" @tap="viewQuiz(quiz)">
            <view class="quiz-left">
              <text class="quiz-title">{{ quiz.title }}</text>
              <view class="quiz-meta">
                <text class="quiz-meta-text">{{ quiz.questionCount }}{{ isZh ? '题' : 'Q' }}</text>
                <text class="quiz-meta-sep">·</text>
                <text class="quiz-meta-text">{{ diffLabel(quiz.difficulty) }}</text>
                <text class="quiz-meta-sep">·</text>
                <text class="quiz-meta-text">{{ formatDate(quiz.createdAt) }}</text>
              </view>
            </view>
            <Icon name="chevron_right" :size="16" color="#94a3b8" />
          </view>
        </view>
        <view v-else class="empty-state">
          <Icon name="quiz" :size="36" :color="subjectColor" />
          <text>{{ isZh ? '还没有生成过试卷' : 'No quizzes yet' }}</text>
          <view class="empty-btn" :style="{ background: subjectColor }" @tap="goQuestionGen">
            <text style="color:#fff;font-size:24rpx;font-weight:600;">{{ isZh ? '去出题' : 'Generate' }}</text>
          </view>
        </view>
      </view>

      <!-- 最近活动 -->
      <view class="section-card">
        <view class="section-header">
          <Icon name="timeline" :size="18" :color="subjectColor" />
          <text class="section-title">{{ isZh ? '最近活动' : 'Recent Activity' }}</text>
        </view>
        <view v-if="recentActivities.length" class="activity-list">
          <view v-for="(act, i) in recentActivities" :key="i" class="activity-item">
            <view class="activity-dot" :style="{ background: act.color }" />
            <view class="activity-content">
              <text class="activity-text">{{ act.text }}</text>
              <text class="activity-time">{{ act.time }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text>{{ isZh ? '暂无活动记录' : 'No activity' }}</text>
        </view>
      </view>

      <view style="height: 60rpx" />
      </view>
    </scroll-view>

    <!-- 试卷预览弹窗 -->
    <view v-if="selectedQuiz" class="quiz-modal-mask" @tap="selectedQuiz = null">
      <view class="quiz-modal" @tap.stop>
        <view class="quiz-modal-header">
          <text class="quiz-modal-title">{{ selectedQuiz.title }}</text>
          <view class="icon-btn" @tap="selectedQuiz = null">
            <Icon name="close" :size="20" :color="iconColor" />
          </view>
        </view>
        <scroll-view class="quiz-modal-body" scroll-y>
          <MarkdownText :content="selectedQuiz.content" />
        </scroll-view>
        <view class="quiz-modal-footer">
          <view class="action-btn outline" @tap="copyQuizContent">
            <Icon name="content_copy" :size="16" :color="subjectColor" />
            <text :style="{ color: subjectColor, fontSize: '24rpx', fontWeight: '600' }">{{ isZh ? '复制' : 'Copy' }}</text>
          </view>
          <view class="action-btn danger" @tap="deleteQuiz(selectedQuiz.id)">
            <Icon name="delete" :size="16" color="#ef4444" />
            <text style="color:#ef4444;font-size:24rpx;font-weight:600;">{{ isZh ? '删除' : 'Delete' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { getSubjectConfig, SUBJECT_LIST } from '@/teacher/types/subjects'
import lessonPlansService from '@/teacher/services/lesson-plans'
import type { LessonPlan } from '@/teacher/types/lesson-plan'
import MarkdownText from '@/components/common/MarkdownText.vue'

interface SavedQuiz {
  id: string
  title: string
  subject: string
  difficulty: string
  questionCount: number
  content: string
  createdAt: string
}

interface ActivityItem {
  text: string
  time: string
  color: string
}

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8')
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const currentSubject = computed(() => getSubjectConfig(authStore.teacherSubject) || SUBJECT_LIST[3])
const subjectColor = computed(() => currentSubject.value.color)

const stats = ref({
  totalPlans: 0,
  draftPlans: 0,
  publishedPlans: 0,
  archivedPlans: 0,
  totalQuizzes: 0,
})

const quizzes = ref<SavedQuiz[]>([])
const recentActivities = ref<ActivityItem[]>([])
const selectedQuiz = ref<SavedQuiz | null>(null)

function barPercent(value: number) {
  if (stats.value.totalPlans === 0) return '0%'
  return `${Math.round((value / stats.value.totalPlans) * 100)}%`
}

function diffLabel(d: string) {
  if (!isZh.value) return d
  const map: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难', mixed: '混合' }
  return map[d] || d
}

function formatDate(raw?: string) {
  if (!raw) return '--'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatRelative(raw: string) {
  const d = new Date(raw)
  const now = Date.now()
  const diff = now - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return isZh.value ? '刚刚' : 'Just now'
  if (mins < 60) return `${mins}${isZh.value ? '分钟前' : 'm ago'}`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}${isZh.value ? '小时前' : 'h ago'}`
  const days = Math.floor(hrs / 24)
  return `${days}${isZh.value ? '天前' : 'd ago'}`
}

async function loadStats() {
  // 加载教案
  let plans: LessonPlan[] = []
  try {
    plans = await lessonPlansService.getLessonPlans({ limit: 200 })
  } catch { plans = [] }

  stats.value.totalPlans = plans.length
  stats.value.draftPlans = plans.filter(p => p.status === 'draft').length
  stats.value.publishedPlans = plans.filter(p => p.status === 'published').length
  stats.value.archivedPlans = plans.filter(p => p.status === 'archived').length

  // 加载试卷
  try {
    const raw = uni.getStorageSync('saved_quizzes')
    quizzes.value = raw ? JSON.parse(raw) : []
  } catch { quizzes.value = [] }
  stats.value.totalQuizzes = quizzes.value.length

  // 构建活动时间线
  const activities: ActivityItem[] = []

  plans.slice(0, 5).forEach(p => {
    activities.push({
      text: `${isZh.value ? '教案' : 'Plan'}: ${p.title}`,
      time: formatRelative(p.$updatedAt || p.$createdAt),
      color: p.status === 'published' ? '#10b981' : p.status === 'archived' ? '#94a3b8' : '#f59e0b'
    })
  })

  quizzes.value.slice(0, 5).forEach(q => {
    activities.push({
      text: `${isZh.value ? '试卷' : 'Quiz'}: ${q.title}`,
      time: formatRelative(q.createdAt),
      color: '#3b82f6'
    })
  })

  // 按时间排序
  activities.sort((a, b) => {
    // 简单比较，把"刚刚"排前面
    if (a.time.includes('刚刚') || a.time.includes('Just')) return -1
    if (b.time.includes('刚刚') || b.time.includes('Just')) return 1
    return 0
  })

  recentActivities.value = activities.slice(0, 8)
}

function refreshData() {
  uni.showToast({ title: isZh.value ? '刷新中...' : 'Refreshing...', icon: 'none', duration: 800 })
  loadStats()
}

function viewQuiz(quiz: SavedQuiz) {
  selectedQuiz.value = quiz
}

function copyQuizContent() {
  if (!selectedQuiz.value) return
  uni.setClipboardData({
    data: selectedQuiz.value.content,
    success: () => uni.showToast({ title: isZh.value ? '已复制' : 'Copied', icon: 'success' })
  })
}

function deleteQuiz(id: string) {
  uni.showModal({
    title: isZh.value ? '删除试卷' : 'Delete Quiz',
    content: isZh.value ? '确定删除这份试卷？' : 'Delete this quiz?',
    success: (res) => {
      if (!res.confirm) return
      quizzes.value = quizzes.value.filter(q => q.id !== id)
      uni.setStorageSync('saved_quizzes', JSON.stringify(quizzes.value))
      stats.value.totalQuizzes = quizzes.value.length
      selectedQuiz.value = null
      uni.showToast({ title: isZh.value ? '已删除' : 'Deleted', icon: 'success' })
    }
  })
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/teaching/index' })
  }
}

function goQuestionGen() {
  uni.navigateTo({ url: '/pages/teaching/question-gen' })
}

onMounted(() => loadStats())
</script>

<style lang="scss" scoped>
.analytics-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
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
  padding: 0 24rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  backdrop-filter: blur(14px);
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;

  .icon-btn {
    width: 64rpx; height: 64rpx; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    &:active { opacity: 0.7; }
  }
}

.topbar-center {
  display: flex; align-items: center; gap: 8rpx;
}

.title {
  color: var(--text-main);
  font-size: 30rpx;
  font-weight: 700;
}

.main-scroll {
  flex: 1;
}

.scroll-inner {
  padding: 16rpx 24rpx 0;
  box-sizing: border-box;
}

// ===== 统计卡 =====
.stats-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.stat-card {
  flex: 1;
  padding: 20rpx 16rpx;
  border-radius: 18rpx;
  background: var(--surface);
  border: 1.5px solid;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.stat-value {
  font-size: 44rpx;
  font-weight: 800;
  line-height: 1;
}

.stat-label {
  font-size: 22rpx;
  color: var(--text-soft);
  font-weight: 500;
}

// ===== 内容区 =====
.section-card {
  margin-bottom: 20rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: var(--surface);
  border: 1px solid var(--line);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
  flex: 1;
}

.section-badge {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
  color: #ffffff;
}

// 柱状图
.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.bar-item {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.bar-label-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.bar-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 4rpx;
}

.bar-name {
  font-size: 24rpx;
  color: var(--text-main);
  flex: 1;
}

.bar-count {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--text-main);
}

.bar-track {
  height: 16rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 999rpx;
  transition: width 0.5s ease;
  min-width: 4rpx;
}

// 试卷列表
.quiz-list {
  display: flex;
  flex-direction: column;
}

.quiz-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1px solid var(--line);
  &:last-child { border-bottom: none; }
  &:active { opacity: 0.7; }
}

.quiz-left {
  flex: 1;
  min-width: 0;
}

.quiz-title {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quiz-meta {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 4rpx;
}

.quiz-meta-text {
  font-size: 22rpx;
  color: var(--text-soft);
}

.quiz-meta-sep {
  font-size: 20rpx;
  color: var(--text-soft);
}

// 活动列表
.activity-list {
  display: flex;
  flex-direction: column;
}

.activity-item {
  display: flex;
  gap: 12rpx;
  padding: 12rpx 0;
}

.activity-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  margin-top: 10rpx;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.activity-text {
  font-size: 24rpx;
  color: var(--text-main);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-time {
  font-size: 22rpx;
  color: var(--text-soft);
  flex-shrink: 0;
  margin-left: 12rpx;
}

// 空状态
.empty-state {
  padding: 24rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  text { font-size: 24rpx; color: var(--text-soft); }
}

.empty-btn {
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  margin-top: 8rpx;
  &:active { opacity: 0.8; }
}

// ===== 试卷预览弹窗 =====
.quiz-modal-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
}

.quiz-modal {
  width: 100%;
  max-height: 80vh;
  background: var(--surface);
  border-radius: 24rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.quiz-modal-header {
  padding: 20rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
}

.quiz-modal-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.quiz-modal-body {
  flex: 1;
  padding: 20rpx 24rpx;
  overflow: auto;
}

.quiz-modal-footer {
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom, 0px));
  display: flex;
  gap: 12rpx;
  border-top: 1px solid var(--line);
}

.action-btn {
  flex: 1;
  height: 72rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  &:active { transform: scale(0.97); }

  &.outline {
    background: transparent;
    border: 1px solid var(--line);
  }

  &.danger {
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }
}
</style>
