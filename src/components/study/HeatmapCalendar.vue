<template>
  <view :class="['heatmap-calendar', themeClass]">
    <view class="calendar-header">
      <view class="nav-btn" @tap="prevMonth">
        <Icon name="chevron_left" :size="18" :color="iconColor" />
      </view>
      <text class="month-title">{{ monthTitle }}</text>
      <view class="nav-btn" @tap="nextMonth">
        <Icon name="chevron_right" :size="18" :color="iconColor" />
      </view>
    </view>

    <view class="weekday-labels">
      <text v-for="label in weekdayLabels" :key="label" class="weekday-label">{{ label }}</text>
    </view>

    <view v-for="(week, wi) in calendarWeeks" :key="wi" class="week-section">
      <view class="days-row">
        <view v-for="(cell, ci) in week" :key="ci" class="day-cell-wrap">
          <view
            v-if="cell.day > 0"
            :class="['day-cell', { checked: cell.checked, today: cell.isToday, selected: cell.dateStr === selectedDate }]"
            :style="cell.checked ? { opacity: Math.min(1, 0.5 + cell.count * 0.15) } : {}"
            @tap="onDayTap(cell)"
          >
            <text :class="['day-text', { checked: cell.checked, today: cell.isToday }]">{{ cell.day }}</text>
            <view v-if="cell.checked" class="dot-indicator" />
          </view>
        </view>
      </view>

      <view v-if="expandedWeekIndex === wi && selectedCheckin" class="detail-card">
        <view class="detail-arrow-wrap">
          <view class="detail-arrow" :style="{ left: arrowLeft }" />
        </view>
        <view class="detail-body">
          <view class="detail-top">
            <view class="detail-badge">
              <text>{{ checkinTypeLabel(selectedCheckin.checkinType) }}</text>
            </view>
            <text class="detail-date">{{ selectedCheckin.checkinDate }}</text>
            <view class="detail-close" @tap="selectedDate = ''">
              <Icon name="close" :size="14" :color="iconColor" />
            </view>
          </view>
          <text class="detail-content">{{ selectedCheckin.content }}</text>
          <view class="detail-footer">
            <Icon name="schedule" :size="14" color="#4A90E2" />
            <text class="detail-duration">{{ selectedCheckin.duration }} {{ isZh ? '分钟' : 'min' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { StudyCheckin, StudyCheckinType } from '@/types/study-checkin'
import { useUiPreferencesStore } from '@/stores/ui-preferences'

interface CalendarCell {
  day: number
  dateStr: string
  checked: boolean
  count: number
  isToday: boolean
}

const props = defineProps<{
  checkins: StudyCheckin[]
  currentMonth: Date
  themeClass: string
}>()

const emit = defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
}>()

const uiPreferencesStore = useUiPreferencesStore()
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#4b5563' : '#cbd5e1'))

const selectedDate = ref('')

const weekdayLabels = computed(() =>
  isZh.value ? ['一', '二', '三', '四', '五', '六', '日'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']
)

const monthTitle = computed(() => {
  const year = props.currentMonth.getFullYear()
  const month = props.currentMonth.getMonth() + 1
  return isZh.value ? `${year}年${month}月` : `${year}/${String(month).padStart(2, '0')}`
})

const checkinMap = computed(() => {
  const map: Record<string, StudyCheckin> = {}
  for (const c of props.checkins) {
    map[c.checkinDate] = c
  }
  return map
})

const dateCountMap = computed(() => {
  const map: Record<string, number> = {}
  for (const c of props.checkins) {
    map[c.checkinDate] = (map[c.checkinDate] || 0) + 1
  }
  return map
})

const calendarWeeks = computed(() => {
  const year = props.currentMonth.getFullYear()
  const month = props.currentMonth.getMonth()
  const firstDayOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  let startWeekday = firstDayOfMonth.getDay()
  if (startWeekday === 0) startWeekday = 7

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const allCells: CalendarCell[] = []

  for (let i = 1; i < startWeekday; i++) {
    allCells.push({ day: 0, dateStr: '', checked: false, count: 0, isToday: false })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const count = dateCountMap.value[dateStr] || 0
    allCells.push({
      day,
      dateStr,
      checked: count > 0,
      count,
      isToday: dateStr === todayStr
    })
  }

  while (allCells.length % 7 !== 0) {
    allCells.push({ day: 0, dateStr: '', checked: false, count: 0, isToday: false })
  }

  const weeks: CalendarCell[][] = []
  for (let i = 0; i < allCells.length; i += 7) {
    weeks.push(allCells.slice(i, i + 7))
  }
  return weeks
})

const expandedWeekIndex = computed(() => {
  if (!selectedDate.value) return -1
  return calendarWeeks.value.findIndex((week) => week.some((c) => c.dateStr === selectedDate.value))
})

const selectedCheckin = computed(() => {
  if (!selectedDate.value) return null
  return checkinMap.value[selectedDate.value] || null
})

const arrowLeft = computed(() => {
  if (expandedWeekIndex.value < 0 || !selectedDate.value) return '50%'
  const week = calendarWeeks.value[expandedWeekIndex.value]
  const idx = week.findIndex((c) => c.dateStr === selectedDate.value)
  if (idx < 0) return '50%'
  const pct = ((idx + 0.5) / 7) * 100
  return `${pct}%`
})

function onDayTap(cell: CalendarCell) {
  if (!cell.checked || cell.day <= 0) return
  selectedDate.value = selectedDate.value === cell.dateStr ? '' : cell.dateStr
}

function checkinTypeLabel(type: StudyCheckinType) {
  const map: Record<StudyCheckinType, [string, string]> = {
    self_study: ['自习', 'Self Study'],
    vocabulary: ['背单词', 'Vocabulary'],
    exercises: ['刷题', 'Exercises'],
    review: ['复习', 'Review'],
    other: ['其他', 'Other']
  }
  const pair = map[type] || map.other
  return isZh.value ? pair[0] : pair[1]
}

function prevMonth() {
  selectedDate.value = ''
  emit('prev')
}

function nextMonth() {
  selectedDate.value = ''
  emit('next')
}
</script>

<style scoped lang="scss">
.heatmap-calendar {
  border-radius: 22rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 24rpx;
  box-shadow: 0 12rpx 28rpx rgba(15, 23, 42, 0.06);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.nav-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-soft, rgba(248, 250, 252, 1));

  &:active {
    opacity: 0.7;
  }
}

.month-title {
  color: var(--text-main);
  font-size: 30rpx;
  font-weight: 700;
}

.weekday-labels {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8rpx;
  margin-bottom: 12rpx;
}

.weekday-label {
  text-align: center;
  color: var(--text-sub);
  font-size: 22rpx;
  font-weight: 600;
}

.week-section {
  margin-bottom: 4rpx;
}

.days-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8rpx;
}

