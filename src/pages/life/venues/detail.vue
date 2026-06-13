<template>
  <view :class="['venue-detail-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">场地详情</text>
      </view>
    </view>

    <view v-if="!venue" class="state-card">
      <text class="state-text">加载中...</text>
    </view>

    <template v-else>
      <view v-if="venue.coverImage" class="cover-section">
        <image :src="venue.coverImage" mode="aspectFill" class="cover-img" />
      </view>

      <view class="info-card">
        <view class="info-top">
          <text class="venue-name">{{ venue.name }}</text>
          <view :class="['status-tag', venue.status]">
            <text class="status-text">{{ venue.status === 'available' ? '可预约' : '不可用' }}</text>
          </view>
        </view>

        <view class="info-row">
          <Icon name="location_on" :size="16" :color="metaColor" />
          <text class="info-text">{{ venue.location }}</text>
        </view>
        <view v-if="venue.capacity" class="info-row">
          <Icon name="people" :size="16" :color="metaColor" />
          <text class="info-text">容纳 {{ venue.capacity }} 人</text>
        </view>
        <view v-if="venue.openTime" class="info-row">
          <Icon name="schedule" :size="16" :color="metaColor" />
          <text class="info-text">开放时间：{{ venue.openTime }}</text>
        </view>
        <view v-if="venue.equipment" class="info-row">
          <Icon name="devices" :size="16" :color="metaColor" />
          <text class="info-text">{{ venue.equipment }}</text>
        </view>

        <view v-if="venue.description" class="desc-section">
          <text class="desc-label">场地介绍</text>
          <text class="desc-content">{{ venue.description }}</text>
        </view>
      </view>

      <!-- 预约表单 -->
      <view v-if="venue.status === 'available'" class="reserve-card">
        <text class="reserve-title">预约场地</text>

        <view class="field-block">
          <text class="field-label">预约日期 *</text>
          <picker mode="date" :value="reserveDate" @change="onDateChange">
            <view class="picker-display">
              <text :class="['picker-text', { placeholder: !reserveDate }]">
                {{ reserveDate || '选择日期' }}
              </text>
              <Icon name="calendar_month" :size="18" color="#f49d25" />
            </view>
          </picker>
        </view>

        <!-- 已预约时间段 -->
        <view v-if="reserveDate" class="booked-slots-section">
          <view class="booked-header">
            <Icon name="event_busy" :size="16" color="#f49d25" />
            <text class="booked-title">{{ reserveDate }} 已预约时段</text>
          </view>
          <view v-if="activeReservations.length" class="slots-list">
            <view v-for="r in activeReservations" :key="r.$id" :class="['slot-item', { mine: isMyReservation(r) }]">
              <view :class="['slot-bar', { mine: isMyReservation(r) }]" />
              <view class="slot-content">
                <text class="slot-time">{{ formatTime(r.startTime) }} - {{ formatTime(r.endTime) }}</text>
                <text class="slot-purpose">{{ r.purpose || '未填写用途' }}{{ isMyReservation(r) ? '（我的预约）' : '' }}</text>
              </view>
              <view v-if="isMyReservation(r)" class="slot-cancel" @tap="handleCancelReservation(r.$id)">
                <text>取消</text>
              </view>
            </view>
          </view>
          <view v-else class="no-slots">
            <text class="no-slots-text">该日暂无预约，可自由选择时段</text>
          </view>
        </view>

        <view class="field-block">
          <text class="field-label">时间段 *</text>
          <view class="time-range-row">
            <picker mode="time" :value="startTime" class="time-picker-half" @change="onStartChange">
              <view class="picker-display compact">
                <Icon name="play_arrow" :size="16" color="#f49d25" />
                <text :class="['picker-text', { placeholder: !startTime }]">
                  {{ startTime || '开始' }}
                </text>
              </view>
            </picker>
            <view class="time-divider"><text class="divider-text">至</text></view>
            <picker mode="time" :value="endTime" class="time-picker-half" @change="onEndChange">
              <view class="picker-display compact">
                <Icon name="stop" :size="16" color="#f49d25" />
                <text :class="['picker-text', { placeholder: !endTime }]">
                  {{ endTime || '结束' }}
                </text>
              </view>
            </picker>
          </view>
          <text v-if="conflictWarning" class="conflict-tip">{{ conflictWarning }}</text>
        </view>

        <view class="field-block">
          <text class="field-label">用途</text>
          <input
            v-model="purpose"
            class="field-input"
            placeholder="例如：社团会议、自习、排练等"
            maxlength="500"
          />
        </view>

        <view :class="['submit-btn', { disabled: submitting || !!conflictWarning }]" @tap="handleReserve">
          <text class="submit-text">{{ submitting ? '提交中...' : '提交预约' }}</text>
        </view>
      </view>

      <!-- 发布者操作 -->
      <view v-if="isAuthor" class="action-bar">
        <view class="action-btn delete" @tap="confirmDelete">
          <Icon name="delete" :size="18" color="#ef4444" />
          <text class="action-text delete-text">删除场地</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import venuesService from '@/services/venues'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { Venue, VenueReservation } from '@/types/venue'

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#475569' : '#cbd5e1'))
const metaColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#94a3b8' : '#64748b'))

