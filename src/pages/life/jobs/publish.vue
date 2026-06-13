<template>
  <view :class="['job-publish-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ pageTitle }}</text>
      </view>
    </view>

    <view class="hero-card">
      <view class="hero-content">
        <text class="hero-title">{{ heroTitle }}</text>
        <text class="hero-subtitle">{{ heroSubtitle }}</text>
      </view>
      <view class="hero-icon">
        <Icon name="work" :size="100" color="rgba(244, 157, 37, 0.22)" />
      </view>
    </view>

    <view class="form-card">
      <view class="field-block">
        <text class="field-title">{{ titleLabel }} *</text>
        <input
          v-model="draftTitle"
          class="field-input"
          :placeholder="titlePlaceholder"
          maxlength="200"
        />
      </view>

      <view class="field-block">
        <text class="field-title">{{ descLabel }} *</text>
        <textarea
          v-model="draftDesc"
          class="field-textarea"
          :placeholder="descPlaceholder"
          maxlength="5000"
        />
      </view>

      <view class="field-block">
        <text class="field-title">{{ salaryLabel }} *</text>
        <input
          v-model="draftSalary"
          class="field-input"
          :placeholder="salaryPlaceholder"
          maxlength="200"
        />
      </view>

      <view class="field-block">
        <text class="field-title">{{ workTimeLabel }} *</text>
        <input
          v-model="draftWorkTime"
          class="field-input"
          :placeholder="workTimePlaceholder"
          maxlength="500"
        />
      </view>

      <view class="field-block">
        <text class="field-title">{{ locationLabel }} *</text>
        <input
          v-model="draftLocation"
          class="field-input"
          :placeholder="locationPlaceholder"
          maxlength="500"
        />
      </view>

      <view class="field-block">
        <text class="field-title">{{ contactLabel }} *</text>
        <input
          v-model="draftContact"
          class="field-input"
          :placeholder="contactPlaceholder"
          maxlength="500"
        />
      </view>

      <view class="field-block">
        <text class="field-title">{{ categoryLabel }} *</text>
        <view class="chip-row">
          <view
            v-for="opt in categoryOptions"
            :key="opt.value"
            class="chip"
            :class="{ active: draftCategory === opt.value }"
            @tap="draftCategory = opt.value"
          >
            <text>{{ opt.label }}</text>
          </view>
        </view>
      </view>

      <view class="field-block">
        <text class="field-title">{{ requirementsLabel }}</text>
        <textarea
          v-model="draftRequirements"
          class="field-textarea small"
          :placeholder="requirementsPlaceholder"
          maxlength="2000"
        />
      </view>

      <view class="field-block">
        <text class="field-title">{{ deadlineLabel }}</text>
        <picker mode="date" :value="draftDeadline" @change="onDeadlineChange">
          <view class="date-picker-input">
            <text :class="draftDeadline ? 'date-text' : 'date-placeholder'">
              {{ draftDeadline || deadlinePlaceholder }}
            </text>
            <Icon name="event" :size="16" color="#f49d25" />
          </view>
        </picker>
      </view>

      <view class="submit-row">
        <view class="submit-btn" :class="{ disabled: submitting }" @tap="handleSubmit">
          <text class="submit-text">{{ submitting ? publishingLabel : submitLabel }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import jobListingsService from '@/services/job-listings'
import type { JobCategory } from '@/types/job-listing'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { requireAuth } from '@/utils/auth-guard'

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const submitting = ref(false)
const draftTitle = ref('')
const draftDesc = ref('')
const draftSalary = ref('')
const draftWorkTime = ref('')
const draftLocation = ref('')
const draftContact = ref('')
const draftCategory = ref<JobCategory>('campus_job')
const draftRequirements = ref('')
const draftDeadline = ref('')

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#475569' : '#cbd5e1'))
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const pageTitle = computed(() => (isZh.value ? '发布职位' : 'Post a Job'))
const heroTitle = computed(() => (isZh.value ? '发布就业信息' : 'Post Job Listing'))
const heroSubtitle = computed(() => (isZh.value ? '描述清晰、信息完整，帮助同学找到合适机会' : 'Clear descriptions help students find the right opportunity'))
const titleLabel = computed(() => (isZh.value ? '职位名称' : 'Job Title'))
const titlePlaceholder = computed(() => (isZh.value ? '例如：图书馆助理、家教老师' : 'e.g. Library Assistant, Tutor'))
const descLabel = computed(() => (isZh.value ? '职位描述' : 'Description'))
const descPlaceholder = computed(() => (isZh.value ? '描述工作内容、职责等详细信息...' : 'Describe job duties, responsibilities...'))
const salaryLabel = computed(() => (isZh.value ? '薪资待遇' : 'Salary'))
const salaryPlaceholder = computed(() => (isZh.value ? '例如：50元/小时、面议、志愿（无报酬）' : 'e.g. 50 RMB/hr, Negotiable'))
const workTimeLabel = computed(() => (isZh.value ? '工作时间' : 'Work Time'))
const workTimePlaceholder = computed(() => (isZh.value ? '例如：周一至周五 9:00-17:00' : 'e.g. Mon-Fri 9:00-17:00'))
const locationLabel = computed(() => (isZh.value ? '工作地点' : 'Location'))
const locationPlaceholder = computed(() => (isZh.value ? '例如：校内图书馆、线上远程' : 'e.g. Campus Library, Remote'))
const contactLabel = computed(() => (isZh.value ? '联系方式' : 'Contact Info'))
const contactPlaceholder = computed(() => (isZh.value ? '例如：微信号 xxx / 邮箱 xxx@xxx.com' : 'e.g. WeChat: xxx / Email: xxx@xxx.com'))
const categoryLabel = computed(() => (isZh.value ? '分类' : 'Category'))
const requirementsLabel = computed(() => (isZh.value ? '要求（选填）' : 'Requirements (optional)'))
const requirementsPlaceholder = computed(() => (isZh.value ? '例如：英语四级以上、有相关经验优先' : 'e.g. CET-4 required, experience preferred'))
const deadlineLabel = computed(() => (isZh.value ? '截止日期（选填）' : 'Deadline (optional)'))
const deadlinePlaceholder = computed(() => (isZh.value ? '选择截止日期' : 'Select deadline'))
const submitLabel = computed(() => (isZh.value ? '发布职位' : 'Publish'))
const publishingLabel = computed(() => (isZh.value ? '发布中...' : 'Publishing...'))

const categoryOptions = computed(() => [
  { value: 'campus_job' as JobCategory, label: isZh.value ? '校内勤工' : 'Campus Job' },
  { value: 'part_time' as JobCategory, label: isZh.value ? '校外兼职' : 'Part-time' },
  { value: 'internship' as JobCategory, label: isZh.value ? '实习' : 'Internship' },
  { value: 'volunteer' as JobCategory, label: isZh.value ? '志愿者' : 'Volunteer' }
])

const onDeadlineChange = (e: any) => {
  draftDeadline.value = e.detail.value || ''
}

const resetDraft = () => {
  draftTitle.value = ''
  draftDesc.value = ''
  draftSalary.value = ''
  draftWorkTime.value = ''
  draftLocation.value = ''
  draftContact.value = ''
  draftCategory.value = 'campus_job'
  draftRequirements.value = ''
  draftDeadline.value = ''
}

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.navigateTo({ url: '/pages/life/jobs/index' })
  }
}

