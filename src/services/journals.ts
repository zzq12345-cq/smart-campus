import { ID, Permission, Query, Role } from 'appwrite'
import authService from '@/services/auth'
import mentalHealthFunctionService from '@/services/mental-health-function'
import type { Journal, JournalCreateData, JournalListOptions, JournalUpdateData } from '@/types/journal'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import { JOURNALS_TABLE_ID, MINDGUARD_DATABASE_ID } from '@/utils/appwrite-shared'

const JOURNAL_MOOD_SET = new Set(['happy', 'calm', 'anxious', 'sad', 'angry'])
const LEGACY_MOOD_TO_MODERN = {
  开心: 'happy',
  喜悦: 'happy',
  平静: 'calm',
  焦虑: 'anxious',
  低落: 'sad'
} as const

const MODERN_MOOD_TO_LEGACY = {
  happy: '开心',
  calm: '平静',
  anxious: '焦虑',
  sad: '低落',
  angry: '低落'
} as const

const MOOD_COLOR_MAP = {
  happy: '#F59E0B',
  calm: '#60A5FA',
  anxious: '#F87171',
  sad: '#9CA3AF',
  angry: '#EF4444'
} as const

class JournalsService {
  private getDatabaseAndTable() {
    return {
      databaseId: MINDGUARD_DATABASE_ID,
      tableId: JOURNALS_TABLE_ID
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

  private buildUserPermissions(userId: string) {
    return [Permission.read(Role.user(userId)), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))]
  }

  private normalizeMood(mood?: unknown): Journal['mood'] {
    if (typeof mood === 'string' && JOURNAL_MOOD_SET.has(mood)) {
      return mood as Journal['mood']
    }
    if (typeof mood === 'string' && mood in LEGACY_MOOD_TO_MODERN) {
      return LEGACY_MOOD_TO_MODERN[mood as keyof typeof LEGACY_MOOD_TO_MODERN]
    }
    return 'calm'
  }

  private normalizeTags(tags?: unknown) {
    if (!Array.isArray(tags)) {
      return []
    }
    return tags
      .map((item) => String(item || '').trim().slice(0, 50))
      .filter(Boolean)
      .slice(0, 10)
  }

  private normalizeRiskLevel(riskLevel?: unknown) {
    const value = Number(riskLevel ?? 1)
    if (!Number.isFinite(value)) {
      return 1
    }
    return Math.max(1, Math.min(3, Math.round(value)))
  }

  private normalizeSentimentScore(score?: unknown) {
    const value = Number(score ?? 0)
    if (!Number.isFinite(value)) {
      return 0
    }
    return Math.max(-1, Math.min(1, value))
  }

  private normalizeStoredTitle(title?: unknown) {
    const normalized = String(title || '').trim()
    return normalized ? normalized.slice(0, 200) : ''
  }

  private normalizeSummary(summary?: unknown) {
    return String(summary || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1000)
  }

  private normalizeLegacyMood(mood?: unknown) {
    const normalized = this.normalizeMood(mood)
    return MODERN_MOOD_TO_LEGACY[normalized]
  }

  private normalizeLegacyMoodIntensity(mood?: Journal['mood'], riskLevel?: unknown) {
    const normalizedMood = this.normalizeMood(mood)
    const normalizedRiskLevel = this.normalizeRiskLevel(riskLevel)
    if (normalizedRiskLevel >= 3) {
      return 5
    }
    if (normalizedMood === 'anxious' || normalizedMood === 'sad' || normalizedMood === 'angry') {
      return normalizedRiskLevel >= 2 ? 4 : 3
    }
    return normalizedMood === 'happy' ? 4 : 2
  }

  private normalizeLegacyMoodColor(mood?: Journal['mood']) {
    const normalizedMood = this.normalizeMood(mood)
    return MOOD_COLOR_MAP[normalizedMood]
  }

  private buildCompatPayload(input: JournalCreateData | JournalUpdateData, existing?: Partial<Journal> & Record<string, unknown>) {
    const content = String(input.content ?? existing?.content ?? '').trim()
    const mood = this.normalizeMood(input.mood ?? existing?.mood)
    const tags = this.normalizeTags(input.tags ?? existing?.tags ?? existing?.tagIds)
    const isPrivate = input.isPrivate ?? existing?.isPrivate ?? Boolean(existing?.rebtOnly ?? true)
    const riskLevel = this.normalizeRiskLevel(input.riskLevel ?? existing?.riskLevel)

    return {
      userId: existing?.userId || '',
      title: this.normalizeStoredTitle(existing?.title),
      content,
      mood,
      isPrivate,
      tags,
      summary: this.normalizeSummary(input.summary ?? existing?.summary),
      sentimentScore: this.normalizeSentimentScore(input.sentimentScore ?? existing?.sentimentScore),
      riskLevel,
      entryAt: String(existing?.entryAt || new Date().toISOString()),
      rebtOnly: Boolean(isPrivate),
      tagIds: tags,
      moodIntensity: this.normalizeLegacyMoodIntensity(mood, riskLevel),
      moodColor: this.normalizeLegacyMoodColor(mood),
      attachments: Array.isArray(existing?.attachments) ? existing.attachments : [],
      legacyMood: this.normalizeLegacyMood(mood)
    }
  }

