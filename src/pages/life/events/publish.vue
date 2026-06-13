<template>
  <view :class="['event-publish-page', themeClass]">
    <view class="top-bar">
      <view class="left" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
        <text class="title">发布活动</text>
      </view>
    </view>

    <view class="hero-card">
      <view class="hero-content">
        <text class="hero-title">发起一场校园活动</text>
        <text class="hero-subtitle">竞赛、讲座、社团……让更多人参与进来</text>
      </view>
      <view class="hero-icon">
        <Icon name="celebration" :size="120" color="rgba(244, 157, 37, 0.22)" />
      </view>
    </view>

    <view class="form-card">
      <view class="field-block">
        <text class="field-title">活动标题 *</text>
        <input
          v-model="form.title"
          class="field-input"
          placeholder="请输入活动名称"
          maxlength="200"
        />
      </view>

      <view class="field-block">
        <text class="field-title">活动描述 *</text>
        <textarea
          v-model="form.description"
          class="field-textarea"
          placeholder="详细描述活动内容、要求、流程、报名方式等"
          maxlength="5000"
        />
      </view>

      <view class="field-block">
        <text class="field-title">活动地点 *</text>
        <input
          v-model="form.location"
          class="field-input"
          placeholder="例如：图书馆 B 区 301"
          maxlength="500"
        />
      </view>

      <view class="field-block">
        <text class="field-title">活动时间 *</text>
        <picker mode="date" :value="eventDateStr" @change="onEventDateChange">
          <view class="picker-display">
            <text :class="['picker-text', { placeholder: !eventDateStr }]">
              {{ eventDateStr || '选择活动日期' }}
            </text>
            <Icon name="calendar_month" :size="18" color="#f49d25" />
          </view>
        </picker>
        <view class="time-range-row">
          <picker mode="time" :value="eventStartTimeStr" class="time-picker-half" @change="onEventStartTimeChange">
            <view class="picker-display compact">
              <Icon name="play_arrow" :size="16" color="#f49d25" />
              <text :class="['picker-text', { placeholder: !eventStartTimeStr }]">
                {{ eventStartTimeStr || '开始时间' }}
              </text>
            </view>
          </picker>
          <view class="time-range-divider">
            <text class="divider-text">至</text>
          </view>
          <picker mode="time" :value="eventEndTimeStr" class="time-picker-half" @change="onEventEndTimeChange">
            <view class="picker-display compact">
              <Icon name="stop" :size="16" color="#f49d25" />
              <text :class="['picker-text', { placeholder: !eventEndTimeStr }]">
                {{ eventEndTimeStr || '结束时间' }}
              </text>
            </view>
          </picker>
        </view>
      </view>

      <view class="field-block">
        <text class="field-title">报名截止时间 *</text>
        <picker mode="date" :value="deadlineDateStr" @change="onDeadlineDateChange">
          <view class="picker-display">
            <text :class="['picker-text', { placeholder: !deadlineDateStr }]">
              {{ deadlineDateStr || '选择截止日期' }}
            </text>
            <Icon name="calendar_month" :size="18" color="#f49d25" />
          </view>
        </picker>
        <picker mode="time" :value="deadlineTimeStr" @change="onDeadlineTimeChange">
          <view class="picker-display" style="margin-top: 12rpx;">
            <text :class="['picker-text', { placeholder: !deadlineTimeStr }]">
              {{ deadlineTimeStr || '选择截止时间' }}
            </text>
            <Icon name="schedule" :size="18" color="#f49d25" />
          </view>
        </picker>
      </view>

      <view class="field-block">
        <text class="field-title">人数上限</text>
        <input
          v-model="capacityStr"
          class="field-input"
          type="number"
          placeholder="0 表示不限人数"
        />
      </view>

      <view class="field-block">
        <text class="field-title">活动分类 *</text>
        <view class="chip-row">
          <view
            v-for="cat in categoryOptions"
            :key="cat.value"
            :class="['chip', { active: form.category === cat.value }]"
            @tap="form.category = cat.value"
          >
            <text>{{ cat.label }}</text>
          </view>
        </view>
      </view>

      <view class="field-block">
        <view class="field-head">
          <text class="field-title">封面图片</text>
          <text class="field-tip">可选</text>
        </view>
        <view class="cover-upload">
          <view v-if="coverPreview" class="cover-preview" @tap="chooseCover">
            <image class="cover-img" :src="coverPreview" mode="aspectFill" />
            <view class="cover-remove" @tap.stop="removeCover">
              <Icon name="close" :size="14" color="#fff" />
            </view>
          </view>
          <view v-else class="cover-add" @tap="chooseCover">
            <Icon name="add_photo_alternate" :size="26" color="#f49d25" />
            <text class="cover-add-text">添加封面</text>
          </view>
        </view>
      </view>

      <view class="field-block">
        <text class="field-title">联系方式</text>
        <input
          v-model="form.contactInfo"
          class="field-input"
          placeholder="手机号/微信/QQ（可选）"
          maxlength="500"
        />
      </view>

      <view class="submit-row">
        <view :class="['submit-btn', { disabled: submitting }]" @tap="handleSubmit">
          <text class="submit-text">{{ submitting ? '发布中...' : '发布活动' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import eventsService from '@/services/events'
import { uploadPostImage } from '@/services/storage'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import type { EventCategory } from '@/types/event'
import { requireAuth } from '@/utils/auth-guard'

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#475569' : '#cbd5e1'))

const submitting = ref(false)
const coverPreview = ref('')
const coverFile = ref<File | undefined>()

const form = reactive({
  title: '',
  description: '',
  location: '',
  category: 'other' as EventCategory,
  contactInfo: ''
})

const eventDateStr = ref('')
const eventStartTimeStr = ref('')
const eventEndTimeStr = ref('')
const deadlineDateStr = ref('')
const deadlineTimeStr = ref('')
const capacityStr = ref('0')

const categoryOptions: { value: EventCategory; label: string }[] = [
  { value: 'competition', label: '竞赛' },
  { value: 'lecture', label: '讲座' },
  { value: 'club', label: '社团' },
  { value: 'entertainment', label: '文娱' },
  { value: 'other', label: '其他' }
]

const onEventDateChange = (e: { detail: { value: string } }) => { eventDateStr.value = e.detail.value }
const onEventStartTimeChange = (e: { detail: { value: string } }) => { eventStartTimeStr.value = e.detail.value }
const onEventEndTimeChange = (e: { detail: { value: string } }) => { eventEndTimeStr.value = e.detail.value }
const onDeadlineDateChange = (e: { detail: { value: string } }) => { deadlineDateStr.value = e.detail.value }
const onDeadlineTimeChange = (e: { detail: { value: string } }) => { deadlineTimeStr.value = e.detail.value }

const buildISODate = (dateStr: string, timeStr: string) => {
  const time = timeStr || '00:00'
  return new Date(`${dateStr}T${time}:00`).toISOString()
}

const chooseCover = async () => {
  if (submitting.value) return
  try {
    const result = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: reject
      })
    })
    const tempFiles = Array.isArray(result.tempFiles) ? result.tempFiles : []
    const first = tempFiles[0] as { path?: string; tempFilePath?: string; file?: File } | undefined
    const path = first?.path || first?.tempFilePath || (result.tempFilePaths?.[0] ?? '')
    if (path) {
      coverPreview.value = path
      coverFile.value = typeof File !== 'undefined' && first?.file instanceof File ? first.file : undefined
    }
  } catch { /* cancelled */ }
}