const venue = ref<Venue | null>(null)
const venueId = ref('')
const reservations = ref<VenueReservation[]>([])
const submitting = ref(false)
const cancellingId = ref('')

const reserveDate = ref('')
const startTime = ref('')
const endTime = ref('')
const purpose = ref('')

const isAuthor = computed(() =>
  authStore.isLoggedIn && venue.value?.authorId === authStore.user?.$id
)

const activeReservations = computed(() =>
  reservations.value.filter(r => r.status !== 'cancelled')
)

const currentUserId = computed(() =>
  String(authStore.user?.$id || '').trim()
)

const isMyReservation = (r: VenueReservation) =>
  currentUserId.value && r.userId === currentUserId.value

const myActiveReservations = computed(() =>
  activeReservations.value.filter(r => isMyReservation(r))
)

const conflictWarning = computed(() => {
  if (!startTime.value || !endTime.value || endTime.value <= startTime.value) return ''
  for (const r of activeReservations.value) {
    const rStart = formatTime(r.startTime)
    const rEnd = formatTime(r.endTime)
    if (startTime.value < rEnd && endTime.value > rStart) {
      return `与已有预约 ${rStart}-${rEnd} 冲突，请更换时段`
    }
  }
  return ''
})

const onDateChange = (e: { detail: { value: string } }) => {
  reserveDate.value = e.detail.value
  loadReservations()
}
const onStartChange = (e: { detail: { value: string } }) => { startTime.value = e.detail.value }
const onEndChange = (e: { detail: { value: string } }) => { endTime.value = e.detail.value }

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return iso }
}

const validate = () => {
  if (!reserveDate.value) { uni.showToast({ title: '请选择预约日期', icon: 'none' }); return false }
  if (!startTime.value) { uni.showToast({ title: '请选择开始时间', icon: 'none' }); return false }
  if (!endTime.value) { uni.showToast({ title: '请选择结束时间', icon: 'none' }); return false }
  if (endTime.value <= startTime.value) { uni.showToast({ title: '结束时间须晚于开始时间', icon: 'none' }); return false }
  if (conflictWarning.value) { uni.showToast({ title: conflictWarning.value, icon: 'none' }); return false }
  return true
}

const handleReserve = async () => {
  if (submitting.value) return
  if (!authStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    uni.navigateTo({ url: '/pages/mine/login' })
    return
  }
  if (!validate()) return

  submitting.value = true
  try {
    const st = new Date(`${reserveDate.value}T${startTime.value}:00`).toISOString()
    const et = new Date(`${reserveDate.value}T${endTime.value}:00`).toISOString()

    await venuesService.createReservation({
      venueId: venueId.value,
      startTime: st,
      endTime: et,
      purpose: purpose.value.trim() || undefined
    })

    uni.showToast({ title: '预约成功', icon: 'success' })
    purpose.value = ''
    startTime.value = ''
    endTime.value = ''
    await loadReservations()
  } catch (err) {
    const msg = err instanceof Error ? err.message : '预约失败'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    submitting.value = false
  }
}

  const handleCancelReservation = async (reservationId: string) => {
    if (cancellingId.value) return
    uni.showModal({
      title: '确认取消',
      content: '确定要取消这条预约吗？',
      success: async (res) => {
        if (!res.confirm) return
        cancellingId.value = reservationId
        try {
          await venuesService.cancelReservation(reservationId)
          uni.showToast({ title: '已取消预约', icon: 'success' })
          await loadReservations()
        } catch (err) {
          const msg = err instanceof Error ? err.message : '取消失败'
          uni.showToast({ title: msg, icon: 'none' })
        } finally {
          cancellingId.value = ''
        }
      }
    })
  }

const confirmDelete = () => {
  uni.showModal({
    title: '确认删除',
    content: '删除后无法恢复，确定要删除这个场地吗？',
    confirmColor: '#ef4444',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await venuesService.deleteVenue(venueId.value)
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => {
          uni.redirectTo({ url: '/pages/life/venues/index' })
        }, 200)
      } catch {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    }
  })
}

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.navigateTo({ url: '/pages/life/venues/index' })
  }
}

