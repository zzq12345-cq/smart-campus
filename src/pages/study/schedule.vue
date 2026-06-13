<template>
    <view :class="['schedule-page', themeClass]">
        <view class="top-bar">
            <view class="top-left" @tap="goBack">
                <Icon name="arrow_back" :size="20" :color="iconColor" />
                <text class="title">{{ pageTitle }}</text>
            </view>
            <view class="top-right">

                <view class="add-course-btn" @tap="showCourseForm = true">
                    <Icon name="add" :size="18" color="#4A90E2" />
                </view>
                <view class="refresh-btn" :class="{ disabled: refreshing }" @tap="handleRefresh">
                    <Icon :name="refreshing ? 'sync' : 'refresh'" :size="18"
                        :color="refreshing ? '#94a3b8' : '#4A90E2'" />
                    <text>{{ refreshing ? refreshingLabel : refreshLabel }}</text>
                </view>
            </view>
        </view>

        <view v-if="noticeMessage" class="notice-card">
            <text class="notice-text">{{ noticeMessage }}</text>
            <view v-if="showBindAction" class="notice-action" @tap="goToIdentity">
                <text>{{ bindActionLabel }}</text>
            </view>
        </view>

        <view v-if="loading && !hasSemesterList" class="state-card">
            <text>{{ loadingLabel }}</text>
        </view>

        <view v-else-if="!hasSemesterList && errorMessage" class="state-card error">
            <text>{{ errorMessage }}</text>
            <view class="state-actions">
                <view class="primary-btn" @tap="handleRefresh">
                    <text>{{ retryLabel }}</text>
                </view>
                <view v-if="showBindAction" class="secondary-btn" @tap="goToIdentity">
                    <text>{{ bindActionLabel }}</text>
                </view>
            </view>
        </view>

        <template v-else-if="hasSemesterList">
            <view class="control-card">
                <view class="control-strip">
                    <view class="week-pill">
                        <text class="week-chip-text">{{ currentWeekTitle }}</text>
                    </view>

                    <view class="view-tabs">
                        <view v-for="item in viewTabs" :key="item.value"
                            :class="['view-tab', { active: viewMode === item.value }]" @tap="viewMode = item.value">
                            <text>{{ item.label }}</text>
                        </view>
                    </view>
                </view>

                <view class="week-toolbar">
                    <view class="week-nav-btn" :class="{ disabled: !canGoPrevWeek }" @tap="changeWeek(-1)">
                        <Icon name="chevron_left" :size="18" :color="canGoPrevWeek ? iconColor : '#94a3b8'" />
                        <text>{{ prevWeekLabel }}</text>
                    </view>

                    <view class="week-toolbar-center">
                        <text class="week-range-text">{{ weekRangeLabel }}</text>
                        <text class="week-range-caption">{{ maxWeekLabel }}</text>
                    </view>

                    <view class="week-nav-btn align-right" :class="{ disabled: !canGoNextWeek }" @tap="changeWeek(1)">
                        <text>{{ nextWeekLabel }}</text>
                        <Icon name="chevron_right" :size="18" :color="canGoNextWeek ? iconColor : '#94a3b8'" />
                    </view>
                </view>
            </view>

            <scroll-view class="semester-scroll" :scroll-x="semesterTabs.length > 2" show-scrollbar="false">
                <view class="semester-tabs">
                    <view v-for="semester in semesterTabs" :key="semester.semesterId"
                        :class="['semester-chip', { active: semester.semesterId === selectedSemesterId }]"
                        @tap="handleSemesterChange(semester.semesterId)">
                        <text>{{ semester.semesterName }}</text>
                    </view>
                </view>
            </scroll-view>

            <view v-if="scheduleLoading && !hasScheduleData" class="state-card">
                <text>{{ loadingScheduleLabel }}</text>
            </view>

            <view v-else-if="!hasScheduleData && errorMessage" class="state-card error">
                <text>{{ errorMessage }}</text>
                <view class="state-actions">
                    <view class="primary-btn" @tap="handleRefresh">
                        <text>{{ retryLabel }}</text>
                    </view>
                    <view v-if="showBindAction" class="secondary-btn" @tap="goToIdentity">
                        <text>{{ bindActionLabel }}</text>
                    </view>
                </view>
            </view>

            <template v-else-if="viewMode === 'day'">
                <scroll-view class="weekday-scroll" scroll-x show-scrollbar="false">
                    <view class="weekday-row">
                        <view v-for="day in weekdayColumns" :key="day.day"
                            :class="['weekday-pill', { active: day.isActive, today: day.isToday }]"
                            @tap="setSelectedDay(day.day)">
                            <view class="weekday-topline">
                                <text class="weekday-name">{{ day.label }}</text>
                                <text v-if="day.isToday" class="weekday-tag">{{ todayShortLabel }}</text>
                            </view>
                            <text class="weekday-date">{{ day.shortDate }}</text>
                        </view>
                    </view>
                </scroll-view>

                <view class="agenda-panel">
                    <view class="agenda-head">
                        <view>
                            <text class="section-title">{{ selectedDayTitle }}</text>
                            <text class="section-subtitle">{{ selectedDaySubtitle }}</text>
                        </view>
                        <view class="agenda-badge">
                            <text>{{ selectedDayTimeSummary }}</text>
                        </view>
                    </view>

                    <view v-if="!selectedDayCourses.length" class="agenda-empty">
                        <text>{{ emptyDayLabel }}</text>
                    </view>

                    <view v-for="course in selectedDayCourses" :key="courseKey(course)" class="day-agenda-card">
                        <view class="day-card-main">
                            <text class="course-name">{{ course.name }}</text>
                            <text class="course-meta">{{ teacherLabel }}: {{ course.teacher || teacherFallback }}</text>
                            <text class="course-meta">{{ locationLabel }}: {{ course.location || locationFallback }}</text>
                        </view>
                        <view class="time-badge">
                            <text>{{ formatCourseTimeRange(course) }}</text>
                        </view>
                    </view>
                </view>
            </template>


            <template v-else-if="viewMode === 'week'">
                <view class="timetable-scroll">
                    <view class="timetable-shell">
                        <view class="timetable-header">
                            <view class="timeline-header" />
                            <view v-for="day in weekdayColumns" :key="day.day"
                                :class="['weekday-pill board', { active: day.isActive, today: day.isToday }]"
                                @tap="setSelectedDay(day.day)">
                                <view class="weekday-topline">
                                    <text class="weekday-name">{{ day.label }}</text>
                                    <text v-if="day.isToday" class="weekday-tag">{{ todayShortLabel }}</text>
                                </view>
                                <text class="weekday-date">{{ day.shortDate }}</text>
                            </view>
                        </view>

                        <view class="timetable-body">
                            <view class="timeline-column">
                                <view v-for="slot in slotRows" :key="slot.slot"
                                    :class="['timeline-slot', { break: slot.isBreak }]"
                                    :style="slotStyle(slot.slot)">
                                    <text :class="['timeline-number', { break: slot.isBreak }]">{{ slot.label }}</text>
                                    <text class="timeline-time">{{ slot.start }}</text>
                                    <text class="timeline-time">{{ slot.end }}</text>
                                </view>
                            </view>

                            <view class="track-columns" :style="{ height: timetableHeight }">
                                <view v-for="day in weekdayColumns" :key="`${day.day}-track`"
                                    :class="['day-track', { active: day.isActive }]">
                                    <view v-for="slot in slotRows" :key="`${day.day}-${slot.slot}`"
                                        :class="['slot-cell', { break: slot.isBreak }]"
                                        :style="slotStyle(slot.slot)" />

                                    <view v-for="course in day.courses" :key="courseKey(course)" class="timetable-event"
                                        :style="courseEventStyle(course)">
                                        <text class="event-name">{{ course.name }}</text>
                                        <text class="event-meta">{{ course.location || locationFallback }}</text>
                                    </view>
                                </view>
                            </view>
                        </view>
                    </view>
                </view>
            </template>


            <template v-else-if="viewMode === 'timeline'">
                <SemesterTimeline
                    :semester-name="selectedSemester?.semesterName || ''"
                    :start-date="selectedSemester?.startDate || ''"
                    :is-zh="isZh"
                />
            </template>

            <view v-if="untimedCourses.length" class="untimed-card">
                <view class="agenda-head compact">
                    <view>
                        <text class="section-title">{{ untimedTitle }}</text>
                        <text class="section-subtitle">{{ untimedSubtitle }}</text>
                    </view>
                </view>

                <view v-for="course in untimedCourses" :key="`${courseKey(course)}-untimed`" class="untimed-item">
                    <text class="course-name">{{ course.name }}</text>
                    <text class="course-meta">{{ course.teacher || teacherFallback }}</text>
                    <text class="course-meta">{{ course.weeksText || weeksPendingLabel }}</text>
                </view>
            </view>
        </template>


        <CourseForm
            :visible="showCourseForm"
            @close="showCourseForm = false"
            @save="handleCourseFormSave"
        />
    </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, onMounted, ref } from 'vue'
