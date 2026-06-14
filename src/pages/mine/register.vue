<template>
  <view :class="['auth-page', themeClass]">
    <view class="top-bar">
      <view class="icon-btn" @tap="goBack">
        <Icon name="chevron_left" :size="24" :color="iconColor" />
      </view>
      <text class="title">{{ registerTitle }}</text>
      <view class="icon-btn"></view>
    </view>

    <!-- Banner 卡片 -->
    <view class="hero-card">
      <view class="hero-content">
        <text class="hero-title">{{ registerTitle }}</text>
        <text class="hero-subtitle">{{ registerSubtitle }}</text>
      </view>
    </view>

    <!-- 主表单 -->
    <view class="form-card">
      <view class="input-group">
        <text class="input-label">{{ roleLabel }}</text>
        <view class="role-row">
          <view
            :class="['role-chip', { active: role === 'student' }]"
            @tap="role = 'student'"
          >
            <text class="role-chip-text">{{ studentLabel }}</text>
          </view>
          <view
            :class="['role-chip', { active: role === 'teacher' }]"
            @tap="role = 'teacher'"
          >
            <text class="role-chip-text">{{ teacherLabel }}</text>
          </view>
        </view>
      </view>

      <view class="input-group">
        <text class="input-label">{{ nameLabel }}</text>
        <view class="input-with-icon">
          <!-- 浅绿底圆角矩形 Icon 包裹盒 -->
          <view class="input-icon-wrap">
            <Icon name="person" :size="18" color="#22c55e" />
          </view>
          <input
            v-model="name"
            class="input-field"
            type="text"
            :placeholder="namePlaceholder"
            placeholder-class="placeholder-style"
          />
        </view>
      </view>

      <view class="input-group">
        <text class="input-label">{{ emailLabel }}</text>
        <view class="input-with-icon">
          <!-- 浅绿底圆角矩形 Icon 包裹盒 -->
          <view class="input-icon-wrap">
            <Icon name="mail" :size="18" color="#22c55e" />
          </view>
          <input
            v-model="email"
            class="input-field"
            type="text"
            :placeholder="emailPlaceholder"
            placeholder-class="placeholder-style"
          />
        </view>
      </view>

      <view class="input-group">
        <text class="input-label">{{ passwordLabel }}</text>
        <view class="input-with-icon input-with-eye">
          <!-- 浅绿底圆角矩形 Icon 包裹盒 -->
          <view class="input-icon-wrap">
            <Icon name="lock" :size="18" color="#22c55e" />
          </view>
          <input
            v-model="password"
            class="input-field"
            :type="showPassword ? 'text' : 'password'"
            :placeholder="passwordPlaceholder"
            placeholder-class="placeholder-style"
          />
          <view class="eye-btn" @tap="showPassword = !showPassword">
            <Icon :name="showPassword ? 'visibility' : 'visibility_off'" :size="20" color="#22c55e" />
          </view>
        </view>
      </view>

      <view class="input-group">
        <text class="input-label">{{ confirmLabel }}</text>
        <view class="input-with-icon input-with-eye">
          <!-- 浅绿底圆角矩形 Icon 包裹盒 -->
          <view class="input-icon-wrap">
            <Icon name="lock" :size="18" color="#22c55e" />
          </view>
          <input
            v-model="confirmPassword"
            class="input-field"
            :type="showConfirmPassword ? 'text' : 'password'"
            :placeholder="confirmPlaceholder"
            placeholder-class="placeholder-style"
          />
          <view class="eye-btn" @tap="showConfirmPassword = !showConfirmPassword">
            <Icon :name="showConfirmPassword ? 'visibility' : 'visibility_off'" :size="20" color="#22c55e" />
          </view>
        </view>
      </view>

      <view class="submit-btn" @tap="handleRegister">
        <text class="submit-text">{{ loading ? loadingText : registerLabel }}</text>
      </view>

      <!-- 已有账号链接 -->
      <view class="switch-row" @tap="navigateToLogin">
        <text class="switch-prefix">{{ hasAccountText }}</text>
        <view class="switch-link-wrap">
          <text class="switch-link">{{ loginLabel }}</text>
          <view class="switch-link-decor" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import { roleHomeUrl } from '@/utils/auth-guard'
