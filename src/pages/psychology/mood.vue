<template>
  <view :class="['mood-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ pageTitle }}</text>
      </view>
    </view>

    <view class="insight-card">
      <view class="stat-item">
        <text class="stat-value">{{ stats.monthCount }}</text>
        <text class="stat-label">{{ monthCountLabel }}</text>
      </view>
      <view class="stat-item bordered">
        <text class="stat-value">{{ stats.streak }}</text>
        <text class="stat-label">{{ streakLabel }}</text>
      </view>
      <view class="stat-item">
        <text class="stat-value small">{{ todayCheckin ? doneLabel : addLabel }}</text>
        <text class="stat-label">{{ todayLabel }}</text>
      </view>
    </view>

    <view class="composer-card">
      <view class="composer-header">
        <view class="composer-icon">
          <Icon name="mood" :size="20" color="#886fde" />
        </view>
        <view class="composer-title-wrap">
          <text class="label">{{ formTitle }}</text>
          <text class="label-sub">{{ formHint }}</text>
        </view>
      </view>

      <view class="field-block">
        <text class="field-title">{{ moodTitle }}</text>
        <view class="chip-row">
          <view
            v-for="item in moodOptions"
            :key="item.value"
            class="chip mood-chip"
            :class="{ active: draft.mood === item.value }"
            @tap="draft.mood = item.value"
          >
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="field-block">
        <text class="field-title">{{ intensityLabel }}</text>
        <view class="scale-row">
          <text class="scale-min">1</text>
          <slider
            :value="draft.moodIntensity"
            min="1"
            max="5"
            step="1"
            activeColor="#886fde"
            backgroundColor="rgba(136,111,222,0.2)"
            block-size="24"
            @change="onIntensityChange"
          />
          <text class="scale-max">5</text>
        </view>
        <text class="scale-value">{{ draft.moodIntensity }}</text>
      </view>

      <view class="field-block">
        <text class="field-title">{{ energyLabel }}</text>
        <view class="scale-row">
          <text class="scale-min">1</text>
          <slider
            :value="draft.energyLevel"
            min="1"
            max="5"
            step="1"
            activeColor="#886fde"
            backgroundColor="rgba(136,111,222,0.2)"
            block-size="24"
            @change="onEnergyChange"
          />
          <text class="scale-max">5</text>
        </view>
        <text class="scale-value">{{ draft.energyLevel }}</text>
      </view>

      <view class="field-block">
        <text class="field-title">{{ notesLabel }}</text>
        <textarea
          v-model="draft.notes"
          class="composer-input notes-input"
          :placeholder="notesPlaceholder"
          maxlength="1000"
        />
      </view>

      <view class="composer-row">
        <view class="submit-btn" :class="{ disabled: submitting }" @tap="submitCheckin">
          <text class="submit-text">{{ submitLabel }}</text>
        </view>
      </view>
    </view>

    <view class="list-title-row">
      <text class="list-title">{{ listTitle }}</text>
      <text class="list-count">{{ checkins.length }}{{ countSuffix }}</text>
    </view>

    <view class="mood-list">
      <view v-if="loading && !checkins.length" class="state-card">
        <text class="state-text">{{ loadingText }}</text>
      </view>
      <view v-else-if="!checkins.length" class="state-card">
        <text class="state-text">{{ emptyText }}</text>
      </view>

      <view v-for="item in checkins" :key="item.$id" class="mood-card">
        <view class="card-header">
          <view :class="['mood-pill', moodClass(item.mood)]">
            <Icon name="mood" :size="14" color="#ffffff" />
            <text>{{ moodLabel(item.mood, isZh) }}</text>
          </view>
          <text class="time">{{ item.checkinDate }}</text>
        </view>
        <view class="card-meta">
          <text class="meta-text">{{ intensityLabel }} {{ item.moodIntensity }} · {{ energyLabel }} {{ item.energyLevel }}</text>
          <view v-if="Number(item.riskLevel) >= 2" class="meta-chip risk" :class="riskClass(item.riskLevel)">
            {{ riskLabel(item.riskLevel, isZh) }}
          </view>
        </view>
        <text v-if="item.notes" class="content">{{ item.notes }}</text>
        <view class="card-footer">
          <text class="entry-time">{{ formatTime(item.$createdAt) }}</text>
          <view class="card-actions">
            <view v-if="isToday(item.checkinDate)" class="edit-btn" @tap="editCheckin(item)">
              <Icon name="edit" :size="14" :color="iconColor" />
              <text class="edit-text">{{ editLabel }}</text>
            </view>
            <view class="delete-btn" @tap="deleteCheckin(item)">
              <Icon name="delete" :size="14" color="#ef4444" />
              <text class="delete-text">{{ deleteLabel }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import checkinsService from '@/services/checkins'
import { useAuthStore } from '@/stores/auth'
import { usePointsStore } from '@/stores/points'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { Checkin, CheckinMood } from '@/types/checkin'
import { usePsychologyNav } from '@/composables/usePsychologyNav'
import { moodClass, moodLabel, riskClass, riskLabel } from '@/utils/mood-helpers'
import { requireAuth } from '@/utils/auth-guard'

const { goBack } = usePsychologyNav()

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()
const pointsStore = usePointsStore()

const checkins = ref<Checkin[]>([])
const loading = ref(false)
const submitting = ref(false)
const draft = reactive({
  mood: 'calm' as CheckinMood,
  moodIntensity: 3,
  energyLevel: 3,
  notes: ''
})

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8'))
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const pageTitle = computed(() => (isZh.value ? '情绪记录' : 'Mood Check'))
const formTitle = computed(() => (isZh.value ? '今日情绪' : "Today's Mood"))
const formHint = computed(() => (isZh.value ? '记录当下的心情与精力' : 'Track your mood and energy'))
const moodTitle = computed(() => (isZh.value ? '心情' : 'Mood'))
const intensityLabel = computed(() => (isZh.value ? '情绪强度' : 'Intensity'))
const energyLabel = computed(() => (isZh.value ? '精力' : 'Energy'))
const notesLabel = computed(() => (isZh.value ? '备注（可选）' : 'Notes (optional)'))
const notesPlaceholder = computed(() => (isZh.value ? '有什么想记下的…' : 'Anything to note…'))
const submitLabel = computed(() => (isZh.value ? '保存记录' : 'Save'))
const listTitle = computed(() => (isZh.value ? '历史记录' : 'History'))
const countSuffix = computed(() => (isZh.value ? ' 条' : ' items'))
const loadingText = computed(() => (isZh.value ? '加载中...' : 'Loading...'))
const emptyText = computed(() => (isZh.value ? '还没有情绪记录' : 'No mood records yet'))
const monthCountLabel = computed(() => (isZh.value ? '本月记录' : 'This Month'))
const streakLabel = computed(() => (isZh.value ? '连续天数' : 'Streak'))
const todayLabel = computed(() => (isZh.value ? '今日' : 'Today'))
const doneLabel = computed(() => (isZh.value ? '已记录' : 'Done'))
const addLabel = computed(() => (isZh.value ? '去记录' : 'Add'))
const editLabel = computed(() => (isZh.value ? '编辑' : 'Edit'))
const deleteLabel = computed(() => (isZh.value ? '删除' : 'Delete'))

const moodOptions = computed(() => [
  { value: 'happy' as CheckinMood, label: isZh.value ? '开心' : 'Happy' },
  { value: 'calm' as CheckinMood, label: isZh.value ? '平静' : 'Calm' },
  { value: 'anxious' as CheckinMood, label: isZh.value ? '焦虑' : 'Anxious' },
  { value: 'sad' as CheckinMood, label: isZh.value ? '低落' : 'Sad' },
  { value: 'angry' as CheckinMood, label: isZh.value ? '烦躁' : 'Angry' }
])

const todayStr = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
})