import type {
  EducationAuthSnapshot,
  EducationScheduleCourse,
  EducationSemesterSchedule,
  EducationSemesterSummary
} from '@/types/education'
import educationFunctionService from '@/services/education-function'
import educationScheduleCacheService from '@/services/education-schedule-cache'
import educationSessionService from '@/services/education-session'

import CourseForm from '@/components/study/CourseForm.vue'
import type { ManualCourse } from '@/components/study/CourseForm.vue'
import SemesterTimeline from '@/components/study/SemesterTimeline.vue'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { requireAuth } from '@/utils/auth-guard'
import {
  clampSemesterWeek,
  getCurrentWeekForSemester,
  getSemesterMaxWeek,
  getSemesterWeekStartDate,
  getSemesterWeekdayForDate,
  getUntimedCourses,
  getWeekScheduleCourses,
  selectDefaultSemester,
  sortSemesters
} from '@/utils/education-schedule'


type ViewMode = 'day' | 'week' | 'timeline'

interface SlotMeta {
  slot: number
  startSlot: number
  endSlot: number
  label: string
  start: string
  end: string
  isBreak?: boolean
}

const DAY_IN_MS = 24 * 60 * 60 * 1000
const TRACK_SLOT_HEIGHT = 108
const DEFAULT_SLOT_COUNT = 12
const WEEKDAY_LABELS_ZH = ['\u5468\u4e00', '\u5468\u4e8c', '\u5468\u4e09', '\u5468\u56db', '\u5468\u4e94', '\u5468\u516d', '\u5468\u65e5']
const WEEKDAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const COURSE_SLOT_TIMES: SlotMeta[] = [
  { slot: 1, startSlot: 1, endSlot: 1, label: '1', start: '08:00', end: '08:45' },
  { slot: 2, startSlot: 2, endSlot: 2, label: '2', start: '08:55', end: '09:40' },
  { slot: 3, startSlot: 3, endSlot: 3, label: '3', start: '10:00', end: '10:45' },
  { slot: 4, startSlot: 4, endSlot: 4, label: '4', start: '10:55', end: '11:40' },
  { slot: 11, startSlot: 11, endSlot: 11, label: '\u53481', start: '12:30', end: '13:15', isBreak: true },
  { slot: 12, startSlot: 12, endSlot: 12, label: '\u53482', start: '13:25', end: '14:10', isBreak: true },
  { slot: 5, startSlot: 5, endSlot: 5, label: '5', start: '14:30', end: '15:15' },
  { slot: 6, startSlot: 6, endSlot: 6, label: '6', start: '15:25', end: '16:10' },
  { slot: 7, startSlot: 7, endSlot: 7, label: '7', start: '16:30', end: '17:15' },
  { slot: 8, startSlot: 8, endSlot: 8, label: '8', start: '17:25', end: '18:10' },
  { slot: 9, startSlot: 9, endSlot: 9, label: '9', start: '19:30', end: '20:15' },
  { slot: 10, startSlot: 10, endSlot: 10, label: '10', start: '20:25', end: '21:10' }
]
const DISPLAY_SLOT_SEQUENCE = [1, 2, 3, 4, 11, 12, 5, 6, 7, 8, 9, 10]
const COURSE_PALETTES = [
  { gradient: 'linear-gradient(180deg, #8fbfd9 0%, #7fb1ce 100%)', shadow: 'rgba(127, 177, 206, 0.28)' },
  { gradient: 'linear-gradient(180deg, #9ace9a 0%, #84c184 100%)', shadow: 'rgba(132, 193, 132, 0.28)' },
  { gradient: 'linear-gradient(180deg, #4fb3aa 0%, #3f9f97 100%)', shadow: 'rgba(63, 159, 151, 0.28)' },
  { gradient: 'linear-gradient(180deg, #ebc77d 0%, #ddb565 100%)', shadow: 'rgba(221, 181, 101, 0.28)' },
  { gradient: 'linear-gradient(180deg, #f2a19c 0%, #e58e88 100%)', shadow: 'rgba(229, 142, 136, 0.28)' },
  { gradient: 'linear-gradient(180deg, #39ade6 0%, #2b9cd7 100%)', shadow: 'rgba(43, 156, 215, 0.28)' }
]

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()