const handleSubmit = async () => {
  if (!authStore.isLoggedIn) {
    uni.showToast({ title: isZh.value ? '请先登录' : 'Please login first', icon: 'none' })
    uni.navigateTo({ url: '/pages/mine/login' })
    return
  }
  if (submitting.value) return

  const title = draftTitle.value.trim()
  if (!title) {
    uni.showToast({ title: isZh.value ? '请输入职位名称' : 'Please enter job title', icon: 'none' })
    return
  }

  const description = draftDesc.value.trim()
  if (!description) {
    uni.showToast({ title: isZh.value ? '请输入职位描述' : 'Please enter description', icon: 'none' })
    return
  }

  const salary = draftSalary.value.trim()
  if (!salary) {
    uni.showToast({ title: isZh.value ? '请输入薪资待遇' : 'Please enter salary', icon: 'none' })
    return
  }

  const workTime = draftWorkTime.value.trim()
  if (!workTime) {
    uni.showToast({ title: isZh.value ? '请输入工作时间' : 'Please enter work time', icon: 'none' })
    return
  }

  const location = draftLocation.value.trim()
  if (!location) {
    uni.showToast({ title: isZh.value ? '请输入工作地点' : 'Please enter location', icon: 'none' })
    return
  }

  const contactInfo = draftContact.value.trim()
  if (!contactInfo) {
    uni.showToast({ title: isZh.value ? '请输入联系方式' : 'Please enter contact info', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    await jobListingsService.createListing({
      title,
      description,
      salary,
      workTime,
      location,
      contactInfo,
      requirements: draftRequirements.value.trim() || undefined,
      category: draftCategory.value,
      deadline: draftDeadline.value ? new Date(draftDeadline.value).toISOString() : undefined
    })
    resetDraft()
    uni.showToast({ title: isZh.value ? '发布成功' : 'Published', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: '/pages/life/jobs/index' }), 200)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    uni.showToast({
      title: msg || (isZh.value ? '发布失败' : 'Publish failed'),
      icon: 'none'
    })
  } finally {
    submitting.value = false
  }
}

onShow(async () => {
  uiPreferencesStore.initFromSystem()
  if (!requireAuth('/pages/life/jobs/publish')) return
  await authStore.refreshProfile()
})
</script>

<style scoped lang="scss">
.job-publish-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 48rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f8f7f5;
  --surface: #ffffff;
  --line: rgba(244, 157, 37, 0.2);
  --text-main: #1e293b;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(248, 247, 245, 0.9);
}

