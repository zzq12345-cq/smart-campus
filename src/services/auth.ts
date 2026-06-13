import { ID, Permission, Role } from 'appwrite'
import userSessionsService from '@/services/user-sessions'
import type {
  AuthUser,
  DbUser,
  DeviceInfoSnapshot,
  LoginResult,
  ProfileUpdateInput,
  RegisterResult,
  Session,
} from '@/types/auth'
import { clearToken } from '@/utils/api-client'
import { account, tablesDB } from '@/utils/appwrite'
import { syncClientSession, syncClientSessionFromStorage } from '@/utils/appwrite-sdk'
import { MINDGUARD_DATABASE_ID, USERS_TABLE_ID } from '@/utils/appwrite-shared'

const STORAGE_KEYS = {
  isLoggedIn: 'isLoggedIn',
  user: 'user',
  dbUser: 'dbUser',
  session: 'session',
  cookieFallback: 'cookieFallback',
} as const

type AppwriteError = { code?: number; type?: string }
type SessionWithSecret = Session & { secret?: string | null; expiration?: string | number | null }

function asAppwriteError(error: unknown) {
  return error as AppwriteError
}

function getClientSessionSecret(session: Session | null | undefined) {
  const candidate = session as SessionWithSecret | null | undefined
  return typeof candidate?.secret === 'string' ? candidate.secret.trim() : ''
}