const loading = ref(true)
const refreshing = ref(false)
const scheduleLoading = ref(false)
const errorMessage = ref('')
const errorCode = ref<number | null>(null)
const noticeMessage = ref('')
const rebindRecommended = ref(false)
const fetchedAt = ref('')
const viewMode = ref<ViewMode>('week')
const selectedSemesterId = ref('')
const currentWeek = ref(1)
const selectedDay = ref(1)
const followCurrentWeek = ref(true)
const semesterSummaries = ref<EducationSemesterSummary[]>([])
const semesterSchedules = ref<Record<string, EducationSemesterSchedule>>({})
const authSnapshot = ref<EducationAuthSnapshot | null>(null)
const pageInitialized = ref(false)

const showCourseForm = ref(false)
const manualCourses = ref<ManualCourse[]>([])

function loadManualCourses() {
  try {
    const raw = uni.getStorageSync('manualCourses')
    if (raw) manualCourses.value = JSON.parse(raw)
  } catch { /* ignore */ }
}

function saveManualCourses() {
  uni.setStorageSync('manualCourses', JSON.stringify(manualCourses.value))
}

function handleCourseFormSave(course: ManualCourse) {
  const idx = manualCourses.value.findIndex((c) => c.id === course.id)
  if (idx >= 0) {
    manualCourses.value.splice(idx, 1, course)
  } else {
    manualCourses.value.push(course)
  }
  saveManualCourses()
  showCourseForm.value = false
}

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#4b5563' : '#cbd5e1'))
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')
const pageTitle = computed(() => (isZh.value ? '\u8bfe\u8868' : 'Schedule'))
const refreshLabel = computed(() => (isZh.value ? '\u5237\u65b0' : 'Refresh'))
const refreshingLabel = computed(() => (isZh.value ? '\u5237\u65b0\u4e2d' : 'Refreshing'))
const retryLabel = computed(() => (isZh.value ? '\u91cd\u8bd5' : 'Retry'))
const bindActionLabel = computed(() => (isZh.value ? '\u53bb\u7ed1\u5b9a' : 'Reconnect'))
const loadingLabel = computed(() => (isZh.value ? '\u6b63\u5728\u52a0\u8f7d\u5b66\u671f\u5217\u8868\u2026' : 'Loading semesters...'))
const loadingScheduleLabel = computed(() => (isZh.value ? '\u6b63\u5728\u52a0\u8f7d\u5f53\u524d\u5b66\u671f\u8bfe\u8868\u2026' : 'Loading schedule...'))
const emptyTitle = computed(() => (isZh.value ? '\u6682\u65e0\u8bfe\u8868\u6570\u636e' : 'No schedule yet'))
const emptyDayLabel = computed(() => (isZh.value ? '\u5f53\u5929\u6682\u65e0\u8bfe\u7a0b\u5b89\u6392' : 'No classes for this day'))
const prevWeekLabel = computed(() => (isZh.value ? '\u4e0a\u4e00\u5468' : 'Prev'))
const nextWeekLabel = computed(() => (isZh.value ? '\u4e0b\u4e00\u5468' : 'Next'))
const courseUnitLabel = computed(() => (isZh.value ? '\u8282' : 'items'))
const teacherLabel = computed(() => (isZh.value ? '\u6559\u5e08' : 'Teacher'))
const locationLabel = computed(() => (isZh.value ? '\u5730\u70b9' : 'Location'))
const teacherFallback = computed(() => (isZh.value ? '\u6559\u5e08\u5f85\u5b9a' : 'Teacher pending'))
const locationFallback = computed(() => (isZh.value ? '\u5730\u70b9\u5f85\u5b9a' : 'Location pending'))
const untimedTitle = computed(() => (isZh.value ? '\u5f85\u5b89\u6392\u8bfe\u7a0b' : 'Untimed courses'))
const untimedSubtitle = computed(() =>
  isZh.value ? '\u5b9e\u8bad\u3001\u5b9e\u8df5\u7b49\u672a\u5199\u5165\u56fa\u5b9a\u8282\u6b21\u7684\u8bfe\u7a0b\u4f1a\u663e\u793a\u5728\u8fd9\u91cc' : 'Practice or flexible courses stay here'
)
const weeksPendingLabel = computed(() => (isZh.value ? '\u5468\u6b21\u5f85\u5b9a' : 'Weeks pending'))
const todayShortLabel = computed(() => (isZh.value ? '\u4eca' : 'Now'))
const currentUserId = computed(() => String(authStore.user?.$id || authStore.dbUser?.$id || '').trim())

const semesterTabs = computed(() => sortSemesters(semesterSummaries.value))
const selectedSemester = computed(
  () => semesterTabs.value.find((item) => item.semesterId === selectedSemesterId.value) || semesterTabs.value[0] || null
)
const selectedSemesterSchedule = computed(() => {
  const semesterId = String(selectedSemesterId.value || '').trim()
  return semesterId ? semesterSchedules.value[semesterId] || null : null
})
const hasSemesterList = computed(() => semesterTabs.value.length > 0)
const hasScheduleData = computed(() => Boolean(selectedSemesterSchedule.value))
const maxWeek = computed(() => getSemesterMaxWeek(selectedSemesterSchedule.value))
const canGoPrevWeek = computed(() => currentWeek.value > 1)
const canGoNextWeek = computed(() => currentWeek.value < maxWeek.value)

