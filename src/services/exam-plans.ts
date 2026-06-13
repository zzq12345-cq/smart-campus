import { ID, Permission, Query, Role } from 'appwrite'
import authService from '@/services/auth'
import mentalHealthFunctionService from '@/services/mental-health-function'
import type { ExamPlan, ExamPlanCreateData, ExamTask } from '@/types/exam-plan'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import { MINDGUARD_DATABASE_ID, EXAM_PLANS_TABLE_ID } from '@/utils/appwrite-shared'

class ExamPlansService {
  private get db() {
    return { databaseId: MINDGUARD_DATABASE_ID, tableId: EXAM_PLANS_TABLE_ID }
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

  private buildPermissions(authorId: string) {
    return [
      Permission.read(Role.user(authorId)),
      Permission.update(Role.user(authorId)),
      Permission.delete(Role.user(authorId))
    ]
  }

  private async queueMentalHealthEvaluation(rowId: string, eventType: 'create' | 'update') {
    try {
      await mentalHealthFunctionService.evaluateEvent({
        sourceTable: 'exam_plans',
        rowId,
        eventType
      })
    } catch (error) {
      console.warn('Mental health evaluation skipped for exam plan:', error)
    }
  }

  async createExamPlan(data: ExamPlanCreateData, userId?: string) {
    const authorId = userId || (await this.getAuthUserId())
    const { databaseId, tableId } = this.db

    const payload: Record<string, unknown> = {
      authorId,
      subject: data.subject,
      examDate: data.examDate,
      examEndDate: data.examEndDate || '',
      location: data.location || '',
      examType: data.examType,
      notes: data.notes || '',
      tasks: JSON.stringify(data.tasks || []),
      isPublic: false
    }

    const permissions = this.buildPermissions(authorId)
    const created = (await tablesDB.createRow(databaseId, tableId, ID.unique(), payload, permissions)) as ExamPlan
    await this.queueMentalHealthEvaluation(created.$id, 'create')
    return created
  }

  async getMyExamPlans(userId?: string) {
    const authorId = userId || (await this.getAuthUserId())
    const { databaseId, tableId } = this.db
    const queries = [
      Query.equal('authorId', authorId),
      Query.orderAsc('examDate'),
      Query.limit(100)
    ]
    const result = await tablesDB.listRows(databaseId, tableId, queries)
    return (result?.rows || []) as ExamPlan[]
  }

  async getExamPlan(id: string) {
    const { databaseId, tableId } = this.db
    return (await tablesDB.getRow(databaseId, tableId, id)) as ExamPlan
  }

  async updateExamPlan(id: string, data: Partial<ExamPlanCreateData>) {
    const { databaseId, tableId } = this.db
    const payload: Record<string, unknown> = {}
    if (data.subject !== undefined) payload.subject = data.subject
    if (data.examDate !== undefined) payload.examDate = data.examDate
    if (data.examEndDate !== undefined) payload.examEndDate = data.examEndDate
    if (data.location !== undefined) payload.location = data.location
    if (data.examType !== undefined) payload.examType = data.examType
    if (data.notes !== undefined) payload.notes = data.notes
    if (data.tasks !== undefined) payload.tasks = JSON.stringify(data.tasks)
    const updated = (await tablesDB.updateRow(databaseId, tableId, id, payload)) as ExamPlan
    await this.queueMentalHealthEvaluation(updated.$id, 'update')
    return updated
  }

  async updateTasks(id: string, tasks: ExamTask[]) {
    const { databaseId, tableId } = this.db
    return (await tablesDB.updateRow(databaseId, tableId, id, { tasks: JSON.stringify(tasks) })) as ExamPlan
  }

  async deleteExamPlan(id: string) {
    const { databaseId, tableId } = this.db
    await tablesDB.deleteRow(databaseId, tableId, id)
    return true
  }

  parseTasks(raw: string): ExamTask[] {
    try {
      const arr = JSON.parse(raw || '[]')
      return Array.isArray(arr) ? arr : []
    } catch {
      return []
    }
  }
}

const examPlansService = new ExamPlansService()
export default examPlansService