const removeCover = () => {
  coverPreview.value = ''
  coverFile.value = undefined
}

const validate = () => {
  if (!form.title.trim()) { uni.showToast({ title: '请输入活动标题', icon: 'none' }); return false }
  if (!form.description.trim()) { uni.showToast({ title: '请输入活动描述', icon: 'none' }); return false }
  if (!form.location.trim()) { uni.showToast({ title: '请输入活动地点', icon: 'none' }); return false }
  if (!eventDateStr.value) { uni.showToast({ title: '请选择活动日期', icon: 'none' }); return false }
  if (!eventStartTimeStr.value) { uni.showToast({ title: '请选择开始时间', icon: 'none' }); return false }
  if (eventEndTimeStr.value && eventEndTimeStr.value <= eventStartTimeStr.value) {
    uni.showToast({ title: '结束时间须晚于开始时间', icon: 'none' }); return false
  }
  if (!deadlineDateStr.value) { uni.showToast({ title: '请选择报名截止日期', icon: 'none' }); return false }
  return true
}

const handleSubmit = async () => {
  if (submitting.value) return
  if (!authStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    uni.navigateTo({ url: '/pages/mine/login' })
    return
  }
  if (!validate()) return

  submitting.value = true
  try {
    let coverUrl = ''
    if (coverPreview.value) {
      try {
        coverUrl = await uploadPostImage({ localPath: coverPreview.value, file: coverFile.value })
      } catch {
        // cover upload is optional, proceed without it
      }
    }

    const eventEndDate = eventEndTimeStr.value
      ? buildISODate(eventDateStr.value, eventEndTimeStr.value)
      : undefined

    await eventsService.createEvent({
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      eventDate: buildISODate(eventDateStr.value, eventStartTimeStr.value),
      eventEndDate,
      registrationDeadline: buildISODate(deadlineDateStr.value, deadlineTimeStr.value),
      capacity: Math.max(0, parseInt(capacityStr.value, 10) || 0),
      category: form.category,
      coverImage: coverUrl || undefined,
      contactInfo: form.contactInfo.trim() || undefined
    })

    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/life/events/index' })
    }, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '发布失败'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    submitting.value = false
  }
}

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.navigateTo({ url: '/pages/life/events/index' })
  }
}