const weekCoursesBase = computed(() => getWeekScheduleCourses(selectedSemesterSchedule.value, currentWeek.value))
const weekCourses = computed(() => {
  const manual = manualCourses.value.map((m) => ({
    name: m.courseName,
    credit: 0,
    teacher: m.teacher,
    weeksText: '',
    type: 'manual',
    studentCount: 0,
    semesterId: selectedSemesterId.value,
    semesterName: selectedSemester.value?.semesterName || '',
    day: m.dayOfWeek,
    startSlot: m.startSlot,
    endSlot: m.endSlot,
    weeks: [],
    location: m.location,
    weekType: '',
    timeLocation: null
  }) as EducationScheduleCourse)
  return [...weekCoursesBase.value, ...manual]
})
const untimedCourses = computed(() => getUntimedCourses(selectedSemesterSchedule.value))
const showBindAction = computed(() => rebindRecommended.value || errorCode.value === 401)
const currentWeekTitle = computed(() => (isZh.value ? `\u7b2c${currentWeek.value}\u5468` : `Week ${currentWeek.value}`))
const maxWeekLabel = computed(() => (isZh.value ? `\u5171${maxWeek.value}\u5468` : `${maxWeek.value} weeks`))
const viewTabs = computed(() => [
  { value: 'day' as const, label: isZh.value ? '\u65e5\u8bfe\u8868' : 'Day' },

  { value: 'week' as const, label: isZh.value ? '\u5468\u8bfe\u8868' : 'Week' },
  { value: 'timeline' as const, label: isZh.value ? '\u65f6\u95f4\u7ebf' : 'Timeline' }
])
const weekCourseCountLabel = computed(() => (isZh.value ? '\u672c\u5468\u8bfe\u7a0b' : 'This week'))
const slotRows = computed(() => {
  const sequence = DISPLAY_SLOT_SEQUENCE.slice(0, Math.max(DEFAULT_SLOT_COUNT, DISPLAY_SLOT_SEQUENCE.length))
  return sequence.map((actualSlot, index) => {
    const slotMeta = getSlotMeta(actualSlot)
    return {
      ...slotMeta,
      slot: index + 1
    }
  })
})
const timetableHeight = computed(() => `${slotRows.value.length * TRACK_SLOT_HEIGHT}rpx`)

const weekdayColumns = computed(() => {
  const labels = isZh.value ? WEEKDAY_LABELS_ZH : WEEKDAY_LABELS_EN
  const weekStart = getWeekStartDate(selectedSemester.value, currentWeek.value)

  return labels.map((label, index) => {
    const day = index + 1
    const dateValue = weekStart ? new Date(weekStart.getTime() + index * DAY_IN_MS) : null
    const courses = weekCourses.value.filter((course) => course.day === day)

    return {
      day,
      label,
      shortDate: formatMonthDay(dateValue),
      fullDate: formatReadableDate(dateValue),
      isToday: resolveTodayWeekday(selectedSemester.value, currentWeek.value) === day,
      isActive: selectedDay.value === day,
      courses
    }
  })
})
const selectedDayInfo = computed(
  () => weekdayColumns.value.find((item) => item.day === selectedDay.value) || weekdayColumns.value[0] || null
)
const selectedDayCourses = computed(() => weekCourses.value.filter((course) => course.day === selectedDay.value))
const weekRangeLabel = computed(() => {
  const firstDay = weekdayColumns.value[0]
  const lastDay = weekdayColumns.value[weekdayColumns.value.length - 1]
  if (!firstDay || !lastDay) {
    return maxWeekLabel.value
  }
  return `${firstDay.shortDate} - ${lastDay.shortDate}`
})
const selectedDayTitle = computed(() => {
  if (!selectedDayInfo.value) {
    return isZh.value ? '\u65e5\u8bfe\u8868' : 'Day schedule'
  }
  return `${selectedDayInfo.value.label} \u00B7 ${selectedDayInfo.value.fullDate}`
})
const selectedDaySubtitle = computed(() => {
  if (!selectedDayInfo.value) {
    return ''
  }
  return isZh.value
    ? `${selectedDayCourses.value.length} \u8282\u8bfe\u7a0b\u5b89\u6392`
    : `${selectedDayCourses.value.length} classes`
})
const selectedDayTimeSummary = computed(() => {
  if (!selectedDayCourses.value.length) {
    return isZh.value ? '\u7a7a\u95f2' : 'Free'
  }
  return formatCourseTimeRange(selectedDayCourses.value[0], selectedDayCourses.value[selectedDayCourses.value.length - 1])
})

function normalizeWeekday(day: number) {
  if (!Number.isFinite(day)) {
    return 1
  }
  return Math.min(7, Math.max(1, Math.floor(day)))
}

function getWeekStartDate(semester: EducationSemesterSummary | EducationSemesterSchedule | null | undefined, week: number) {
  return getSemesterWeekStartDate(semester, week)
}

function resolveTodayWeekday(
  semester: EducationSemesterSummary | EducationSemesterSchedule | null | undefined,
  week: number,
  today = new Date()
) {
  return getSemesterWeekdayForDate(semester, week, today)
}

function resolveSelectedDay(
  semester: EducationSemesterSummary | EducationSemesterSchedule | null | undefined,
  week: number,
  schedule: EducationSemesterSchedule | null | undefined,
  fallbackDay = selectedDay.value
) {
  const weekItems = getWeekScheduleCourses(schedule, week)
  const todayWeekday = resolveTodayWeekday(semester, week)

  if (todayWeekday && weekItems.some((course) => course.day === todayWeekday)) {
    return todayWeekday
  }

  const normalizedFallback = normalizeWeekday(fallbackDay)
  if (weekItems.some((course) => course.day === normalizedFallback)) {
    return normalizedFallback
  }

  return weekItems[0]?.day || todayWeekday || normalizedFallback
}

function formatMonthDay(dateValue: Date | null) {
  if (!dateValue) {
    return '--/--'
  }
  const month = String(dateValue.getMonth() + 1).padStart(2, '0')
  const day = String(dateValue.getDate()).padStart(2, '0')
  return `${month}/${day}`
}

function formatReadableDate(dateValue: Date | null) {
  if (!dateValue) {
    return isZh.value ? '\u65e5\u671f\u5f85\u5b9a' : 'Date TBD'
  }

  const month = dateValue.getMonth() + 1
  const day = dateValue.getDate()
  return isZh.value ? `${month}\u6708${day}\u65e5` : `${month}/${day}`
}

function getSlotMeta(slot: number) {
  return COURSE_SLOT_TIMES.find((item) => item.slot === slot || item.startSlot === slot) || {
    slot,
    startSlot: slot,
    endSlot: slot,
    label: String(slot),
    start: '--:--',
    end: '--:--'
  }
}

function formatSlotText(course: { startSlot: number; endSlot: number }) {
  const startMeta = getSlotMeta(course.startSlot)
  const endMeta = getSlotMeta(course.endSlot)
  const isNumeric = /^\d+$/.test(startMeta.label) && /^\d+$/.test(endMeta.label)
  const slotLabel = startMeta.label === endMeta.label
    ? startMeta.label
    : `${startMeta.label}-${endMeta.label}`

  if (isZh.value) {
    return isNumeric ? `\u7b2c${slotLabel}\u8282` : `${slotLabel}\u8282`
  }

  return `Period ${slotLabel}`
}

