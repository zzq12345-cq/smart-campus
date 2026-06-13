<template>
  <view :class="['auth-page', themeClass]">
    <view class="top-bar">
      <view class="icon-btn" @tap="goBack">
        <Icon name="arrow_back" :size="20" :color="iconColor" />
      </view>
      <text class="title">{{ pageTitle }}</text>
      <view class="icon-btn"></view>
    </view>

    <view class="hero-card">
      <text class="hero-title">{{ heroTitle }}</text>
      <text class="hero-subtitle">{{ heroSubtitle }}</text>
    </view>

    <view v-if="showSuccessState" class="success-card">
      <view class="success-head">
        <view class="success-icon">
          <Icon name="verified_user" :size="22" color="#ffffff" />
        </view>
        <view class="success-copy">
          <text class="success-title">{{ connectedTitle }}</text>
          <text class="success-subtitle">{{ connectedSubtitle }}</text>
        </view>
      </view>

      <view class="info-grid">
        <view class="info-item">
          <text class="info-label">{{ studentIdLabel }}</text>
          <text class="info-value">{{ savedSnapshot?.personalInfo.studentId || '--' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">{{ authenticatedAtLabel }}</text>
          <text class="info-value">{{ authenticatedAtText }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">{{ nameLabel }}</text>
          <text class="info-value">{{ savedSnapshot?.personalInfo.name || '--' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">{{ majorLabel }}</text>
          <text class="info-value">{{ savedSnapshot?.personalInfo.major || '--' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">{{ classLabel }}</text>
          <text class="info-value">{{ savedSnapshot?.personalInfo.class || '--' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">{{ gradeLabel }}</text>
          <text class="info-value">{{ savedSnapshot?.personalInfo.grade || '--' }}</text>
        </view>
      </view>

      <view class="success-actions">
        <view class="secondary-btn" @tap="startReconnect">
          <text class="secondary-btn-text">{{ reconnectLabel }}</text>
        </view>
        <view class="ghost-btn" @tap="clearAuthSnapshot">
          <text class="ghost-btn-text">{{ clearLabel }}</text>
        </view>
      </view>
    </view>

    <template v-else>
      <view class="mode-card">
        <text class="mode-label">{{ modeLabel }}</text>
        <view class="mode-tabs">
          <view
            v-for="mode in loginModes"
            :key="mode.value"
            :class="['mode-tab', { active: activeLoginMode === mode.value }]"
            @tap="selectLoginMode(mode.value)"
          >
            <text>{{ mode.label }}</text>
          </view>
        </view>
      </view>

      <template v-if="activeLoginMode === 'captcha'">
        <view class="form-card">
          <view class="input-group">
            <text class="input-label">{{ studentIdLabel }}</text>
            <input
              v-model="studentId"
              class="input-field"
              type="text"
              :placeholder="studentIdPlaceholder"
              placeholder-class="placeholder-style"
            />
          </view>

          <view class="input-group input-group-last">
            <text class="input-label">{{ passwordLabel }}</text>
            <input
              v-model="password"
              class="input-field"
              type="password"
              :placeholder="passwordPlaceholder"
              placeholder-class="placeholder-style"
            />
          </view>

          <view
            class="submit-btn captcha-fetch-btn"
            :class="{ disabled: fetchingCaptcha || !canFetchCaptcha }"
            @tap="handleFetchCaptcha"
          >
            <text class="submit-text">{{ fetchingCaptcha ? loadingText : captchaActionLabel }}</text>
          </view>
        </view>

        <view v-if="captchaState" class="captcha-card">
          <view class="captcha-header">
            <view>
              <text class="captcha-title">{{ captchaTitle }}</text>
              <text class="captcha-subtitle">{{ captchaSubtitle }}</text>
            </view>
            <text class="captcha-refresh" @tap="handleRefreshCaptcha">{{ refreshCaptchaLabel }}</text>
          </view>

          <view class="hint-section">
            <text class="hint-label">{{ tapHintLabel }}</text>
            <view class="hint-chips">
              <view
                v-for="(hint, index) in captchaState.captchaTextHints"
                :key="hint + '-' + index"
                class="hint-chip"
                :class="{ active: index === selectedPoints.length, done: index < selectedPoints.length }"
              >
                <text>{{ index + 1 }}. {{ hint }}</text>
              </view>
            </view>
          </view>

          <view class="captcha-image-panel" @tap="handleCaptchaTap">
            <image
              id="captcha-image-panel"
              class="captcha-image"
              :src="captchaImageSrc"
              mode="widthFix"
            />
            <view
              v-for="point in selectedPoints"
              :key="point.order"
              class="captcha-marker"
              :style="getMarkerStyle(point)"
            >
              <text>{{ point.order }}</text>
            </view>
          </view>

          <view class="points-row">
            <text class="points-label">{{ selectedPointsLabel }}</text>
            <view v-if="selectedPoints.length" class="point-tags">
              <view
                v-for="point in selectedPoints"
                :key="`tag-${point.order}`"
                class="point-tag"
              >
                <text>#{{ point.order }} · {{ point.x }}, {{ point.y }}</text>
              </view>
            </view>
            <text v-else class="point-empty">--</text>
          </view>

          <view class="captcha-actions">
            <view class="ghost-btn" @tap="resetSelectedPoints">
              <text class="ghost-btn-text">{{ resetPointsLabel }}</text>
            </view>
            <view
              class="submit-btn submit-btn-inline captcha-submit-btn"
              :class="{ disabled: submitting || !canSubmitLogin }"
              @tap="handleSubmitLogin"
            >
              <text class="submit-text">{{ submitting ? submittingText : submitLabel }}</text>
            </view>
          </view>
        </view>
      </template>

      <template v-else>
        <view class="link-card">
          <text class="captcha-title">{{ linkTitle }}</text>
          <text class="captcha-subtitle">{{ linkSubtitle }}</text>

          <view v-if="showLinkStatus" class="link-status-card">
            <text class="hint-label">{{ linkStatusLabel }}</text>
            <view :class="['status-pill', `status-pill-${linkStatusVariant}`]">
              <text>{{ linkStatusText }}</text>
            </view>
          </view>

          <view class="captcha-actions">
            <view
              class="submit-btn submit-btn-inline link-generate-btn"
              :class="{ disabled: fetchingLoginLink || confirmingLoginLink }"
              @tap="handleFetchLoginLink"
            >
              <text class="submit-text">{{ linkPrimaryActionLabel }}</text>
            </view>
            <view
              class="ghost-btn link-open-btn"
              :class="{ disabled: !canOpenLoginLink }"
              @tap="handleOpenLoginLink"
            >
              <text class="ghost-btn-text">{{ linkOpenLabel }}</text>
            </view>
          </view>
        </view>
      </template>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, onUnmounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { t } from '@/i18n'
import { I18N_KEYS } from '@/i18n/keys'
import { useAuthStore } from '@/stores/auth'
import { useUiPreferencesStore } from '@/stores/ui-preferences'
import educationFunctionService from '@/services/education-function'
import educationScheduleCacheService from '@/services/education-schedule-cache'
import educationSessionService from '@/services/education-session'
import {
  buildCaptchaImginfo,
  extractEventClientPoint,
  getElementRect,
  mapClientPointToImagePoint
} from '@/utils/education-captcha'
import { redirectToLogin } from '@/utils/auth-guard'
import type {
  EducationAuthSnapshot,
  EducationCaptchaPoint,
  EducationCaptchaResult,
  EducationLoginLinkResult,
  EducationLoginLinkStatusResult,
  EducationLoginResult,
  EducationPendingLinkLogin
} from '@/types/education'

type LoginMode = 'captcha' | 'link'

const uiPreferencesStore = useUiPreferencesStore()
const authStore = useAuthStore()
const instance = getCurrentInstance()

const studentId = ref('')
const password = ref('')
const activeLoginMode = ref<LoginMode>('captcha')

const fetchingCaptcha = ref(false)
const submitting = ref(false)
const captchaState = ref<EducationCaptchaResult | null>(null)
const selectedPoints = ref<EducationCaptchaPoint[]>([])

const fetchingLoginLink = ref(false)
const openingLoginLink = ref(false)
const confirmingLoginLink = ref(false)
const loginLinkState = ref<EducationLoginLinkResult | null>(null)
const linkStatus = ref<EducationLoginLinkStatusResult | null>(null)
const linkPollingTimer = ref<ReturnType<typeof setInterval> | null>(null)

const savedSnapshot = ref<EducationAuthSnapshot | null>(null)
const reconnecting = ref(false)

let linkPollingInFlight = false
let resumeStateInFlight = false

const themeClass = computed(() => `theme-${uiPreferencesStore.theme}`)
const iconColor = computed(() => (uiPreferencesStore.theme === 'light' ? '#64748b' : '#94a3b8'))
const currentAppUserId = computed(() => String(authStore.user?.$id || '').trim())

const pageTitle = computed(() => t(I18N_KEYS.mineIdentityTitle, uiPreferencesStore.locale))
const heroTitle = computed(() => t(I18N_KEYS.mineIdentityHeroTitle, uiPreferencesStore.locale))
const heroSubtitle = computed(() => t(I18N_KEYS.mineIdentityHeroSubtitle, uiPreferencesStore.locale))
const modeLabel = computed(() => t(I18N_KEYS.mineIdentityModeLabel, uiPreferencesStore.locale))
const captchaModeLabel = computed(() => t(I18N_KEYS.mineIdentityModeCaptcha, uiPreferencesStore.locale))
const linkModeLabel = computed(() => t(I18N_KEYS.mineIdentityModeLink, uiPreferencesStore.locale))
const studentIdLabel = computed(() => t(I18N_KEYS.mineIdentityStudentIdLabel, uiPreferencesStore.locale))
const studentIdPlaceholder = computed(() => t(I18N_KEYS.mineIdentityStudentIdPlaceholder, uiPreferencesStore.locale))
const passwordLabel = computed(() => t(I18N_KEYS.mineIdentityPasswordLabel, uiPreferencesStore.locale))
const passwordPlaceholder = computed(() => t(I18N_KEYS.mineIdentityPasswordPlaceholder, uiPreferencesStore.locale))
const captchaActionLabel = computed(() => t(I18N_KEYS.mineIdentityFetchCaptcha, uiPreferencesStore.locale))
const refreshCaptchaLabel = computed(() => t(I18N_KEYS.mineIdentityRefreshCaptcha, uiPreferencesStore.locale))
const captchaTitle = computed(() => t(I18N_KEYS.mineIdentityCaptchaTitle, uiPreferencesStore.locale))
const captchaSubtitle = computed(() => t(I18N_KEYS.mineIdentityCaptchaSubtitle, uiPreferencesStore.locale))
const linkTitle = computed(() => t(I18N_KEYS.mineIdentityLinkTitle, uiPreferencesStore.locale))
const linkSubtitle = computed(() => t(I18N_KEYS.mineIdentityLinkSubtitle, uiPreferencesStore.locale))
const linkGenerateLabel = computed(() => t(I18N_KEYS.mineIdentityLinkGenerate, uiPreferencesStore.locale))
const linkRegenerateLabel = computed(() => t(I18N_KEYS.mineIdentityLinkRegenerate, uiPreferencesStore.locale))
const linkOpenLabel = computed(() => t(I18N_KEYS.mineIdentityLinkOpen, uiPreferencesStore.locale))
const linkStatusLabel = computed(() => t(I18N_KEYS.mineIdentityLinkStatus, uiPreferencesStore.locale))
const linkReadyLabel = computed(() => t(I18N_KEYS.mineIdentityLinkReady, uiPreferencesStore.locale))
const linkWaitingLabel = computed(() => t(I18N_KEYS.mineIdentityLinkWaiting, uiPreferencesStore.locale))
const linkConfirmedLabel = computed(() => t(I18N_KEYS.mineIdentityLinkConfirmed, uiPreferencesStore.locale))
const linkExpiredLabel = computed(() => t(I18N_KEYS.mineIdentityLinkExpired, uiPreferencesStore.locale))
const linkErrorLabel = computed(() => t(I18N_KEYS.mineIdentityLinkError, uiPreferencesStore.locale))
const linkCopiedLabel = computed(() => t(I18N_KEYS.mineIdentityLinkCopied, uiPreferencesStore.locale))
const linkOpenFailedLabel = computed(() => t(I18N_KEYS.mineIdentityLinkOpenFailed, uiPreferencesStore.locale))
const tapHintLabel = computed(() => t(I18N_KEYS.mineIdentityTapHint, uiPreferencesStore.locale))
const selectedPointsLabel = computed(() => t(I18N_KEYS.mineIdentitySelectedPoints, uiPreferencesStore.locale))
const resetPointsLabel = computed(() => t(I18N_KEYS.mineIdentityResetPoints, uiPreferencesStore.locale))
const submitLabel = computed(() => t(I18N_KEYS.mineIdentitySubmit, uiPreferencesStore.locale))
const submittingText = computed(() => t(I18N_KEYS.mineIdentitySubmitting, uiPreferencesStore.locale))
const loadingText = computed(() => t(I18N_KEYS.commonLoading, uiPreferencesStore.locale))
const connectedTitle = computed(() => t(I18N_KEYS.mineIdentityConnectedTitle, uiPreferencesStore.locale))
const connectedSubtitle = computed(() => t(I18N_KEYS.mineIdentityConnectedSubtitle, uiPreferencesStore.locale))
const authenticatedAtLabel = computed(() => t(I18N_KEYS.mineIdentityAuthenticatedAt, uiPreferencesStore.locale))
const reconnectLabel = computed(() => t(I18N_KEYS.mineIdentityReconnect, uiPreferencesStore.locale))
const clearLabel = computed(() => t(I18N_KEYS.mineIdentityClear, uiPreferencesStore.locale))
const loginSuccessLabel = computed(() => t(I18N_KEYS.mineIdentityLoginSuccess, uiPreferencesStore.locale))
const sessionExpiredLabel = computed(() => t(I18N_KEYS.mineIdentitySessionExpired, uiPreferencesStore.locale))
const captchaRequiredLabel = computed(() => t(I18N_KEYS.mineIdentityCaptchaRequired, uiPreferencesStore.locale))
const credentialsRequiredLabel = computed(() => t(I18N_KEYS.mineIdentityCredentialsRequired, uiPreferencesStore.locale))
const captchaLoadFailedLabel = computed(() => t(I18N_KEYS.mineIdentityCaptchaLoadFailed, uiPreferencesStore.locale))

const nameLabel = computed(() => t(I18N_KEYS.mineIdentityNameLabel, uiPreferencesStore.locale))
const majorLabel = computed(() => t(I18N_KEYS.mineIdentityMajorLabel, uiPreferencesStore.locale))
const classLabel = computed(() => t(I18N_KEYS.mineIdentityClassLabel, uiPreferencesStore.locale))
const gradeLabel = computed(() => t(I18N_KEYS.mineIdentityGradeLabel, uiPreferencesStore.locale))

const loginModes = computed(() => [
  { value: 'captcha' as const, label: captchaModeLabel.value },
  { value: 'link' as const, label: linkModeLabel.value }
])

const canFetchCaptcha = computed(() => Boolean(studentId.value.trim() && password.value))
const canSubmitLogin = computed(
  () => Boolean(captchaState.value && selectedPoints.value.length === captchaState.value.captchaTextHints.length)
)
const canOpenLoginLink = computed(
  () => Boolean(loginLinkState.value?.loginUrl) && !openingLoginLink.value && !confirmingLoginLink.value
)
const showSuccessState = computed(() => Boolean(savedSnapshot.value) && !reconnecting.value)
const showLinkStatus = computed(() => Boolean(loginLinkState.value || linkStatus.value))
const captchaImageSrc = computed(() =>
  captchaState.value ? `data:image/jpeg;base64,${captchaState.value.captchaImageBase64}` : ''
)
const authenticatedAtText = computed(() => {
  if (!savedSnapshot.value?.authenticatedAt) {
    return '--'
  }
  const date = new Date(savedSnapshot.value.authenticatedAt)
  return Number.isNaN(date.getTime()) ? '--' : date.toLocaleString()
})
const linkStatusVariant = computed(() => linkStatus.value?.status || 'waiting')
const linkStatusText = computed(() => {
  if (!loginLinkState.value && !linkStatus.value) {
    return linkSubtitle.value
  }
  if (!linkStatus.value) {
    return linkReadyLabel.value
  }
  if (linkStatus.value.status === 'waiting') {
    return linkStatus.value.message || linkWaitingLabel.value
  }
  if (linkStatus.value.status === 'confirmed') {
    return linkStatus.value.message || linkConfirmedLabel.value
  }
  if (linkStatus.value.status === 'expired') {
    return linkStatus.value.message || linkExpiredLabel.value
  }
  return linkStatus.value.message || linkErrorLabel.value
})
const linkPrimaryActionLabel = computed(() => {
  if (fetchingLoginLink.value) {
    return loadingText.value
  }
  return loginLinkState.value ? linkRegenerateLabel.value : linkGenerateLabel.value
})

function showToast(title: string, duration = 2400) {
  uni.showToast({
    title,
    icon: 'none',
    duration
  })
}

function resetSelectedPoints() {
  selectedPoints.value = []
}

function stopLinkPolling() {
  if (linkPollingTimer.value) {
    clearInterval(linkPollingTimer.value)
    linkPollingTimer.value = null
  }
  linkPollingInFlight = false
}

function resetCaptchaState() {
  captchaState.value = null
  resetSelectedPoints()
}

function resetLinkLoginState() {
  stopLinkPolling()
  loginLinkState.value = null
  linkStatus.value = null
  educationSessionService.clearPendingLinkLogin()
}

function resetAuthFlowState() {
  resetCaptchaState()
  resetLinkLoginState()
}

function restoreSnapshot() {
  savedSnapshot.value = educationSessionService.getSnapshot(currentAppUserId.value)
}

function clearEducationLocalCache() {
  educationSessionService.clearSnapshot()
  educationScheduleCacheService.clearSnapshot()
}

function savePendingLinkLogin(result: EducationLoginLinkResult) {
  if (!currentAppUserId.value) {
    return
  }

  const pendingLinkLogin: EducationPendingLinkLogin = {
    appUserId: currentAppUserId.value,
    challengeId: result.challengeId,
    loginUrl: result.loginUrl,
    ticket: result.ticket,
    expiresAt: result.expiresAt
  }

  educationSessionService.savePendingLinkLogin(pendingLinkLogin)
}

function restorePendingLinkLogin() {
  const pendingLinkLogin = educationSessionService.getPendingLinkLogin(currentAppUserId.value)
  if (!pendingLinkLogin) {
    return false
  }

  loginLinkState.value = {
    challengeId: pendingLinkLogin.challengeId,
    loginUrl: pendingLinkLogin.loginUrl,
    ticket: pendingLinkLogin.ticket,
    expiresAt: pendingLinkLogin.expiresAt
  }
  activeLoginMode.value = 'link'
  linkStatus.value = isLinkExpired(pendingLinkLogin.expiresAt)
    ? {
        status: 'expired',
        message: linkExpiredLabel.value
      }
    : {
        status: 'waiting',
        message: linkWaitingLabel.value
      }

  return true
}

function selectLoginMode(mode: LoginMode) {
  if (activeLoginMode.value === mode) {
    return
  }
  activeLoginMode.value = mode
  resetAuthFlowState()
}

function goBack() {

  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/mine/index' })
  }
}

function getMarkerStyle(point: EducationCaptchaPoint) {
  if (!captchaState.value) {
    return {}
  }
  return {
    left: `${(point.x / captchaState.value.imageWidth) * 100}%`,
    top: `${(point.y / captchaState.value.imageHeight) * 100}%`
  }
}

function isLinkExpired(expiresAt?: string | null) {
  const raw = String(expiresAt || '').trim()
  if (!raw) {
    return false
  }
  const timestamp = new Date(raw).getTime()
  return Number.isFinite(timestamp) && timestamp <= Date.now()
}

function getPageSource() {
  try {
    const pageStack = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const currentPage = Array.isArray(pageStack) ? pageStack[pageStack.length - 1] : null
    return String((currentPage as { options?: Record<string, unknown> } | null)?.options?.source || '').trim()
  } catch {
    return ''
  }
}

function navigateBackToSchedule() {
  if (getPageSource() !== 'schedule') {
    return
  }


  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.navigateTo({ url: '/pages/study/schedule' })
  }
}

function applyLoginSuccess(result: EducationLoginResult, fallbackStudentId = '') {
  const snapshot: EducationAuthSnapshot = {
    appUserId: currentAppUserId.value,
    studentId: result.personalInfo.studentId || fallbackStudentId,
    cookieBundle: result.cookieBundle,
    personalInfo: result.personalInfo,
    authenticatedAt: new Date().toISOString()
  }

  educationSessionService.saveSnapshot(snapshot)
  savedSnapshot.value = snapshot
  reconnecting.value = false
  studentId.value = snapshot.studentId || studentId.value
  password.value = ''
  resetAuthFlowState()
  showToast(loginSuccessLabel.value, 1800)
  navigateBackToSchedule()
}

async function requestCaptcha() {
  captchaState.value = await educationFunctionService.getCaptcha()
  resetSelectedPoints()
}

async function handleFetchCaptcha() {
  if (fetchingCaptcha.value || !canFetchCaptcha.value) {
    if (!canFetchCaptcha.value) {
      showToast(credentialsRequiredLabel.value)
    }
    return
  }

  fetchingCaptcha.value = true
  try {
    await requestCaptcha()
  } catch (error: any) {
    const message =
      typeof error?.message === 'string' && error.message ? error.message : captchaLoadFailedLabel.value
    showToast(message)
  } finally {
    fetchingCaptcha.value = false
  }
}

async function handleRefreshCaptcha() {
  if (fetchingCaptcha.value) {
    return
  }
  await handleFetchCaptcha()
}

async function handleCaptchaTap(event: Record<string, any>) {
  if (!captchaState.value || selectedPoints.value.length >= captchaState.value.captchaTextHints.length) {
    return
  }

  const clientPoint = extractEventClientPoint(event)
  if (!clientPoint) {
    showToast(captchaRequiredLabel.value)
    return
  }

  const rect = await getElementRect(instance?.proxy as object | undefined, '#captcha-image-panel')
  if (!rect || !captchaState.value.imageWidth || !captchaState.value.imageHeight) {
    showToast(captchaLoadFailedLabel.value)
    return
  }

  const point = mapClientPointToImagePoint(
    clientPoint,
    rect,
    captchaState.value.imageWidth,
    captchaState.value.imageHeight,
    selectedPoints.value.length + 1
  )
  selectedPoints.value = [...selectedPoints.value, point]
}

async function handleSubmitLogin() {
  if (submitting.value) {
    return
  }
  if (!captchaState.value || !canSubmitLogin.value) {
    showToast(captchaRequiredLabel.value)
    return
  }
  if (!studentId.value.trim() || !password.value) {
    showToast(credentialsRequiredLabel.value)
    return
  }

  submitting.value = true
  try {
    const result = await educationFunctionService.submitLogin({
      challengeId: captchaState.value.challengeId,
      username: studentId.value.trim(),
      password: password.value,
      imginfo: buildCaptchaImginfo(selectedPoints.value, captchaState.value.imageWidth, captchaState.value.imageHeight)
    })

    applyLoginSuccess(result, studentId.value.trim())
  } catch (error: any) {
    const message =
      typeof error?.message === 'string' && error.message ? error.message : sessionExpiredLabel.value
    showToast(message, 2800)
    resetSelectedPoints()
    try {
      await requestCaptcha()
    } catch {
      // ignore follow-up captcha refresh failure
    }
  } finally {
    submitting.value = false
  }
}

async function requestLoginLink() {
  const result = await educationFunctionService.getLoginLink()
  loginLinkState.value = result
  linkStatus.value = {
    status: 'waiting',
    message: linkReadyLabel.value
  }
  savePendingLinkLogin(result)
}

async function confirmLoginLink() {
  if (!loginLinkState.value || confirmingLoginLink.value) {
    return
  }

  confirmingLoginLink.value = true
  try {
    const result = await educationFunctionService.confirmLoginLink({
      challengeId: loginLinkState.value.challengeId,
      ticket: loginLinkState.value.ticket
    })
    applyLoginSuccess(result)
  } catch (error: any) {
    const message = typeof error?.message === 'string' && error.message ? error.message : linkErrorLabel.value
    linkStatus.value = {
      status: 'error',
      message
    }
    showToast(message)
  } finally {
    confirmingLoginLink.value = false
  }
}

async function pollLoginLinkStatusOnce() {
  if (!loginLinkState.value || linkPollingInFlight || confirmingLoginLink.value) {
    return
  }

  if (isLinkExpired(loginLinkState.value.expiresAt)) {
    stopLinkPolling()
    linkStatus.value = {
      status: 'expired',
      message: linkExpiredLabel.value
    }
    return
  }

  const currentChallengeId = loginLinkState.value.challengeId
  linkPollingInFlight = true
  try {
    const result = await educationFunctionService.checkLoginLink({
      challengeId: currentChallengeId,
      ticket: loginLinkState.value.ticket
    })
    if (loginLinkState.value?.challengeId !== currentChallengeId) {
      return
    }
    linkStatus.value = result
    if (result.status === 'confirmed') {
      stopLinkPolling()
      await confirmLoginLink()
      return
    }
    if (result.status === 'expired' || result.status === 'error') {
      stopLinkPolling()
    }
  } catch (error: any) {
    const message = typeof error?.message === 'string' && error.message ? error.message : linkErrorLabel.value
    stopLinkPolling()
    linkStatus.value = {
      status: 'error',
      message
    }
    showToast(message)
  } finally {
    linkPollingInFlight = false
  }
}

function startLinkPolling() {
  if (!loginLinkState.value || confirmingLoginLink.value || isLinkExpired(loginLinkState.value.expiresAt)) {
    return
  }
  stopLinkPolling()
  void pollLoginLinkStatusOnce()
  linkPollingTimer.value = setInterval(() => {
    void pollLoginLinkStatusOnce()
  }, 2000)
}

async function handleFetchLoginLink() {
  if (fetchingLoginLink.value || confirmingLoginLink.value) {
    return
  }

  fetchingLoginLink.value = true
  try {
    resetLinkLoginState()
    await requestLoginLink()
    startLinkPolling()
  } catch (error: any) {
    const message = typeof error?.message === 'string' && error.message ? error.message : linkErrorLabel.value
    linkStatus.value = {
      status: 'error',
      message
    }
    showToast(message)
  } finally {
    fetchingLoginLink.value = false
  }
}

function openExternalLoginUrl(url: string) {
  const plusRuntime = (globalThis as any).plus?.runtime
  if (plusRuntime?.openURL) {
    try {
      plusRuntime.openURL(url)
      return true
    } catch {
      return false
    }
  }

  if (typeof window !== 'undefined') {
    const userAgent = String(window.navigator?.userAgent || '').toLowerCase()
    const isWechatBrowser = userAgent.includes('micromessenger')

    try {
      if (isWechatBrowser && typeof window.location?.assign === 'function') {
        window.location.assign(url)
        return true
      }
      if (typeof window.open === 'function') {
        window.open(url, '_blank', 'noopener,noreferrer')
        return true
      }
      if (typeof window.location?.assign === 'function') {
        window.location.assign(url)
        return true
      }
    } catch {
      return false
    }
  }

  return false
}

async function copyLoginLink(url: string) {
  const clipboardApi = (uni as any).setClipboardData
  if (typeof clipboardApi !== 'function') {
    return false
  }

  return new Promise<boolean>((resolve) => {
    clipboardApi({
      data: url,
      success: () => {
        showToast(linkCopiedLabel.value)
        resolve(true)
      },
      fail: () => resolve(false)
    })
  })
}

async function handleOpenLoginLink() {
  const loginUrl = String(loginLinkState.value?.loginUrl || '').trim()
  if (!loginUrl || openingLoginLink.value || confirmingLoginLink.value) {
    return
  }

  openingLoginLink.value = true
  try {
    const opened = openExternalLoginUrl(loginUrl)
    if (!opened) {
      const copied = await copyLoginLink(loginUrl)
      if (!copied) {
        showToast(linkOpenFailedLabel.value)
      }
    }
  } finally {
    openingLoginLink.value = false
  }
}

async function resumeAuthPageState() {
  if (resumeStateInFlight) {
    return
  }

  resumeStateInFlight = true
  try {
    uiPreferencesStore.initFromSystem()
    await authStore.init()
    if (!authStore.isLoggedIn) {
      redirectToLogin('/pages/mine/identity')
      return
    }

    restoreSnapshot()
    if (savedSnapshot.value) {
      stopLinkPolling()
      educationSessionService.clearPendingLinkLogin()
      studentId.value = savedSnapshot.value.studentId || savedSnapshot.value.personalInfo.studentId
      reconnecting.value = false
      return
    }

    reconnecting.value = true
    if (!loginLinkState.value) {
      restorePendingLinkLogin()
    }
    if (activeLoginMode.value === 'link' && loginLinkState.value) {
      if (isLinkExpired(loginLinkState.value.expiresAt)) {
        stopLinkPolling()
        linkStatus.value = {
          status: 'expired',
          message: linkExpiredLabel.value
        }
        return
      }
      startLinkPolling()
    }
  } finally {
    resumeStateInFlight = false
  }
}

function handleBrowserPageShow() {
  void resumeAuthPageState()
}

function handleBrowserPageHide() {
  stopLinkPolling()
}

function handleVisibilityChange() {
  if (typeof document === 'undefined') {
    return
  }

  if (document.visibilityState === 'visible') {
    void resumeAuthPageState()
    return
  }

  stopLinkPolling()
}

function startReconnect() {
  const cachedStudentId = savedSnapshot.value?.studentId || savedSnapshot.value?.personalInfo.studentId || ''
  clearEducationLocalCache()
  savedSnapshot.value = null
  reconnecting.value = true
  studentId.value = cachedStudentId
  password.value = ''
  resetAuthFlowState()
}

function clearAuthSnapshot() {
  clearEducationLocalCache()
  savedSnapshot.value = null
  reconnecting.value = false
  password.value = ''
  resetAuthFlowState()
  showToast(t(I18N_KEYS.mineIdentityCleared, uiPreferencesStore.locale))
}

onShow(() => {
  void resumeAuthPageState()
})

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('pageshow', handleBrowserPageShow)
    window.addEventListener('pagehide', handleBrowserPageHide)
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('pageshow', handleBrowserPageShow)
    window.removeEventListener('pagehide', handleBrowserPageHide)
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
  stopLinkPolling()
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

.hero-card,
.mode-card,
.form-card,
.captcha-card,
.link-card,
.success-card {
  border-radius: 24rpx;
  border: 1px solid var(--line);
  background: var(--surface);
}

.hero-card {
  margin-top: 14rpx;
  padding: 34rpx;
  background: linear-gradient(135deg, rgba(111, 222, 129, 0.22), rgba(111, 222, 129, 0.07));
}

.hero-title,
.captcha-title,
.success-title {
  color: var(--text-main);
  display: block;
  font-size: 34rpx;
  font-weight: 700;
}

.hero-title {
  font-size: 46rpx;
}

.hero-subtitle,
.captcha-subtitle,
.success-subtitle {
  margin-top: 8rpx;
  color: var(--text-sub);
  display: block;
  font-size: 24rpx;
}

.mode-card,
.form-card,
.captcha-card,
.link-card,
.success-card {
  margin-top: 22rpx;
  padding: 24rpx;
}

.mode-label,
.input-label,
.hint-label,
.points-label,
.info-label {
  color: var(--text-main);
  font-size: 24rpx;
  font-weight: 600;
}

.mode-tabs {
  margin-top: 14rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.mode-tab {
  min-height: 80rpx;
  border-radius: 16rpx;
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-sub);
  font-size: 26rpx;
  font-weight: 600;
}

.mode-tab.active {
  color: #ffffff;
  border-color: transparent;
  background: linear-gradient(135deg, #6fde81, #2cbb63);
}

.input-group {
  margin-bottom: 16rpx;
}

.input-group-last {
  margin-bottom: 0;
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
  box-sizing: border-box;
}

.placeholder-style {
  color: #9ca3af;
}

.submit-btn,
.secondary-btn,
.ghost-btn {
  min-height: 88rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-btn {
  margin-top: 18rpx;
  background: #6fde81;
}

.submit-btn-inline {
  margin-top: 0;
  flex: 1;
}

.submit-btn.disabled,
.secondary-btn.disabled,
.ghost-btn.disabled {
  opacity: 0.45;
}

.submit-text,
.secondary-btn-text,
.ghost-btn-text {
  font-size: 30rpx;
  font-weight: 700;
}

.submit-text,
.secondary-btn-text {
  color: #ffffff;
}

.ghost-btn-text {
  color: #2cbb63;
}

.ghost-btn {
  padding: 0 24rpx;
  border: 1px solid var(--line);
  background: rgba(111, 222, 129, 0.08);
}

.secondary-btn {
  padding: 0 24rpx;
  background: linear-gradient(135deg, #6fde81, #2cbb63);
}

.captcha-header,
.success-head,
.captcha-actions,
.success-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.captcha-refresh {
  color: #2cbb63;
  font-size: 24rpx;
  font-weight: 700;
}

.hint-section,
.points-row,
.link-status-card {
  margin-top: 18rpx;
}

.hint-chips,
.point-tags {
  margin-top: 12rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.hint-chip,
.point-tag {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  border: 1px solid var(--line);
  color: var(--text-sub);
  font-size: 22rpx;
}

.hint-chip.active,
.hint-chip.done,
.point-tag {
  color: #1f7f45;
  background: rgba(111, 222, 129, 0.16);
}

.point-empty {
  color: var(--text-sub);
  font-size: 22rpx;
}

.captcha-image-panel {
  position: relative;
  margin-top: 18rpx;
  border-radius: 20rpx;
  overflow: hidden;
  border: 1px solid var(--line);
  background: rgba(111, 222, 129, 0.06);
}

.captcha-image {
  width: 100%;
  display: block;
}

.captcha-marker {
  position: absolute;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: #2cbb63;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
  box-shadow: 0 10rpx 24rpx rgba(44, 187, 99, 0.26);
}

.status-pill {
  margin-top: 12rpx;
  padding: 12rpx 18rpx;
  border-radius: 16rpx;
  font-size: 24rpx;
  font-weight: 600;
  border: 1px solid var(--line);
  color: var(--text-sub);
  background: rgba(111, 222, 129, 0.08);
  word-break: break-word;
}

.status-pill-waiting {
  color: #1f7f45;
  background: rgba(111, 222, 129, 0.16);
}

.status-pill-confirmed {
  color: #14532d;
  background: rgba(34, 197, 94, 0.18);
}

.status-pill-expired,
.status-pill-error {
  color: #b91c1c;
  background: rgba(248, 113, 113, 0.12);
}

.captcha-actions,
.success-actions {
  margin-top: 22rpx;
}

.success-head {
  align-items: flex-start;
}

.success-icon {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6fde81, #2cbb63);
  flex-shrink: 0;
}

.success-copy {
  flex: 1;
}

.info-grid {
  margin-top: 24rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.info-item {
  padding: 18rpx;
  border-radius: 18rpx;
  border: 1px solid var(--line);
  background: rgba(111, 222, 129, 0.06);
}

.info-value {
  margin-top: 8rpx;
  display: block;
  color: var(--text-main);
  font-size: 26rpx;
  font-weight: 600;
  word-break: break-all;
}
</style>
