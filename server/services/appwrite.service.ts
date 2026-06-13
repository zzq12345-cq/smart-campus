/**
 * Appwrite REST API 服务层
 * 不依赖 Server SDK 和 API Key，通过 REST API 直接操作
 */
import {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_DATABASE_ID,
} from '../config/index.js'

export const DB_ID = APPWRITE_DATABASE_ID

// ========== REST API 请求基础 ==========

interface RequestOptions {
  method?: string
  body?: Record<string, unknown>
  query?: Record<string, unknown>
  headers?: Record<string, string>
}

function flattenQuery(params: Record<string, unknown>, prefix = ''): string[] {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (typeof v === 'object' && v !== null) {
          parts.push(...flattenQuery(v as Record<string, unknown>, `${fullKey}[${i}]`))
        } else {
          parts.push(`${encodeURIComponent(`${fullKey}[${i}]`)}=${encodeURIComponent(String(v))}`)
        }
      })
    } else if (typeof value === 'object' && value !== null) {
      parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(JSON.stringify(value))}`)
    } else if (value !== undefined) {
      parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`)
    }
  }
  return parts
}

async function appwriteRequest<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const queryString = options.query ? `?${flattenQuery(options.query).join('&')}` : ''
  const url = `${APPWRITE_ENDPOINT}${path}${queryString}`

  const headers: Record<string, string> = {
    'X-Appwrite-Project': APPWRITE_PROJECT_ID,
    'X-Appwrite-Response-Format': '1.6.0',
    ...options.headers,
  }

  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null) as { message?: string; type?: string } | null
    const err = new Error(errorData?.message || `Appwrite error (${response.status})`) as Error & {
      statusCode?: number
      type?: string
    }
    err.statusCode = response.status
    err.type = errorData?.type
    throw err
  }

  // DELETE 可能返回空 body
  if (response.status === 204) return {} as T

  return response.json() as Promise<T>
}

// ========== Account API（用户自身操作）==========

interface AppwriteSession {
  $id: string
  userId: string
  secret?: string
}

interface AppwriteAccount {
  $id: string
  email: string
  name: string
  $createdAt: string
}

/**
 * 创建新账号
 */
export async function createAccount(email: string, password: string, name: string): Promise<AppwriteAccount> {
  return appwriteRequest('/account', {
    method: 'POST',
    body: { userId: 'unique()', email, password, name },
  })
}

/**
 * 通过邮箱密码创建 session（验证密码）
 * 返回 session 信息和 cookie
 */
export async function createEmailSession(email: string, password: string): Promise<{
  session: AppwriteSession
  cookies: string
}> {
  const url = `${APPWRITE_ENDPOINT}/account/sessions/email`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': APPWRITE_PROJECT_ID,
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => null) as { message?: string } | null
    const err = new Error(errData?.message || '邮箱或密码错误') as Error & { statusCode?: number }
    err.statusCode = 401
    throw err
  }

  const session = await response.json() as AppwriteSession
  const cookies = response.headers.get('set-cookie') || ''

  return { session, cookies }
}

/**
 * 通过 session cookie 获取当前账号信息
 */
export async function getAccountBySession(cookies: string): Promise<AppwriteAccount> {
  return appwriteRequest('/account', {
    headers: { Cookie: cookies },
  })
}

/**
 * 删除 session
 */
export async function deleteSession(sessionId: string, cookies: string): Promise<void> {
  try {
    await appwriteRequest(`/account/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { Cookie: cookies },
    })
  } catch {
    // 清理失败不阻塞
  }
}

// ========== Databases API ==========

/** Appwrite 文档基础字段 */
export interface AppwriteDocument {
  $id: string
  $createdAt: string
  $updatedAt: string
  [key: string]: unknown
}

interface DocumentList<T = AppwriteDocument> {
  total: number
  documents: T[]
}

export async function listDocuments<T = AppwriteDocument>(
  collectionId: string,
  queries: string[] = [],
  databaseId = DB_ID
): Promise<DocumentList<T>> {
  const query: Record<string, unknown> = {}
  if (queries.length) {
    query.queries = queries
  }
  return appwriteRequest(`/databases/${databaseId}/collections/${collectionId}/documents`, { query })
}

export async function getDocument<T = AppwriteDocument>(
  collectionId: string,
  documentId: string,
  databaseId = DB_ID
): Promise<T> {
  return appwriteRequest<T>(`/databases/${databaseId}/collections/${collectionId}/documents/${documentId}`)
}

export async function createDocument<T = AppwriteDocument>(
  collectionId: string,
  data: Record<string, unknown>,
  documentId?: string,
  permissions?: string[],
  databaseId = DB_ID
): Promise<T> {
  return appwriteRequest<T>(`/databases/${databaseId}/collections/${collectionId}/documents`, {
    method: 'POST',
    body: {
      documentId: documentId || 'unique()',
      data,
      ...(permissions ? { permissions } : {}),
    },
  })
}

export async function updateDocument<T = AppwriteDocument>(
  collectionId: string,
  documentId: string,
  data: Record<string, unknown>,
  permissions?: string[],
  databaseId = DB_ID
): Promise<T> {
  return appwriteRequest<T>(`/databases/${databaseId}/collections/${collectionId}/documents/${documentId}`, {
    method: 'PATCH',
    body: {
      data,
      ...(permissions ? { permissions } : {}),
    },
  })
}

export async function deleteDocument(
  collectionId: string,
  documentId: string,
  databaseId = DB_ID
): Promise<void> {
  return appwriteRequest(`/databases/${databaseId}/collections/${collectionId}/documents/${documentId}`, {
    method: 'DELETE',
  })
}

// ========== Query Helper ==========
// 兼容 Appwrite Query 格式

export const Query = {
  equal: (attr: string, value: unknown) => JSON.stringify({ method: 'equal', attribute: attr, values: Array.isArray(value) ? value : [value] }),
  notEqual: (attr: string, value: unknown) => JSON.stringify({ method: 'notEqual', attribute: attr, values: Array.isArray(value) ? value : [value] }),
  lessThan: (attr: string, value: unknown) => JSON.stringify({ method: 'lessThan', attribute: attr, values: [value] }),
  greaterThan: (attr: string, value: unknown) => JSON.stringify({ method: 'greaterThan', attribute: attr, values: [value] }),
  search: (attr: string, value: string) => JSON.stringify({ method: 'search', attribute: attr, values: [value] }),
  contains: (attr: string, value: unknown) => JSON.stringify({ method: 'contains', attribute: attr, values: Array.isArray(value) ? value : [value] }),
  orderAsc: (attr: string) => JSON.stringify({ method: 'orderAsc', attribute: attr }),
  orderDesc: (attr: string) => JSON.stringify({ method: 'orderDesc', attribute: attr }),
  limit: (value: number) => JSON.stringify({ method: 'limit', values: [value] }),
  offset: (value: number) => JSON.stringify({ method: 'offset', values: [value] }),
  cursorAfter: (id: string) => JSON.stringify({ method: 'cursorAfter', values: [id] }),
}

// Appwrite Permission helper
export const Permission = {
  read: (role: string) => `read("${role}")`,
  write: (role: string) => `write("${role}")`,
  create: (role: string) => `create("${role}")`,
  update: (role: string) => `update("${role}")`,
  delete: (role: string) => `delete("${role}")`,
}

export const Role = {
  any: () => 'any',
  guests: () => 'guests',
  users: () => 'users',
  user: (id: string) => `user:${id}`,
}