function dayLabel(day: number) {
  const labels = isZh.value ? WEEKDAY_LABELS_ZH : WEEKDAY_LABELS_EN
  return labels[Math.max(0, day - 1)] || (isZh.value ? '\u5f85\u5b9a' : 'TBD')
}

function formatCoursePeriod(course: { day: number; startSlot: number; endSlot: number }) {
  return `${dayLabel(course.day)} \u00B7 ${formatSlotText(course)}`
}

function formatCourseTimeRange(
  startCourse: { startSlot: number; endSlot: number },
  endCourse?: { startSlot: number; endSlot: number }
) {
  const startMeta = getSlotMeta(startCourse.startSlot)
  const endMeta = getSlotMeta((endCourse || startCourse).endSlot)
  return `${startMeta.start}-${endMeta.end}`
}

function getTimelineRowIndex(slot: number) {
  if (!Number.isFinite(slot) || slot <= 0) {
    return 1
  }

  const matchedIndex = DISPLAY_SLOT_SEQUENCE.indexOf(Math.floor(slot))
  if (matchedIndex >= 0) {
    return matchedIndex + 1
  }

  return Math.max(1, Math.floor(slot))
}

function hashString(input: string) {
  return [...input].reduce((result, char) => {
    return (result * 31 + char.charCodeAt(0)) >>> 0
  }, 7)
}

function getCoursePalette(courseName: string) {
  return COURSE_PALETTES[hashString(courseName) % COURSE_PALETTES.length]
}

function agendaAccentStyle(course: EducationScheduleCourse) {
  const palette = getCoursePalette(course.name)
  return {
    background: palette.gradient,
    boxShadow: `0 10rpx 24rpx ${palette.shadow}`
  }
}

function courseEventStyle(course: EducationScheduleCourse) {
  const palette = getCoursePalette(course.name)
  const startRow = getTimelineRowIndex(course.startSlot)
  const endRow = getTimelineRowIndex(course.endSlot)
  const span = Math.max(1, endRow - startRow + 1)
  const top = (startRow - 1) * TRACK_SLOT_HEIGHT + 8
  const height = span * TRACK_SLOT_HEIGHT - 16

  return {
    top: `${top}rpx`,
    height: `${height}rpx`,
    background: palette.gradient,
    boxShadow: `0 18rpx 36rpx ${palette.shadow}`
  }
}

function slotStyle(slot: number) {
  return {
    top: `${(slot - 1) * TRACK_SLOT_HEIGHT}rpx`,
    height: `${TRACK_SLOT_HEIGHT}rpx`
  }
}

function courseKey(course: {
  semesterId: string
  name: string
  day: number
  startSlot: number
  endSlot: number
  location: string
}) {
  return [course.semesterId, course.name, course.day, course.startSlot, course.endSlot, course.location].join('::')
}

function persistCache() {
  if (!authSnapshot.value || !semesterTabs.value.length) {
    return
  }

  educationScheduleCacheService.saveSnapshot({
    appUserId: authSnapshot.value.appUserId,
    fetchedAt: fetchedAt.value || new Date().toISOString(),
    semesters: semesterTabs.value,
    semesterSchedules: semesterSchedules.value
  })
}

function applySemesterList(nextSemesters: EducationSemesterSummary[], nextFetchedAt: string, preserveSelection = true) {
  const sortedSemesters = sortSemesters(nextSemesters)
  semesterSummaries.value = sortedSemesters
  fetchedAt.value = nextFetchedAt

  const preservedSemester = preserveSelection
    ? sortedSemesters.find((item) => item.semesterId === selectedSemesterId.value)
    : null
  const defaultSemester = preservedSemester || selectDefaultSemester(sortedSemesters) || sortedSemesters[0] || null
  const nextSemesterId = defaultSemester?.semesterId || ''
  const nextSchedule = nextSemesterId ? semesterSchedules.value[nextSemesterId] || null : null
  const nextWeek = followCurrentWeek.value || !preservedSemester
    ? getCurrentWeekForSemester(nextSchedule || defaultSemester)
    : clampSemesterWeek(nextSchedule || preservedSemester, currentWeek.value)

  selectedSemesterId.value = nextSemesterId
  currentWeek.value = nextWeek
  selectedDay.value = resolveSelectedDay(defaultSemester, nextWeek, nextSchedule, selectedDay.value)
}

async function refreshSemesterList() {
  if (!authSnapshot.value) {
    return false
  }

  errorCode.value = null
  try {
    const result = await educationFunctionService.getScheduleSemesters(authSnapshot.value.cookieBundle)
    const nextFetchedAt = new Date().toISOString()
    applySemesterList(result.semesters, nextFetchedAt)
    persistCache()
    return true
  } catch (error) {
    errorCode.value = Number((error as { code?: number })?.code || 0) || null
    const message = error instanceof Error ? error.message : String(error || '')

    if (hasSemesterList.value) {
      rebindRecommended.value = errorCode.value === 401
      noticeMessage.value = errorCode.value === 401
        ? (isZh.value ? '\u6559\u52a1\u767b\u5f55\u5df2\u5931\u6548\uff0c\u5f53\u524d\u663e\u793a\u7f13\u5b58\u5b66\u671f\u5217\u8868' : 'Education login expired, showing cached semesters')
        : (isZh.value ? '\u5237\u65b0\u5b66\u671f\u5217\u8868\u5931\u8d25\uff0c\u5f53\u524d\u663e\u793a\u7f13\u5b58\u6570\u636e' : 'Failed to refresh semester list, showing cache')
    } else {
      errorMessage.value = message || (isZh.value ? '\u83b7\u53d6\u5b66\u671f\u5217\u8868\u5931\u8d25' : 'Failed to load semester list')
      rebindRecommended.value = errorCode.value === 401
    }
    return false
  } finally {
    loading.value = false
  }
}

