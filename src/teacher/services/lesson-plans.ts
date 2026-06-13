import { ID, Permission, Query, Role } from 'appwrite'
import authService from '@/services/auth'
import type {
  LessonPlan,
  LessonPlanCreateData,
  LessonPlanUpdateData,
  LessonPlanListOptions,
  LessonPlanStatus
} from '@/teacher/types/lesson-plan'
import { tablesDB } from '@/utils/appwrite'
import { TEACHING_DATABASE_ID, LESSON_PLANS_TABLE_ID } from '@/utils/appwrite-shared'

class LessonPlansService {
  private getDatabaseAndTable() {
    return {
      databaseId: TEACHING_DATABASE_ID,
      tableId: LESSON_PLANS_TABLE_ID
    }
  }

  private async getAuthUserId() {
    try {
      const user = await authService.getCurrentUser()
      if (user?.$id) return user.$id
    } catch {}
    return 'local-user-id'
  }

  private buildPermissions(teacherId: string) {
    return [
      Permission.read(Role.user(teacherId)),
      Permission.update(Role.user(teacherId)),
      Permission.delete(Role.user(teacherId))
    ]
  }

  // --- 本地降级存储助手 ---
  private get LOCAL_KEY() { return 'offline_lesson_plans' }

  private getLocalPlans(): LessonPlan[] {
    try {
      const data = uni.getStorageSync(this.LOCAL_KEY)
      return data ? JSON.parse(data) : []
    } catch { return [] }
  }

  private saveLocalPlans(plans: LessonPlan[]) {
    try { uni.setStorageSync(this.LOCAL_KEY, JSON.stringify(plans)) } catch {}
  }

  /** 创建备课方案 */
  async createLessonPlan(data: LessonPlanCreateData, userId?: string): Promise<LessonPlan> {
    const teacherId = userId || (await this.getAuthUserId())
    const { databaseId, tableId } = this.getDatabaseAndTable()

    const payload: Record<string, unknown> = {
      teacherId,
      title: data.title,
      subject: data.subject,
      grade: data.grade || '',
      objectives: data.objectives || '',
      content: data.content || '',
      steps: data.steps || '[]',
      keyPoints: data.keyPoints || '',
      duration: data.duration || 45,
      teachingMethod: data.teachingMethod || '',
      materials: data.materials || '[]',
      homework: data.homework || '',
      reflection: data.reflection || '',
      notes: data.notes || '',
      status: 'draft' as LessonPlanStatus
    }

    try {
      const permissions = this.buildPermissions(teacherId)
      return (await tablesDB.createRow(databaseId, tableId, ID.unique(), payload, permissions)) as LessonPlan
    } catch (error) {
      console.warn('[LessonPlans] 数据库可能未创建，降级到本地离线存储:', error)
      const newPlan = { ...payload, $id: `local-${Date.now()}`, $createdAt: new Date().toISOString(), $updatedAt: new Date().toISOString() } as LessonPlan
      const plans = this.getLocalPlans()
      plans.unshift(newPlan)
      this.saveLocalPlans(plans)
      return newPlan
    }
  }

  /** 获取备课方案列表 */
  async getLessonPlans(options: LessonPlanListOptions = {}): Promise<LessonPlan[]> {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    try {
      const queries: string[] = []
      if (options.status) queries.push(Query.equal('status', options.status))
      if (options.subject) queries.push(Query.equal('subject', options.subject))
      if (options.keyword) queries.push(Query.contains('title', options.keyword.trim()))
      queries.push(Query.orderDesc('$updatedAt'))
      queries.push(Query.limit(options.limit ?? 20))
      queries.push(Query.offset(options.offset ?? 0))

      const result = await tablesDB.listRows(databaseId, tableId, queries)
      return (result?.rows || []) as LessonPlan[]
    } catch (e) {
      // 离线降级
      let plans = this.getLocalPlans()
      if (options.status) plans = plans.filter(p => p.status === options.status)
      if (options.subject) plans = plans.filter(p => p.subject === options.subject)
      if (options.keyword) plans = plans.filter(p => p.title.includes(options.keyword!))
      return plans
    }
  }

  /** 获取单个备课方案 */
  async getLessonPlan(id: string): Promise<LessonPlan> {
    // 本地方案直接从 localStorage 读
    if (id.startsWith('local-')) {
      const plan = this.getLocalPlans().find(p => p.$id === id)
      if (plan) return plan
      throw new Error('Local plan not found')
    }

    const { databaseId, tableId } = this.getDatabaseAndTable()
    try {
      return (await tablesDB.getRow(databaseId, tableId, id)) as LessonPlan
    } catch (e) {
      // 降级：从本地存储中查找
      const plan = this.getLocalPlans().find(p => p.$id === id)
      if (plan) return plan
      throw e
    }
  }

