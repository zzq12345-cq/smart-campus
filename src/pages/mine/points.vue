<template>
  <view :class="['mine-points-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ pageTitle }}</text>
      </view>
    </view>

    <view class="balance-card">
      <view class="balance-main">
        <Icon name="stars" :size="28" color="#F59E0B" />
        <text class="balance-value">{{ pointsStore.balance }}</text>
      </view>
      <view class="balance-sub">
        <view class="balance-stat">
          <text class="balance-stat-label">{{ todayEarnedLabel }}</text>
          <text class="balance-stat-value">+{{ pointsStore.todayPoints }}</text>
        </view>
        <view class="balance-stat">
          <text class="balance-stat-label">{{ totalEarnedLabel }}</text>
          <text class="balance-stat-value">{{ pointsStore.totalEarned }}</text>
        </view>
        <view class="balance-stat">
          <text class="balance-stat-label">{{ totalSpentLabel }}</text>
          <text class="balance-stat-value">{{ pointsStore.totalSpent }}</text>
        </view>
      </view>
    </view>

    <view class="section-header">
      <Icon name="task_alt" :size="20" color="#6fde81" />
      <text>{{ dailyTasksLabel }}</text>
      <text class="section-badge">{{ pointsStore.completedTaskCount }}/{{ DAILY_TASKS.length }}</text>
    </view>

    <view class="tasks-grid">
      <view
        v-for="task in DAILY_TASKS"
        :key="task.id"
        :class="['task-card', { completed: isTaskDone(task.id) }]"
        @tap="handleTaskTap(task.id)"
      >
        <view class="task-icon">
          <Icon :name="task.icon" :size="20" :color="isTaskDone(task.id) ? '#6fde81' : iconColor" />
        </view>
        <text class="task-name">{{ getTaskName(task.id) }}</text>
        <text class="task-reward">+{{ task.points }}</text>
        <view v-if="isTaskDone(task.id)" class="task-check">
          <Icon name="check_circle" :size="16" color="#6fde81" />
        </view>
      </view>
    </view>

    <view class="section-header">
      <Icon name="receipt_long" :size="20" color="#6fde81" />
      <text>{{ recentLabel }}</text>
    </view>

    <view v-if="pointsStore.transactions.length === 0" class="empty-card">
      <text class="empty-text">{{ noTransactionsLabel }}</text>
    </view>

    <view v-else class="transactions-list">
      <view v-for="txn in pointsStore.transactions" :key="txn.$id" class="txn-row">
        <view class="txn-left">
          <Icon :name="txn.amount > 0 ? 'add_circle' : 'remove_circle'" :size="18"
            :color="txn.amount > 0 ? '#6fde81' : '#ef4444'" />
          <text class="txn-desc">{{ txn.description }}</text>
        </view>
        <text :class="['txn-amount', { positive: txn.amount > 0 }]">
          {{ txn.amount > 0 ? '+' : '' }}{{ txn.amount }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import Icon from '@/components/common/Icon.vue'
import { useAuthStore } from '@/stores/auth'
import { usePointsStore } from '@/stores/points'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import type { LocaleCode } from '@/types/ui'
import type { DailyTaskId } from '@/types/points'
import { DAILY_TASKS } from '@/data/points-constants'

const authStore = useAuthStore()
const pointsStore = usePointsStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => uiPreferencesStore.isDark ? '#a0aec0' : '#64748b')
const locale = computed(() => uiPreferencesStore.locale as LocaleCode)

const pageTitle = computed(() => t(I18N_KEYS.pointsTitle, locale.value))
const todayEarnedLabel = computed(() => t(I18N_KEYS.pointsTodayEarned, locale.value))
const totalEarnedLabel = computed(() => t(I18N_KEYS.pointsTotalEarned, locale.value))
const totalSpentLabel = computed(() => t(I18N_KEYS.pointsTotalSpent, locale.value))
const dailyTasksLabel = computed(() => t(I18N_KEYS.pointsDailyTasks, locale.value))
const recentLabel = computed(() => t(I18N_KEYS.pointsRecentTransactions, locale.value))
const noTransactionsLabel = computed(() => t(I18N_KEYS.pointsNoTransactions, locale.value))

