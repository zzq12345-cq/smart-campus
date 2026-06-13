/**
 * Mental health assessments service.
 * Persists evaluation results to mental_health_assessments table for trend and future AI analysis.
 * Data is stored per-user with same permission model as checkins.
 * Privacy: Assessment data is used only for user's own history and future AI insights; ensure
 * compliance with local data protection requirements when storing or processing.
 */

import { ID, Permission, Query, Role } from 'appwrite'
import authService from '@/services/auth'
import type { EvaluationAnswer } from '@/types/psychology-evaluation'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import { MINDGUARD_DATABASE_ID, USER_EVALUATION_RESULTS_TABLE_ID } from '@/utils/appwrite-shared'

export interface CreateAssessmentData {
  scaleId: string
  totalScore: number
  maxScore: number
  answers: EvaluationAnswer[]
  resultTier?: string
}

export interface MentalHealthAssessment {
  $id: string
  userId: string
  scaleId: string
  totalScore: number
  maxScore: number
  answers: string
  resultTier?: string
  $createdAt?: string
}

class MentalHealthAssessmentsService {
  private getDatabaseAndTable() {
    return {
      databaseId: MINDGUARD_DATABASE_ID,
      tableId: USER_EVALUATION_RESULTS_TABLE_ID
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
    return [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId))
    ]
  }

  async createAssessment(data: CreateAssessmentData): Promise<MentalHealthAssessment> {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const permissions = this.buildPermissions(userId)
    const payload = {
      userId,
      scaleId: String(data.scaleId || '').trim() || 'mood_screen',
      totalScore: Number(data.totalScore) || 0,
      maxScore: Number(data.maxScore) || 0,
      answers: JSON.stringify(data.answers || []),
      resultTier: data.resultTier != null ? String(data.resultTier) : undefined
    }
    const created = (await tablesDB.createRow(
      databaseId,
      tableId,
      ID.unique(),
      payload as unknown as Record<string, unknown>,
      permissions
    )) as MentalHealthAssessment
    return created
  }

  async listMyAssessments(options: { limit?: number; offset?: number } = {}): Promise<MentalHealthAssessment[]> {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const queries = [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(options.limit ?? 30),
      Query.offset(options.offset ?? 0)
    ]
    const result = await tablesDB.listRows(databaseId, tableId, queries)
    return (result?.rows || []) as MentalHealthAssessment[]
  }
}

const mentalHealthAssessmentsService = new MentalHealthAssessmentsService()
export default mentalHealthAssessmentsService
