import { Query } from 'appwrite'
import authService from '@/services/auth'
import followsFunctionService from '@/services/follows-function'
import notificationsService from '@/services/notifications'
import type { Follow } from '@/types/follow'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import {
  FOLLOWS_TABLE_ID,
  MINDGUARD_DATABASE_ID
} from '@/utils/appwrite-shared'

function createTypedError(message: string, code: number) {
  const error = new Error(message) as Error & { code?: number }
  error.code = code
  return error
}

class FollowsService {
  private getDatabaseAndTable() {
    return {
      databaseId: MINDGUARD_DATABASE_ID,
      tableId: FOLLOWS_TABLE_ID
    }
  }

  private async getAuthUserId() {
    const user = await authService.getCurrentUser()
    if (!user?.$id) {
      throw createTypedError('User is not authenticated', 401)
    }
    return user.$id
  }

  async followUser(targetUserId: string) {
    const currentUserId = await this.getAuthUserId()
    const normalizedTarget = String(targetUserId || '').trim()
    if (!normalizedTarget) {
      throw createTypedError('Target user ID is required', 400)
    }
    if (normalizedTarget === currentUserId) {
      throw createTypedError('Cannot follow yourself', 400)
    }
    const result = await followsFunctionService.followUser({ targetUserId: normalizedTarget })

    notificationsService.createNotification({
      recipientId: normalizedTarget,
      actorId: currentUserId,
      type: 'follow',
      targetType: 'user',
      targetId: normalizedTarget
    }).catch(() => undefined)

    return result.follow
  }

  async unfollowUser(targetUserId: string) {
    const currentUserId = await this.getAuthUserId()
    const normalizedTarget = String(targetUserId || '').trim()
    if (!normalizedTarget) {
      throw createTypedError('Target user ID is required', 400)
    }
    if (normalizedTarget === currentUserId) {
      throw createTypedError('Cannot unfollow yourself', 400)
    }
    const result = await followsFunctionService.unfollowUser({ targetUserId: normalizedTarget })
    return result.removed
  }

  async isFollowing(targetUserId: string, followerId?: string) {
    const effectiveFollower = followerId || (await this.getAuthUserId())
    const record = await this.getFollowRecord(effectiveFollower, String(targetUserId || '').trim())
    return !!record
  }

  async getFollowers(userId: string, limit = 20, offset = 0) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const result = await tablesDB.listRows(databaseId, tableId, [
      Query.equal('followingId', String(userId || '').trim()),
      Query.orderDesc('$createdAt'),
      Query.limit(limit),
      Query.offset(offset)
    ])
    return (result?.rows || []) as Follow[]
  }

  async getFollowing(userId: string, limit = 20, offset = 0) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const result = await tablesDB.listRows(databaseId, tableId, [
      Query.equal('followerId', String(userId || '').trim()),
      Query.orderDesc('$createdAt'),
      Query.limit(limit),
      Query.offset(offset)
    ])
    return (result?.rows || []) as Follow[]
  }

  private async getFollowRecord(followerId: string, followingId: string): Promise<Follow | null> {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const result = await tablesDB.listRows(databaseId, tableId, [
      Query.equal('followerId', followerId),
      Query.equal('followingId', followingId),
      Query.limit(1)
    ])
    const rows = (result?.rows || []) as Follow[]
    return rows.length > 0 ? rows[0] : null
  }
}

const followsService = new FollowsService()
export default followsService
