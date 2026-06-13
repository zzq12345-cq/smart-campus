import { Query } from 'appwrite'
import authService from '@/services/auth'
import mentalHealthFunctionService from '@/services/mental-health-function'
import type {
  MentalHealthAssessment,
  MentalHealthInsightTimelineItem,
  MentalHealthInsightsPageData,
  MentalHealthInsightsSummary,
  MentalHealthIntervention,
  MentalHealthRiskLevel,
  MentalHealthTooltipMessage
} from '@/types/mental-health'
import type { NotificationRow } from '@/types/notification'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import {
  MENTAL_HEALTH_ASSESSMENTS_TABLE_ID,
  MENTAL_HEALTH_INTERVENTIONS_TABLE_ID,
  MINDGUARD_DATABASE_ID,
  NOTIFICATIONS_TABLE_ID,
  SUGGESTIONS_TABLE_ID
} from '@/utils/appwrite-shared'

interface SuggestionRow {
  $id: string
  title: string
  description?: string
  metadataJson?: string
  priority?: string
  category?: string
  status?: string
  $createdAt?: string
  $updatedAt?: string
}

class MentalHealthInsightsService {
  private async getAuthUserId() {
    const user = await authService.getCurrentUser()
    return String(user?.$id || '').trim()
  }

  private safeParseJson<T>(value: unknown, fallback: T): T {
    try {
      return JSON.parse(String(value || '')) as T
    } catch {
      return fallback
    }
  }

  private normalizeText(value: unknown, maxLength = 1000) {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim()
    return normalized ? normalized.slice(0, maxLength) : ''
  }

  private clampRiskLevel(level?: unknown) {
    return Math.max(0, Math.min(3, Number(level || 0))) as MentalHealthRiskLevel
  }

  private toTimestamp(raw?: string) {
    const timestamp = Date.parse(String(raw || ''))
    return Number.isFinite(timestamp) ? timestamp : 0
  }

  private buildEmptySummary(): MentalHealthInsightsSummary {
    return {
      latestSource: undefined,
      latestRiskLevel: 0,
      latestText: '',
      latestCreatedAt: '',
      assessmentCount: 0,
      interventionCount: 0,
      suggestionCount: 0,
      notificationCount: 0,
      totalCount: 0
    }
  }

  private buildEmptyPageData(): MentalHealthInsightsPageData {
    return {
      summary: this.buildEmptySummary(),
      timeline: []
    }
  }

  private getRiskCategory(level?: number) {
    const riskLevel = this.clampRiskLevel(level)
    switch (riskLevel) {
      case 3:
        return '高风险提醒'
      case 2:
        return '干预建议'
      case 1:
        return '情绪关注'
      default:
        return 'AI 提示'
    }
  }

  private getAssessmentStudentMessage(row: MentalHealthAssessment) {
    const snapshot = this.safeParseJson<Record<string, unknown>>(row.featureSnapshotJson, {})
    return this.normalizeText(snapshot.studentMessage, 800)
  }

  private getSuggestionRiskLevel(row: SuggestionRow) {
    const metadata = this.safeParseJson<Record<string, unknown>>(row.metadataJson, {})
    return this.clampRiskLevel(metadata.finalRiskLevel)
  }

  private mapIntervention(row: MentalHealthIntervention): MentalHealthTooltipMessage | null {
    const payload = this.safeParseJson<Record<string, unknown>>(row.payloadJson, {})
    const text = this.normalizeText(payload.studentMessage || payload.message, 240)
    if (!text) {
      return null
    }
    return {
      id: row.$id,
      category: this.normalizeText(payload.category || 'AI 关怀', 40) || 'AI 关怀',
      text,
      riskLevel: this.clampRiskLevel(payload.riskLevel)
    }
  }

  private mapAssessment(row: MentalHealthAssessment): MentalHealthTooltipMessage | null {
    const text =
      this.normalizeText(row.emotionSummary, 240) ||
      this.getAssessmentStudentMessage(row) ||
      this.normalizeText(row.recommendedAction, 120)
    if (!text) {
      return null
    }
    return {
      id: row.$id,
      category: this.getRiskCategory(row.finalRiskLevel),
      text,
      riskLevel: this.clampRiskLevel(row.finalRiskLevel)
    }
  }

  private mapSuggestion(row: SuggestionRow): MentalHealthTooltipMessage | null {
    const text = this.normalizeText(row.description, 240)
    if (!text) {
      return null
    }
    return {
      id: row.$id,
      category: this.normalizeText(row.title || '建议', 60) || '建议',
      text,
      riskLevel: this.getSuggestionRiskLevel(row)
    }
  }

