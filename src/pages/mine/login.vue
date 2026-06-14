<template>
  <view :class="['auth-page', themeClass]">
    <view class="top-bar">
      <view class="icon-btn" @tap="goBack">
        <Icon name="chevron_left" :size="24" :color="iconColor" />
      </view>
      <text class="title">{{ loginTitle }}</text>
      <view class="icon-btn"></view>
    </view>

    <!-- Banner 卡片 -->
    <view class="hero-card">
      <view class="hero-content">
        <text class="hero-title">{{ loginTitle }}</text>
        <text class="hero-subtitle">{{ loginSubtitle }}</text>
      </view>
    </view>

    <!-- 主表单 -->
    <view class="form-card">
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

      <view class="forgot-row">
        <text class="forgot-link" @tap="navigateToForgotPassword">{{ forgotPasswordLabel }}</text>
      </view>

      <view class="submit-btn" @tap="handleLogin">
        <text class="submit-text">{{ loading ? loadingText : loginLabel }}</text>
      </view>

      <!-- 立即注册链接 -->
      <view class="switch-row" @tap="navigateToRegister">
        <text class="switch-prefix">{{ noAccountText }}</text>
        <view class="switch-link-wrap">
          <text class="switch-link">{{ registerLabel }}</text>
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

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()

const email = ref('test@example.com')
const password = ref('12345678')
const loading = ref(false)

const showPassword = ref(false)
const redirectUrl = ref('/pages/mine/index')

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8'))
const isZh = computed(() => uiPreferencesStore.locale === 'zh-CN')

const loginTitle = computed(() => (isZh.value ? '登录账号' : 'Login'))
const loginSubtitle = computed(() =>
  isZh.value ? '连接你的学习与心理数据' : 'Connect your study and psychology data'
)
const emailLabel = computed(() => (isZh.value ? '邮箱' : 'Email'))
const emailPlaceholder = computed(() => (isZh.value ? '请输入邮箱地址' : 'Enter your email'))
const passwordLabel = computed(() => (isZh.value ? '密码' : 'Password'))
const passwordPlaceholder = computed(() => (isZh.value ? '请输入密码' : 'Enter your password'))
const loadingText = computed(() => (isZh.value ? '登录中...' : 'Signing in...'))
const loginLabel = computed(() => (isZh.value ? '登录' : 'Login'))
const forgotPasswordLabel = computed(() => (isZh.value ? '忘记密码？' : 'Forgot password?'))
const noAccountText = computed(() => (isZh.value ? '还没有账号？' : 'No account yet?'))
const registerLabel = computed(() => (isZh.value ? '立即注册' : 'Register now'))

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function goBack() {

  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/mine/index' })
  }
}

function navigateToRegister() {
  uni.navigateTo({
    url: `/pages/mine/register?redirect=${encodeURIComponent(redirectUrl.value)}`
  })
}

function navigateToForgotPassword() {
  uni.navigateTo({
    url: `/pages/mine/forgot-password?redirect=${encodeURIComponent(redirectUrl.value)}`
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

async function handleLogin() {
  if (loading.value) {
    return
  }
  const normalizedEmail = email.value.trim()
  if (!isEmailValid(normalizedEmail)) {
    uni.showToast({
      title: isZh.value ? '请输入有效邮箱' : 'Please enter a valid email',
      icon: 'none'
    })
    return
  }
  if (!password.value) {
    uni.showToast({
      title: isZh.value ? '请输入密码' : 'Please enter password',
      icon: 'none'
    })
    return
  }

  loading.value = true
  try {
    await authStore.login(normalizedEmail, password.value)
    uni.showToast({
      title: isZh.value ? '登录成功' : 'Login successful',
      icon: 'success'
    })
    setTimeout(() => {
      redirectAfterAuth()
    }, 500)
  } catch (error: any) {
    let message = isZh.value ? '登录失败，请重试' : 'Login failed, please retry'
    if (error?.code === 401) {
      message = isZh.value ? '邮箱或密码错误' : 'Invalid email or password'
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
  margin-top: 24rpx;
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

.forgot-row {
  margin-top: 2rpx;
  display: flex;
  justify-content: flex-end;
}

.forgot-link {
  color: #22c55e;
  font-size: 24rpx;
  font-weight: 600;
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
</style>
