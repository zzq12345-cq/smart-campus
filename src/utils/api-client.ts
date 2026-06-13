/**
 * 统一后端 API 客户端
 * 前端所有服务通过此模块与后端通信
 */

const API_BASE = (import.meta as any).env?.VITE_API_URL || ''

// ========== Token 管理 ==========

const TOKEN_KEY = 'jwt_token'

export function getToken(): string {
  try {
    return uni.getStorageSync(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(token: string): void {
  try {
    uni.setStorageSync(TOKEN_KEY, token)
  } catch {
    // ignore
  }
}

export function clearToken(): void {
  try {
    uni.removeStorageSync(TOKEN_KEY)
  } catch {
    // ignore
  }
}

// ========== 请求封装 ==========

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: string[]
}

interface RequestOptions {
  method?: string
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  headers?: Record<string, string>
  /** 跳过自动设置 Authorization 头 */
  skipAuth?: boolean
}

class ApiError extends Error {
  code: number
  details?: string[]
  constructor(message: string, code: number, details?: string[]) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
  }
}

function buildQueryString(query?: Record<string, string | number | boolean | undefined>): string {
  if (!query) return ''
  const pairs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  return pairs.length ? `?${pairs.join('&')}` : ''
}

/**
 * 通用 API 请求
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = `${API_BASE}${path}${buildQueryString(options.query)}`
  const token = options.skipAuth ? '' : getToken()

  const headers: Record<string, string> = {
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  // 优先使用 uni.request（兼容小程序），浏览器环境用 fetch
  if (typeof uni !== 'undefined' && typeof uni.request === 'function') {
    return uniApiRequest<T>(url, options.method || 'GET', headers, options.body)
  }

  return fetchApiRequest<T>(url, options.method || 'GET', headers, options.body)
}

/** fetch 实现 */
async function fetchApiRequest<T>(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: unknown
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = (await response.json()) as ApiResponse<T>

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error || data.message || `请求失败 (${response.status})`,
      response.status,
      data.details
    )
  }

  return data.data as T
}

/** uni.request 实现（小程序兼容） */
function uniApiRequest<T>(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: unknown
): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: method as any,
      header: headers,
      data: body as string | AnyObject | ArrayBuffer | undefined,
      success: (res) => {
        const data = res.data as ApiResponse<T>
        const status = res.statusCode || 0

        if (status >= 400 || !data?.success) {
          reject(
            new ApiError(
              data?.error || data?.message || `请求失败 (${status})`,
              status,
              data?.details
            )
          )
          return
        }

        resolve(data.data as T)
      },
      fail: (err) => {
        reject(new ApiError(err?.errMsg || '网络请求失败', 0))
      },
    })
  })
}

// ========== 便捷方法 ==========

export function apiGet<T = unknown>(path: string, query?: Record<string, string | number | boolean | undefined>) {
  return apiRequest<T>(path, { method: 'GET', query })
}

export function apiPost<T = unknown>(path: string, body?: unknown) {
  return apiRequest<T>(path, { method: 'POST', body })
}

export function apiPatch<T = unknown>(path: string, body?: unknown) {
  return apiRequest<T>(path, { method: 'PATCH', body })
}

export function apiDelete<T = unknown>(path: string) {
  return apiRequest<T>(path, { method: 'DELETE' })
}

export { ApiError }
export default { apiRequest, apiGet, apiPost, apiPatch, apiDelete, getToken, setToken, clearToken }
