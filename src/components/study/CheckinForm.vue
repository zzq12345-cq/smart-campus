<template>
  <view v-if="visible" class="checkin-overlay" @tap="handleClose">
    <view class="checkin-form" @tap.stop>
      <view class="form-header">
        <text class="form-title">{{ isZh ? '学习打卡' : 'Study Check-in' }}</text>
        <view class="close-btn" @tap="handleClose">
          <Icon name="close" :size="18" :color="iconColor" />
        </view>
      </view>

      <view class="form-section">
        <text class="form-label">{{ isZh ? '打卡类型' : 'Type' }}</text>
        <scroll-view class="type-scroll" scroll-x show-scrollbar="false">
          <view class="type-chips">
            <view
              v-for="item in typeOptions"
              :key="item.value"
              :class="['type-chip', { active: formData.checkinType === item.value }]"
              @tap="formData.checkinType = item.value"
            >
              <text>{{ item.label }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="form-section">
        <text class="form-label">{{ isZh ? '学习内容' : 'Content' }}</text>
        <textarea
          v-model="formData.content"
          class="content-input"
          :placeholder="isZh ? '记录今天的学习内容...' : 'What did you learn today...'"
          :maxlength="2000"
          :auto-height="true"
          :style="{ minHeight: '160rpx' }"
        />
      </view>

      <view class="form-section">
        <text class="form-label">{{ isZh ? '学习时长 (分钟)' : 'Duration (minutes)' }}</text>
        <view class="duration-row">
          <view class="duration-btn" @tap="adjustDuration(-15)">
            <text>-15</text>
          </view>
          <input
            v-model="durationText"
            class="duration-input"
            type="number"
            :placeholder="'0'"
            @blur="onDurationBlur"
          />
          <view class="duration-btn" @tap="adjustDuration(15)">
            <text>+15</text>
          </view>
        </view>
      </view>

      <view class="form-actions">
        <view class="cancel-btn" @tap="handleClose">
          <text>{{ isZh ? '取消' : 'Cancel' }}</text>
        </view>
        <view class="submit-btn" :class="{ disabled: !canSubmit }" @tap="handleSubmit">
          <text>{{ isZh ? '提交打卡' : 'Submit' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { StudyCheckinType } from '@/types/study-checkin'
import { useUiPreferencesStore } from '@/stores/ui-preferences'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', data: { checkinType: StudyCheckinType; content: string; duration: number }): void
}>()

const uiPreferencesStore = useUiPreferencesStore()
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#4b5563' : '#cbd5e1'))

const typeOptions = computed(() => [
  { value: 'self_study' as StudyCheckinType, label: isZh.value ? '自习' : 'Self Study' },
  { value: 'vocabulary' as StudyCheckinType, label: isZh.value ? '背单词' : 'Vocabulary' },
  { value: 'exercises' as StudyCheckinType, label: isZh.value ? '刷题' : 'Exercises' },
  { value: 'review' as StudyCheckinType, label: isZh.value ? '复习' : 'Review' },
  { value: 'other' as StudyCheckinType, label: isZh.value ? '其他' : 'Other' }
])

const formData = reactive({
  checkinType: 'self_study' as StudyCheckinType,
  content: '',
  duration: 30
})
const durationText = ref('30')

watch(
  () => props.visible,
  (val) => {
    if (val) {
      formData.checkinType = 'self_study'
      formData.content = ''
      formData.duration = 30
      durationText.value = '30'
    }
  }
)

const canSubmit = computed(() => formData.content.trim().length > 0 && formData.duration > 0)

function adjustDuration(delta: number) {
  formData.duration = Math.max(0, formData.duration + delta)
  durationText.value = String(formData.duration)
}

function onDurationBlur() {
  const val = parseInt(durationText.value, 10)
  formData.duration = Number.isFinite(val) && val >= 0 ? val : 0
  durationText.value = String(formData.duration)
}

function handleClose() {
  emit('close')
}

function handleSubmit() {
  if (!canSubmit.value) return
  emit('submit', {
    checkinType: formData.checkinType,
    content: formData.content.trim(),
    duration: formData.duration
  })
}
</script>

<style scoped lang="scss">
.checkin-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.checkin-form {
  width: 100%;
  max-height: 85vh;
  border-radius: 28rpx 28rpx 0 0;
  background: var(--surface);
  padding: 32rpx 28rpx 48rpx;
  overflow-y: auto;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28rpx;
}

.form-title {
  color: var(--text-main);
  font-size: 32rpx;
  font-weight: 700;
}

.close-btn {
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

.form-section {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  color: var(--text-sub);
  font-size: 24rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
}

.type-scroll {
  width: 100%;
}

.type-chips {
  display: flex;
  gap: 12rpx;
  white-space: nowrap;
}

.type-chip {
  flex-shrink: 0;
  min-height: 60rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    color: var(--text-sub);
    font-size: 24rpx;
    font-weight: 600;
  }
}

.type-chip.active {
  background: rgba(74, 144, 226, 0.14);
  border-color: rgba(74, 144, 226, 0.3);

  text {
    color: #4A90E2;
    font-weight: 700;
  }
}

.content-input {
  width: 100%;
  min-height: 160rpx;
  padding: 18rpx;
  border-radius: 16rpx;
  border: 1px solid var(--line);
  background: var(--surface-soft, rgba(248, 250, 252, 1));
  color: var(--text-main);
  font-size: 26rpx;
  line-height: 1.6;
  box-sizing: border-box;
}

.duration-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.duration-btn {
  min-width: 80rpx;
  height: 64rpx;
  border-radius: 16rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    color: #4A90E2;
    font-size: 24rpx;
    font-weight: 700;
  }

  &:active {
    opacity: 0.7;
  }
}

.duration-input {
  flex: 1;
  height: 64rpx;
  padding: 0 18rpx;
  border-radius: 16rpx;
  border: 1px solid var(--line);
  background: var(--surface-soft, rgba(248, 250, 252, 1));
  color: var(--text-main);
  font-size: 28rpx;
  font-weight: 700;
  text-align: center;
}

.form-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 32rpx;
}

.cancel-btn,
.submit-btn {
  flex: 1;
  min-height: 80rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cancel-btn {
  border: 1px solid var(--line);
  background: var(--surface);

  text {
    color: var(--text-sub);
    font-size: 28rpx;
    font-weight: 600;
  }
}

.submit-btn {
  background: #4A90E2;
  box-shadow: 0 10rpx 22rpx rgba(74, 144, 226, 0.35);

  text {
    color: #ffffff;
    font-size: 28rpx;
    font-weight: 700;
  }
}

.submit-btn.disabled {
  opacity: 0.45;
}
</style>