onShow(() => {
  uiPreferencesStore.initFromSystem()
  requireAuth('/pages/life/events/publish')
})
</script>

<style scoped lang="scss">
.event-publish-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 48rpx;
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
  margin-top: 20rpx;
}

.field-block:first-child {
  margin-top: 0;
}

.field-title {
  color: var(--text-sub);
  font-size: 24rpx;
  font-weight: 600;
}

.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-tip {
  color: var(--text-soft);
  font-size: 20rpx;
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

.field-textarea {
  margin-top: 10rpx;
  width: 100%;
  min-height: 200rpx;
  padding: 14rpx 18rpx;
  border-radius: 14rpx;
  background: var(--input-bg);
  border: 1px solid var(--line);
  color: var(--text-main);
  font-size: 26rpx;
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
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 0;
}

.time-picker-half {
  flex: 1;
}

.picker-display.compact {
  margin-top: 0;
  height: 72rpx;
  padding: 0 14rpx;
  gap: 8rpx;
}

.time-range-divider {
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

.chip-row {
  margin-top: 10rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.chip {
  min-height: 56rpx;
  border: 1px solid var(--line);
  border-radius: 999rpx;
  padding: 0 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    color: var(--text-sub);
    font-size: 24rpx;
  }
}

.chip.active {
  background: rgba(244, 157, 37, 0.18);
  border-color: rgba(244, 157, 37, 0.45);

  text { color: #d48620; }
}

.cover-upload {
  margin-top: 10rpx;
}

.cover-preview {
  position: relative;
  width: 240rpx;
  height: 160rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
}

.cover-remove {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.58);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-add {
  width: 240rpx;
  height: 160rpx;
  border-radius: 16rpx;
  border: 1px dashed rgba(244, 157, 37, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.cover-add-text {
  color: #d48620;
  font-size: 22rpx;
  font-weight: 600;
}

.submit-row {
  margin-top: 30rpx;
}

.submit-btn {
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
</style>
