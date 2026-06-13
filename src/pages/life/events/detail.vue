<template>
  <view :class="['event-detail-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">活动详情</text>
      </view>
    </view>

    <view v-if="loading" class="state-card">
      <text class="state-text">加载中...</text>
    </view>

    <view v-else-if="!event" class="state-card">
      <text class="state-text">活动不存在</text>
    </view>

    <template v-else>
      <view class="cover-wrap">
        <image
          v-if="event.coverImage"
          class="cover-image"
          :src="event.coverImage"
          mode="aspectFill"
          lazy-load
        />
        <view v-else class="cover-gradient" />
        <view class="category-badge">
          <text>{{ categoryLabel }}</text>
        </view>
      </view>

      <view class="detail-card">
        <text class="event-title">{{ event.title }}</text>

        <view class="info-section">
          <view class="info-item">
            <Icon name="event" :size="18" color="#f49d25" />
            <text class="info-label">活动时间</text>
            <text class="info-value">{{ formattedEventDateRange }}</text>
          </view>
          <view class="info-item">
            <Icon name="pin_drop" :size="18" color="#f49d25" />
            <text class="info-label">活动地点</text>
            <text class="info-value">{{ event.location }}</text>
          </view>
          <view class="info-item">
            <Icon name="group" :size="18" color="#f49d25" />
            <text class="info-label">报名人数</text>
            <text class="info-value">{{ registrationText }}</text>
          </view>
          <view class="info-item">
            <Icon name="schedule" :size="18" color="#f49d25" />
            <text class="info-label">报名截止</text>
            <text class="info-value">{{ formattedDeadline }}</text>
          </view>
          <view v-if="event.contactInfo" class="info-item">
            <Icon name="call" :size="18" color="#f49d25" />
            <text class="info-label">联系方式</text>
            <text class="info-value">{{ event.contactInfo }}</text>
          </view>
        </view>

        <view class="desc-section">
          <text class="desc-title">活动详情</text>
          <text class="desc-content">{{ event.description }}</text>
        </view>
      </view>

      <view v-if="isAuthor" class="registrations-card">
        <view class="reg-header">
          <text class="reg-title">报名列表 ({{ registrations.length }})</text>
          <view class="refresh-btn" @tap="loadRegistrations">
            <Icon name="refresh" :size="16" color="#f49d25" />
          </view>
        </view>
        <view v-if="!registrations.length" class="reg-empty">
          <text class="state-text">暂无报名</text>
        </view>
        <view v-for="reg in registrations" :key="reg.$id" class="reg-item">
          <Icon name="person" :size="16" color="#94a3b8" />
          <text class="reg-user">{{ reg.userId }}</text>
          <text class="reg-time">{{ formatRegTime(reg.$createdAt) }}</text>
        </view>
      </view>

      <view class="action-bar">
        <template v-if="isAuthor">
          <view class="action-btn delete" @tap="confirmDelete">
            <Icon name="delete" :size="18" color="#ef4444" />
            <text>删除活动</text>
          </view>
        </template>
        <template v-else>
          <view v-if="isRegistered" class="action-btn cancel" @tap="handleCancel">
            <text>{{ cancelling ? '取消中...' : '取消报名' }}</text>
          </view>
          <view
            v-else
            :class="['action-btn', 'register', { disabled: !canRegister }]"
            @tap="handleRegister"
          >
            <text>{{ registerButtonText }}</text>
          </view>
        </template>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import eventsService from '@/services/events'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { CampusEvent, EventCategory, EventRegistration } from '@/types/event'

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#475569' : '#cbd5e1'))

const loading = ref(true)
const registering = ref(false)
const cancelling = ref(false)
const event = ref<CampusEvent | null>(null)
const isRegistered = ref(false)
const registrations = ref<EventRegistration[]>([])