  private normalizeJournalRow(row: Journal & Record<string, unknown>) {
    const mood = this.normalizeMood(row.mood)
    const tags = this.normalizeTags(row.tags ?? row.tagIds)
    const title = this.normalizeStoredTitle(row.title)

    return {
      ...row,
      mood,
      title: title || undefined,
      isPrivate: row.isPrivate ?? Boolean(row.rebtOnly ?? true),
      tags,
      summary: this.normalizeSummary(row.summary),
      sentimentScore: this.normalizeSentimentScore(row.sentimentScore),
      riskLevel: this.normalizeRiskLevel(row.riskLevel ?? row.moodIntensity)
    } as Journal
  }

  private async queueMentalHealthEvaluation(rowId: string, eventType: 'create' | 'update') {
    try {
      await mentalHealthFunctionService.evaluateEvent({
        sourceTable: 'journals',
        rowId,
        eventType
      })
    } catch (error) {
      console.warn('Mental health evaluation skipped for journal:', error)
    }
  }

  async createJournal(input: JournalCreateData) {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()

    const payload = this.buildCompatPayload(input, {
      userId,
      isPrivate: true
    })

    const permissions = this.buildUserPermissions(userId)
    const createPayload = {
      ...payload,
      userId,
      mood: payload.mood,
      legacyMood: undefined
    } as Record<string, unknown>
    createPayload.mood = payload.mood
    createPayload.entryAt = payload.entryAt
    createPayload.rebtOnly = payload.rebtOnly
    createPayload.tagIds = payload.tagIds
    createPayload.moodIntensity = payload.moodIntensity
    createPayload.moodColor = payload.moodColor
    createPayload.attachments = payload.attachments

    const created = this.normalizeJournalRow(
      (await tablesDB.createRow(databaseId, tableId, ID.unique(), createPayload, permissions)) as Journal & Record<string, unknown>
    )
    await this.queueMentalHealthEvaluation(created.$id, 'create')
    return created
  }

  async getMyJournals(options: JournalListOptions = {}) {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()

    const queries: string[] = [Query.equal('userId', userId)]
    if (options.mood) {
      queries.push(Query.equal('mood', options.mood))
    }
    if (typeof options.isPrivate === 'boolean') {
      queries.push(Query.equal('isPrivate', options.isPrivate))
    }
    if (typeof options.riskLevel === 'number') {
      queries.push(Query.equal('riskLevel', this.normalizeRiskLevel(options.riskLevel)))
    }

    const order = options.order || 'desc'
    queries.push(order === 'asc' ? Query.orderAsc('$createdAt') : Query.orderDesc('$createdAt'))
    queries.push(Query.limit(options.limit ?? 20))
    queries.push(Query.offset(options.offset ?? 0))

    const result = await tablesDB.listRows(databaseId, tableId, queries)
    return (result?.rows || []).map((row) => this.normalizeJournalRow(row as Journal & Record<string, unknown>))
  }

  async getJournalById(rowId: string) {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const row = this.normalizeJournalRow((await tablesDB.getRow(databaseId, tableId, rowId)) as Journal & Record<string, unknown>)
    if (row?.userId !== userId) {
      const forbidden = new Error('No access to this journal') as Error & { code?: number }
      forbidden.code = 403
      throw forbidden
    }
    return row
  }

  async updateJournal(rowId: string, patch: JournalUpdateData) {
    const existing = await this.getJournalById(rowId)
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const permissions = this.buildUserPermissions(existing.userId)

    const payload = this.buildCompatPayload(patch, existing as Journal & Record<string, unknown>)
    const updatePayload: Record<string, unknown> = {
      userId: existing.userId,
      title: payload.title,
      content: payload.content,
      mood: payload.mood,
      isPrivate: payload.isPrivate,
      tags: payload.tags,
      summary: payload.summary,
      sentimentScore: payload.sentimentScore,
      riskLevel: payload.riskLevel,
      entryAt: payload.entryAt,
      rebtOnly: payload.rebtOnly,
      tagIds: payload.tagIds,
      moodIntensity: payload.moodIntensity,
      moodColor: payload.moodColor,
      attachments: payload.attachments
    }

    const updated = this.normalizeJournalRow(
      (await tablesDB.updateRow(databaseId, tableId, rowId, updatePayload, permissions)) as Journal & Record<string, unknown>
    )
    await this.queueMentalHealthEvaluation(updated.$id, 'update')
    return updated
  }

  async deleteJournal(rowId: string) {
    await this.getJournalById(rowId)
    const { databaseId, tableId } = this.getDatabaseAndTable()
    await tablesDB.deleteRow(databaseId, tableId, rowId)
    return true
  }

  async getJournalsByRiskRange(riskMin: number, riskMax: number) {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const result = await tablesDB.listRows(databaseId, tableId, [
      Query.equal('userId', userId),
      Query.greaterThanEqual('riskLevel', this.normalizeRiskLevel(riskMin)),
      Query.lessThanEqual('riskLevel', this.normalizeRiskLevel(riskMax)),
      Query.orderDesc('$createdAt'),
      Query.limit(50)
    ])
    return (result?.rows || []).map((row) => this.normalizeJournalRow(row as Journal & Record<string, unknown>))
  }

  async createMyJournal(input: JournalCreateData) {
    return this.createJournal(input)
  }

  async listMyJournals(options: JournalListOptions = {}) {
    const rows = await this.getMyJournals(options)
    return { rows, total: rows.length }
  }

  async getMyJournal(rowId: string) {
    return this.getJournalById(rowId)
  }

  async updateMyJournal(rowId: string, patch: JournalUpdateData) {
    return this.updateJournal(rowId, patch)
  }

  async deleteMyJournal(rowId: string) {
    return this.deleteJournal(rowId)
  }
}

const journalsService = new JournalsService()
export default journalsService