async function ensureSemesterSchedule(semesterId: string, force = false) {
  if (!authSnapshot.value || !semesterId) {
    return false
  }
  if (!force && semesterSchedules.value[semesterId]) {
    return true
  }

  scheduleLoading.value = true
  errorCode.value = null
  errorMessage.value = ''
  rebindRecommended.value = false

  try {
    const result = await educationFunctionService.getSchedule(authSnapshot.value.cookieBundle, semesterId)
    semesterSchedules.value = {
      ...semesterSchedules.value,
      [semesterId]: result.schedule
    }
    fetchedAt.value = new Date().toISOString()

    if (selectedSemesterId.value === semesterId) {
      currentWeek.value = followCurrentWeek.value
        ? getCurrentWeekForSemester(result.schedule)
        : clampSemesterWeek(result.schedule, currentWeek.value)
      selectedDay.value = resolveSelectedDay(result.schedule, currentWeek.value, result.schedule, selectedDay.value)
    }

    noticeMessage.value = ''
    persistCache()
    return true
  } catch (error) {
    errorCode.value = Number((error as { code?: number })?.code || 0) || null
    const message = error instanceof Error ? error.message : String(error || '')
    const hasCachedSchedule = Boolean(semesterSchedules.value[semesterId])
    rebindRecommended.value = errorCode.value === 401

    if (hasCachedSchedule) {
      noticeMessage.value = errorCode.value === 401
        ? (isZh.value ? '\u6559\u52a1\u767b\u5f55\u5df2\u5931\u6548\uff0c\u5f53\u524d\u663e\u793a\u7f13\u5b58\u8bfe\u8868' : 'Education login expired, showing cached schedule')
        : (isZh.value ? '\u5237\u65b0\u5931\u8d25\uff0c\u5f53\u524d\u663e\u793a\u7f13\u5b58\u8bfe\u8868' : 'Refresh failed, showing cached schedule')
    } else {
      errorMessage.value = message || (isZh.value ? '\u83b7\u53d6\u8bfe\u8868\u5931\u8d25' : 'Failed to load schedule')
    }
    return false
  } finally {
    scheduleLoading.value = false
  }
}

async function initializePage() {
  loading.value = true
  errorMessage.value = ''
  noticeMessage.value = ''
  rebindRecommended.value = false
  uiPreferencesStore.initFromSystem()
  uiPreferencesStore.setActiveSection('study')

  loadManualCourses()
  await authStore.init()

  if (!requireAuth('/pages/study/schedule')) {
    loading.value = false
    return
  }

  authSnapshot.value = educationSessionService.getSnapshot(currentUserId.value)
  if (!authSnapshot.value) {
    loading.value = false
    errorCode.value = 401
    rebindRecommended.value = true
    errorMessage.value = isZh.value ? '\u8bf7\u5148\u5728\u8eab\u4efd\u8ba4\u8bc1\u4e2d\u7ed1\u5b9a\u6559\u52a1\u8d26\u53f7' : 'Please connect your education account first'
    uni.showToast({
      title: isZh.value ? '\u8bf7\u5148\u7ed1\u5b9a\u6559\u52a1\u8d26\u53f7' : 'Please connect education account',
      icon: 'none'
    })
    uni.navigateTo({
      url: '/pages/mine/identity?source=schedule'
    })
    return
  }

  const cachedSnapshot = educationScheduleCacheService.getSnapshot(authSnapshot.value.appUserId)
  if (cachedSnapshot) {
    semesterSchedules.value = cachedSnapshot.semesterSchedules || {}
    applySemesterList(cachedSnapshot.semesters, cachedSnapshot.fetchedAt, false)
    noticeMessage.value = isZh.value ? '\u5df2\u52a0\u8f7d\u672c\u5730\u7f13\u5b58\u5b66\u671f\u6570\u636e\uff0c\u6b63\u5728\u540c\u6b65\u6700\u65b0\u4fe1\u606f' : 'Loaded cached semesters, syncing latest data'
    loading.value = false
  }

  const listLoaded = await refreshSemesterList()
  if (!selectedSemesterId.value) {
    return
  }

  await ensureSemesterSchedule(
    selectedSemesterId.value,
    listLoaded || !Boolean(semesterSchedules.value[selectedSemesterId.value])
  )
}

function setSelectedDay(day: number) {
  selectedDay.value = normalizeWeekday(day)
}

function handleSemesterChange(semesterId: string) {
  const targetSemester = semesterTabs.value.find((item) => item.semesterId === semesterId)
  if (!targetSemester) {
    return
  }

  followCurrentWeek.value = true
  selectedSemesterId.value = semesterId
  currentWeek.value = getCurrentWeekForSemester(targetSemester)
  selectedDay.value = resolveSelectedDay(
    targetSemester,
    currentWeek.value,
    semesterSchedules.value[semesterId] || null,
    selectedDay.value
  )
  errorMessage.value = ''
  noticeMessage.value = ''
  void ensureSemesterSchedule(semesterId)
}

function changeWeek(offset: number) {
  if (!selectedSemester.value) {
    return
  }
  followCurrentWeek.value = false
  currentWeek.value = clampSemesterWeek(selectedSemesterSchedule.value || selectedSemester.value, currentWeek.value + offset)
  selectedDay.value = resolveSelectedDay(selectedSemester.value, currentWeek.value, selectedSemesterSchedule.value, selectedDay.value)
}

async function handleRefresh() {
  if (refreshing.value || !authSnapshot.value) {
    return
  }
  refreshing.value = true
  noticeMessage.value = ''
  const listLoaded = await refreshSemesterList()
  if (selectedSemesterId.value && (listLoaded || hasSemesterList.value)) {
    await ensureSemesterSchedule(selectedSemesterId.value, true)
  }
  refreshing.value = false
}

function goBack() {

  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/study/index' })
  }
}

function goToIdentity() {
  uni.navigateTo({
    url: '/pages/mine/identity?source=schedule'
  })
}

function shouldRefreshAfterReturn() {
  const nextSnapshot = educationSessionService.getSnapshot(currentUserId.value)
  const previousCookieBundle = String(authSnapshot.value?.cookieBundle || '').trim()
  const nextCookieBundle = String(nextSnapshot?.cookieBundle || '').trim()
  return previousCookieBundle !== nextCookieBundle
}

onShow(() => {
  if (!pageInitialized.value || refreshing.value || scheduleLoading.value || loading.value) {
    return
  }

  if (shouldRefreshAfterReturn()) {
    void initializePage()
  }
})

onMounted(async () => {
  await initializePage()
  pageInitialized.value = true
})
</script>

<style scoped lang="scss">
.schedule-page {
    min-height: 100vh;
    padding: 16rpx 24rpx 56rpx;
    background: var(--page-bg);
}

