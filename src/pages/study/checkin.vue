<template>
  <view :class="['checkin-page', themeClass]">
    <view class="top-bar">
      <view class="top-left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ pageTitle }}</text>
      </view>
    </view>

    <view v-if="loading" class="state-card">
      <text class="state-text">{{ isZh ? '加载中...' : 'Loading...' }}</text>
    </view>

    <template v-else>
      <view class="stats-card">
        <view class="stat-item">
          <text class="stat-value">{{ streakDays }}</text>
          <text class="stat-label">{{ isZh ? '连续打卡' : 'Streak' }}</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item">
          <text class="stat-value">{{ monthCheckinCount }}</text>
          <text class="stat-label">{{ isZh ? '本月打卡' : 'This Month' }}</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item">
          <text class="stat-value">{{ monthTotalDuration }}</text>
          <text class="stat-label">{{ isZh ? '总时长(分)' : 'Minutes' }}</text>
        </view>
      </view>

      <HeatmapCalendar
        :checkins="monthCheckins"
        :current-month="calendarMonth"
        :theme-class="themeClass"
        @prev="changeMonth(-1)"
        @next="changeMonth(1)"
      />

      <view v-if="todayCheckin" class="today-tip">
        <Icon name="check_circle" :size="16" color="#22c55e" />
        <text class="today-tip-text">{{ isZh ? '今日已打卡 · 点击日历中的蓝色日期查看详情' : 'Checked in today · Tap a blue date to view details' }}</text>
      </view>
      <view v-else class="today-tip">
        <Icon name="info" :size="16" color="#4A90E2" />
        <text class="today-tip-text">{{ isZh ? '今日尚未打卡 · 点击右下角按钮开始' : 'Not checked in · Tap the button to start' }}</text>
      </view>
    </template>

    <view class="fab" @tap="showForm = true">
      <Icon name="add" :size="24" color="#ffffff" />
    </view>

    <CheckinForm :visible="showForm" @close="showForm = false" @submit="handleCheckinSubmit" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { StudyCheckin, StudyCheckinType } from '@/types/study-checkin'
import studyCheckinsService from '@/services/study-checkins'
import { useAuthStore } from '@/stores/auth'
import { usePointsStore } from '@/stores/points'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { requireAuth } from '@/utils/auth-guard'
import HeatmapCalendar from '@/components/study/HeatmapCalendar.vue'
import CheckinForm from '@/components/study/CheckinForm.vue'

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()
const pointsStore = usePointsStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#4b5563' : '#cbd5e1'))
const pageTitle = computed(() => (isZh.value ? '学习打卡' : 'Study Check-in'))

const loading = ref(true)
const showForm = ref(false)
const streakDays = ref(0)
const monthCheckins = ref<StudyCheckin[]>([])
const calendarMonth = ref(new Date())

const monthCheckinCount = computed(() => monthCheckins.value.length)
const monthTotalDuration = computed(() => monthCheckins.value.reduce((sum, c) => sum + c.duration, 0))

const todayStr = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
})

const todayCheckin = computed(() => monthCheckins.value.find((c) => c.checkinDate === todayStr.value) || null)

async function loadData() {
  loading.value = true
  try {
    const year = calendarMonth.value.getFullYear()
    const month = calendarMonth.value.getMonth() + 1

    const [streak, monthly] = await Promise.all([
      studyCheckinsService.getStreakDays(),
      studyCheckinsService.getCheckinsByMonth(year, month)
    ])

    streakDays.value = streak
    monthCheckins.value = monthly
  } catch (error) {
    console.error('Load checkin data failed:', error)
    uni.showToast({
      title: isZh.value ? '加载失败' : 'Load failed',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

async function loadMonthData() {
  try {
    const year = calendarMonth.value.getFullYear()
    const month = calendarMonth.value.getMonth() + 1
    monthCheckins.value = await studyCheckinsService.getCheckinsByMonth(year, month)
  } catch (error) {
    console.error('Load month data failed:', error)
  }
}

function changeMonth(delta: number) {
  const current = calendarMonth.value
  calendarMonth.value = new Date(current.getFullYear(), current.getMonth() + delta, 1)
  loadMonthData()
}

async function handleCheckinSubmit(data: { checkinType: StudyCheckinType; content: string; duration: number }) {
  try {
    await studyCheckinsService.createCheckin({
      checkinDate: todayStr.value,
      checkinType: data.checkinType,
      content: data.content,
      duration: data.duration
    })
    const userId = authStore.dbUser?.$id
    if (userId) {
      await pointsStore.completeDailyTask(userId, 'study_checkin')
      pointsStore.checkAndUnlockAchievement(userId, 'first_study')
    }
    showForm.value = false
    uni.showToast({
      title: isZh.value ? '打卡成功！' : 'Checked in!',
      icon: 'success'
    })
    await loadData()
  } catch (error) {
    console.error('Create checkin failed:', error)
    uni.showToast({
      title: isZh.value ? '打卡失败' : 'Check-in failed',
      icon: 'none'
    })
  }
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/study/index' })
  }
}

onMounted(async () => {
  uiPreferencesStore.initFromSystem()
  uiPreferencesStore.setActiveSection('study')
  await authStore.init()
  if (!requireAuth('/pages/study/checkin')) {
    loading.value = false
    return
  }
  await loadData()
})
</script>

<style scoped lang="scss">
.checkin-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 120rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f6f6f8;
  --surface: #ffffff;
  --surface-soft: #f8fafc;
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(74, 144, 226, 0.12);
  --topbar-bg: rgba(246, 246, 248, 0.9);
  --shadow-card: 0 12rpx 28rpx rgba(15, 23, 42, 0.06);
}

.theme-dark {
  --page-bg: #151c2a;
  --surface: rgba(15, 23, 42, 0.86);
  --surface-soft: rgba(30, 41, 59, 0.78);
  --text-main: #f1f5f9;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --line: rgba(74, 144, 226, 0.24);
  --topbar-bg: rgba(21, 28, 42, 0.9);
  --shadow-card: 0 14rpx 30rpx rgba(2, 6, 23, 0.28);
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  min-height: 80rpx;
  display: flex;
  align-items: center;
  background: var(--topbar-bg);
  backdrop-filter: blur(14px);
}

.top-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.title {
  color: var(--text-main);
  font-size: 32rpx;
  font-weight: 700;
}

.stats-card {
  margin-top: 14rpx;
  border-radius: 22rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--shadow-card);
  padding: 28rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-bottom: 14rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-value {
  color: #4A90E2;
  font-size: 40rpx;
  font-weight: 700;
}

.stat-label {
  color: var(--text-sub);
  font-size: 22rpx;
  font-weight: 600;
}

.stat-divider {
  width: 1px;
  height: 60rpx;
  background: var(--line);
}

.today-tip {
  margin-top: 14rpx;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  background: var(--surface);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.today-tip-text {
  color: var(--text-sub);
  font-size: 22rpx;
  font-weight: 500;
}

.state-card {
  border-radius: 22rpx;
  border: 1px dashed var(--line);
  background: var(--surface);
  padding: 36rpx 24rpx;
  text-align: center;
}

.state-text {
  color: var(--text-sub);
  font-size: 24rpx;
}

.fab {
  position: fixed;
  right: 36rpx;
  bottom: 120rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4A90E2, #3f7dcb);
  box-shadow: 0 14rpx 30rpx rgba(74, 144, 226, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;

  &:active {
    opacity: 0.8;
  }
}
</style>
