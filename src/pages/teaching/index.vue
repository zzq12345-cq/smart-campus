<template>
  <view :class="['teaching-page', themeClass]">
    <view class="top-bar">
      <view class="left">
        <Icon name="menu_book" :size="22" color="#e14d2a" />
        <text class="title">{{ pageData.headerTitle }}</text>
      </view>
      <view class="right">
        <view class="subject-pill" @tap="goSubjectSelect">
          <text class="subject-pill-text">{{ subjectLabel }}</text>
          <Icon name="expand_more" :size="14" color="#e14d2a" />
        </view>
      </view>
    </view>

    <!-- Banner 卡片 -->
    <view class="hero-card">
      <view class="hero-content">
        <view class="hero-title-wrap">
          <text class="hero-title-main">{{ isZh ? '智慧备课，' : 'Smart prep, ' }}</text>
          <text class="hero-title-highlight">{{ isZh ? '高效教学' : 'efficient teaching' }}</text>
        </view>
        <text class="hero-subtitle">{{ pageData.heroSubtitle }}</text>
        <view class="hero-button" @tap="goPreparation">
          <text class="hero-button-text">{{ pageData.heroAction }}</text>
          <view class="hero-btn-arrow">
            <Icon name="chevron_right" :size="14" color="#e14d2a" />
          </view>
        </view>
      </view>
    </view>

    <!-- 教学工具 -->
    <view class="section-title-row">
      <view class="section-left">
        <Icon name="widgets" :size="18" color="#e14d2a" />
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
            <view class="quick-icon">
              <Icon :name="item.icon" :size="20" color="#e14d2a" />
            </view>
            <text class="quick-title">{{ item.title }}</text>
          </view>
          <text class="quick-subtitle">{{ item.subtitle }}</text>
          <!-- 卡片右下角小箭头 -->
          <view class="quick-card-arrow">
            <Icon name="chevron_right" :size="12" color="#e14d2a" />
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 最近教案 -->
    <view class="section-title-row">
      <view class="section-left">
        <Icon name="history" :size="18" color="#e14d2a" />
        <text class="section-title">{{ pageData.recentTitle }}</text>
      </view>
      <view class="section-action-wrap" @tap="goLessonPlans">
        <text class="section-action">{{ isZh ? '查看全部' : 'View All' }}</text>
        <Icon name="chevron_right" :size="14" color="#94a3b8" />
      </view>
    </view>

    <view class="feed-list">
      <view v-if="loadingPlans && !recentPlans.length" class="state-card">
        <text class="state-text">{{ isZh ? '加载中...' : 'Loading...' }}</text>
      </view>

      <view v-else-if="!recentPlans.length" class="state-card">
        <view class="empty-icon-wrap">
          <!-- 橙红色大加号文件 -->
          <Icon name="post_add" :size="60" color="#e14d2a" />
        </view>
        <text class="state-text">{{ isZh ? '还没有教案，开始创建吧' : 'No plans yet' }}</text>
        <view class="empty-btn" @tap="goPreparation">
          <text class="empty-btn-text">{{ isZh ? 'AI智能备课' : 'AI Preparation' }}</text>
        </view>
      </view>

      <view v-for="plan in recentPlans" :key="plan.$id" class="plan-card" @tap="goEditPlan(plan.$id)">
        <view class="plan-head">
          <view class="plan-badge">
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
  if (authStore.isLoggedIn && !authStore.isTeacher) {
    uni.reLaunch({ url: '/pages/study/index' })
    return
  }
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
  padding: 16rpx 28rpx 176rpx;
  background: var(--page-bg);
  transition: background-color 0.2s ease;
}

.theme-light {
  --page-bg: linear-gradient(180deg, #fff8f6 0%, #ffffff 100%);
  --surface: #ffffff;
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(225, 77, 42, 0.08);
  --topbar-bg: rgba(255, 248, 246, 0.95);
  --accent: #e14d2a;
  --accent-soft: rgba(225, 77, 42, 0.08);
  --card-shadow: 0 8rpx 24rpx rgba(225, 77, 42, 0.04), 0 2rpx 8rpx rgba(0, 0, 0, 0.01);
}

.theme-dark {
  --page-bg: linear-gradient(180deg, #1f1412 0%, #150f0e 100%);
  --surface: #1e1513;
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #64748b;
  --line: rgba(225, 77, 42, 0.16);
  --topbar-bg: rgba(31, 20, 18, 0.95);
  --accent: #ff6e4e;
  --accent-soft: rgba(255, 110, 78, 0.12);
  --card-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.16);
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  backdrop-filter: blur(16px);
  background: var(--topbar-bg);
  border-bottom: 1px solid rgba(225, 77, 42, 0.04);
  margin-bottom: 12rpx;

  .left {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  .title {
    color: var(--text-main);
    font-size: 36rpx;
    font-weight: 800;
  }

  .right {
    display: flex;
    align-items: center;
  }
}

.subject-pill {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: 0 2rpx 8rpx rgba(225, 77, 42, 0.03);

  &:active {
    opacity: 0.8;
  }
}

.subject-pill-text {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-main);
}

.hero-card {
  position: relative;
  z-index: 1;
  height: 272rpx;
  border-radius: 36rpx;
  padding: 32rpx 32rpx 32rpx 36rpx;
  margin-bottom: 24rpx;
  background-image: url('/static/teaching_banner_full.png');
  background-size: cover;
  background-position: right center;
  background-repeat: no-repeat;
  box-shadow: 0 8rpx 28rpx rgba(225, 77, 42, 0.08);
  border: 1px solid var(--line);
  overflow: hidden;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.98);
  }
}