  private mapNotification(row: NotificationRow): MentalHealthTooltipMessage | null {
    const text = this.normalizeText(row.preview, 240)
    if (!text) {
      return null
    }
    return {
      id: row.$id,
      category: '系统提醒',
      text
    }
  }

  private mapAssessmentTimeline(row: MentalHealthAssessment): MentalHealthInsightTimelineItem | null {
    const title = this.normalizeText(row.emotionSummary, 240) || this.getRiskCategory(row.finalRiskLevel)
    const text = this.getAssessmentStudentMessage(row)
    const secondaryText = this.normalizeText(row.recommendedAction, 120)
    if (!title && !text && !secondaryText) {
      return null
    }
    return {
      id: row.$id,
      source: 'assessment',
      title: title || this.getRiskCategory(row.finalRiskLevel),
      text,
      secondaryText,
      riskLevel: this.clampRiskLevel(row.finalRiskLevel),
      createdAt: String(row.$createdAt || row.$updatedAt || '')
    }
  }

  private mapInterventionTimeline(row: MentalHealthIntervention): MentalHealthInsightTimelineItem | null {
    const payload = this.safeParseJson<Record<string, unknown>>(row.payloadJson, {})
    const resources = Array.isArray(payload.resources)
      ? payload.resources.map((item) => this.normalizeText(item, 80)).filter(Boolean).slice(0, 2)
      : []
    const title =
      this.normalizeText(payload.title, 120) ||
      this.normalizeText(payload.category, 60) ||
      this.normalizeText(row.actionType, 60)
    const text = this.normalizeText(payload.studentMessage || payload.message, 800)
    const secondaryText = resources.join(' · ')
    if (!title && !text && !secondaryText) {
      return null
    }
    return {
      id: row.$id,
      source: 'intervention',
      title: title || 'AI 干预',
      text,
      secondaryText,
      riskLevel: this.clampRiskLevel(payload.riskLevel),
      createdAt: String(row.$createdAt || row.$updatedAt || '')
    }
  }

  private mapSuggestionTimeline(row: SuggestionRow): MentalHealthInsightTimelineItem | null {
    const title = this.normalizeText(row.title, 120)
    const text = this.normalizeText(row.description, 800)
    const secondaryText = this.normalizeText(row.category, 60)
    if (!title && !text) {
      return null
    }
    return {
      id: row.$id,
      source: 'suggestion',
      title: title || '建议',
      text,
      secondaryText,
      riskLevel: this.getSuggestionRiskLevel(row),
      createdAt: String(row.$createdAt || row.$updatedAt || '')
    }
  }

  private mapNotificationTimeline(row: NotificationRow): MentalHealthInsightTimelineItem | null {
    const title = this.normalizeText(row.preview, 800)
    if (!title) {
      return null
    }
    return {
      id: row.$id,
      source: 'notification',
      title,
      text: '',
      secondaryText: '',
      createdAt: String(row.$createdAt || row.$updatedAt || '')
    }
  }

  private sortTimeline(items: MentalHealthInsightTimelineItem[]) {
    return items.slice().sort((left, right) => this.toTimestamp(right.createdAt) - this.toTimestamp(left.createdAt))
  }

  private buildSummary(
    timeline: MentalHealthInsightTimelineItem[],
    counts: Omit<MentalHealthInsightsSummary, 'latestSource' | 'latestRiskLevel' | 'latestText' | 'latestCreatedAt'>
  ): MentalHealthInsightsSummary {
    const latestInsightItem = timeline.find((item) => item.source !== 'notification') || timeline[0]
    const latestRiskItem =
      timeline.find((item) => typeof item.riskLevel === 'number' && item.riskLevel > 0) || latestInsightItem

    return {
      latestSource: latestInsightItem?.source,
      latestRiskLevel: this.clampRiskLevel(latestRiskItem?.riskLevel),
      latestText: latestInsightItem?.title || latestInsightItem?.text || '',
      latestCreatedAt: latestInsightItem?.createdAt || '',
      ...counts
    }
  }

  private async listAssessments(userId: string, limit: number) {
    const result = await tablesDB.listRows(MINDGUARD_DATABASE_ID, MENTAL_HEALTH_ASSESSMENTS_TABLE_ID, [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(limit)
    ])
    return (result?.rows || []) as MentalHealthAssessment[]
  }

