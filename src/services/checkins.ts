import { ID, Permission, Query, Role } from 'appwrite'
import authService from '@/services/auth'
import mentalHealthFunctionService from '@/services/mental-health-function'
import type { Checkin, CheckinCreateData, CheckinUpdateData } from '@/types/checkin'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import { CHECKINS_TABLE_ID, MINDGUARD_DATABASE_ID } from '@/utils/appwrite-shared'

const CHECKIN_MOOD_SET = new Set(['happy', 'calm', 'anxious', 'sad', 'angry'])

class CheckinsService {
  private getDatabaseAndTable() {
    return {
      databaseId: MINDGUARD_DATABASE_ID,
      tableId: CHECKINS_TABLE_ID
    }
  }

  private async getAuthUserId() {
    const user = await authService.getCurrentUser()
    if (!user?.$id) {
      const error = new Error('User is not authenticated') as Error & { code?: number }
      error.code = 401
      throw error
    }
    return user.$id
  }

  private buildPermissions(userId: string) {
    return [Permission.read(Role.user(userId)), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))]
  }

  private normalizeMood(mood?: unknown): Checkin['mood'] {
    if (typeof mood === 'string' && CHECKIN_MOOD_SET.has(mood)) {
      return mood as Checkin['mood']
    }
    return 'calm'
  }

  private normalizeScale(value: unknown, fallback: number) {
    const normalized = Number(value ?? fallback)
    if (!Number.isFinite(normalized)) {
      return fallback
    }
    return Math.max(1, Math.min(5, Math.round(normalized)))
  }

  private normalizeRiskLevel(value: unknown) {
    const normalized = Number(value ?? 1)
    if (!Number.isFinite(normalized)) {
      return 1
    }
    return Math.max(1, Math.min(3, Math.round(normalized)))
  }

  private normalizeText(value: unknown, maxLength: number) {
    return String(value || '').trim().slice(0, maxLength)
  }

  private async queueMentalHealthEvaluation(rowId: string, eventType: 'create' | 'update') {
    try {
      await mentalHealthFunctionService.evaluateEvent({
        sourceTable: 'checkins',
        rowId,
        eventType
      })
    } catch (error) {
      console.warn('Mental health evaluation skipped for checkin:', error)
    }
  }

  async createCheckin(input: CheckinCreateData) {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const payload = {
      userId,
      checkinDate: this.normalizeText(input.checkinDate, 10),
      mood: this.normalizeMood(input.mood),
      moodIntensity: this.normalizeScale(input.moodIntensity, 3),
      energyLevel: this.normalizeScale(input.energyLevel, 3),
      notes: this.normalizeText(input.notes, 1000),
      riskLevel: this.normalizeRiskLevel(input.riskLevel),
      riskReason: this.normalizeText(input.riskReason, 1000)
    }

    const permissions = this.buildPermissions(userId)
    const created = (await tablesDB.createRow(databaseId, tableId, ID.unique(), payload, permissions)) as Checkin
    await this.queueMentalHealthEvaluation(created.$id, 'create')
    return created
  }

  async listMyCheckins(options: { startDate?: string; endDate?: string; limit?: number; offset?: number } = {}) {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const queries: string[] = [Query.equal('userId', userId)]
    if (options.startDate) {
      queries.push(Query.greaterThanEqual('checkinDate', options.startDate))
    }
    if (options.endDate) {
      queries.push(Query.lessThanEqual('checkinDate', options.endDate))
    }
    queries.push(Query.orderDesc('checkinDate'))
    queries.push(Query.limit(options.limit ?? 30))
    queries.push(Query.offset(options.offset ?? 0))

    const result = await tablesDB.listRows(databaseId, tableId, queries)
    return (result?.rows || []) as Checkin[]
  }

  async getMyCheckin(rowId: string) {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const row = (await tablesDB.getRow(databaseId, tableId, rowId)) as Checkin
    if (row.userId !== userId) {
      const error = new Error('No access to this checkin') as Error & { code?: number }
      error.code = 403
      throw error
    }
    return row
  }

  async updateCheckin(rowId: string, patch: CheckinUpdateData) {
    const existing = await this.getMyCheckin(rowId)
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const permissions = this.buildPermissions(existing.userId)
    const payload = {
      userId: existing.userId,
      checkinDate: patch.checkinDate ? this.normalizeText(patch.checkinDate, 10) : existing.checkinDate,
      mood: this.normalizeMood(patch.mood ?? existing.mood),
      moodIntensity: this.normalizeScale(patch.moodIntensity ?? existing.moodIntensity, 3),
      energyLevel: this.normalizeScale(patch.energyLevel ?? existing.energyLevel, 3),
      notes: this.normalizeText(patch.notes ?? existing.notes, 1000),
      riskLevel: this.normalizeRiskLevel(patch.riskLevel ?? existing.riskLevel),
      riskReason: this.normalizeText(patch.riskReason ?? existing.riskReason, 1000)
    }

    const updated = (await tablesDB.updateRow(databaseId, tableId, rowId, payload, permissions)) as Checkin
    await this.queueMentalHealthEvaluation(updated.$id, 'update')
    return updated
  }

  async deleteCheckin(rowId: string) {
    await this.getMyCheckin(rowId)
    const { databaseId, tableId } = this.getDatabaseAndTable()
    await tablesDB.deleteRow(databaseId, tableId, rowId)
  }
}

const checkinsService = new CheckinsService()
export default checkinsService
