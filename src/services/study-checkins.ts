import { ID, Permission, Query, Role } from 'appwrite'
import authService from '@/services/auth'
import mentalHealthFunctionService from '@/services/mental-health-function'
import type { StudyCheckin, StudyCheckinCreateData } from '@/types/study-checkin'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import { MINDGUARD_DATABASE_ID, STUDY_CHECKINS_TABLE_ID } from '@/utils/appwrite-shared'

class StudyCheckinsService {
  private getDatabaseAndTable() {
    return {
      databaseId: MINDGUARD_DATABASE_ID,
      tableId: STUDY_CHECKINS_TABLE_ID
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

  private async queueMentalHealthEvaluation(rowId: string) {
    try {
      await mentalHealthFunctionService.evaluateEvent({
        sourceTable: 'study_checkins',
        rowId,
        eventType: 'create'
      })
    } catch (error) {
      console.warn('Mental health evaluation skipped for study checkin:', error)
    }
  }

  async createCheckin(input: StudyCheckinCreateData) {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const payload = {
      userId,
      checkinDate: input.checkinDate,
      checkinType: input.checkinType,
      content: input.content,
      duration: input.duration
    }
    const permissions = this.buildPermissions(userId)
    const created = (await tablesDB.createRow(databaseId, tableId, ID.unique(), payload, permissions)) as StudyCheckin
    await this.queueMentalHealthEvaluation(created.$id)
    return created
  }

  async getMyCheckins(options: { startDate?: string; endDate?: string; limit?: number; offset?: number } = {}) {
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
    queries.push(Query.limit(options.limit ?? 50))
    queries.push(Query.offset(options.offset ?? 0))

    const result = await tablesDB.listRows(databaseId, tableId, queries)
    return (result?.rows || []) as StudyCheckin[]
  }

  async getCheckinsByMonth(year: number, month: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return this.getMyCheckins({ startDate, endDate, limit: 100 })
  }

  async getStreakDays() {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()

    const queries: string[] = [
      Query.equal('userId', userId),
      Query.orderDesc('checkinDate'),
      Query.limit(100)
    ]

    const result = await tablesDB.listRows(databaseId, tableId, queries)
    const rows = (result?.rows || []) as StudyCheckin[]

    if (!rows.length) {
      return 0
    }

    const uniqueDates = Array.from(new Set(rows.map((r) => r.checkinDate))).sort().reverse()
    const today = new Date()
    const todayStr = formatDate(today)
    const yesterdayStr = formatDate(new Date(today.getTime() - 86400000))

    if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
      return 0
    }

    let streak = 1
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1])
      const currDate = new Date(uniqueDates[i])
      const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / 86400000)
      if (diffDays === 1) {
        streak++
      } else {
        break
      }
    }

    return streak
  }
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const studyCheckinsService = new StudyCheckinsService()
export default studyCheckinsService
