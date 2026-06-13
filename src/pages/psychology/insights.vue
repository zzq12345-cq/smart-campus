<template>
  <view :class="['insights-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ pageTitle }}</text>
      </view>
      <view class="right">
        <view class="icon-btn" :class="{ disabled: refreshing }" @tap="handleRefresh">
          <Icon name="sync" :size="20" :color="iconColor" />
        </view>
      </view>
    </view>

    <view v-if="loading && !timeline.length" class="state-card">
      <text class="state-title">{{ loadingTitle }}</text>
      <text class="state-text">{{ loadingText }}</text>
    </view>

    <view v-else-if="error && !timeline.length" class="state-card error">
      <text class="state-title">{{ errorTitle }}</text>
      <text class="state-text">{{ error }}</text>
      <view class="retry-btn" @tap="loadInsights">
        <text class="retry-btn-text">{{ retryLabel }}</text>
      </view>
    </view>

    <template v-else>
      <view class="hero-card">
        <view class="hero-head">
          <view class="hero-copy">
            <text class="hero-title">{{ heroTitle }}</text>
            <text class="hero-subtitle">{{ heroSubtitle }}</text>
          </view>
          <view :class="['risk-pill', riskTone(summary.latestRiskLevel)]">
            <text>{{ riskLabel(summary.latestRiskLevel) }}</text>
          </view>
        </view>

        <text class="hero-text">{{ localizedSummary.latestText || noInsightText }}</text>
        <text class="hero-meta">
          {{ latestUpdatedLabel }} {{ localizedSummary.latestCreatedAt ? formatTime(localizedSummary.latestCreatedAt) : noDateLabel }}
        </text>
      </view>

      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-value">{{ localizedSummary.assessmentCount }}</text>
          <text class="stat-label">{{ assessmentCountLabel }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ localizedSummary.interventionCount }}</text>
          <text class="stat-label">{{ interventionCountLabel }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ localizedSummary.suggestionCount }}</text>
          <text class="stat-label">{{ suggestionCountLabel }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ localizedSummary.notificationCount }}</text>
          <text class="stat-label">{{ notificationCountLabel }}</text>
        </view>
      </view>

      <view v-if="error && timeline.length" class="state-card error inline-state">
        <text class="state-text">{{ error }}</text>
      </view>

      <view class="section-title-row">
        <view class="section-left">
          <Icon name="insights" :size="18" color="#886fde" />
          <text class="section-title">{{ timelineTitle }}</text>
        </view>
        <text class="section-count">{{ localizedSummary.totalCount }}{{ countSuffix }}</text>
      </view>

      <view v-if="!localizedTimeline.length" class="state-card">
        <text class="state-title">{{ emptyTitle }}</text>
        <text class="state-text">{{ emptyText }}</text>
        <view class="retry-btn" @tap="handleRefresh">
          <text class="retry-btn-text">{{ refreshLabel }}</text>
        </view>
      </view>

      <view v-else class="timeline-list">
        <view v-for="item in localizedTimeline" :key="item.id" class="timeline-card">
          <view class="timeline-head">
            <view class="timeline-badges">
              <view class="source-badge">
                <text>{{ sourceLabel(item.source) }}</text>
              </view>
              <view v-if="typeof item.riskLevel === 'number'" :class="['risk-badge', riskTone(item.riskLevel)]">
                <text>{{ riskLabel(item.riskLevel) }}</text>
              </view>
            </view>
            <text class="timeline-time">{{ formatTime(item.createdAt) }}</text>
          </view>

          <text class="timeline-title">{{ item.title }}</text>
          <text v-if="item.text" class="timeline-text">{{ item.text }}</text>
          <text v-if="item.secondaryText" class="timeline-secondary">
            {{ secondaryPrefix }}{{ item.secondaryText }}
          </text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import mentalHealthInsightsService from '@/services/mental-health-insights'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type {
  MentalHealthInsightSource,
  MentalHealthInsightsPageData,
  MentalHealthInsightTimelineItem,
  MentalHealthRiskLevel
} from '@/types/mental-health'
import { requireAuth } from '@/utils/auth-guard'
import { localizeMentalHealthText } from '@/utils/mental-health-localization'

const EMPTY_PAGE_DATA: MentalHealthInsightsPageData = {
  summary: {
    latestSource: undefined,
    latestRiskLevel: 0,
    latestText: '',
    latestCreatedAt: '',
    assessmentCount: 0,
    interventionCount: 0,
    suggestionCount: 0,
    notificationCount: 0,
    totalCount: 0
  },
  timeline: []
}

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()

const pageData = ref<MentalHealthInsightsPageData>(EMPTY_PAGE_DATA)
const loading = ref(false)
const refreshing = ref(false)
const error = ref('')

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8'))
const locale = computed(() => uiPreferencesStore.locale)
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const summary = computed(() => pageData.value.summary)
const timeline = computed(() => pageData.value.timeline)
const localizedSummary = computed(() => ({
  ...summary.value,
  latestText: localizeMentalHealthText(summary.value.latestText, locale.value)
}))
const localizedTimeline = computed(() =>
  timeline.value.map((item) => ({
    ...item,
    title: localizeMentalHealthText(item.title, locale.value),
    text: localizeMentalHealthText(item.text, locale.value),
    secondaryText: localizeMentalHealthText(item.secondaryText, locale.value)
  })) as MentalHealthInsightTimelineItem[]
)

