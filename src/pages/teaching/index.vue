<template>
  <view :class="['teaching-page', themeClass]">
    <view class="top-bar">
      <view class="left">
        <Icon name="menu_book" :size="22" :color="subjectColor" />
        <text class="title">{{ pageData.headerTitle }}</text>
      </view>
      <view class="right">
        <view class="subject-pill" @tap="goSubjectSelect">
          <text class="subject-pill-text">{{ subjectLabel }}</text>
          <Icon name="expand_more" :size="14" :color="subjectColor" />
        </view>
      </view>
    </view>

    <view class="hero-card" :style="{ background: heroGradient }">
      <view class="hero-content">
        <text class="hero-title">{{ pageData.heroTitle }}</text>
        <text class="hero-subtitle">{{ pageData.heroSubtitle }}</text>
        <view class="hero-button" :style="{ background: subjectColor }" @tap="goPreparation">
          <text class="hero-button-text">{{ pageData.heroAction }}</text>
        </view>
      </view>
      <view class="hero-icon">
        <Icon :name="subjectIcon" :size="164" :color="heroIconColor" />
      </view>
    </view>

    <view class="section-title-row">
      <view class="section-left">
        <Icon name="widgets" :size="18" :color="subjectColor" />
        <text class="section-title">{{ pageData.quickTitle }}</text>
      </view>
    </view>

    <scroll-view class="quick-scroll" :scroll-x="hasQuickOverflow" show-scrollbar="false">
      <view :class="['quick-grid', { 'is-overflow': hasQuickOverflow }]">
        <view
          v-for="(item, index) in pageData.quickActions"
          :key="index"
          class="quick-card"
          @tap="handleQuickAction(item)"
        >
          <view class="quick-head">
            <view class="quick-icon" :style="{ background: subjectColorLight }">
              <Icon :name="item.icon" :size="20" :color="subjectColor" />
            </view>
            <text class="quick-title">{{ item.title }}</text>
          </view>
          <text class="quick-subtitle">{{ item.subtitle }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="section-title-row">
      <view class="section-left">
        <Icon name="history" :size="18" :color="subjectColor" />
        <text class="section-title">{{ pageData.recentTitle }}</text>
      </view>
      <text class="section-action" @tap="goLessonPlans">{{ isZh ? '查看全部' : 'View All' }}</text>
    </view>

    <view class="feed-list">
      <view v-if="loadingPlans && !recentPlans.length" class="state-card">
        <text class="state-text">{{ isZh ? '加载中...' : 'Loading...' }}</text>
      </view>

      <view v-else-if="!recentPlans.length" class="state-card">
        <view class="empty-icon">
          <Icon name="note_add" :size="40" :color="subjectColor" />
        </view>
        <text class="state-text">{{ isZh ? '还没有教案，开始创建吧' : 'No plans yet' }}</text>
        <view class="empty-btn" :style="{ background: subjectColor }" @tap="goPreparation">
          <text class="empty-btn-text">{{ isZh ? 'AI 智能备课' : 'AI Preparation' }}</text>
        </view>
      </view>

      <view v-for="plan in recentPlans" :key="plan.$id" class="plan-card" @tap="goEditPlan(plan.$id)">
        <view class="plan-head">
          <view class="plan-badge" :style="{ background: subjectColorLight, color: subjectColor }">
            <text>{{ plan.subject || subjectLabel }}</text>
          </view>
          <view :class="['status-dot', `status-${plan.status}`]" />
          <text class="plan-status">{{ statusLabel(plan.status) }}</text>
        </view>
        <text class="plan-title">{{ plan.title }}</text>
        <view class="plan-meta">
          <text class="plan-meta-text">{{ plan.grade || '--' }}</text>
          <text class="plan-meta-sep">·</text>
          <text class="plan-meta-text">{{ plan.duration || 45 }}{{ isZh ? '分钟' : 'min' }}</text>
          <text class="plan-meta-sep">·</text>
          <text class="plan-meta-text">{{ formatDate(plan.$updatedAt) }}</text>
        </view>
      </view>
    </view>

    <FloatingAiButton v-if="isTabBarVisible" />
    <AppTabBar v-if="isTabBarVisible" value="/pages/teaching/index" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { getPageData as getTeachingPageData } from '@/mocks/pages/teaching'
import { getSubjectConfig, SUBJECT_LIST, TEACHING_PRIMARY } from '@/teacher/types/subjects'
import lessonPlansService from '@/teacher/services/lesson-plans'
import type { LessonPlan } from '@/teacher/types/lesson-plan'
import AppTabBar from '@/components/common/AppTabBar.vue'
import FloatingAiButton from '@/components/common/FloatingAiButton.vue'
import type { TeachingQuickAction } from '@/mocks/pages/teaching'

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')
const pageData = computed(() => getTeachingPageData(uiPreferencesStore.locale))
const isTabBarVisible = ref(false)

const currentSubject = computed(() => {
  const config = getSubjectConfig(authStore.teacherSubject)
  return config || SUBJECT_LIST[3] // 默认思政
})

const subjectColor = computed(() => currentSubject.value.color)
const subjectColorLight = computed(() => currentSubject.value.colorLight)
const subjectIcon = computed(() => currentSubject.value.icon)
const subjectLabel = computed(() => isZh.value ? currentSubject.value.name : currentSubject.value.nameEn)
const heroGradient = computed(() => currentSubject.value.gradient)
const heroIconColor = computed(() => {
  const hex = currentSubject.value.color
  return hex.replace('#', 'rgba(') ? `${hex}40` : 'rgba(192,0,0,0.25)'
})

const loadingPlans = ref(false)
const recentPlans = ref<LessonPlan[]>([])
const hasQuickOverflow = computed(() => pageData.value.quickActions.length > 4)

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
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function goSubjectSelect() {
  uni.navigateTo({ url: '/pages/teaching/subject-select' })
}

function goPreparation() {
  uni.navigateTo({ url: '/pages/teaching/preparation' })
}

function goLessonPlans() {
  uni.navigateTo({ url: '/pages/teaching/lesson-plans' })
}

function goEditPlan(id: string) {
  uni.navigateTo({ url: `/pages/teaching/lesson-plan-detail?id=${encodeURIComponent(id)}` })
}

function handleQuickAction(item: TeachingQuickAction) {
  if (item.route) {
    uni.navigateTo({ url: item.route })
  } else {
    uni.showToast({ title: isZh.value ? '即将上线' : 'Coming soon', icon: 'none' })
  }
}

async function loadRecentPlans() {
  if (!authStore.isLoggedIn) return
  loadingPlans.value = true
  try {
    recentPlans.value = await lessonPlansService.getMyLessonPlans({ limit: 5 })
  } catch (e) {
    console.error('Load recent plans failed:', e)
  } finally {
    loadingPlans.value = false
  }
}

const hideNativeTabBar = () => {
  if (typeof uni?.hideTabBar !== 'function') return
  uni.hideTabBar({ animation: false })
}

onShow(async () => {
  isTabBarVisible.value = true
  hideNativeTabBar()
  uiPreferencesStore.initFromSystem()
  uiPreferencesStore.setActiveSection('teaching')

  if (!authStore.teacherSubject) {
    // 未选科目，跳转科目选择
    uni.navigateTo({ url: '/pages/teaching/subject-select' })
    return
  }

  await authStore.refreshProfile()
  await loadRecentPlans()
})

onHide(() => {
  isTabBarVisible.value = false
})
</script>

<style lang="scss" scoped>
.teaching-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 176rpx;
  background: var(--page-bg);
  transition: background-color 0.2s ease;
}