class AuthService {
  private getSessionExpiresAt(session: Session | null | undefined) {
    const candidate = session as SessionWithSecret | null | undefined
    const values = [session?.expire, session?.expiresAt, candidate?.expiration]
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim()
      }
      if (typeof value === 'number') {
        return value
      }
    }
    return null
  }

  private setAuthStorage(session: Session, user: AuthUser, dbUser: DbUser) {
    clearToken()
    uni.setStorageSync(STORAGE_KEYS.isLoggedIn, true)
    uni.setStorageSync(STORAGE_KEYS.session, session)
    uni.setStorageSync(STORAGE_KEYS.user, user)
    uni.setStorageSync(STORAGE_KEYS.dbUser, dbUser)
    syncClientSession(getClientSessionSecret(session))
  }

  private clearAuthStorage() {
    clearToken()
    uni.removeStorageSync(STORAGE_KEYS.isLoggedIn)
    uni.removeStorageSync(STORAGE_KEYS.session)
    uni.removeStorageSync(STORAGE_KEYS.user)
    uni.removeStorageSync(STORAGE_KEYS.dbUser)
    uni.removeStorageSync(STORAGE_KEYS.cookieFallback)
    syncClientSession()
  }

  private async recordUserSession(session: Session) {
    const sessionId = String(session?.$id || '').trim()
    if (!sessionId) {
      return
    }

    let expiresAt = this.getSessionExpiresAt(session)
    let ipAddress = String(session?.ip || '').trim()
    let countryCode = String(session?.countryCode || '').trim()
    let countryName = String(session?.countryName || '').trim()

    if (!expiresAt) {
      try {
        const current = (await account.getSession('current')) as Session | null
        expiresAt = this.getSessionExpiresAt(current)
        if (!ipAddress) {
          ipAddress = String(current?.ip || '').trim()
        }
        if (!countryCode) {
          countryCode = String(current?.countryCode || '').trim()
        }
        if (!countryName) {
          countryName = String(current?.countryName || '').trim()
        }
      } catch {
        return
      }
    }

    if (!expiresAt) {
      return
    }

    try {
      await userSessionsService.upsertMySession({
        sessionId,
        expiresAt,
        deviceInfo: (this.getDeviceInfoSnapshot() as Record<string, unknown> | null) || undefined,
        ipAddress,
        countryCode,
        countryName,
      })
    } catch {
      // ignore
    }
  }

  private buildUsersRowPermissions(userId: string) {
    return [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
      Permission.read(Role.users()),
    ]
  }

  private async createEmailPasswordSessionWithRetry(email: string, password: string) {
    try {
      return (await account.createEmailPasswordSession(email, password)) as Session
    } catch (error) {
      const appwriteError = asAppwriteError(error)
      if (appwriteError.type !== 'user_session_already_exists') {
        throw error
      }
      try {
        await account.deleteSession('current')
      } catch {
        // ignore
      }
      return (await account.createEmailPasswordSession(email, password)) as Session
    }
  }

  getDeviceInfoSnapshot(): DeviceInfoSnapshot | null {
    try {
      const info = uni.getSystemInfoSync?.()
      if (!info) {
        return null
      }
      return {
        platform: info.platform,
        uniPlatform: info.uniPlatform,
        brand: info.brand,
        model: info.model,
        system: info.system,
        appVersion: info.appVersion,
      }
    } catch {
      return null
    }
  }

  async ensureUsersRow(authUser: AuthUser): Promise<DbUser> {
    const permissions = this.buildUsersRowPermissions(authUser.$id)

    try {
      const existing = (await tablesDB.getRow(MINDGUARD_DATABASE_ID, USERS_TABLE_ID, authUser.$id)) as DbUser
      const existingPermissions = Array.isArray(existing?.$permissions) ? existing.$permissions : []
      if (!existingPermissions.includes(Permission.read(Role.users()))) {
        try {
          return (await tablesDB.updateRow(
            MINDGUARD_DATABASE_ID,
            USERS_TABLE_ID,
            authUser.$id,
            undefined,
            permissions
          )) as DbUser
        } catch {
          return existing
        }
      }
      return existing
    } catch (error) {
      const appwriteError = asAppwriteError(error)
      if (appwriteError.code !== 404) {
        throw error
      }
    }

    return (await tablesDB.createRow(
      MINDGUARD_DATABASE_ID,
      USERS_TABLE_ID,
      authUser.$id,
      {
        email: authUser.email,
        name: authUser.name,
        level: 1,
        streakDays: 0,
        totalCheckins: 0,
        totalTasks: 0,
        privacySettings: '{}',
        notificationSettings: '{}',
      },
      permissions
    )) as DbUser
  }

  async refreshProfile() {
    try {
      syncClientSessionFromStorage()
      const user = (await account.get()) as AuthUser
      const dbUser = await this.ensureUsersRow(user)
      uni.setStorageSync(STORAGE_KEYS.isLoggedIn, true)
      uni.setStorageSync(STORAGE_KEYS.user, user)
      uni.setStorageSync(STORAGE_KEYS.dbUser, dbUser)
      return { user, dbUser }
    } catch {
      return null
    }
  }

  async register(email: string, password: string, name: string): Promise<RegisterResult> {
    await this.deleteActiveSessionIfAny()
    await account.create(ID.unique(), email, password, name)

    const session = await this.createEmailPasswordSessionWithRetry(email, password)
    const user = (await account.get()) as AuthUser
    const dbUser = await this.ensureUsersRow(user)

    this.setAuthStorage(session, user, dbUser)
    await this.recordUserSession(session)

    return { session, user, dbUser }
  }

  async login(email: string, password: string): Promise<LoginResult> {
    await this.deleteActiveSessionIfAny()
    const session = await this.createEmailPasswordSessionWithRetry(email, password)
    const user = (await account.get()) as AuthUser
    const dbUser = await this.ensureUsersRow(user)

    this.setAuthStorage(session, user, dbUser)
    await this.recordUserSession(session)

    return { session, user, dbUser }
  }

  async resetPassword(email: string) {
    await account.createRecovery(email)
    return true
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      syncClientSessionFromStorage()
      return (await account.get()) as AuthUser
    } catch {
      return null
    }
  }

  isLoggedIn() {
    return Boolean(uni.getStorageSync(STORAGE_KEYS.isLoggedIn))
  }

  getStoredUser(): AuthUser | null {
    return (uni.getStorageSync(STORAGE_KEYS.user) as AuthUser) || null
  }

  getStoredDbUser(): DbUser | null {
    return (uni.getStorageSync(STORAGE_KEYS.dbUser) as DbUser) || null
  }

  async updateProfile(input: ProfileUpdateInput = {}) {
    syncClientSessionFromStorage()
    const authUser = (await account.get()) as AuthUser
    const existingDbUser = await this.ensureUsersRow(authUser)

    const patch: Record<string, unknown> = {}
    if (typeof input.name === 'string') {
      patch.name = input.name.trim()
    }
    if (input.avatar === null) {
      patch.avatar = null
    } else if (typeof input.avatar === 'string') {
      const avatar = input.avatar.trim()
      if (avatar) {
        patch.avatar = avatar
      }
    }
    if (typeof input.bio === 'string') {
      patch.bio = input.bio.trim()
    }
    if (typeof input.school === 'string') {
      patch.school = input.school.trim()
    }
    if (typeof input.teacherSubject === 'string') {
      patch.teacherSubject = input.teacherSubject.trim()
    }

    let dbUser = existingDbUser
    if (Object.keys(patch).length > 0) {
      dbUser = (await tablesDB.updateRow(
        MINDGUARD_DATABASE_ID,
        USERS_TABLE_ID,
        authUser.$id,
        patch
      )) as DbUser
    }

    let user = authUser
    if (typeof patch.name === 'string' && patch.name !== authUser.name) {
      try {
        await account.updateName(patch.name)
        user = (await account.get()) as AuthUser
      } catch {
        // ignore
      }
    }

    uni.setStorageSync(STORAGE_KEYS.isLoggedIn, true)
    uni.setStorageSync(STORAGE_KEYS.user, user)
    uni.setStorageSync(STORAGE_KEYS.dbUser, dbUser)
    return { user, dbUser }
  }

  async deleteActiveSessionIfAny() {
    try {
      syncClientSessionFromStorage()
      await account.deleteSession('current')
    } catch {
      // ignore
    }
  }

  async logout() {
    try {
      const storedSession = (uni.getStorageSync(STORAGE_KEYS.session) as SessionWithSecret) || null
      const storedSessionId = String(storedSession?.$id || '').trim()
      if (storedSessionId) {
        try {
          await userSessionsService.deleteMySessionBySessionId(storedSessionId)
        } catch {
          // ignore
        }
      }
      syncClientSessionFromStorage()
      await account.deleteSession('current')
    } catch {
      // ignore
    } finally {
      this.clearAuthStorage()
    }
  }
}

const authService = new AuthService()
export default authService