const pageTitle = computed(() => t(I18N_KEYS.psychologyInsightsTitle, locale.value))
const heroTitle = computed(() => t(I18N_KEYS.psychologyInsightsHeroTitle, locale.value))
const heroSubtitle = computed(() => t(I18N_KEYS.psychologyInsightsHeroSubtitle, locale.value))
const latestUpdatedLabel = computed(() => t(I18N_KEYS.psychologyInsightsLatestUpdated, locale.value))
const noDateLabel = computed(() => t(I18N_KEYS.psychologyInsightsNoDate, locale.value))
const noInsightText = computed(() => t(I18N_KEYS.psychologyInsightsNoInsight, locale.value))
const timelineTitle = computed(() => t(I18N_KEYS.psychologyInsightsTimelineTitle, locale.value))
const countSuffix = computed(() => (isZh.value ? ' 条' : ' items'))
const assessmentCountLabel = computed(() => t(I18N_KEYS.psychologyInsightsAssessmentCount, locale.value))
const interventionCountLabel = computed(() => t(I18N_KEYS.psychologyInsightsInterventionCount, locale.value))
const suggestionCountLabel = computed(() => t(I18N_KEYS.psychologyInsightsSuggestionCount, locale.value))
const notificationCountLabel = computed(() => t(I18N_KEYS.psychologyInsightsNotificationCount, locale.value))
const loadingTitle = computed(() => t(I18N_KEYS.psychologyInsightsLoadingTitle, locale.value))
const loadingText = computed(() => t(I18N_KEYS.psychologyInsightsLoadingText, locale.value))
const emptyTitle = computed(() => t(I18N_KEYS.psychologyInsightsEmptyTitle, locale.value))
const emptyText = computed(() => t(I18N_KEYS.psychologyInsightsEmptyText, locale.value))
const errorTitle = computed(() => t(I18N_KEYS.psychologyInsightsErrorTitle, locale.value))
const retryLabel = computed(() => t(I18N_KEYS.psychologyInsightsRetry, locale.value))
const refreshLabel = computed(() => t(I18N_KEYS.psychologyInsightsRefresh, locale.value))
const secondaryPrefix = computed(() => t(I18N_KEYS.psychologyInsightsSecondaryPrefix, locale.value))
const refreshSuccessText = computed(() => t(I18N_KEYS.psychologyInsightsRefreshSuccess, locale.value))
const refreshFailText = computed(() => t(I18N_KEYS.psychologyInsightsRefreshFail, locale.value))

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/psychology/index' })
  }
}

function sourceLabel(source: MentalHealthInsightSource) {
  const labels = locale.value === 'zh-CN'
    ? {
        assessment: 'AI 评估',
        intervention: 'AI 干预',
        suggestion: '建议卡片',
        notification: '系统提醒'
      }
    : {
        assessment: 'Assessment',
        intervention: 'Intervention',
        suggestion: 'Suggestion',
        notification: 'Notification'
  }
  return labels[source]
}

function toDisplayErrorMessage(input: unknown) {
  const message = input instanceof Error ? input.message : ''
  if (!message || message === 'Failed to load mental health insights') {
    return t(I18N_KEYS.commonLoadError, locale.value)
  }
  return localizeMentalHealthText(message, locale.value)
}

function riskLabel(level?: MentalHealthRiskLevel) {
  const normalized = Math.max(0, Math.min(3, Number(level || 0)))
  if (isZh.value) {
    if (normalized >= 3) return '高风险'
    if (normalized >= 2) return '中风险'
    if (normalized >= 1) return '关注'
    return '常规'
  }
  if (normalized >= 3) return 'High Risk'
  if (normalized >= 2) return 'Medium Risk'
  if (normalized >= 1) return 'Watch'
  return 'Routine'
}

function riskTone(level?: MentalHealthRiskLevel) {
  const normalized = Math.max(0, Math.min(3, Number(level || 0)))
  if (normalized >= 3) return 'risk-high'
  if (normalized >= 2) return 'risk-mid'
  if (normalized >= 1) return 'risk-watch'
  return 'risk-low'
}

function formatTime(raw?: string) {
  if (!raw) {
    return noDateLabel.value
  }
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return raw
  }
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

async function loadInsights() {
  loading.value = true
  error.value = ''
  try {
    pageData.value = await mentalHealthInsightsService.getInsightsPageData(20)
  } catch (loadError) {
    console.error('Load mental health insights failed:', loadError)
    error.value = toDisplayErrorMessage(loadError)
  } finally {
    loading.value = false
    uni.stopPullDownRefresh?.()
  }
}

