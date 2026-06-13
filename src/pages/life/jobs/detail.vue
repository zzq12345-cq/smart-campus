<template>
  <view :class="['job-detail-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">{{ pageTitle }}</text>
      </view>
    </view>

    <view v-if="loading" class="state-card">
      <text class="state-text">{{ loadingText }}</text>
    </view>

    <view v-else-if="errorMessage" class="state-card error">
      <text class="state-text">{{ errorMessage }}</text>
      <view class="retry-btn" @tap="loadDetail">
        <text class="retry-text">{{ retryText }}</text>
      </view>
    </view>

    <view v-else-if="item" class="detail-body">
      <view class="hero-section">
        <text class="job-title">{{ item.title }}</text>
        <view class="salary-row">
          <text class="salary-label">{{ isZh ? '薪资待遇：' : 'Salary: ' }}</text>
          <text class="salary">{{ item.salary }}</text>
        </view>
        <view class="badge-row">
          <view class="category-chip">
            <text>{{ categoryLabel }}</text>
          </view>
          <view class="status-chip" :class="item.status">
            <text>{{ statusLabel }}</text>
          </view>
        </view>
      </view>

      <view class="info-card">
        <view class="info-item">
          <view class="info-icon">
            <Icon name="schedule" :size="16" color="#f49d25" />
          </view>
          <view class="info-content">
            <text class="info-label">{{ workTimeLabel }}</text>
            <text class="info-value">{{ item.workTime }}</text>
          </view>
        </view>

        <view class="info-item">
          <view class="info-icon">
            <Icon name="location_on" :size="16" color="#f49d25" />
          </view>
          <view class="info-content">
            <text class="info-label">{{ locationLabel }}</text>
            <text class="info-value">{{ item.location }}</text>
          </view>
        </view>

        <view v-if="item.requirements" class="info-item">
          <view class="info-icon">
            <Icon name="checklist" :size="16" color="#f49d25" />
          </view>
          <view class="info-content">
            <text class="info-label">{{ requirementsLabel }}</text>
            <text class="info-value">{{ item.requirements }}</text>
          </view>
        </view>

        <view class="info-item">
          <view class="info-icon">
            <Icon name="call" :size="16" color="#f49d25" />
          </view>
          <view class="info-content">
            <text class="info-label">{{ contactLabel }}</text>
            <text class="info-value">{{ item.contactInfo }}</text>
          </view>
        </view>

        <view v-if="item.deadline" class="info-item">
          <view class="info-icon">
            <Icon name="event" :size="16" color="#f49d25" />
          </view>
          <view class="info-content">
            <text class="info-label">{{ deadlineLabel }}</text>
            <text class="info-value">{{ formatDate(item.deadline) }}</text>
          </view>
        </view>
      </view>

      <view class="desc-card">
        <text class="desc-title">{{ descriptionLabel }}</text>
        <text class="desc-content">{{ item.description }}</text>
      </view>

      <view class="time-row">
        <text class="time-text">{{ formatTime(item.$createdAt) }}</text>
      </view>

      <view class="bottom-actions">
        <view
          v-if="isOwner && item.status === 'recruiting'"
          class="action-btn mark-btn"
          :class="{ disabled: updatingStatus }"
          @tap="markFilled"
        >
          <Icon name="check_circle" :size="18" color="#ffffff" />
          <text>{{ isZh ? '标记已招满' : 'Mark Filled' }}</text>
        </view>
        <view
          v-if="isOwner && item.status === 'filled'"
          class="action-btn reopen-btn"
          :class="{ disabled: updatingStatus }"
          @tap="markRecruiting"
        >
          <Icon name="refresh" :size="18" color="#b45309" />
          <text>{{ isZh ? '重新招募' : 'Reopen' }}</text>
        </view>
        <view
          v-if="isOwner"
          class="action-btn delete-btn"
          @tap="confirmDelete"
        >
          <Icon name="delete" :size="18" color="#ef4444" />
          <text>{{ isZh ? '删除' : 'Delete' }}</text>
        </view>
        <view
          v-if="!isOwner && canContact"
          class="action-btn contact-btn"
          :class="{ disabled: startingConversation }"
          @tap="contactPublisher"
        >
          <Icon name="mail" :size="18" color="#ffffff" />
          <text>{{ isZh ? '联系发布者' : 'Contact Publisher' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { Query } from 'appwrite'
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import jobListingsService from '@/services/job-listings'
import conversationsService from '@/services/conversations'
import type { JobListing } from '@/types/job-listing'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { redirectToLogin } from '@/utils/auth-guard'
import { tablesDB } from '@/utils/appwrite'
import { MINDGUARD_DATABASE_ID, USERS_TABLE_ID } from '@/utils/appwrite-shared'

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#475569' : '#cbd5e1'))

const itemId = ref('')
const item = ref<JobListing | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const authorName = ref('')
const updatingStatus = ref(false)
const startingConversation = ref(false)

const pageTitle = computed(() => (isZh.value ? '职位详情' : 'Job Detail'))
const loadingText = computed(() => (isZh.value ? '加载中...' : 'Loading...'))
const retryText = computed(() => (isZh.value ? '重试' : 'Retry'))
const workTimeLabel = computed(() => (isZh.value ? '工作时间' : 'Work Time'))
const locationLabel = computed(() => (isZh.value ? '工作地点' : 'Location'))
const requirementsLabel = computed(() => (isZh.value ? '要求' : 'Requirements'))
const contactLabel = computed(() => (isZh.value ? '联系方式' : 'Contact'))
const deadlineLabel = computed(() => (isZh.value ? '截止日期' : 'Deadline'))
const descriptionLabel = computed(() => (isZh.value ? '详细描述' : 'Description'))

const currentUserId = computed(() => String(authStore.user?.$id || authStore.dbUser?.$id || '').trim())
const isOwner = computed(() => Boolean(item.value && currentUserId.value && item.value.authorId === currentUserId.value))
const canContact = computed(() => Boolean(item.value?.authorId && currentUserId.value && item.value.authorId !== currentUserId.value))

const categoryLabel = computed(() => {
  const map: Record<string, { zh: string; en: string }> = {
    campus_job: { zh: '校内勤工', en: 'Campus Job' },
    part_time: { zh: '校外兼职', en: 'Part-time' },
    internship: { zh: '实习', en: 'Internship' },
    volunteer: { zh: '志愿者', en: 'Volunteer' }
  }
  const entry = map[item.value?.category || '']
  return entry ? (isZh.value ? entry.zh : entry.en) : ''
})

const statusLabel = computed(() => {
  const map: Record<string, { zh: string; en: string }> = {
    recruiting: { zh: '招募中', en: 'Recruiting' },
    filled: { zh: '已招满', en: 'Filled' }
  }
  const entry = map[item.value?.status || '']
  return entry ? (isZh.value ? entry.zh : entry.en) : ''
})

const formatDate = (raw?: string) => {
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatTime = (rawTime?: string) => {
  if (!rawTime) return ''
  const ts = new Date(rawTime).getTime()
  if (Number.isNaN(ts)) return rawTime
  const diffMin = Math.floor((Date.now() - ts) / 60000)
  if (diffMin < 1) return isZh.value ? '刚刚' : 'Just now'
  if (diffMin < 60) return isZh.value ? `${diffMin}分钟前` : `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return isZh.value ? `${diffH}小时前` : `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return isZh.value ? `${diffD}天前` : `${diffD}d ago`
}

const resolveAuthor = async (authorId: string) => {
  if (!authorId) return
  try {
    const result = await tablesDB.listRows(MINDGUARD_DATABASE_ID, USERS_TABLE_ID, [
      Query.equal('$id', [authorId]),
      Query.limit(1)
    ])
    const row = (result?.rows || [])[0] as Record<string, unknown> | undefined
    if (row) {
      authorName.value = String(row.name || '').trim() || authorId
    } else {
      authorName.value = isZh.value ? '校园用户' : 'Campus User'
    }
  } catch {
    authorName.value = isZh.value ? '校园用户' : 'Campus User'
  }
}

const loadDetail = async () => {
  if (!itemId.value) {
    errorMessage.value = isZh.value ? '缺少职位 ID' : 'Missing job ID'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await jobListingsService.getListing(itemId.value)
    item.value = result
    await resolveAuthor(result.authorId)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    errorMessage.value = isZh.value ? `加载失败：${msg || '请稍后重试'}` : `Failed: ${msg || 'retry later'}`
  } finally {
    loading.value = false
  }
}

const markFilled = async () => {
  if (!item.value || updatingStatus.value) return
  updatingStatus.value = true
  try {
    const updated = await jobListingsService.updateStatus(item.value.$id, 'filled')
    item.value = { ...item.value, status: updated.status || 'filled' }
    uni.showToast({ title: isZh.value ? '已标记为招满' : 'Marked as filled', icon: 'success' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    uni.showToast({ title: msg || (isZh.value ? '操作失败' : 'Failed'), icon: 'none' })
  } finally {
    updatingStatus.value = false
  }
}

const markRecruiting = async () => {
  if (!item.value || updatingStatus.value) return
  updatingStatus.value = true
  try {
    const updated = await jobListingsService.updateStatus(item.value.$id, 'recruiting')
    item.value = { ...item.value, status: updated.status || 'recruiting' }
    uni.showToast({ title: isZh.value ? '已重新招募' : 'Reopened', icon: 'success' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    uni.showToast({ title: msg || (isZh.value ? '操作失败' : 'Failed'), icon: 'none' })
  } finally {
    updatingStatus.value = false
  }
}

const confirmDelete = () => {
  uni.showModal({
    title: isZh.value ? '确认删除' : 'Confirm Delete',
    content: isZh.value ? '删除后无法恢复，确认删除？' : 'This cannot be undone. Delete?',
    success: async (res) => {
      if (!res.confirm || !item.value) return
      try {
        await jobListingsService.deleteListing(item.value.$id)
        uni.showToast({ title: isZh.value ? '已删除' : 'Deleted', icon: 'success' })
        setTimeout(() => goBack(), 300)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        uni.showToast({ title: msg || (isZh.value ? '删除失败' : 'Delete failed'), icon: 'none' })
      }
    }
  })
}

const contactPublisher = async () => {
  if (!item.value?.authorId || startingConversation.value) return
  if (!authStore.isLoggedIn) {
    uni.showToast({ title: isZh.value ? '请先登录' : 'Please login first', icon: 'none' })
    redirectToLogin()
    return
  }
  startingConversation.value = true
  try {
    const conversation = await conversationsService.findOrCreateDirectConversation(item.value.authorId)
    const title = encodeURIComponent(authorName.value || (isZh.value ? '发布者' : 'Publisher'))
    uni.navigateTo({
      url: `/pages/messages/chat?conversationId=${encodeURIComponent(conversation.$id)}&title=${title}`
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    uni.showToast({ title: msg || (isZh.value ? '发起私信失败' : 'Failed'), icon: 'none' })
  } finally {
    startingConversation.value = false
  }
}

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.navigateTo({ url: '/pages/life/jobs/index' })
  }
}

onLoad(async (query) => {
  uiPreferencesStore.initFromSystem()
  await authStore.refreshProfile()
  itemId.value = String(query?.id || '').trim()
  await loadDetail()
})
</script>

<style scoped lang="scss">
.job-detail-page {
  min-height: 100vh;
  padding: 0 0 160rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f8f7f5;
  --surface: #ffffff;
  --text-main: #1e293b;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(244, 157, 37, 0.16);
  --topbar-bg: rgba(248, 247, 245, 0.9);
}

.theme-dark {
  --page-bg: #221a10;
  --surface: rgba(30, 23, 15, 0.78);
  --text-main: #f8fafc;
  --text-sub: #d1d5db;
  --text-soft: #94a3af;
  --line: rgba(244, 157, 37, 0.3);
  --topbar-bg: rgba(34, 26, 16, 0.88);
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
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

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.hero-section {
  margin: 0 24rpx;
  padding: 28rpx 24rpx;
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: linear-gradient(130deg, rgba(244, 157, 37, 0.18), rgba(244, 157, 37, 0.06));
}

.job-title {
  color: var(--text-main);
  font-size: 36rpx;
  font-weight: 800;
  line-height: 1.3;
  display: block;
}

.salary-row {
  margin-top: 14rpx;
  display: flex;
  align-items: baseline;
}

.salary-label {
  color: var(--text-sub);
  font-size: 28rpx;
  font-weight: 600;
}

.salary {
  color: #b45309;
  font-size: 40rpx;
  font-weight: 800;
}

.badge-row {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}

.category-chip {
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(244, 157, 37, 0.16);

  text {
    color: #b45309;
    font-size: 22rpx;
    font-weight: 600;
  }
}

.status-chip {
  padding: 4rpx 16rpx;
  border-radius: 999rpx;

  text {
    font-size: 22rpx;
    font-weight: 600;
  }
}

.status-chip.recruiting {
  background: rgba(244, 157, 37, 0.14);

  text {
    color: #b45309;
  }
}

.status-chip.filled {
  background: rgba(148, 163, 184, 0.18);

  text {
    color: #64748b;
  }
}

.info-card,
.desc-card {
  margin: 0 24rpx;
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 24rpx;
}

.info-item {
  display: flex;
  gap: 14rpx;
  padding: 12rpx 0;

  & + .info-item {
    border-top: 1px solid var(--line);
  }
}

.info-icon {
  flex-shrink: 0;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(244, 157, 37, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2rpx;
}

.info-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.info-label {
  color: var(--text-soft);
  font-size: 22rpx;
  font-weight: 600;
}

.info-value {
  color: var(--text-main);
  font-size: 26rpx;
  line-height: 1.5;
}

.desc-title {
  color: var(--text-main);
  font-size: 28rpx;
  font-weight: 700;
  display: block;
  margin-bottom: 12rpx;
}

.desc-content {
  color: var(--text-sub);
  font-size: 26rpx;
  line-height: 1.7;
  white-space: pre-wrap;
  display: block;
}

.time-row {
  margin: 0 24rpx;
  padding: 0 4rpx;
}

.time-text {
  color: var(--text-soft);
  font-size: 22rpx;
}

.bottom-actions {
  margin: 8rpx 24rpx 0;
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  min-height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;

  text {
    font-size: 26rpx;
    font-weight: 700;
  }

  &:active {
    opacity: 0.8;
  }
}

.action-btn.disabled {
  opacity: 0.6;
}

.contact-btn {
  background: linear-gradient(135deg, #f49d25, #ea580c);
  box-shadow: 0 8rpx 20rpx rgba(244, 157, 37, 0.35);

  text {
    color: #ffffff;
  }
}

.mark-btn {
  background: linear-gradient(135deg, #f49d25, #ea580c);
  box-shadow: 0 8rpx 20rpx rgba(244, 157, 37, 0.3);

  text {
    color: #ffffff;
  }
}

.reopen-btn {
  background: rgba(244, 157, 37, 0.18);

  text {
    color: #b45309;
  }
}

.delete-btn {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.2);

  text {
    color: #ef4444;
  }
}

.state-card {
  margin: 60rpx 24rpx 0;
  padding: 36rpx 24rpx;
  border: 1px dashed var(--line);
  border-radius: 24rpx;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
}

.state-card.error {
  border-color: rgba(239, 68, 68, 0.3);
}

.state-text {
  color: var(--text-sub);
  font-size: 24rpx;
}

.retry-btn {
  border-radius: 999rpx;
  border: 1px solid rgba(244, 157, 37, 0.36);
  padding: 10rpx 24rpx;
  background: rgba(244, 157, 37, 0.14);
}

.retry-text {
  color: #b45309;
  font-size: 22rpx;
  font-weight: 600;
}
</style>