const CATEGORY_LABELS: Record<EventCategory, string> = {
  competition: '竞赛', lecture: '讲座', club: '社团',
  entertainment: '文娱', other: '其他'
}

const categoryLabel = computed(() => event.value ? (CATEGORY_LABELS[event.value.category] || '其他') : '')

const isAuthor = computed(() => {
  if (!event.value || !authStore.user) return false
  return event.value.authorId === authStore.user.$id
})

const formattedEventDateRange = computed(() => {
  if (!event.value) return ''
  const start = formatDateTime(event.value.eventDate)
  if (!event.value.eventEndDate) return start
  const end = formatDateTime(event.value.eventEndDate)
  const startDate = start.split(' ')[0]
  const endDate = end.split(' ')[0]
  if (startDate === endDate) {
    return `${start} ~ ${end.split(' ')[1]}`
  }
  return `${start} ~ ${end}`
})
const formattedDeadline = computed(() => formatDateTime(event.value?.registrationDeadline))

const registrationText = computed(() => {
  if (!event.value) return ''
  const count = event.value.registrationCount || 0
  if (event.value.capacity > 0) return `${count}/${event.value.capacity} 人`
  return `${count} 人已报名`
})

const isDeadlinePassed = computed(() => {
  if (!event.value) return true
  try {
    return new Date(event.value.registrationDeadline).getTime() < Date.now()
  } catch { return true }
})

const isFull = computed(() => {
  if (!event.value) return false
  return event.value.capacity > 0 && event.value.registrationCount >= event.value.capacity
})

const canRegister = computed(() => {
  if (!event.value) return false
  if (event.value.status !== 'upcoming' && event.value.status !== 'ongoing') return false
  if (isDeadlinePassed.value) return false
  if (isFull.value) return false
  return true
})

const registerButtonText = computed(() => {
  if (registering.value) return '报名中...'
  if (isDeadlinePassed.value) return '已截止'
  if (isFull.value) return '已满'
  if (event.value?.status === 'ended' || event.value?.status === 'cancelled') return '活动已结束'
  return '立即报名'
})

function formatDateTime(val?: string) {
  if (!val) return ''
  try {
    const d = new Date(val)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return val }
}

function formatRegTime(val: string) {
  try {
    const d = new Date(val)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return val }
}