.day-cell-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
}

.day-cell {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  position: relative;
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.92);
  }
}

.day-cell.checked {
  background: #4A90E2;
  cursor: pointer;
}

.day-cell.today {
  border: 2px solid #4A90E2;
}

.day-cell.selected {
  box-shadow: 0 0 0 3rpx rgba(74, 144, 226, 0.5);
  transform: scale(1.08);
}

.dot-indicator {
  position: absolute;
  bottom: 6rpx;
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
}

.day-text {
  color: var(--text-main);
  font-size: 24rpx;
  font-weight: 600;
}

.day-text.checked {
  color: #ffffff;
}

.day-text.today:not(.checked) {
  color: #4A90E2;
  font-weight: 700;
}

.detail-card {
  margin: 10rpx 0 8rpx;
  position: relative;
}

.detail-arrow-wrap {
  position: relative;
  height: 16rpx;
}

.detail-arrow {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 16rpx solid transparent;
  border-right: 16rpx solid transparent;
  border-bottom: 16rpx solid rgba(74, 144, 226, 0.12);
}

.detail-body {
  border-radius: 18rpx;
  border: 1px solid rgba(74, 144, 226, 0.18);
  background: var(--surface-soft, rgba(248, 250, 252, 1));
  padding: 20rpx 22rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.detail-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.detail-badge {
  min-height: 40rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  background: rgba(74, 144, 226, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    color: #4A90E2;
    font-size: 22rpx;
    font-weight: 600;
  }
}

.detail-date {
  flex: 1;
  color: var(--text-soft);
  font-size: 22rpx;
}

.detail-close {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    opacity: 0.6;
  }
}

.detail-content {
  color: var(--text-main);
  font-size: 26rpx;
  line-height: 1.6;
  word-break: break-all;
}

.detail-footer {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.detail-duration {
  color: #4A90E2;
  font-size: 22rpx;
  font-weight: 600;
}
</style>
