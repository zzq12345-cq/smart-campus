import { ID, Permission, Query, Role } from 'appwrite'
import authService from '@/services/auth'
import type { MaterialType, StudyMaterial, StudyMaterialCreateData } from '@/types/study-material'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import { MINDGUARD_DATABASE_ID, STUDY_MATERIALS_TABLE_ID } from '@/utils/appwrite-shared'

export interface StudyMaterialListOptions {
  materialType?: MaterialType | 'all'
  subject?: string
  limit?: number
  offset?: number
}

class StudyMaterialsService {
  private getDatabaseAndTable() {
    return {
      databaseId: MINDGUARD_DATABASE_ID,
      tableId: STUDY_MATERIALS_TABLE_ID
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

  private buildPermissions(authorId: string) {
    return [
      Permission.read(Role.any()),
      Permission.update(Role.user(authorId)),
      Permission.delete(Role.user(authorId))
    ]
  }

  async createMaterial(data: StudyMaterialCreateData, userId?: string) {
    const authorId = userId || (await this.getAuthUserId())
    const { databaseId, tableId } = this.getDatabaseAndTable()

    const payload = {
      authorId,
      title: data.title,
      description: data.description,
      subject: data.subject,
      materialType: data.materialType,
      fileIds: data.fileIds,
      fileNames: data.fileNames,
      downloadCount: 0,
      likeCount: 0,
      tags: data.tags || []
    }
    const permissions = this.buildPermissions(authorId)
    return (await tablesDB.createRow(
      databaseId,
      tableId,
      ID.unique(),
      payload,
      permissions
    )) as StudyMaterial
  }

  async getMaterials(options: StudyMaterialListOptions = {}) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const queries: string[] = []

    if (options.materialType && options.materialType !== 'all') {
      queries.push(Query.equal('materialType', options.materialType))
    }
    if (options.subject?.trim()) {
      queries.push(Query.equal('subject', options.subject.trim()))
    }

    queries.push(Query.orderDesc('$createdAt'))
    queries.push(Query.limit(options.limit ?? 20))
    queries.push(Query.offset(options.offset ?? 0))

    const result = await tablesDB.listRows(databaseId, tableId, queries)
    return (result?.rows || []) as StudyMaterial[]
  }

  async getMaterial(id: string) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    return (await tablesDB.getRow(databaseId, tableId, id)) as StudyMaterial
  }

  async getMyMaterials(userId?: string) {
    const authorId = userId || (await this.getAuthUserId())
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const queries: string[] = [
      Query.equal('authorId', authorId),
      Query.orderDesc('$createdAt'),
      Query.limit(100)
    ]
    const result = await tablesDB.listRows(databaseId, tableId, queries)
    return (result?.rows || []) as StudyMaterial[]
  }

  async deleteMaterial(id: string) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    await tablesDB.deleteRow(databaseId, tableId, id)
    return true
  }

  async incrementDownloadCount(id: string, currentCount: number) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    try {
      await tablesDB.updateRow(databaseId, tableId, id, {
        downloadCount: currentCount + 1
      })
    } catch {
      // silently ignore permission errors
    }
  }

  async incrementLikeCount(id: string, currentCount: number) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    try {
      await tablesDB.updateRow(databaseId, tableId, id, {
        likeCount: currentCount + 1
      })
    } catch {
      // silently ignore permission errors
    }
  }

  async searchMaterials(keyword: string) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const trimmed = keyword.trim()
    if (!trimmed) {
      return this.getMaterials()
    }

    const queries: string[] = [
      Query.contains('title', trimmed),
      Query.orderDesc('$createdAt'),
      Query.limit(50)
    ]

    const result = await tablesDB.listRows(databaseId, tableId, queries)
    return (result?.rows || []) as StudyMaterial[]
  }
}

const studyMaterialsService = new StudyMaterialsService()
export default studyMaterialsService