.hero-content {
  width: 52%;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 2;
}

.hero-title-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4rpx;
  margin-bottom: 8rpx;
}

.hero-title-main {
  font-size: 38rpx;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.2;
}

.hero-title-highlight {
  font-size: 38rpx;
  font-weight: 800;
  color: var(--accent);
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 20rpx;
  color: var(--text-sub);
  line-height: 1.4;
  margin-bottom: 18rpx;
  font-weight: 500;
  white-space: nowrap;
}

.hero-button {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 24rpx 10rpx 30rpx;
  background: var(--accent);
  border-radius: 999rpx;
  align-self: flex-start;
  box-shadow: 0 6rpx 16rpx rgba(225, 77, 42, 0.2);
  transition: all 0.2s ease;
  height: 52rpx;
  box-sizing: border-box;

  &:active {
    transform: scale(0.96);
    opacity: 0.9;
  }
}

.hero-button-text {
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1;
}

.hero-btn-arrow {
  width: 30rpx;
  height: 30rpx;
  border-radius: 50%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-title-row {
  margin-top: 44rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--text-main);
}

.section-action-wrap {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 8rpx;

  &:active {
    opacity: 0.7;
  }
}

.section-action {
  font-size: 24rpx;
  color: var(--text-sub);
  font-weight: 500;
}

.quick-scroll {
  white-space: nowrap;
  width: 100%;
}

.quick-grid {
  display: flex;
  gap: 20rpx;
  padding: 4rpx 4rpx 20rpx 4rpx;
}

.quick-card {
  position: relative;
  flex-shrink: 0;
  width: 220rpx;
  background: var(--surface);
  border-radius: 28rpx;
  padding: 32rpx 24rpx 36rpx;
  box-shadow: var(--card-shadow);
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  box-sizing: border-box;
  transition: all 0.2s ease;

  &:active {
    transform: translateY(2rpx);
    box-shadow: 0 4rpx 12rpx rgba(225, 77, 42, 0.02);
  }
}

.quick-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 10rpx;
  width: 100%;
}

.quick-icon {
  width: 76rpx;
  height: 76rpx;
  border-radius: 20rpx;
  background: var(--accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.quick-subtitle {
  font-size: 22rpx;
  color: var(--text-sub);
  line-height: 1.4;
  white-space: normal;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin-bottom: 12rpx;
  min-height: 62rpx;
}

.quick-card-arrow {
  position: absolute;
  right: 16rpx;
  bottom: 16rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(225, 77, 42, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.quick-card:active .quick-card-arrow {
  background: rgba(225, 77, 42, 0.12);
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.state-card {
  padding: 80rpx 40rpx;
  border-radius: 32rpx;
  background: var(--surface);
  box-shadow: var(--card-shadow);
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.empty-icon-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: var(--accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}

.state-text {
  font-size: 28rpx;
  color: var(--text-sub);
  font-weight: 500;
}

.empty-btn {
  margin-top: 12rpx;
  padding: 20rpx 64rpx;
  background: var(--accent);
  border-radius: 999rpx;
  box-shadow: 0 8rpx 20rpx rgba(225, 77, 42, 0.25);
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.96);
    opacity: 0.9;
  }
}

.empty-btn-text {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
  letter-spacing: 1rpx;
}

.plan-card {
  padding: 32rpx;
  border-radius: 28rpx;
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: var(--card-shadow);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  transition: all 0.2s ease;

  &:active {
    transform: translateY(2rpx);
    box-shadow: 0 4rpx 12rpx rgba(225, 77, 42, 0.02);
  }
}

.plan-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.plan-badge {
  font-size: 20rpx;
  font-weight: 700;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  background: var(--accent-soft);
  color: var(--accent);

  text {
    font-size: 20rpx;
  }
}

.status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;

  &.status-draft { background: #f59e0b; }
  &.status-published { background: #10b981; }
  &.status-archived { background: #94a3b8; }
}

.plan-status {
  font-size: 22rpx;
  color: var(--text-soft);
  font-weight: 500;
}

.plan-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.4;
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