import type { UserRole } from '@/types/auth'

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const role = ref<UserRole>('student')
const loading = ref(false)

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const redirectUrl = ref('/pages/mine/index')

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8'))
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const registerTitle = computed(() => (isZh.value ? '注册账号' : 'Register'))
const registerSubtitle = computed(() =>
  isZh.value ? '创建你的 UniSmart 账号，开启成长记录。' : 'Create your UniSmart account to start your growth journey.'
)
const nameLabel = computed(() => (isZh.value ? '昵称' : 'Name'))
const namePlaceholder = computed(() => (isZh.value ? '请输入昵称（至少2位）' : 'Enter your name (min 2 chars)'))
const emailLabel = computed(() => (isZh.value ? '邮箱' : 'Email'))
const emailPlaceholder = computed(() => (isZh.value ? '请输入邮箱地址' : 'Enter your email'))
const passwordLabel = computed(() => (isZh.value ? '密码' : 'Password'))
const passwordPlaceholder = computed(() => (isZh.value ? '请输入密码（至少8位）' : 'Enter password (min 8 chars)'))
const confirmLabel = computed(() => (isZh.value ? '确认密码' : 'Confirm Password'))
const confirmPlaceholder = computed(() => (isZh.value ? '请再次输入密码' : 'Enter password again'))
const loadingText = computed(() => (isZh.value ? '注册中...' : 'Registering...'))
const registerLabel = computed(() => (isZh.value ? '注册' : 'Register'))
const hasAccountText = computed(() => (isZh.value ? '已有账号？' : 'Already have an account?'))
const loginLabel = computed(() => (isZh.value ? '立即登录' : 'Login now'))
const roleLabel = computed(() => (isZh.value ? '我是' : 'I am a'))
const studentLabel = computed(() => (isZh.value ? '学生' : 'Student'))
const teacherLabel = computed(() => (isZh.value ? '教师' : 'Teacher'))

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function goBack() {

  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.navigateTo({ url: `/pages/mine/login?redirect=${encodeURIComponent(redirectUrl.value)}` })
  }
}

function navigateToLogin() {
  uni.navigateTo({
    url: `/pages/mine/login?redirect=${encodeURIComponent(redirectUrl.value)}`
  })
}

function redirectAfterAuth() {
  const explicit = redirectUrl.value && redirectUrl.value !== '/pages/mine/index'
  const target = explicit ? redirectUrl.value : roleHomeUrl(authStore.isTeacher)
  const tabPages = [
    '/pages/study/index',
    '/pages/teaching/index',
    '/pages/life/index',
    '/pages/psychology/index',
    '/pages/mine/index'
  ]
  const targetPath = target.split('?')[0]
  if (tabPages.includes(targetPath)) {
    uni.switchTab({
      url: targetPath,
      fail: () => {
        uni.switchTab({ url: '/pages/mine/index' })
      }
    })
    return
  }
  uni.redirectTo({
    url: target,
    fail: () => {
      uni.switchTab({ url: '/pages/mine/index' })
    }
  })
}

async function handleRegister() {
  if (loading.value) {
    return
  }

  const normalizedName = name.value.trim()
  const normalizedEmail = email.value.trim()

  if (normalizedName.length < 2) {
    uni.showToast({
      title: isZh.value ? '昵称至少2位' : 'Name must be at least 2 chars',
      icon: 'none'
    })
    return
  }
  if (!isEmailValid(normalizedEmail)) {
    uni.showToast({
      title: isZh.value ? '请输入有效邮箱' : 'Please enter a valid email',
      icon: 'none'
    })
    return
  }
  if (password.value.length < 8) {
    uni.showToast({
      title: isZh.value ? '密码至少8位' : 'Password must be at least 8 chars',
      icon: 'none'
    })
    return
  }
  if (password.value !== confirmPassword.value) {
    uni.showToast({
      title: isZh.value ? '两次密码不一致' : 'Passwords do not match',
      icon: 'none'
    })
    return
  }

  loading.value = true
  try {
    await authStore.register(normalizedEmail, password.value, normalizedName)
    authStore.setRole(role.value)
    uni.showToast({
      title: isZh.value ? '注册成功' : 'Register successful',
      icon: 'success'
    })
    setTimeout(() => {
      redirectAfterAuth()
    }, 500)
  } catch (error: any) {
    let message = isZh.value ? '注册失败，请重试' : 'Register failed, please retry'
    if (error?.code === 409) {
      message = isZh.value ? '邮箱已被注册，请直接登录' : 'Email already exists, please login'
    } else if (error?.code === 429) {
      message = isZh.value ? '请求过于频繁，请稍后' : 'Too many requests, try later'
    } else if (typeof error?.message === 'string' && error.message) {
      message = error.message
    }
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 2600
    })
  } finally {
    loading.value = false
  }
}

onLoad((options?: Record<string, string>) => {
  if (options?.redirect) {
    redirectUrl.value = decodeURIComponent(options.redirect)
  }
})

onShow(async () => {
  uiPreferencesStore.initFromSystem()
  await authStore.init()
  if (authStore.isLoggedIn) {
    redirectAfterAuth()
  }
})
</script>