  /** 获取当前教师的备课方案 */
  async getMyLessonPlans(options: LessonPlanListOptions = {}, userId?: string): Promise<LessonPlan[]> {
    const teacherId = userId || (await this.getAuthUserId())
    const { databaseId, tableId } = this.getDatabaseAndTable()
    try {
      const queries: string[] = [Query.equal('teacherId', teacherId)]
      if (options.status) queries.push(Query.equal('status', options.status))
      if (options.subject) queries.push(Query.equal('subject', options.subject))
      queries.push(Query.orderDesc('$updatedAt'))
      queries.push(Query.limit(options.limit ?? 50))
      queries.push(Query.offset(options.offset ?? 0))

      const result = await tablesDB.listRows(databaseId, tableId, queries)
      return (result?.rows || []) as LessonPlan[]
    } catch (e) {
      const plans = this.getLocalPlans().filter(p => p.teacherId === teacherId)
      return plans
    }
  }

  /** 更新备课方案 */
  async updateLessonPlan(id: string, data: LessonPlanUpdateData): Promise<LessonPlan> {
    const patch: Record<string, unknown> = {}
    if (data.title !== undefined) patch.title = data.title
    if (data.subject !== undefined) patch.subject = data.subject
    if (data.grade !== undefined) patch.grade = data.grade
    if (data.objectives !== undefined) patch.objectives = data.objectives
    if (data.content !== undefined) patch.content = data.content
    if (data.steps !== undefined) patch.steps = data.steps
    if (data.keyPoints !== undefined) patch.keyPoints = data.keyPoints
    if (data.duration !== undefined) patch.duration = data.duration
    if (data.teachingMethod !== undefined) patch.teachingMethod = data.teachingMethod
    if (data.materials !== undefined) patch.materials = data.materials
    if (data.homework !== undefined) patch.homework = data.homework
    if (data.reflection !== undefined) patch.reflection = data.reflection
    if (data.notes !== undefined) patch.notes = data.notes
    if (data.status !== undefined) patch.status = data.status

    if (id.startsWith('local-')) {
      const plans = this.getLocalPlans()
      const index = plans.findIndex(p => p.$id === id)
      if (index === -1) throw new Error('Local plan not found')
      plans[index] = { ...plans[index], ...patch, $updatedAt: new Date().toISOString() } as LessonPlan
      this.saveLocalPlans(plans)
      return plans[index]
    }

    const { databaseId, tableId } = this.getDatabaseAndTable()
    return (await tablesDB.updateRow(databaseId, tableId, id, patch)) as LessonPlan
  }

  /** 发布备课方案 */
  async publishLessonPlan(id: string): Promise<LessonPlan> {
    return this.updateLessonPlan(id, { status: 'published' })
  }

  /** 归档备课方案 */
  async archiveLessonPlan(id: string): Promise<LessonPlan> {
    return this.updateLessonPlan(id, { status: 'archived' })
  }

  /** 删除备课方案 */
  async deleteLessonPlan(id: string): Promise<boolean> {
    if (id.startsWith('local-')) {
      const plans = this.getLocalPlans().filter(p => p.$id !== id)
      this.saveLocalPlans(plans)
      return true
    }

    const { databaseId, tableId } = this.getDatabaseAndTable()
    await tablesDB.deleteRow(databaseId, tableId, id)
    return true
  }

  /** 搜索备课方案 */
  async searchLessonPlans(keyword: string): Promise<LessonPlan[]> {
    const trimmed = keyword.trim()
    if (!trimmed) return this.getMyLessonPlans()
    return this.getLessonPlans({ keyword: trimmed, limit: 50 })
  }

  /** 复制备课方案 */
  async duplicateLessonPlan(id: string): Promise<LessonPlan> {
    const original = await this.getLessonPlan(id)
    return this.createLessonPlan({
      title: `${original.title}（副本）`,
      subject: original.subject,
      grade: original.grade,
      objectives: original.objectives,
      content: original.content,
      steps: original.steps,
      keyPoints: original.keyPoints,
      duration: original.duration,
      teachingMethod: original.teachingMethod,
      materials: original.materials,
      homework: original.homework,
      reflection: original.reflection,
      notes: original.notes
    })
  }
}

const lessonPlansService = new LessonPlansService()
export default lessonPlansService