.theme-light {
  --page-bg: #f8f6f6;
  --surface: #ffffff;
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(192, 0, 0, 0.12);
  --topbar-bg: rgba(248, 246, 246, 0.9);
}

.theme-dark {
  --page-bg: #1a1315;
  --surface: rgba(26, 19, 21, 0.78);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --line: rgba(192, 0, 0, 0.24);
  --topbar-bg: rgba(26, 19, 21, 0.9);
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

  .title {
    color: var(--text-main);
    font-size: 34rpx;
    font-weight: 700;
  }

  .right {
    display: flex;
    align-items: center;
  }
}

.subject-pill {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: var(--surface);
  border: 1px solid var(--line);

  &:active { opacity: 0.7; }
}

.subject-pill-text {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-main);
}

.hero-card {
  margin-top: 12rpx;
  position: relative;
  overflow: hidden;
  border-radius: 28rpx;
  border: 1px solid var(--line);
  padding: 40rpx;
}

.hero-content {
  width: 70%;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  position: relative;
  z-index: 2;
}

.hero-title {
  font-size: 44rpx;
  line-height: 1.25;
  font-weight: 700;
  color: var(--text-main);
}

.hero-subtitle {
  font-size: 24rpx;
  color: var(--text-sub);
  line-height: 1.5;
}

.hero-button {
  margin-top: 12rpx;
  align-self: flex-start;
  padding: 16rpx 40rpx;
  border-radius: 999rpx;

  &:active { opacity: 0.85; transform: scale(0.97); }
}

.hero-button-text {
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 600;
}

.hero-icon {
  position: absolute;
  right: -20rpx;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.35;
}

.section-title-row {
  margin-top: 32rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-left {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-main);
}

.section-action {
  font-size: 24rpx;
  color: var(--text-sub);

  &:active { opacity: 0.7; }
}

.quick-scroll {
  white-space: nowrap;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;

  &.is-overflow {
    display: flex;
    gap: 16rpx;
  }
}

.quick-card {
  border-radius: 20rpx;
  border: 1px solid var(--line);
  padding: 24rpx;
  background: var(--surface);
  white-space: normal;
  min-width: 200rpx;
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:active {
    transform: scale(0.97);
  }
}

.quick-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.quick-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-title {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-main);
}

.quick-subtitle {
  font-size: 22rpx;
  color: var(--text-sub);
  line-height: 1.4;
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.state-card {
  padding: 60rpx 24rpx;
  border-radius: 20rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.state-text {
  font-size: 26rpx;
  color: var(--text-sub);
}

.empty-icon {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-btn {
  margin-top: 8rpx;
  padding: 14rpx 36rpx;
  border-radius: 999rpx;

  &:active { opacity: 0.85; }
}

.empty-btn-text {
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
}

.plan-card {
  padding: 24rpx;
  border-radius: 20rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  transition: transform 0.15s ease;

  &:active { transform: scale(0.98); }
}

.plan-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 10rpx;
}

.plan-badge {
  font-size: 20rpx;
  font-weight: 600;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;

  text {
    font-size: 20rpx;
  }
}

.status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  margin-left: 8rpx;

  &.status-draft { background: #f59e0b; }
  &.status-published { background: #10b981; }
  &.status-archived { background: #94a3b8; }
}

.plan-status {
  font-size: 20rpx;
  color: var(--text-soft);
}

.plan-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 8rpx;
}

.plan-meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.plan-meta-text {
  font-size: 22rpx;
  color: var(--text-soft);
}

.plan-meta-sep {
  font-size: 22rpx;
  color: var(--text-soft);
}
</style>
