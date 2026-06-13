import { useAuthStore } from '@/stores/auth'

const LOGIN_PAGE_URL = '/pages/mine/login'
const FALLBACK_PAGE_URL = '/pages/mine/index'

const AUTH_WHITELIST = [
  '/pages/mine/login',
  '/pages/mine/register',
  '/pages/mine/forgot-password'
]

let interceptorInstalled = false

function getPathFromUrl(url: string): string {
  return url.split('?')[0]
}

function isWhitelisted(url: string): boolean {
  return AUTH_WHITELIST.includes(getPathFromUrl(url))
}

function getCurrentRouteUrl() {
  const pages = getCurrentPages()
  if (!pages.length) {
    return ''
  }
  const current = pages[pages.length - 1] as any
  const route = `/${current.route}`
  const options = current.options || {}
  const query = Object.keys(options)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(options[key]))}`)
    .join('&')
  return query ? `${route}?${query}` : route
}

export function redirectToLogin(redirectUrl?: string) {
  const target = redirectUrl || getCurrentRouteUrl()
  const loginUrl = target && !isWhitelisted(target)
    ? `${LOGIN_PAGE_URL}?redirect=${encodeURIComponent(target)}`
    : LOGIN_PAGE_URL

  uni.navigateTo({
    url: loginUrl,
    fail: () => {
      uni.switchTab({
        url: FALLBACK_PAGE_URL
      })
    }
  })
}

export function setupAuthInterceptor() {
  if (interceptorInstalled) return
  interceptorInstalled = true

  const methods = ['navigateTo', 'redirectTo', 'reLaunch', 'switchTab'] as const

  for (const method of methods) {
    uni.addInterceptor(method, {
      invoke(args: any) {
        if (!args.url || isWhitelisted(args.url)) return args

        // authStore.isLoggedIn defaults to false before init(),
        // so an uninitialized store safely redirects to login.
        const authStore = useAuthStore()
        if (authStore.isLoggedIn) return args

        const targetUrl = args.url as string
        const loginUrl = `${LOGIN_PAGE_URL}?redirect=${encodeURIComponent(targetUrl)}`

        uni.navigateTo({
          url: loginUrl,
          fail: () => uni.switchTab({ url: FALLBACK_PAGE_URL })
        })
        return false
      }
    })
  }
}

export function checkAuthOnLaunch() {
  const authStore = useAuthStore()
  // init() is synchronous in practice (only uni.getStorageSync calls),
  // so this completes before the isLoggedIn check below.
  void authStore.init()
  if (!authStore.isLoggedIn) {
    uni.reLaunch({ url: LOGIN_PAGE_URL })
  }
}

export function requireAuth(redirectUrl?: string) {
  const authStore = useAuthStore()
  if (authStore.isLoggedIn) {
    return true
  }

  uni.showToast({
    title: '请先登录',
    icon: 'none'
  })
  redirectToLogin(redirectUrl)
  return false
}

export function getCurrentUser() {
  const authStore = useAuthStore()
  return authStore.user
}

export async function logout(redirectUrl?: string) {
  const authStore = useAuthStore()
  await authStore.logout()
  uni.showToast({
    title: '已退出登录',
    icon: 'success'
  })
  setTimeout(() => {
    redirectToLogin(redirectUrl)
  }, 800)
}

export default {
  requireAuth,
  redirectToLogin,
  getCurrentUser,
  logout,
  setupAuthInterceptor,
  checkAuthOnLaunch
}