function isTaskDone(taskId: string) {
  return pointsStore.dailyTaskStatus[taskId] === true
}

const TASK_NAME_KEYS: Record<DailyTaskId, string> = {
  mood_checkin: I18N_KEYS.pointsTaskMoodCheckin,
  study_checkin: I18N_KEYS.pointsTaskStudyCheckin,
  journal_entry: I18N_KEYS.pointsTaskJournal,
  ai_chat_message: I18N_KEYS.pointsTaskAiChat,
  post_create: I18N_KEYS.pointsTaskPostCreate,
  evaluation_complete: I18N_KEYS.pointsTaskEvaluation,
}

function getTaskName(taskId: DailyTaskId) {
  return t(TASK_NAME_KEYS[taskId], locale.value)
}

function handleTaskTap(taskId: DailyTaskId) {
  if (isTaskDone(taskId)) return
  const routes: Partial<Record<DailyTaskId, string>> = {
    mood_checkin: '/pages/psychology/mood',
    study_checkin: '/pages/study/checkin',
    journal_entry: '/pages/psychology/journal',
    ai_chat_message: '/pages/ai/chat',
    post_create: '/pages/study/post-publish',
    evaluation_complete: '/pages/psychology/evaluation',
  }
  const url = routes[taskId]
  if (url) uni.navigateTo({ url })
}

function goBack() {
  uni.navigateBack()
}

onMounted(async () => {
  const userId = authStore.dbUser?.$id
  if (userId && !pointsStore.initialized) {
    await pointsStore.init(userId)
  }
})
</script>

<style lang="scss" scoped>
.mine-points-page {
  min-height: 100vh;
  padding: 0 24rpx 120rpx;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  .left {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }
  .title {
    font-size: 32rpx;
    font-weight: 700;
  }
}

.balance-card {
  background: linear-gradient(135deg, rgba(111, 222, 129, 0.12), rgba(245, 158, 11, 0.12));
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
}

.balance-main {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.balance-value {
  font-size: 56rpx;
  font-weight: 800;
  color: #F59E0B;
}

.balance-sub {
  display: flex;
  gap: 32rpx;
}

.balance-stat {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.balance-stat-label {
  font-size: 22rpx;
  opacity: 0.6;
}

.balance-stat-value {
  font-size: 26rpx;
  font-weight: 600;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
}

.section-badge {
  margin-left: auto;
  font-size: 22rpx;
  font-weight: 400;
  opacity: 0.5;
}

.tasks-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.task-card {
  position: relative;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  transition: all 0.2s;

  &.completed {
    opacity: 0.6;
    border-color: rgba(111, 222, 129, 0.3);
  }
}

.task-icon {
  margin-bottom: 4rpx;
}

.task-name {
  font-size: 24rpx;
  font-weight: 500;
}

.task-reward {
  font-size: 22rpx;
  color: #F59E0B;
  font-weight: 600;
}

.task-check {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
}

.empty-card {
  padding: 40rpx;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  opacity: 0.4;
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.txn-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 16rpx;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12rpx;
}

.txn-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
  min-width: 0;
}

.txn-desc {
  font-size: 24rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.txn-amount {
  font-size: 26rpx;
  font-weight: 700;
  flex-shrink: 0;
  color: #ef4444;

  &.positive {
    color: #6fde81;
  }
}

// Dark theme overrides
.theme-dark {
  .balance-card {
    background: linear-gradient(135deg, rgba(111, 222, 129, 0.08), rgba(245, 158, 11, 0.08));
  }
  .task-card {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.06);
  }
  .txn-row {
    background: rgba(255, 255, 255, 0.02);
  }
}
</style>
