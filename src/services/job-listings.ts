import { ID, Permission, Query, Role } from 'appwrite'
import authService from '@/services/auth'
import type {
  JobListing,
  JobListingCreateData,
  JobListingListOptions,
  JobCategory,
  JobStatus
} from '@/types/job-listing'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import { MINDGUARD_DATABASE_ID, JOB_LISTINGS_TABLE_ID } from '@/utils/appwrite-shared'

const CATEGORY_SET: Set<JobCategory> = new Set([
  'campus_job',
  'part_time',
  'internship',
  'volunteer'
])

class JobListingsService {
  private getDatabaseAndTable() {
    return {
      databaseId: MINDGUARD_DATABASE_ID,
      tableId: JOB_LISTINGS_TABLE_ID
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

  async createListing(data: JobListingCreateData, userId?: string) {
    const authorId = userId || (await this.getAuthUserId())
    const { databaseId, tableId } = this.getDatabaseAndTable()

    if (!CATEGORY_SET.has(data.category)) {
      throw new Error(`Invalid category: ${data.category}`)
    }

    const payload: Record<string, unknown> = {
      authorId,
      title: data.title,
      description: data.description,
      salary: data.salary,
      workTime: data.workTime,
      location: data.location,
      contactInfo: data.contactInfo,
      requirements: data.requirements || '',
      category: data.category,
      status: 'recruiting' as JobStatus
    }
    if (data.deadline) {
      payload.deadline = data.deadline
    }

    const permissions = this.buildPermissions(authorId)
    return (await tablesDB.createRow(
      databaseId,
      tableId,
      ID.unique(),
      payload,
      permissions
    )) as JobListing
  }

  async getListings(options: JobListingListOptions = {}) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const queries: string[] = []

    if (options.status) {
      queries.push(Query.equal('status', options.status))
    }

    if (options.category && options.category !== 'all') {
      queries.push(Query.equal('category', options.category))
    }

    queries.push(Query.orderDesc('$createdAt'))
    queries.push(Query.limit(options.limit ?? 20))
    queries.push(Query.offset(options.offset ?? 0))

    const result = await tablesDB.listRows(databaseId, tableId, queries)
    return (result?.rows || []) as JobListing[]
  }

  async getListing(id: string) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    return (await tablesDB.getRow(databaseId, tableId, id)) as JobListing
  }

  async getMyListings(userId?: string) {
    const authorId = userId || (await this.getAuthUserId())
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const queries: string[] = [
      Query.equal('authorId', authorId),
      Query.orderDesc('$createdAt'),
      Query.limit(100)
    ]
    const result = await tablesDB.listRows(databaseId, tableId, queries)
    return (result?.rows || []) as JobListing[]
  }

  async updateStatus(id: string, status: JobStatus) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    return (await tablesDB.updateRow(databaseId, tableId, id, { status })) as JobListing
  }

  async deleteListing(id: string) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    await tablesDB.deleteRow(databaseId, tableId, id)
    return true
  }

  async searchListings(keyword: string) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const trimmed = keyword.trim()
    if (!trimmed) {
      return this.getListings()
    }

    const queries: string[] = [
      Query.contains('title', trimmed),
      Query.orderDesc('$createdAt'),
      Query.limit(50)
    ]

    const result = await tablesDB.listRows(databaseId, tableId, queries)
    return (result?.rows || []) as JobListing[]
  }
}

const jobListingsService = new JobListingsService()
export default jobListingsService