<style lang="scss" scoped>
.auth-page {
  min-height: 100vh;
  padding: 16rpx 28rpx 80rpx;
  background-image: url('/static/login_page_bg.png');
  background-size: 100% auto;
  background-position: bottom center;
  background-repeat: no-repeat;
  background-color: var(--page-bg);
}

.theme-light {
  --page-bg: #ffffff;
  --surface: #ffffff;
  --line: rgba(34, 197, 94, 0.08);
  --text-main: #0f172a;
  --text-sub: #64748b;
  --topbar-bg: transparent;
  --input-bg: #ffffff;
  --input-border: rgba(34, 197, 94, 0.16);
}

.theme-dark {
  --page-bg: #131f15;
  --surface: rgba(15, 30, 20, 0.78);
  --line: rgba(34, 197, 94, 0.16);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --topbar-bg: transparent;
  --input-bg: rgba(15, 30, 20, 0.9);
  --input-border: rgba(34, 197, 94, 0.24);
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 88rpx;
  display: grid;
  grid-template-columns: 64rpx 1fr 64rpx;
  align-items: center;
  background: var(--topbar-bg);
  backdrop-filter: blur(14px);
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.title {
  text-align: center;
  color: var(--text-main);
  font-size: 34rpx;
  font-weight: 700;
}

.hero-card {
  margin-top: 14rpx;
  height: 272rpx;
  border-radius: 36rpx;
  padding: 40rpx 40rpx 40rpx 32rpx;
  background-image: url('/static/login_banner_full.png');
  background-size: cover;
  background-position: right bottom;
  background-repeat: no-repeat;
  box-shadow: 0 8rpx 28rpx rgba(34, 197, 94, 0.08);
  overflow: hidden;
  display: flex;
  align-items: center;
}

.hero-content {
  width: 55%;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  position: relative;
  z-index: 2;
}

.hero-title {
  color: #14532d;
  display: block;
  font-size: 44rpx;
  font-weight: 700;
}

.hero-subtitle {
  margin-top: 4rpx;
  color: #166534;
  display: block;
  font-size: 20rpx;
}

.form-card {
  margin-top: 28rpx;
  border-radius: 32rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 40rpx 32rpx;
  box-shadow: 0 16rpx 36rpx rgba(34, 197, 94, 0.05);
}

.input-group {
  margin-bottom: 24rpx;
}

.input-label {
  color: var(--text-main);
  font-size: 24rpx;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid var(--input-border);
  border-radius: 24rpx;
  background: var(--input-bg);
  padding: 0 20rpx 0 104rpx;
  min-height: 96rpx;
}

.input-icon-wrap {
  position: absolute;
  left: 20rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: rgba(34, 197, 94, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-field {
  width: 100%;
  height: 84rpx;
  border: none;
  background: transparent;
  color: var(--text-main);
  font-size: 28rpx;
  padding: 0;
}

.input-with-eye .input-field {
  padding-right: 80rpx;
}

.eye-btn {
  position: absolute;
  right: 12rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-style {
  color: #9ca3af;
}

.submit-btn {
  margin-top: 36rpx;
  min-height: 96rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #22c55e 0%, #10b981 100%);
  box-shadow: 0 8rpx 20rpx rgba(34, 197, 94, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.98);
  }
}

.submit-text {
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
}

.switch-row {
  margin-top: 28rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8rpx;
}

.switch-prefix {
  color: var(--text-sub);
  font-size: 24rpx;
}

.switch-link-wrap {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

.switch-link {
  color: #22c55e;
  font-size: 24rpx;
  font-weight: 700;
}

.switch-link-decor {
  position: absolute;
  bottom: -10rpx;
  left: 0;
  width: 100%;
  height: 12rpx;
  background: transparent;
  pointer-events: none;

  &::before {
    content: "";
    position: absolute;
    bottom: 0;
    left: 2%;
    width: 96%;
    height: 8rpx;
    border-bottom: 3rpx solid #22c55e;
    border-radius: 50%;
    transform: rotate(-1.5deg);
  }

  &::after {
    content: "";
    position: absolute;
    bottom: -3rpx;
    left: 15%;
    width: 70%;
    height: 6rpx;
    border-bottom: 2rpx solid rgba(34, 197, 94, 0.7);
    border-radius: 50%;
    transform: rotate(-0.5deg);
  }
}

.role-row {
  margin-top: 10rpx;
  display: flex;
  gap: 16rpx;
}

.role-chip {
  flex: 1;
  min-height: 96rpx;
  border-radius: 20rpx;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  &:active {
    transform: scale(0.98);
  }
}

.role-chip.active {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.08);

  .role-chip-text {
    color: #22c55e;
  }
}

.role-chip-text {
  color: var(--text-main);
  font-size: 28rpx;
  font-weight: 600;
}
</style>