const loadEvent = async (id: string) => {
  loading.value = true
  try {
    event.value = await eventsService.getEvent(id)
    if (authStore.isLoggedIn) {
      isRegistered.value = await eventsService.isUserRegistered(id)
      if (isAuthor.value) {
        await loadRegistrations()
      }
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const loadRegistrations = async () => {
  if (!event.value) return
  try {
    registrations.value = await eventsService.getEventRegistrations(event.value.$id)
  } catch { /* ignore */ }
}

const handleRegister = async () => {
  if (!canRegister.value || registering.value) return
  if (!authStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    uni.navigateTo({ url: '/pages/mine/login' })
    return
  }
  registering.value = true
  try {
    await eventsService.registerForEvent(event.value!.$id)
    isRegistered.value = true
    event.value!.registrationCount = (event.value!.registrationCount || 0) + 1
    uni.showToast({ title: '报名成功', icon: 'success' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '报名失败'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    registering.value = false
  }
}

const handleCancel = async () => {
  if (cancelling.value) return
  cancelling.value = true
  try {
    await eventsService.cancelRegistration(event.value!.$id)
    isRegistered.value = false
    event.value!.registrationCount = Math.max(0, (event.value!.registrationCount || 0) - 1)
    uni.showToast({ title: '已取消报名', icon: 'success' })
  } catch {
    uni.showToast({ title: '取消失败', icon: 'none' })
  } finally {
    cancelling.value = false
  }
}

const confirmDelete = () => {
  uni.showModal({
    title: '确认删除',
    content: '删除后无法恢复，确认删除该活动？',
    success: async (res) => {
      if (!res.confirm || !event.value) return
      try {
        await eventsService.deleteEvent(event.value.$id)
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => goBack(), 300)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        uni.showToast({ title: msg || '删除失败', icon: 'none' })
      }
    }
  })
}

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.navigateTo({ url: '/pages/life/events/index' })
  }
}

onLoad((query) => {
  uiPreferencesStore.initFromSystem()
  const id = (query as { id?: string })?.id
  if (id) loadEvent(id)
})
</script>

<style scoped lang="scss">
.event-detail-page {
  min-height: 100vh;
  padding-bottom: 140rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f6f6f8;
  --surface: #ffffff;
  --line: rgba(244, 157, 37, 0.18);
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(246, 246, 248, 0.92);
}

.theme-dark {
  --page-bg: #151c2a;
  --surface: rgba(15, 23, 42, 0.78);
  --line: rgba(244, 157, 37, 0.28);
  --text-main: #f1f5f9;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(21, 28, 42, 0.92);
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 88rpx;
  display: flex;
  align-items: center;
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

.state-card {
  padding: 80rpx 24rpx;
  text-align: center;
}

.state-text {
  color: var(--text-soft);
  font-size: 26rpx;
}

.cover-wrap {
  position: relative;
  height: 360rpx;
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
}

.cover-gradient {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f49d25 0%, #f6c97a 50%, #fde8c4 100%);
}

.category-badge {
  position: absolute;
  top: 20rpx;
  left: 24rpx;
  background: rgba(244, 157, 37, 0.9);
  border-radius: 12rpx;
  padding: 6rpx 18rpx;

  text {
    color: #fff;
    font-size: 22rpx;
    font-weight: 600;
  }
}

.detail-card {
  margin: -30rpx 24rpx 0;
  position: relative;
  z-index: 2;
  background: var(--surface);
  border-radius: 24rpx;
  border: 1px solid var(--line);
  padding: 28rpx 24rpx;
}

.event-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.4;
}

.info-section {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.info-label {
  font-size: 24rpx;
  color: var(--text-soft);
  min-width: 120rpx;
}

.info-value {
  font-size: 24rpx;
  color: var(--text-main);
  font-weight: 500;
}

.desc-section {
  margin-top: 28rpx;
  padding-top: 20rpx;
  border-top: 1px solid var(--line);
}

.desc-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.desc-content {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: var(--text-sub);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
}

.registrations-card {
  margin: 20rpx 24rpx 0;
  background: var(--surface);
  border-radius: 20rpx;
  border: 1px solid var(--line);
  padding: 22rpx 24rpx;
}

.reg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reg-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.refresh-btn {
  padding: 8rpx;
}

.reg-empty {
  padding: 24rpx 0;
  text-align: center;
}

.reg-item {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 14rpx 0;
  border-bottom: 1px solid var(--line);
}

.reg-item:last-child {
  border-bottom: none;
}

.reg-user {
  flex: 1;
  font-size: 24rpx;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reg-time {
  font-size: 22rpx;
  color: var(--text-soft);
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 32rpx 32rpx;
  background: var(--topbar-bg);
  backdrop-filter: blur(14px);
  z-index: 30;
}

.action-btn {
  height: 88rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 30rpx;
    font-weight: 700;
  }
}

.action-btn.register {
  background: linear-gradient(135deg, #f49d25, #e88b15);
  box-shadow: 0 8rpx 24rpx rgba(244, 157, 37, 0.35);

  text { color: #fff; }
}

.action-btn.register.disabled {
  opacity: 0.5;
  box-shadow: none;
}

.action-btn.cancel {
  background: var(--surface);
  border: 2px solid rgba(244, 157, 37, 0.4);

  text { color: #f49d25; }
}

.action-btn.delete {
  background: rgba(239, 68, 68, 0.1);
  border: 2px solid rgba(239, 68, 68, 0.3);
  gap: 8rpx;

  text { color: #ef4444; }
}
</style>