  private async listInterventions(userId: string, limit: number) {
    const result = await tablesDB.listRows(MINDGUARD_DATABASE_ID, MENTAL_HEALTH_INTERVENTIONS_TABLE_ID, [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(limit)
    ])
    return (result?.rows || []) as MentalHealthIntervention[]
  }

  private async listSuggestions(userId: string, limit: number) {
    const result = await tablesDB.listRows(MINDGUARD_DATABASE_ID, SUGGESTIONS_TABLE_ID, [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(limit)
    ])
    return (result?.rows || []) as SuggestionRow[]
  }

  private async listSystemNotifications(userId: string, limit: number) {
    const result = await tablesDB.listRows(MINDGUARD_DATABASE_ID, NOTIFICATIONS_TABLE_ID, [
      Query.equal('recipientId', userId),
      Query.equal('type', 'system'),
      Query.orderDesc('$createdAt'),
      Query.limit(limit)
    ])
    return (result?.rows || []) as NotificationRow[]
  }

  async listTooltipMessages(limit = 6) {
    const userId = await this.getAuthUserId()
    if (!userId) {
      return [] as MentalHealthTooltipMessage[]
    }

    try {
      const interventions = (await this.listInterventions(userId, limit))
        .map((row) => this.mapIntervention(row))
        .filter((row): row is MentalHealthTooltipMessage => Boolean(row))
      if (interventions.length) {
        return interventions
      }
    } catch {
      // ignore missing table or auth mismatch and continue fallback chain
    }

    try {
      const assessments = (await this.listAssessments(userId, limit))
        .map((row) => this.mapAssessment(row))
        .filter((row): row is MentalHealthTooltipMessage => Boolean(row))
      if (assessments.length) {
        return assessments
      }
    } catch {
      // ignore missing table or auth mismatch and continue fallback chain
    }

    try {
      const suggestions = (await this.listSuggestions(userId, limit))
        .map((row) => this.mapSuggestion(row))
        .filter((row): row is MentalHealthTooltipMessage => Boolean(row))
      if (suggestions.length) {
        return suggestions
      }
    } catch {
      // ignore missing table or auth mismatch and continue fallback chain
    }

    try {
      return (await this.listSystemNotifications(userId, limit))
        .map((row) => this.mapNotification(row))
        .filter((row): row is MentalHealthTooltipMessage => Boolean(row))
    } catch {
      return [] as MentalHealthTooltipMessage[]
    }
  }

  async getInsightsPageData(limit = 20) {
    const userId = await this.getAuthUserId()
    if (!userId) {
      return this.buildEmptyPageData()
    }

    const settledResults = await Promise.allSettled([
      this.listAssessments(userId, limit),
      this.listInterventions(userId, limit),
      this.listSuggestions(userId, limit),
      this.listSystemNotifications(userId, limit)
    ])

    const assessments = settledResults[0].status === 'fulfilled' ? settledResults[0].value : []
    const interventions = settledResults[1].status === 'fulfilled' ? settledResults[1].value : []
    const suggestions = settledResults[2].status === 'fulfilled' ? settledResults[2].value : []
    const notifications = settledResults[3].status === 'fulfilled' ? settledResults[3].value : []

    if (settledResults.every((item) => item.status === 'rejected')) {
      throw new Error('Failed to load mental health insights')
    }

    const timeline = this.sortTimeline(
      [
        ...assessments.map((row) => this.mapAssessmentTimeline(row)),
        ...interventions.map((row) => this.mapInterventionTimeline(row)),
        ...suggestions.map((row) => this.mapSuggestionTimeline(row)),
        ...notifications.map((row) => this.mapNotificationTimeline(row))
      ].filter((row): row is MentalHealthInsightTimelineItem => Boolean(row))
    )

    return {
      summary: this.buildSummary(timeline, {
        assessmentCount: assessments.length,
        interventionCount: interventions.length,
        suggestionCount: suggestions.length,
        notificationCount: notifications.length,
        totalCount: timeline.length
      }),
      timeline
    } as MentalHealthInsightsPageData
  }

  async refreshInsights(options: { limit?: number; windowDays?: number; aggregateDays?: number } = {}) {
    const userId = await this.getAuthUserId()
    if (!userId) {
      return this.buildEmptyPageData()
    }

    await mentalHealthFunctionService.evaluateUserWindow({
      userId,
      windowDays: options.windowDays ?? 7,
      aggregateDays: options.aggregateDays ?? 30
    })

    return this.getInsightsPageData(options.limit ?? 20)
  }
}

const mentalHealthInsightsService = new MentalHealthInsightsService()
export default mentalHealthInsightsService
