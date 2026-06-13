import { ID, Permission, Query, Role } from 'appwrite'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import authService from '@/services/auth'
import { MINDGUARD_DATABASE_ID, USER_SESSIONS_TABLE_ID } from '@/utils/appwrite-shared'
import type { SessionAnomalyResult, SessionUpsertData, UserSession } from '@/types/session'

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000
export const MAX_CONCURRENT_SESSIONS = 5

function toIsoStringOrNull(value: string | number | Date): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  return null
}

function normalizeDeviceInfo(deviceInfo?: string | Record<string, unknown>) {
  if (!deviceInfo) {
    return ''
  }
  if (typeof deviceInfo === 'string') {
    return deviceInfo
  }
  try {
    const payload = JSON.stringify(deviceInfo)
    return payload.length > 500 ? payload.slice(0, 500) : payload
  } catch {
    return ''
  }
}

class UserSessionsService {
  private lastCleanupTimestamp = 0

  private getDatabaseAndTable() {
    return {
      databaseId: MINDGUARD_DATABASE_ID,
      tableId: USER_SESSIONS_TABLE_ID
    }
  }

  private async getAuthUserId() {
    const user = await authService.getCurrentUser()
    return String(user?.$id || '')
  }

  private buildUserPermissions(userId: string) {
    return [Permission.read(Role.user(userId)), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))]
  }

  private async findMySessionBySessionId(sessionId: string, userId?: string): Promise<UserSession | null> {
    const normalizedUserId = userId || (await this.getAuthUserId())
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const queryResult = await tablesDB.listRows(databaseId, tableId, [
      Query.equal('userId', normalizedUserId),
      Query.equal('sessionId', sessionId),
      Query.limit(1)
    ])
    return (queryResult?.rows?.[0] as UserSession) || null
  }

  private shouldCleanup() {
    const now = Date.now()
    return now - this.lastCleanupTimestamp >= CLEANUP_INTERVAL_MS
  }

  async cleanupExpiredSessions(userId?: string) {
    const normalizedUserId = userId || (await this.getAuthUserId())
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const nowIso = new Date().toISOString()
    const expiredRows = await tablesDB.listRows(databaseId, tableId, [
      Query.equal('userId', normalizedUserId),
      Query.lessThan('expiresAt', nowIso),
      Query.limit(100)
    ])

    const rows = (expiredRows?.rows || []) as UserSession[]
    if (!rows.length) {
      this.lastCleanupTimestamp = Date.now()
      return
    }

    await Promise.all(
      rows
        .map((row) => row.$id)
        .filter(Boolean)
        .map((rowId) => tablesDB.deleteRow(databaseId, tableId, String(rowId)))
    )

    this.lastCleanupTimestamp = Date.now()
  }

  private async enforceSessionLimit(userId: string) {
    const sessions = await this.getMySessions()
    if (sessions.length < MAX_CONCURRENT_SESSIONS) {
      return
    }

    const toDeleteCount = sessions.length - MAX_CONCURRENT_SESSIONS + 1
    const sessionsToDelete = sessions.slice(-toDeleteCount)
    const { databaseId, tableId } = this.getDatabaseAndTable()

    await Promise.all(
      sessionsToDelete
        .map((session) => session.$id)
        .filter(Boolean)
        .map((rowId) => tablesDB.deleteRow(databaseId, tableId, String(rowId)))
    )

    console.warn(`[session-security] Enforced MAX_CONCURRENT_SESSIONS=${MAX_CONCURRENT_SESSIONS} for user ${userId}`)
  }

  async detectAnomaly(input: Pick<UserSession, 'countryCode' | 'ipAddress'>): Promise<SessionAnomalyResult> {
    if (!input.countryCode) {
      return { isAnomalous: false }
    }

    const recent = await this.getMySessions(10)
    const knownCountries = recent.map((item) => String(item.countryCode || '').trim()).filter(Boolean)
    if (!knownCountries.length) {
      return { isAnomalous: false }
    }

    const currentCountry = String(input.countryCode).trim()
    const isKnown = knownCountries.includes(currentCountry)
    if (isKnown) {
      return { isAnomalous: false }
    }

    return {
      isAnomalous: true,
      reason: `Unexpected countryCode detected: ${currentCountry}`
    }
  }

  async getMySessions(limit = MAX_CONCURRENT_SESSIONS): Promise<UserSession[]> {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()

    const result = await tablesDB.listRows(databaseId, tableId, [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(limit)
    ])

    return (result?.rows || []) as UserSession[]
  }

  async upsertMySession(input: SessionUpsertData): Promise<UserSession | null> {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()

    if (this.shouldCleanup()) {
      await this.cleanupExpiredSessions(userId)
    }

    const sessionId = String(input.sessionId || '').trim()
    const expiresAt = toIsoStringOrNull(input.expiresAt)
    if (!sessionId || !expiresAt) {
      const error = new Error('sessionId and expiresAt are required') as Error & { code?: number }
      error.code = 400
      throw error
    }

    const payload: Record<string, unknown> = {
      userId,
      sessionId,
      expiresAt
    }

    const deviceInfo = normalizeDeviceInfo(input.deviceInfo)
    if (deviceInfo) {
      payload.deviceInfo = deviceInfo
    }

    const ipAddress = String(input.ipAddress || '').trim()
    if (ipAddress) {
      payload.ipAddress = ipAddress
    }

    const countryCode = String(input.countryCode || '').trim()
    if (countryCode) {
      payload.countryCode = countryCode.slice(0, 8)
    }

    const countryName = String(input.countryName || '').trim()
    if (countryName) {
      payload.countryName = countryName.slice(0, 100)
    }

    const regionName = String(input.regionName || '').trim()
    if (regionName) {
      payload.regionName = regionName.slice(0, 100)
    }

    const cityName = String(input.cityName || '').trim()
    if (cityName) {
      payload.cityName = cityName.slice(0, 100)
    }

    const timezone = String(input.timezone || '').trim()
    if (timezone) {
      payload.timezone = timezone.slice(0, 64)
    }

    if (typeof input.latitude === 'number') {
      payload.latitude = input.latitude
    }
    if (typeof input.longitude === 'number') {
      payload.longitude = input.longitude
    }

    const geoProvider = String(input.geoProvider || '').trim()
    if (geoProvider) {
      payload.geoProvider = geoProvider.slice(0, 32)
      payload.geoUpdatedAt = new Date().toISOString()
    }

    const anomaly = await this.detectAnomaly({
      countryCode: payload.countryCode as string | undefined,
      ipAddress: payload.ipAddress as string | undefined
    })
    if (anomaly.isAnomalous) {
      console.warn(`[session-security] anomaly detected for user ${userId}: ${anomaly.reason}`)
    }

    const existing = await this.findMySessionBySessionId(sessionId, userId)
    const permissions = this.buildUserPermissions(userId)
    if (existing?.$id) {
      return (await tablesDB.updateRow(databaseId, tableId, String(existing.$id), payload, permissions)) as UserSession
    }

    await this.enforceSessionLimit(userId)
    return (await tablesDB.createRow(databaseId, tableId, ID.unique(), payload, permissions)) as UserSession
  }

  async deleteMySessionBySessionId(sessionId: string) {
    const existing = await this.findMySessionBySessionId(String(sessionId || '').trim())
    if (!existing?.$id) {
      return false
    }
    const { databaseId, tableId } = this.getDatabaseAndTable()
    await tablesDB.deleteRow(databaseId, tableId, String(existing.$id))
    return true
  }
}

const userSessionsService = new UserSessionsService()
export default userSessionsService

