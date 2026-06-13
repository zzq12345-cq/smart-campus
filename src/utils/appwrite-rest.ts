import { config } from '@/utils/appwrite-shared'

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface RequestOptions {
  query?: Record<string, unknown>
  body?: Record<string, unknown>
  headers?: Record<string, string>
}

function hasUniRequest() {
  return typeof uni !== 'undefined' && typeof uni.request === 'function'
}

function getHeaderValue(headers: Record<string, string> | undefined, key: string) {
  if (!headers) {
    return undefined
  }
  return headers[key] ?? headers[key.toLowerCase()]
}

function flattenPayload(data: Record<string, unknown> | unknown[], prefix = ''): Record<string, string> {
  const output: Record<string, string> = {}
  Object.entries(data).forEach(([key, value]) => {
    const finalKey = prefix ? `${prefix}[${key}]` : key
    if (Array.isArray(value)) {
      Object.assign(output, flattenPayload(value, finalKey))
      return
    }
    if (value !== null && typeof value === 'object') {
      output[finalKey] = JSON.stringify(value)
      return
    }
    if (typeof value !== 'undefined') {
      output[finalKey] = String(value)
    }
  })
  return output
}

function encodeQuery(params: Record<string, unknown>) {
  const flattened = flattenPayload(params)
  const pairs = Object.entries(flattened).map(
    ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
  )
  return pairs.length ? `?${pairs.join('&')}` : ''
}

function getCookieFallback() {
  try {
    return uni.getStorageSync('cookieFallback') || ''
  } catch {
    return ''
  }
}

function setCookieFallbackFromHeaders(headers: Record<string, string> | undefined) {
  const cookieFallback = getHeaderValue(headers, 'X-Fallback-Cookies')
  if (!cookieFallback) {
    return
  }
  try {
    uni.setStorageSync('cookieFallback', cookieFallback)
  } catch {
    // ignore
  }
}

function createRequestError(statusCode: number, data: unknown) {
  const payload = data as { message?: string; type?: string } | undefined
  const error = new Error(payload?.message || `Appwrite request failed (${statusCode})`) as Error & {
    code?: number
    type?: string
    response?: unknown
  }
  error.code = statusCode
  error.type = payload?.type
  error.response = data
  return error
}

function appwriteRequest(method: RequestMethod, path: string, options: RequestOptions = {}) {
  if (!hasUniRequest()) {
    const error = new Error('Current runtime does not support uni.request') as Error & { code?: number }
    error.code = 500
    return Promise.reject(error)
  }

  const url = `${config.endpoint}${path}${options.query ? encodeQuery(options.query) : ''}`
  const header: Record<string, string> = {
    'X-Appwrite-Project': config.projectId,
    ...(options.headers || {})
  }
  const cookieFallback = getCookieFallback()
  if (cookieFallback) {
    header['X-Fallback-Cookies'] = cookieFallback
  }

  return new Promise<any>((resolve, reject) => {
    uni.request({
      url,
      method: method as any,
      header,
      data: options.body,
      success: (res) => {
        try {
          setCookieFallbackFromHeaders(res.header as Record<string, string> | undefined)
        } catch {
          // ignore
        }

        const statusCode = res?.statusCode || 0
        if (statusCode >= 400) {
          reject(createRequestError(statusCode, res.data))
          return
        }
        resolve(res.data)
      },
      fail: (rawError) => {
        const error = new Error(rawError?.errMsg || 'Appwrite request failed') as Error & {
          code?: number
          type?: string
          response?: unknown
        }
        error.code = (rawError as any)?.statusCode
        error.type = (rawError as any)?.type
        error.response = rawError
        reject(error)
      }
    })
  })
}

