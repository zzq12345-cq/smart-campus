<template>
  <view :class="['subject-select-page', themeClass]">
    <view class="top-bar">
      <view class="icon-btn" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
      </view>
      <text class="title">{{ isZh ? '选择主教科目' : 'Select Subject' }}</text>
      <view class="icon-btn"></view>
    </view>

    <view class="hero-card">
      <view class="hero-icon">
        <Icon name="school" :size="48" color="rgba(192,0,0,0.6)" />
      </view>
      <text class="hero-title">{{ isZh ? '您教授哪个科目？' : 'What do you teach?' }}</text>
      <text class="hero-subtitle">{{ isZh ? '选择后教学区将展示该科目的相关内容' : 'Your teaching area will be customized accordingly' }}</text>
    </view>

    <view class="subject-grid">
      <view
        v-for="subject in subjects"
        :key="subject.id"
        :class="['subject-card', { selected: selectedSubject === subject.id }]"
        :style="selectedSubject === subject.id ? { borderColor: subject.color, background: subject.colorLight } : {}"
        @tap="selectSubject(subject.id)"
      >
        <view class="subject-icon-wrap" :style="{ background: subject.colorLight }">
          <Icon :name="subject.icon" :size="32" :color="subject.color" />
        </view>
        <text class="subject-name" :style="selectedSubject === subject.id ? { color: subject.color } : {}">
          {{ isZh ? subject.name : subject.nameEn }}
        </text>
        <text class="subject-desc">{{ isZh ? subject.description : subject.descriptionEn }}</text>
        <view v-if="selectedSubject === subject.id" class="check-mark" :style="{ background: subject.color }">
          <Icon name="check" :size="14" color="#ffffff" />
        </view>
      </view>
    </view>

    <view class="bottom-actions">
      <view
        :class="['confirm-btn', { disabled: !selectedSubject || saving }]"
        :style="confirmBtnStyle"
        @tap="confirmSelection"
      >
        <text class="confirm-btn-text">{{ saving ? (isZh ? '保存中...' : 'Saving...') : (isZh ? '确认选择' : 'Confirm') }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { SUBJECT_LIST, getSubjectConfig } from '@/teacher/types/subjects'
import type { TeacherSubject } from '@/teacher/types/subjects'

const authStore = useAuthStore()
const uiPreferencesStore = useUiPreferencesStore()

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8')
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const subjects = SUBJECT_LIST
const selectedSubject = ref<TeacherSubject | ''>(
  (authStore.teacherSubject as TeacherSubject) || ''
)
const saving = ref(false)

const confirmBtnStyle = computed(() => {
  const config = getSubjectConfig(selectedSubject.value || null)
  if (!config) return { background: '#94a3b8' }
  return { background: config.color }
})

function selectSubject(id: TeacherSubject) {
  selectedSubject.value = id
}

async function confirmSelection() {
  if (!selectedSubject.value || saving.value) return

  saving.value = true
  try {
    // 使用 localStorage 存储科目（不依赖 Appwrite 后端字段）
    authStore.setTeacherSubject(selectedSubject.value)
    uni.showToast({
      title: isZh.value ? '科目已选择' : 'Subject selected',
      icon: 'success'
    })
    setTimeout(() => {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack({ delta: 1 })
      } else {
        uni.switchTab({ url: '/pages/teaching/index' })
      }
    }, 600)
  } catch (error) {
    console.error('Save subject failed:', error)
    uni.showToast({
      title: isZh.value ? '保存失败，请重试' : 'Failed to save',
      icon: 'none'
    })
  } finally {
    saving.value = false
  }
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/teaching/index' })
  }
}
</script>

<style lang="scss" scoped>
.subject-select-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 200rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f8f6f6;
  --surface: #ffffff;
  --text-main: #0f172a;
  --text-sub: #64748b;
  --text-soft: #94a3b8;
  --line: rgba(192, 0, 0, 0.12);
}

.theme-dark {
  --page-bg: #1a1315;
  --surface: rgba(26, 19, 21, 0.78);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --text-soft: #94a3b8;
  --line: rgba(192, 0, 0, 0.24);
}

.top-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;

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
    &:active { opacity: 0.7; }
  }
}

.hero-card {
  margin: 16rpx 0 32rpx;
  padding: 40rpx;
  border-radius: 28rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12rpx;
}

.hero-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(192, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}

.hero-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text-main);
}

.hero-subtitle {
  font-size: 24rpx;
  color: var(--text-sub);
  line-height: 1.5;
}

.subject-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.subject-card {
  position: relative;
  padding: 28rpx;
  border-radius: 24rpx;
  border: 2px solid var(--line);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12rpx;
  transition: all 0.2s ease;

  &:active { transform: scale(0.97); }

  &.selected {
    border-width: 2px;
  }
}

.subject-icon-wrap {
  width: 88rpx;
  height: 88rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4rpx;
}

.subject-name {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-main);
}

.subject-desc {
  font-size: 22rpx;
  color: var(--text-sub);
  line-height: 1.4;
}

.check-mark {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 48rpx;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom, 0px));
  background: var(--page-bg);
  z-index: 99;
}

.confirm-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s ease, transform 0.15s ease;

  &:active:not(.disabled) { opacity: 0.85; transform: scale(0.98); }
  &.disabled { opacity: 0.45; }
}

.confirm-btn-text {
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
}
</style>