.theme-light {
    --page-bg: #f6f6f8;
    --surface: #ffffff;
    --surface-soft: #f8fafc;
    --surface-muted: #eef3f8;
    --text-main: #0f172a;
    --text-sub: #64748b;
    --text-soft: #94a3b8;
    --line: rgba(74, 144, 226, 0.12);
    --line-strong: rgba(74, 144, 226, 0.2);
    --accent: #4A90E2;
    --accent-strong: #3f7dcb;
    --accent-soft: rgba(74, 144, 226, 0.12);
    --topbar-bg: rgba(246, 246, 248, 0.9);
    --shadow-card: 0 12rpx 28rpx rgba(15, 23, 42, 0.06);
    --shadow-soft: 0 8rpx 18rpx rgba(74, 144, 226, 0.08);
    --grid-line: rgba(148, 163, 184, 0.18);
}

.theme-dark {
    --page-bg: #151c2a;
    --surface: rgba(15, 23, 42, 0.86);
    --surface-soft: rgba(30, 41, 59, 0.78);
    --surface-muted: rgba(30, 41, 59, 0.92);
    --text-main: #f1f5f9;
    --text-sub: #cbd5e1;
    --text-soft: #94a3b8;
    --line: rgba(74, 144, 226, 0.24);
    --line-strong: rgba(96, 165, 250, 0.3);
    --accent: #60a5fa;
    --accent-strong: #93c5fd;
    --accent-soft: rgba(96, 165, 250, 0.16);
    --topbar-bg: rgba(21, 28, 42, 0.9);
    --shadow-card: 0 14rpx 30rpx rgba(2, 6, 23, 0.28);
    --shadow-soft: 0 10rpx 22rpx rgba(2, 6, 23, 0.2);
    --grid-line: rgba(148, 163, 184, 0.2);
}

.top-bar,
.top-left,
.top-right,
.refresh-btn,
.control-strip,
.view-tabs,
.view-tab,
.week-toolbar,
.week-nav-btn,
.weekday-topline,
.agenda-head,
.state-actions,
.notice-card,
.semester-chip {
    display: flex;
    align-items: center;
}

.top-bar {
    position: sticky;
    top: 0;
    z-index: 20;
    min-height: 80rpx;
    justify-content: space-between;
    background: var(--topbar-bg);
    backdrop-filter: blur(14px);
}

.top-left {
    gap: 12rpx;
}


.top-right {
    gap: 10rpx;
}

.title {
    color: var(--text-main);
    font-size: 32rpx;
    font-weight: 700;
}


.add-course-btn {
    width: 58rpx;
    height: 58rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 1px solid var(--line);
    background: var(--surface);
    box-shadow: var(--shadow-soft);
}

.refresh-btn {
    justify-content: center;
    gap: 8rpx;
    min-height: 58rpx;
    padding: 0 18rpx;
    border-radius: 999rpx;
    border: 1px solid var(--line);
    background: var(--surface);
    box-shadow: var(--shadow-soft);

    text {
        color: var(--accent-strong);
        font-size: 20rpx;
        font-weight: 600;
    }
}

.refresh-btn.disabled,
.week-nav-btn.disabled {
    opacity: 0.45;
}

.control-card,
.notice-card,
.state-card,
.agenda-panel,
.untimed-card {
    margin-top: 14rpx;
    border-radius: 22rpx;
    border: 1px solid var(--line);
    background: var(--surface);
    box-shadow: var(--shadow-card);
}

.control-card {
    padding: 14rpx;
}

.control-strip {
    justify-content: space-between;
    gap: 12rpx;
}

.week-pill {
    min-width: 112rpx;
    height: 50rpx;
    padding: 0 18rpx;
    border-radius: 999rpx;
    background: linear-gradient(135deg, var(--accent), var(--accent-strong));
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8rpx 18rpx rgba(74, 144, 226, 0.22);
}

.week-chip-text {
    color: #ffffff;
    font-size: 22rpx;
    font-weight: 700;
}

.view-tabs {
    flex: 1;
    padding: 4rpx;
    border-radius: 16rpx;
    background: var(--surface-muted);
    gap: 6rpx;
}

.view-tab {
    flex: 1;
    justify-content: center;
    min-height: 48rpx;
    border-radius: 12rpx;

    text {
        color: var(--text-sub);
        font-size: 22rpx;
        font-weight: 700;
    }
}

.view-tab.active {
    background: var(--surface);
    box-shadow: var(--shadow-soft);

    text {
        color: var(--accent-strong);
    }
}

.notice-text,
.state-card text,
.course-meta,
.section-subtitle,
.weekday-date,
.timeline-time,
.event-meta,
.week-range-caption {
    color: var(--text-sub);
    font-size: 24rpx;
    line-height: 1.5;
}

.section-subtitle {
    margin-left: 16rpx;
}

.week-range-text,
.timeline-number,
.weekday-name,
.section-title,
.course-name,
.event-name {
    color: var(--text-main);
    font-weight: 700;
}

.week-toolbar {
    margin-top: 10rpx;
    justify-content: space-between;
    gap: 8rpx;
}

.week-toolbar-center {
    flex: 1;
    min-width: 0;
    text-align: center;
}

.week-range-text {
    display: block;
    font-size: 24rpx;
}

.week-range-caption {
    display: block;
    margin-top: 2rpx;
    font-size: 20rpx;
}

.week-nav-btn {
    min-width: 118rpx;
    min-height: 60rpx;
    padding: 0 14rpx;
    border-radius: 16rpx;
    justify-content: center;
    gap: 2rpx;
    background: var(--surface-soft);

    text {
        color: var(--text-main);
        font-size: 22rpx;
        font-weight: 600;
    }
}

.week-nav-btn.align-right {
    text-align: right;
}

.semester-scroll {
    margin-top: 10rpx;
}

.weekday-scroll,
.timetable-scroll {
    margin-top: 12rpx;
}

.timetable-scroll {
    width: 100%;
    overflow: hidden;
}

.semester-tabs,
.weekday-row {
    display: flex;
    gap: 8rpx;
}

.semester-tabs {
    padding: 2rpx;
}

.semester-chip {
    flex-shrink: 0;
    min-height: 56rpx;
    padding: 0 18rpx;
    border-radius: 16rpx;
    justify-content: center;
    border: 1px solid var(--line);
    background: var(--surface);
    box-shadow: var(--shadow-soft);

    text {
        color: var(--text-sub);
        font-size: 22rpx;
        font-weight: 600;
    }
}

.semester-chip.active {
    background: rgba(74, 144, 226, 0.14);
    border-color: rgba(74, 144, 226, 0.18);

    text {
        color: var(--accent-strong);
    }
}

.notice-card {
    justify-content: space-between;
    gap: 16rpx;
    padding: 18rpx 20rpx;
}

