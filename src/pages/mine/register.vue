<template>
  <view :class="['auth-page', themeClass]">
    <view class="top-bar">
      <view class="icon-btn" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
      </view>
      <text class="title">{{ registerTitle }}</text>
      <view class="icon-btn"></view>
    </view>

    <view class="hero-card">
      <text class="hero-title">{{ registerTitle }}</text>
      <text class="hero-subtitle">{{ registerSubtitle }}</text>
    </view>

    <view class="form-card">
      <view class="input-group">
        <text class="input-label">{{ nameLabel }}</text>
        <input
          v-model="name"
          class="input-field"
          type="text"
          :placeholder="namePlaceholder"
          placeholder-class="placeholder-style"
        />
      </view>

      <view class="input-group">
        <text class="input-label">{{ emailLabel }}</text>
        <input
          v-model="email"
          class="input-field"
          type="text"
          :placeholder="emailPlaceholder"
          placeholder-class="placeholder-style"
        />
      </view>

      <view class="input-group">
        <text class="input-label">{{ passwordLabel }}</text>

        <view class="input-with-eye">
          <input
            v-model="password"
            class="input-field eye-input"
            :type="showPassword ? 'text' : 'password'"
            :placeholder="passwordPlaceholder"
            placeholder-class="placeholder-style"
          />
          <view class="eye-btn" @tap="showPassword = !showPassword">
            <Icon :name="showPassword ? 'visibility' : 'visibility_off'" :size="20" color="#94a3b8" />
          </view>
        </view>
      </view>

      <view class="input-group">
        <text class="input-label">{{ confirmLabel }}</text>

        <view class="input-with-eye">
          <input
            v-model="confirmPassword"
            class="input-field eye-input"
            :type="showConfirmPassword ? 'text' : 'password'"
            :placeholder="confirmPlaceholder"
            placeholder-class="placeholder-style"
          />
          <view class="eye-btn" @tap="showConfirmPassword = !showConfirmPassword">
            <Icon :name="showConfirmPassword ? 'visibility' : 'visibility_off'" :size="20" color="#94a3b8" />
          </view>
        </view>
      </view>

      <view class="submit-btn" @tap="handleRegister">
        <text class="submit-text">{{ loading ? loadingText : registerLabel }}</text>
      </view>

      <view class="switch-row" @tap="navigateToLogin">
        <text class="switch-prefix">{{ hasAccountText }}</text>
        <text class="switch-link">{{ loginLabel }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
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
  const target = redirectUrl.value || '/pages/mine/index'
  const tabPages = ['/pages/study/index', '/pages/life/index', '/pages/psychology/index', '/pages/mine/index']
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
  padding: 16rpx 24rpx 48rpx;
  background: var(--page-bg);
}

.theme-light {
  --page-bg: #f6f8f6;
  --surface: #ffffff;
  --line: rgba(111, 222, 129, 0.18);
  --text-main: #0f172a;
  --text-sub: #64748b;
  --topbar-bg: rgba(246, 248, 246, 0.92);
}

.theme-dark {
  --page-bg: #131f15;
  --surface: rgba(15, 30, 20, 0.78);
  --line: rgba(111, 222, 129, 0.3);
  --text-main: #f8fafc;
  --text-sub: #cbd5e1;
  --topbar-bg: rgba(19, 31, 21, 0.92);
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
  border-radius: 28rpx;
  border: 1px solid var(--line);
  padding: 34rpx;
  background: linear-gradient(135deg, rgba(111, 222, 129, 0.22), rgba(111, 222, 129, 0.07));
}

.hero-title {
  color: var(--text-main);
  display: block;
  font-size: 46rpx;
  font-weight: 700;
}

.hero-subtitle {
  margin-top: 8rpx;
  color: var(--text-sub);
  display: block;
  font-size: 24rpx;
}

.form-card {
  margin-top: 22rpx;
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 24rpx;
}

.input-group {
  margin-bottom: 16rpx;
}

.input-label {
  color: var(--text-main);
  font-size: 24rpx;
  font-weight: 600;
}

.input-field {
  margin-top: 8rpx;
  width: 100%;
  min-height: 84rpx;
  border-radius: 16rpx;
  border: 1px solid var(--line);
  padding: 0 20rpx;
  color: var(--text-main);
  font-size: 28rpx;
  background: transparent;
}


.input-with-eye {
  position: relative;
  margin-top: 8rpx;
}

.input-with-eye .input-field {
  margin-top: 0;
  padding-right: 80rpx;

  // 隐藏浏览器原生密码切换按钮
  &::-ms-reveal,
  &::-webkit-credentials-auto-fill-button {
    display: none;
  }
}

.eye-btn {
  position: absolute;
  right: 0;
  top: 0;
  width: 80rpx;
  height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-style {
  color: #9ca3af;
}

.submit-btn {
  margin-top: 8rpx;
  min-height: 88rpx;
  border-radius: 16rpx;
  background: #6fde81;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-text {
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
}

.switch-row {
  margin-top: 18rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8rpx;
}

.switch-prefix {
  color: var(--text-sub);
  font-size: 24rpx;
}

.switch-link {
  color: #2cbb63;
  font-size: 24rpx;
  font-weight: 700;
}
</style>