const loadVenue = async (id: string) => {
  try {
    venue.value = await venuesService.getVenue(id)
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

const loadReservations = async () => {
  if (!venueId.value) return
  try {
    reservations.value = await venuesService.getReservationsForVenue(
      venueId.value,
      reserveDate.value || undefined
    )
  } catch { /* silent */ }
}

onLoad((query) => {
  if (query?.id) {
    venueId.value = query.id as string
    loadVenue(venueId.value)
    const today = new Date()
    reserveDate.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    loadReservations()
  }
})

onShow(() => {
  uiPreferencesStore.initFromSystem()
})
</script>

<style scoped lang="scss">
.venue-detail-page {
  min-height: 100vh;
  padding: 0 24rpx 100rpx;
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
  --input-bg: rgba(244, 157, 37, 0.06);
}

.theme-dark {
  --page-bg: #151c2a;
  --surface: rgba(15, 23, 42, 0.78);
  --line: rgba(244, 157, 37, 0.28);
  --text-main: #f1f5f9;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --topbar-bg: rgba(21, 28, 42, 0.92);
  --input-bg: rgba(244, 157, 37, 0.08);
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

.state-card {
  padding: 80rpx 0;
  text-align: center;
}

.state-text {
  color: var(--text-soft);
  font-size: 26rpx;
}

.cover-section {
  margin-top: 16rpx;
  height: 320rpx;
  border-radius: 22rpx;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
}

.info-card {
  margin-top: 16rpx;
  border: 1px solid var(--line);
  border-radius: 22rpx;
  background: var(--surface);
  padding: 24rpx;
}

.info-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.venue-name {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-main);
  flex: 1;
}

.status-tag {
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
  margin-left: 12rpx;
}

.status-tag.available { background: rgba(34, 197, 94, 0.16); }
.status-tag.unavailable { background: rgba(239, 68, 68, 0.16); }

.status-text {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--text-sub);
}

.info-row {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.info-text {
  font-size: 24rpx;
  color: var(--text-sub);
}

.desc-section {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1px solid var(--line);
}

.desc-label {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-sub);
  margin-bottom: 8rpx;
}

.desc-content {
  font-size: 26rpx;
  color: var(--text-main);
  line-height: 1.6;
  word-break: break-all;
}

.reserve-card {
  margin-top: 16rpx;
  border: 1px solid var(--line);
  border-radius: 22rpx;
  background: var(--surface);
  padding: 24rpx;
}

.reserve-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 16rpx;
}

.field-block {
  margin-top: 16rpx;
}

.field-block:first-of-type {
  margin-top: 0;
}

.field-label {
  color: var(--text-sub);
  font-size: 24rpx;
  font-weight: 600;
}

.picker-display {
  margin-top: 10rpx;
  height: 72rpx;
  padding: 0 18rpx;
  border-radius: 14rpx;
  background: var(--input-bg);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-text {
  color: var(--text-main);
  font-size: 26rpx;
}

.picker-text.placeholder {
  color: var(--text-soft);
}

.time-range-row {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
}

.time-picker-half { flex: 1; }

.picker-display.compact {
  margin-top: 0;
  height: 72rpx;
  padding: 0 14rpx;
  gap: 8rpx;
}

.time-divider {
  width: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.divider-text {
  color: var(--text-soft);
  font-size: 24rpx;
  font-weight: 600;
}

.field-input {
  margin-top: 10rpx;
  width: 100%;
  height: 72rpx;
  padding: 0 18rpx;
  border-radius: 14rpx;
  background: var(--input-bg);
  border: 1px solid var(--line);
  color: var(--text-main);
  font-size: 26rpx;
}

.booked-slots-section {
  margin-top: 16rpx;
  padding: 16rpx;
  border-radius: 14rpx;
  background: var(--input-bg);
  border: 1px solid var(--line);
}

.booked-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 12rpx;
}

.booked-title {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-sub);
}

.slots-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.slot-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 10rpx 12rpx;
  border-radius: 10rpx;
  background: var(--surface);
}

.slot-bar {
  width: 6rpx;
  height: 48rpx;
  border-radius: 3rpx;
  background: #ef4444;
  flex-shrink: 0;
}

.slot-content {
  flex: 1;
  min-width: 0;
}

.slot-time {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text-main);
}

.slot-purpose {
  display: block;
  font-size: 22rpx;
  color: var(--text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-slots {
  padding: 8rpx 0;
}

.no-slots-text {
  font-size: 24rpx;
  color: var(--text-soft);
}

.conflict-tip {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #ef4444;
  font-weight: 600;
}

.submit-btn {
  margin-top: 24rpx;
  height: 88rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #f49d25, #e88b15);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(244, 157, 37, 0.35);
}

.submit-btn.disabled {
  opacity: 0.72;
  box-shadow: none;
}

.submit-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
}

.slot-item.mine {
  border: 1px solid rgba(244, 157, 37, 0.3);
}

.slot-bar.mine {
  background: #f49d25;
}

.slot-cancel {
  flex-shrink: 0;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(239, 68, 68, 0.12);

  text {
    color: #ef4444;
    font-size: 20rpx;
    font-weight: 600;
  }

  &:active { opacity: 0.7; }
}


.action-bar {
  margin-top: 24rpx;
}

.action-btn {
  height: 80rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.action-btn.delete {
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.08);
}

.action-text {
  font-size: 26rpx;
  font-weight: 600;
}

.delete-text { color: #ef4444; }
</style>