.notice-action,
.primary-btn,
.secondary-btn,
.agenda-badge,
.time-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999rpx;
}

.notice-action {
    flex-shrink: 0;
    min-height: 56rpx;
    padding: 0 18rpx;
    background: var(--accent-soft);

    text {
        color: var(--accent-strong);
        font-size: 22rpx;
        font-weight: 700;
    }
}

.state-card {
    padding: 36rpx 24rpx;
    text-align: center;
}

.state-card.error {
    border-color: rgba(239, 68, 68, 0.3);
}

.state-actions {
    justify-content: center;
    gap: 14rpx;
    margin-top: 18rpx;
}

.primary-btn,
.secondary-btn {
    min-width: 164rpx;
    min-height: 68rpx;
    padding: 0 20rpx;
}

.primary-btn {
    background: #4A90E2;

    text {
        color: #ffffff;
        font-size: 24rpx;
        font-weight: 700;
    }
}

.secondary-btn {
    border: 1px solid var(--line);
    background: var(--surface-soft);

    text {
        color: var(--text-main);
        font-size: 24rpx;
        font-weight: 700;
    }
}

.weekday-pill {
    flex-shrink: 0;
    width: 116rpx;
    padding: 18rpx 0;
    border-radius: 18rpx;
    background: var(--surface);
    border: 1px solid transparent;
    text-align: center;
    box-shadow: var(--shadow-soft);
}

.weekday-pill.active,
.weekday-pill.today {
    background: rgba(74, 144, 226, 0.12);
    border-color: rgba(74, 144, 226, 0.18);
}

.weekday-pill.board {
    flex: 1 1 0;
    width: auto;
    min-width: 0;
    box-shadow: none;
    padding: 16rpx 0;
}

.weekday-pill.board .weekday-topline {
    gap: 4rpx;
}

.weekday-pill.board .weekday-name {
    font-size: 20rpx;
}

.weekday-pill.board .weekday-date {
    font-size: 18rpx;
}

.weekday-pill.board .weekday-tag {
    min-width: 28rpx;
    height: 28rpx;
    padding: 0 6rpx;
    font-size: 16rpx;
    line-height: 28rpx;
}

.weekday-topline {
    justify-content: center;
    gap: 6rpx;
}

.weekday-name {
    font-size: 24rpx;
}

.weekday-tag {
    min-width: 34rpx;
    height: 34rpx;
    padding: 0 8rpx;
    border-radius: 999rpx;
    background: rgba(74, 144, 226, 0.14);
    color: var(--accent-strong);
    font-size: 18rpx;
    font-weight: 700;
    line-height: 34rpx;
    text-align: center;
}

.weekday-date {
    display: block;
    margin-top: 6rpx;
    font-size: 20rpx;
}

.agenda-panel,
.untimed-card {
    padding: 22rpx;
}

.agenda-head {
    justify-content: space-between;
    align-items: flex-start;
    gap: 16rpx;
}

.agenda-head.compact {
    align-items: center;
}

.section-title {
    font-size: 30rpx;
    line-height: 1.4;
}

.agenda-badge,
.time-badge {
    padding: 0 18rpx;
    background: rgba(74, 144, 226, 0.1);

    text {
        color: var(--accent-strong);
        font-size: 24rpx;
        font-weight: 700;
        line-height: 52rpx;
    }
}

.agenda-badge {
    min-height: 52rpx;
}

.agenda-empty {
    margin-top: 18rpx;
    padding: 34rpx 24rpx;
    border-radius: 18rpx;
    background: var(--surface-soft);
    text-align: center;

    text {
        color: var(--text-sub);
        font-size: 24rpx;
    }
}

.day-agenda-card {
    margin-top: 16rpx;
    padding: 20rpx;
    border-radius: 18rpx;
    background: var(--surface-soft);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16rpx;
}

.day-card-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10rpx;
}

.course-name {
    font-size: 30rpx;
    line-height: 1.4;
}

.timetable-shell {
    width: 100%;
    min-width: 0;
    padding: 14rpx 14rpx 14rpx 8rpx;
    border-radius: 24rpx;
    border: 1px solid var(--line);
    background: var(--surface);
    box-shadow: var(--shadow-card);
}

.timetable-header {
    display: grid;
    grid-template-columns: 46rpx repeat(7, minmax(0, 1fr));
    gap: 4rpx;
}

.timeline-header {
    width: 46rpx;
}

.timetable-body {
    margin-top: 14rpx;
    display: grid;
    grid-template-columns: 46rpx minmax(0, 1fr);
    gap: 4rpx;
}

.timeline-column {
    width: 46rpx;
    position: relative;
}

.timeline-slot,
.slot-cell {
    position: absolute;
    left: 0;
    right: 0;
    box-sizing: border-box;
}

.timeline-slot {
    padding-top: 4rpx;
}

.timeline-slot.break {
    padding-top: 10rpx;
}

.timeline-number {
    display: block;
    font-size: 18rpx;
    font-weight: 700;
    line-height: 1.2;
    text-align: center;
}

.timeline-number.break {
    color: var(--accent-strong);
}

.timeline-time {
    display: block;
    font-size: 13rpx;
    line-height: 1.25;
    text-align: center;
}

.track-columns {
    flex: 1;
    display: flex;
    gap: 4rpx;
    position: relative;
    min-width: 0;
}

.day-track {
    flex: 1 1 0;
    min-width: 0;
    position: relative;
    border-radius: 16rpx;
    background: var(--surface-soft);
    overflow: hidden;
    border: 1px solid transparent;
}

.day-track.active {
    border-color: var(--line-strong);
}

.slot-cell {
    border-top: 1px dashed var(--grid-line);
}

.slot-cell.break {
    background: rgba(74, 144, 226, 0.04);
}

.slot-cell:first-child {
    border-top: 0;
}

.timetable-event {
    position: absolute;
    left: 4rpx;
    right: 4rpx;
    padding: 10rpx 8rpx;
    border-radius: 14rpx;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    color: #ffffff;
    box-sizing: border-box;
}

.event-name {
    color: #ffffff;
    font-size: 14rpx;
    font-weight: 700;
    line-height: 1.25;
    white-space: normal;
    word-break: break-word;
}

.event-meta {
    color: rgba(255, 255, 255, 0.92);
    font-size: 13rpx;
    line-height: 1.25;
    white-space: normal;
    word-break: break-word;
}

.untimed-item {
    margin-top: 14rpx;
    padding: 18rpx 20rpx;
    border-radius: 18rpx;
    background: var(--surface-soft);
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}
</style>