export const account = {
  create(userId: string, email: string, password: string, name?: string) {
    return appwriteRequest('POST', '/account', {
      headers: { 'content-type': 'application/json' },
      body: { userId, email, password, name }
    })
  },
  createEmailPasswordSession(email: string, password: string) {
    return appwriteRequest('POST', '/account/sessions/email', {
      headers: { 'content-type': 'application/json' },
      body: { email, password }
    })
  },
  get() {
    return appwriteRequest('GET', '/account')
  },
  getSession(sessionId: string) {
    return appwriteRequest('GET', `/account/sessions/${encodeURIComponent(sessionId)}`)
  },
  deleteSession(sessionId: string) {
    return appwriteRequest('DELETE', `/account/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { 'content-type': 'application/json' }
    })
  },
  updateName(name: string) {
    return appwriteRequest('PATCH', '/account/name', {
      headers: { 'content-type': 'application/json' },
      body: { name }
    })
  },
  createJWT() {
    return appwriteRequest('POST', '/account/jwts', {
      headers: { 'content-type': 'application/json' }
    })
  },
  createRecovery(email: string, url = `${config.endpoint.replace(/\/v1$/, '')}/recover`) {
    return appwriteRequest('POST', '/account/recovery', {
      headers: { 'content-type': 'application/json' },
      body: { email, url }
    })
  }
}

export const tablesDB = {
  listRows(databaseId: string, tableId: string, queries?: string[], total?: boolean, transactionId?: string) {
    return appwriteRequest('GET', `/tablesdb/${databaseId}/tables/${tableId}/rows`, {
      query: {
        ...(typeof queries !== 'undefined' ? { queries } : {}),
        ...(typeof total !== 'undefined' ? { total } : {}),
        ...(typeof transactionId !== 'undefined' ? { transactionId } : {})
      }
    })
  },
  getRow(databaseId: string, tableId: string, rowId: string, queries?: string[], transactionId?: string) {
    return appwriteRequest('GET', `/tablesdb/${databaseId}/tables/${tableId}/rows/${rowId}`, {
      query: {
        ...(typeof queries !== 'undefined' ? { queries } : {}),
        ...(typeof transactionId !== 'undefined' ? { transactionId } : {})
      }
    })
  },
  createRow(
    databaseId: string,
    tableId: string,
    rowId: string,
    data?: Record<string, unknown>,
    permissions?: string[],
    transactionId?: string
  ) {
    return appwriteRequest('POST', `/tablesdb/${databaseId}/tables/${tableId}/rows`, {
      headers: { 'content-type': 'application/json' },
      body: {
        rowId,
        ...(typeof data !== 'undefined' ? { data } : {}),
        ...(typeof permissions !== 'undefined' ? { permissions } : {}),
        ...(typeof transactionId !== 'undefined' ? { transactionId } : {})
      }
    })
  },
  updateRow(
    databaseId: string,
    tableId: string,
    rowId: string,
    data?: Record<string, unknown>,
    permissions?: string[],
    transactionId?: string
  ) {
    return appwriteRequest('PATCH', `/tablesdb/${databaseId}/tables/${tableId}/rows/${rowId}`, {
      headers: { 'content-type': 'application/json' },
      body: {
        ...(typeof data !== 'undefined' ? { data } : {}),
        ...(typeof permissions !== 'undefined' ? { permissions } : {}),
        ...(typeof transactionId !== 'undefined' ? { transactionId } : {})
      }
    })
  },
  deleteRow(databaseId: string, tableId: string, rowId: string, transactionId?: string) {
    return appwriteRequest('DELETE', `/tablesdb/${databaseId}/tables/${tableId}/rows/${rowId}`, {
      headers: { 'content-type': 'application/json' },
      body: typeof transactionId !== 'undefined' ? { transactionId } : undefined
    })
  },
  incrementRowColumn(
    databaseId: string,
    tableId: string,
    rowId: string,
    column: string,
    value?: number,
    max?: number,
    transactionId?: string
  ) {
    return appwriteRequest('PATCH', `/tablesdb/${databaseId}/tables/${tableId}/rows/${rowId}/${column}/increment`, {
      headers: { 'content-type': 'application/json' },
      body: {
        ...(typeof value !== 'undefined' ? { value } : {}),
        ...(typeof max !== 'undefined' ? { max } : {}),
        ...(typeof transactionId !== 'undefined' ? { transactionId } : {})
      }
    })
  },
  decrementRowColumn(
    databaseId: string,
    tableId: string,
    rowId: string,
    column: string,
    value?: number,
    min?: number,
    transactionId?: string
  ) {
    return appwriteRequest('PATCH', `/tablesdb/${databaseId}/tables/${tableId}/rows/${rowId}/${column}/decrement`, {
      headers: { 'content-type': 'application/json' },
      body: {
        ...(typeof value !== 'undefined' ? { value } : {}),
        ...(typeof min !== 'undefined' ? { min } : {}),
        ...(typeof transactionId !== 'undefined' ? { transactionId } : {})
      }
    })
  }
}

export const storage = null
export const functions = {
  createExecution(
    functionId: string,
    body?: string,
    async?: boolean,
    path?: string,
    method = 'POST',
    headers?: Record<string, string>,
    scheduledAt?: string
  ) {
    return appwriteRequest('POST', `/functions/${encodeURIComponent(functionId)}/executions`, {
      headers: { 'content-type': 'application/json' },
      body: {
        ...(typeof body !== 'undefined' ? { body } : {}),
        ...(typeof async !== 'undefined' ? { async } : {}),
        ...(typeof path !== 'undefined' ? { path } : {}),
        ...(typeof method !== 'undefined' ? { method } : {}),
        ...(typeof headers !== 'undefined' ? { headers } : {}),
        ...(typeof scheduledAt !== 'undefined' ? { scheduledAt } : {})
      }
    })
  },
  getExecution(functionId: string, executionId: string) {
    return appwriteRequest(
      'GET',
      `/functions/${encodeURIComponent(functionId)}/executions/${encodeURIComponent(executionId)}`
    )
  }
}
const client = { ping: () => appwriteRequest('GET', '/ping') }

export { config }
export default client