const todayCheckin = computed(() => checkins.value.find((c) => c.checkinDate === todayStr.value) || null)

const stats = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthCount = checkins.value.filter((c) => c.checkinDate >= monthStart).length
  const sorted = [...checkins.value].sort((a, b) => (b.checkinDate > a.checkinDate ? 1 : -1))
  let streak = 0
  for (let i = 0; i < sorted.length; i++) {
    const d = sorted[i].checkinDate
    const pastDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const expect = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, '0')}-${String(pastDate.getDate()).padStart(2, '0')}`
    if (d === expect) {
      streak++
    } else {
      break
    }
  }
  return { monthCount, streak }
})

function onIntensityChange(e: { detail?: { value?: string } }) {
  const v = e?.detail?.value
  if (v !== undefined) draft.moodIntensity = Math.max(1, Math.min(5, Number(v) || 3))
}

function onEnergyChange(e: { detail?: { value?: string } }) {
  const v = e?.detail?.value
  if (v !== undefined) draft.energyLevel = Math.max(1, Math.min(5, Number(v) || 3))
}

function formatTime(raw?: string) {
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString(isZh.value ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function isToday(dateStr: string) {
  return dateStr === todayStr.value
}

function editCheckin(item: Checkin) {
  draft.mood = item.mood
  draft.moodIntensity = item.moodIntensity
  draft.energyLevel = item.energyLevel
  draft.notes = item.notes || ''
  uni.pageScrollTo({ scrollTop: 0, duration: 200 })
}

async function deleteCheckin(item: Checkin) {
  const rowId = item.$id
  const wasToday = isToday(item.checkinDate)
  uni.showModal({
    title: isZh.value ? '删除记录' : 'Delete',
    content: isZh.value ? '确定删除这条情绪记录吗？' : 'Delete this mood record?',
    success: async (res) => {
      if (!res.confirm) return
      const snapshot = checkins.value.slice()
      checkins.value = checkins.value.filter((c) => c.$id !== rowId)
      if (wasToday) {
        draft.mood = 'calm'
        draft.moodIntensity = 3
        draft.energyLevel = 3
        draft.notes = ''
      }
      uni.showToast({ title: isZh.value ? '已删除' : 'Deleted', icon: 'success' })
      try {
        await checkinsService.deleteCheckin(rowId)
      } catch (err) {
        console.error('Delete checkin failed:', err)
        checkins.value = snapshot
        if (wasToday) {
          const restored = snapshot.find((c) => c.$id === rowId)
          if (restored) {
            draft.mood = restored.mood
            draft.moodIntensity = restored.moodIntensity
            draft.energyLevel = restored.energyLevel
            draft.notes = restored.notes || ''
          }
        }
        uni.showToast({
          title: isZh.value ? '删除失败，已恢复' : 'Delete failed, restored',
          icon: 'none'
        })
      }
    }
  })
}

async function submitCheckin() {
  if (submitting.value) return
  submitting.value = true
  try {
    if (todayCheckin.value) {
      await checkinsService.updateCheckin(todayCheckin.value.$id, {
        mood: draft.mood,
        moodIntensity: draft.moodIntensity,
        energyLevel: draft.energyLevel,
        notes: draft.notes.trim() || undefined
      })
      uni.showToast({ title: isZh.value ? '已更新' : 'Updated', icon: 'success' })
    } else {
      await checkinsService.createCheckin({
        checkinDate: todayStr.value,
        mood: draft.mood,
        moodIntensity: draft.moodIntensity,
        energyLevel: draft.energyLevel,
        notes: draft.notes.trim() || undefined,
        riskLevel: 1
      })
      const userId = authStore.dbUser?.$id
      if (userId) {
        await pointsStore.completeDailyTask(userId, 'mood_checkin')
        pointsStore.checkAndUnlockAchievement(userId, 'first_mood')
      }
      uni.showToast({ title: isZh.value ? '记录成功' : 'Saved', icon: 'success' })
    }
    await loadCheckins()
  } catch (error) {
    console.error('Submit checkin failed:', error)
    uni.showToast({
      title: isZh.value ? '保存失败' : 'Save failed',
      icon: 'none'
    })
  } finally {
    submitting.value = false
  }
}

async function loadCheckins() {
  loading.value = true
  try {
    const list = await checkinsService.listMyCheckins({ limit: 60 })
    checkins.value = list
    if (todayCheckin.value) {
      draft.mood = todayCheckin.value.mood
      draft.moodIntensity = todayCheckin.value.moodIntensity
      draft.energyLevel = todayCheckin.value.energyLevel
      draft.notes = todayCheckin.value.notes || ''
    }
  } catch (error) {
    console.error('Load checkins failed:', error)
    checkins.value = []
    uni.showToast({ title: isZh.value ? '加载失败' : 'Load failed', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onShow(async () => {
  uiPreferencesStore.initFromSystem()
  uiPreferencesStore.setActiveSection('psychology')
  if (!requireAuth('/pages/psychology/mood')) {
    return
  }
  await authStore.refreshProfile()
  await loadCheckins()
})
</script>

<style lang="scss" scoped>
@import '@/styles/psychology-vars.scss';

.mood-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 48rpx;
  background: var(--page-bg);
}

.theme-light {
  @include psychology-theme-light;
}

.theme-dark {
  @include psychology-theme-dark;
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  @include psychology-topbar-safe-area;
  @include psychology-card-glass;
  background: var(--topbar-bg);

  .left {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }
}

.title {
  color: var(--text-main);
  font-size: 34rpx;
  font-weight: 700;
}

.insight-card {
  margin-top: 14rpx;
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: linear-gradient(135deg, rgba(136, 111, 222, 0.16), rgba(136, 111, 222, 0.06));
  padding: 22rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  @include psychology-card-glass;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.stat-item.bordered {
  border-left: 1px dashed var(--line);
  border-right: 1px dashed var(--line);
}

.stat-value {
  color: var(--text-main);
  font-size: 36rpx;
  font-weight: 700;
}

.stat-value.small {
  font-size: 28rpx;
}

.stat-label {
  color: var(--text-sub);
  font-size: 20rpx;
}

.composer-card {
  margin-top: 18rpx;
  border: 1px solid var(--line);
  border-radius: 24rpx;
  background: var(--surface);
  padding: 24rpx;
  @include psychology-card-glass;
}

.composer-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.composer-icon {
  width: 58rpx;
  height: 58rpx;
  border-radius: 16rpx;
  background: rgba(136, 111, 222, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
}

.composer-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.label {
  color: var(--text-main);
  font-size: 30rpx;
  font-weight: 700;
}

.label-sub {
  color: var(--text-soft);
  font-size: 22rpx;
}

.field-block {
  margin-top: 18rpx;
}

.field-title {
  color: var(--text-sub);
  font-size: 22rpx;
  font-weight: 600;
}

.chip-row {
  margin-top: 10rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.chip {
  min-height: 52rpx;
  border: 1px solid var(--line);
  border-radius: 999rpx;
  padding: 0 18rpx;
  color: var(--text-sub);
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mood-chip.active {
  background: rgba(136, 111, 222, 0.2);
  color: #7359d3;
  border-color: rgba(136, 111, 222, 0.36);
}

.scale-row {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.scale-min,
.scale-max {
  color: var(--text-soft);
  font-size: 20rpx;
}

.scale-value {
  margin-top: 6rpx;
  color: var(--text-sub);
  font-size: 22rpx;
}

.notes-input {
  margin-top: 10rpx;
  min-height: 120rpx;
  width: 100%;
  color: var(--text-main);
  font-size: 26rpx;
  border-radius: 18rpx;
  background: rgba(136, 111, 222, 0.04);
  padding: 18rpx 20rpx;
  box-sizing: border-box;
}

.composer-row {
  margin-top: 22rpx;
  display: flex;
  justify-content: flex-end;
}

.submit-btn {
  border-radius: 16rpx;
  background: #886fde;
  padding: 12rpx 26rpx;
  box-shadow: 0 8rpx 18rpx rgba(136, 111, 222, 0.28);
}

.submit-text {
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
}

.list-title-row {
  margin-top: 30rpx;
  margin-bottom: 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.list-title {
  color: var(--text-main);
  font-size: 32rpx;
  font-weight: 700;
}

.list-count {
  color: var(--text-soft);
  font-size: 22rpx;
}

.mood-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.mood-card,
.state-card {
  border: 1px solid var(--line);
  border-radius: 22rpx;
  background: var(--surface);
  padding: 22rpx;
}

.state-card {
  text-align: center;
}

.state-text {
  color: var(--text-sub);
  font-size: 24rpx;
}

.card-header,
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.card-meta {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
}

.meta-text {
  color: var(--text-soft);
  font-size: 22rpx;
}

.mood-pill {
  min-height: 42rpx;
  border-radius: 999rpx;
  padding: 0 14rpx;
  color: #ffffff;
  font-size: 22rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.mood-happy {
  background: #f59e0b;
}

.mood-calm {
  background: #10b981;
}

.mood-anxious {
  background: #ef4444;
}

.mood-low {
  background: #6366f1;
}

.mood-angry {
  background: #f97316;
}

.time,
.entry-time {
  color: var(--text-soft);
  font-size: 22rpx;
}

.meta-chip {
  min-height: 44rpx;
  border-radius: 999rpx;
  padding: 0 14rpx;
  font-size: 20rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.meta-chip.risk-low {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.meta-chip.risk-mid {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.meta-chip.risk-high {
  background: rgba(239, 68, 68, 0.14);
  color: #b91c1c;
}

.content {
  margin-top: 14rpx;
  color: var(--text-main);
  font-size: 26rpx;
  line-height: 1.6;
  white-space: pre-wrap;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
}

.edit-text {
  color: var(--text-sub);
  font-size: 22rpx;
}

.delete-btn {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
}

.delete-text {
  color: #ef4444;
  font-size: 22rpx;
}
</style>