async function handleRefresh() {
  if (refreshing.value) {
    return
  }

  refreshing.value = true
  error.value = ''
  try {
    pageData.value = await mentalHealthInsightsService.refreshInsights({
      limit: 20,
      windowDays: 7,
      aggregateDays: 30
    })
    uni.showToast({
      title: refreshSuccessText.value,
      icon: 'success'
    })
  } catch (refreshError) {
    console.error('Refresh mental health insights failed:', refreshError)
    const message = toDisplayErrorMessage(refreshError)
    error.value = message
    uni.showToast({
      title: refreshFailText.value,
      icon: 'none'
    })
  } finally {
    refreshing.value = false
    uni.stopPullDownRefresh?.()
  }
}

onShow(async () => {
  uiPreferencesStore.initFromSystem()
  if (!requireAuth('/pages/psychology/insights')) {
    return
  }
  await authStore.refreshProfile()
  await loadInsights()
})

onPullDownRefresh(async () => {
  if (!requireAuth('/pages/psychology/insights')) {
    uni.stopPullDownRefresh?.()
    return
  }
  await loadInsights()
})
</script>

<style lang="scss" scoped>
.insights-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 48rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f6f6f8;
  --surface: #ffffff;
  --line: rgba(136, 111, 222, 0.16);
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(246, 246, 248, 0.9);
}

.theme-dark {
  --page-bg: #15131f;
  --surface: rgba(24, 25, 39, 0.8);
  --line: rgba(136, 111, 222, 0.3);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(21, 19, 31, 0.9);
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

  .left {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  .right {
    display: flex;
    align-items: center;
  }
}

.title {
  color: var(--text-main);
  font-size: 34rpx;
  font-weight: 700;
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn.disabled {
  opacity: 0.45;
}

.hero-card,
.stat-card,
.timeline-card,
.state-card {
  border: 1px solid var(--line);
  border-radius: 24rpx;
  background: var(--surface);
}

.hero-card {
  margin-top: 14rpx;
  padding: 26rpx;
  background: linear-gradient(135deg, rgba(136, 111, 222, 0.16), rgba(136, 111, 222, 0.04));
}

.hero-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.hero-title {
  color: var(--text-main);
  font-size: 32rpx;
  font-weight: 700;
}

.hero-subtitle {
  color: var(--text-sub);
  font-size: 22rpx;
  line-height: 1.6;
}

.hero-text {
  margin-top: 18rpx;
  color: var(--text-main);
  font-size: 28rpx;
  line-height: 1.7;
  white-space: pre-wrap;
}

.hero-meta {
  margin-top: 16rpx;
  color: var(--text-soft);
  font-size: 22rpx;
}

.risk-pill,
.risk-badge,
.source-badge {
  min-height: 46rpx;
  border-radius: 999rpx;
  padding: 0 16rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 21rpx;
  font-weight: 700;
}

.source-badge {
  background: rgba(136, 111, 222, 0.12);
  color: #6d57c8;
}

.risk-low {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.risk-watch {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

.risk-mid {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.risk-high {
  background: rgba(239, 68, 68, 0.14);
  color: #b91c1c;
}

.stats-grid {
  margin-top: 18rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}

.stat-card {
  padding: 22rpx;
}

.stat-value {
  color: var(--text-main);
  font-size: 36rpx;
  font-weight: 700;
}

.stat-label {
  margin-top: 6rpx;
  color: var(--text-sub);
  font-size: 22rpx;
}

.section-title-row {
  margin-top: 28rpx;
  margin-bottom: 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.section-left {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.section-title {
  color: var(--text-main);
  font-size: 30rpx;
  font-weight: 700;
}

.section-count {
  color: var(--text-soft);
  font-size: 22rpx;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.timeline-card {
  padding: 22rpx;
}

.timeline-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.timeline-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.timeline-time {
  color: var(--text-soft);
  font-size: 22rpx;
  white-space: nowrap;
}

.timeline-title {
  margin-top: 16rpx;
  color: var(--text-main);
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.6;
}

.timeline-text {
  margin-top: 12rpx;
  color: var(--text-main);
  font-size: 24rpx;
  line-height: 1.7;
  white-space: pre-wrap;
}

.timeline-secondary {
  margin-top: 12rpx;
  color: var(--text-sub);
  font-size: 22rpx;
  line-height: 1.6;
}

.state-card {
  margin-top: 18rpx;
  padding: 28rpx 24rpx;
  text-align: center;
}

.state-card.error {
  border-color: rgba(239, 68, 68, 0.18);
  background: rgba(239, 68, 68, 0.06);
}

.inline-state {
  margin-top: 18rpx;
  text-align: left;
}

.state-title {
  color: var(--text-main);
  font-size: 28rpx;
  font-weight: 700;
}

.state-text {
  margin-top: 10rpx;
  color: var(--text-sub);
  font-size: 23rpx;
  line-height: 1.6;
}

.retry-btn {
  margin-top: 18rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 64rpx;
  padding: 0 24rpx;
  border-radius: 16rpx;
  background: #886fde;
}

.retry-btn-text {
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 700;
}
</style>
