/**
 * Auth Service — 认证与用户管理
 * 使用 Appwrite REST API，不依赖 API Key
 */
import {
  createAccount,
  createEmailSession,
  getAccountBySession,
  deleteSession,
  createDocument,
  getDocument,
  updateDocument,
  listDocuments,
  Query,
  Permission,
  Role,
} from './appwrite.service.js'
import { signToken } from '../middleware/auth.js'
import { USERS_TABLE_ID } from '../config/index.js'
import type { DbUser } from '../types/index.js'

/**
 * 构建用户行级权限
 */
function buildUserPermissions(userId: string): string[] {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
    Permission.read(Role.users()),
  ]
}

/**
 * 注册新用户
 */
export async function register(email: string, password: string, name: string) {
  // 1. 通过 Appwrite REST API 创建账号
  const authUser = await createAccount(email, password, name)

  // 2. 创建 session（注册后立即登录）
  const { session, cookies } = await createEmailSession(email, password)

  // 3. 在 users 表创建用户资料行（使用 session cookie 身份）
  let dbUser: any
  try {
    dbUser = await createDocument(
      USERS_TABLE_ID,
      {
        email,
        name,
        level: 1,
        streakDays: 0,
        totalCheckins: 0,
        totalTasks: 0,
        followersCount: 0,
        followingCount: 0,
        privacySettings: '{}',
        notificationSettings: '{}',
      },
      authUser.$id,
      buildUserPermissions(authUser.$id)
    )
  } catch (err) {
    console.error('[Auth] 创建 users 表记录失败:', err)
    // 即使用户表创建失败也不阻塞注册
    dbUser = { $id: authUser.$id, email, name }
  }

  // 4. 清理临时 session
  await deleteSession(session.$id, cookies)

  // 5. 签发自有 JWT
  const token = signToken({
    userId: authUser.$id,
    email: authUser.email,
    name: authUser.name,
  })

  return {
    token,
    user: {
      id: authUser.$id,
      email: authUser.email,
      name: authUser.name,
    },
    dbUser: sanitizeDbUser(dbUser as unknown as DbUser),
  }
}

/**
 * 用户登录
 */
export async function login(email: string, password: string) {
  // 1. 通过 Appwrite REST API 验证密码（创建临时 session）
  const { session, cookies } = await createEmailSession(email, password)

  // 2. 获取用户账号信息
  const authUser = await getAccountBySession(cookies)

  // 3. 获取 users 表记录
  let dbUser: DbUser
  try {
    const doc = await getDocument(USERS_TABLE_ID, authUser.$id)
    dbUser = doc as unknown as DbUser
  } catch {
    // 如果 users 表还没有记录，创建一个
    try {
      const doc = await createDocument(
        USERS_TABLE_ID,
        {
          email: authUser.email,
          name: authUser.name,
          level: 1,
          streakDays: 0,
          totalCheckins: 0,
          totalTasks: 0,
          followersCount: 0,
          followingCount: 0,
          privacySettings: '{}',
          notificationSettings: '{}',
        },
        authUser.$id,
        buildUserPermissions(authUser.$id)
      )
      dbUser = doc as unknown as DbUser
    } catch {
      dbUser = {
        $id: authUser.$id,
        $createdAt: authUser.$createdAt,
        $updatedAt: authUser.$createdAt,
        email: authUser.email,
        name: authUser.name,
        level: 1,
        streakDays: 0,
        totalCheckins: 0,
        totalTasks: 0,
      }
    }
  }

  // 4. 清理临时 session
  await deleteSession(session.$id, cookies)

  // 5. 签发自有 JWT
  const token = signToken({
    userId: authUser.$id,
    email: authUser.email,
    name: authUser.name,
  })

  return {
    token,
    user: {
      id: authUser.$id,
      email: authUser.email,
      name: authUser.name,
    },
    dbUser: sanitizeDbUser(dbUser),
  }
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(userId: string) {
  const dbUser = await getDocument(USERS_TABLE_ID, userId)
  return sanitizeDbUser(dbUser as unknown as DbUser)
}

/**
 * 更新用户资料
 */
export async function updateProfile(
  userId: string,
  patch: {
    name?: string
    avatar?: string | null
    bio?: string
    school?: string
    teacherSubject?: string
  }
) {
  const data: Record<string, unknown> = {}
  if (patch.name !== undefined) data.name = patch.name
  if (patch.avatar !== undefined) data.avatar = patch.avatar
  if (patch.bio !== undefined) data.bio = patch.bio
  if (patch.school !== undefined) data.school = patch.school
  if (patch.teacherSubject !== undefined) data.teacherSubject = patch.teacherSubject

  if (Object.keys(data).length === 0) {
    return getCurrentUser(userId)
  }

  const updated = await updateDocument(USERS_TABLE_ID, userId, data)
  return sanitizeDbUser(updated as unknown as DbUser)
}

/**
 * 密码重置
 * TODO: 接入邮件服务（如 Resend / SendGrid）发送重置链接
 * 当前为占位实现 — 安全设计：不透露用户是否存在
 */
export async function resetPassword(email: string) {
  // TODO: 实现密码重置邮件发送逻辑
  console.warn(`[Auth] resetPassword called for ${email}, but email sending is not implemented yet`)
  return true
}

function sanitizeDbUser(user: DbUser) {
  return {
    id: user.$id,
    email: user.email,
    name: user.name,
    avatar: user.avatar || null,
    bio: user.bio || null,
    school: user.school || null,
    teacherSubject: user.teacherSubject || null,
    level: user.level,
    streakDays: user.streakDays,
    totalCheckins: user.totalCheckins,
    totalTasks: user.totalTasks,
    followersCount: user.followersCount || 0,
    followingCount: user.followingCount || 0,
    createdAt: user.$createdAt,
  }
}