.theme-dark {
  --page-bg: #221a10;
  --surface: rgba(30, 23, 15, 0.78);
  --line: rgba(244, 157, 37, 0.34);
  --text-main: #f8fafc;
  --text-sub: #d1d5db;
  --text-soft: #94a3af;
  --topbar-bg: rgba(34, 26, 16, 0.88);
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

.hero-card {
  margin-top: 14rpx;
  border: 1px solid var(--line);
  border-radius: 26rpx;
  background: linear-gradient(130deg, rgba(244, 157, 37, 0.22), rgba(244, 157, 37, 0.08));
  padding: 30rpx 24rpx;
  position: relative;
  overflow: hidden;
}

.hero-content {
  width: 72%;
  position: relative;
  z-index: 2;
}

.hero-title {
  color: var(--text-main);
  font-size: 36rpx;
  line-height: 1.3;
  font-weight: 700;
}

.hero-subtitle {
  margin-top: 8rpx;
  color: var(--text-sub);
  font-size: 22rpx;
  line-height: 1.5;
}

.hero-icon {
  position: absolute;
  right: -12rpx;
  bottom: -14rpx;
}

.form-card {
  margin-top: 18rpx;
  border: 1px solid var(--line);
  border-radius: 24rpx;
  background: var(--surface);
  padding: 24rpx;
}

.field-block {
  margin-top: 16rpx;

  &:first-child {
    margin-top: 0;
  }
}

.field-title {
  color: var(--text-sub);
  font-size: 23rpx;
  font-weight: 600;
}

.field-input {
  margin-top: 10rpx;
  width: 100%;
  height: 72rpx;
  border: 1px solid var(--line);
  border-radius: 16rpx;
  padding: 0 18rpx;
  color: var(--text-main);
  font-size: 26rpx;
  box-sizing: border-box;
}

.field-textarea {
  margin-top: 10rpx;
  width: 100%;
  min-height: 200rpx;
  border: 1px solid var(--line);
  border-radius: 16rpx;
  padding: 14rpx 18rpx;
  color: var(--text-main);
  font-size: 26rpx;
  box-sizing: border-box;
}

.field-textarea.small {
  min-height: 120rpx;
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
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    color: var(--text-sub);
    font-size: 22rpx;
  }
}

.chip.active {
  background: rgba(244, 157, 37, 0.18);
  border-color: rgba(244, 157, 37, 0.36);

  text {
    color: #b45309;
  }
}

.date-picker-input {
  margin-top: 10rpx;
  height: 72rpx;
  border: 1px solid var(--line);
  border-radius: 16rpx;
  padding: 0 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.date-text {
  color: var(--text-main);
  font-size: 26rpx;
}

.date-placeholder {
  color: var(--text-soft);
  font-size: 26rpx;
}

.submit-row {
  margin-top: 24rpx;
  display: flex;
  justify-content: flex-end;
}

.submit-btn {
  border-radius: 16rpx;
  background: linear-gradient(135deg, #f49d25, #ea580c);
  padding: 14rpx 36rpx;
  box-shadow: 0 8rpx 18rpx rgba(244, 157, 37, 0.3);
}

.submit-btn.disabled {
  opacity: 0.72;
  box-shadow: none;
}

.submit-text {
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
}
</style>
