import { ID, Permission, Query, Role } from 'appwrite'
import authService from '@/services/auth'
import privateMessagingFunctionService from '@/services/private-messaging-function'
import type {
  CreateNotificationInput,
  NotificationListItem,
  NotificationRow
} from '@/types/notification'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import { MINDGUARD_DATABASE_ID, NOTIFICATIONS_TABLE_ID } from '@/utils/appwrite-shared'

function createTypedError(message: string, code: number) {
  const error = new Error(message) as Error & { code?: number }
  error.code = code
  return error
}

class NotificationsService {
  private getDatabaseAndTable() {
    return {
      databaseId: MINDGUARD_DATABASE_ID,
      tableId: NOTIFICATIONS_TABLE_ID
    }
  }

  private async getAuthUserId() {
    const user = await authService.getCurrentUser()
    if (!user?.$id) {
      throw createTypedError('User is not authenticated', 401)
    }
    return user.$id
  }

  // MVP: use Role.users() because the actor (current user) cannot grant
  // per-user permissions to the recipient via client SDK.
  // Data isolation is enforced at query level (always filter by recipientId).
  // Production upgrade: move creation to a server-side Appwrite function.
  private buildPermissions() {
    return [
      Permission.read(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users())
    ]
  }

  private normalize(row: NotificationRow): NotificationRow {
    return {
      ...row,
      recipientId: String(row.recipientId || '').trim(),
      actorId: String(row.actorId || '').trim(),
      type: row.type || 'system',
      targetType: row.targetType || 'post',
      targetId: String(row.targetId || '').trim(),
      preview: String(row.preview || '').trim(),
      isRead: Boolean(row.isRead),
      groupKey: String(row.groupKey || '').trim()
    }
  }

  private async resolveUserMap(userIds: string[]) {
    const uniqueIds = Array.from(new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean)))
    if (!uniqueIds.length) {
      return {} as Record<string, { name: string; avatar: string }>
    }
    try {
      const result = await privateMessagingFunctionService.resolveUsers(uniqueIds)
      return result.users || {}
    } catch {
      return {} as Record<string, { name: string; avatar: string }>
    }
  }

  async createNotification(input: CreateNotificationInput) {
    if (input.recipientId === input.actorId) {
      return null
    }

    const { databaseId, tableId } = this.getDatabaseAndTable()
    const payload = {
      recipientId: String(input.recipientId || '').trim(),
      actorId: String(input.actorId || '').trim(),
      type: input.type,
      targetType: input.targetType,
      targetId: String(input.targetId || '').trim(),
      preview: String(input.preview || '').trim().slice(0, 200),
      isRead: false,
      groupKey: input.groupKey || `${input.type}:${input.targetId}`
    }

    const permissions = this.buildPermissions()
    try {
      const created = (await tablesDB.createRow(
        databaseId,
        tableId,
        ID.unique(),
        payload,
        permissions
      )) as NotificationRow
      return this.normalize(created)
    } catch (error) {
      console.error('Failed to create notification:', error)
      return null
    }
  }

  async listNotifications(options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}) {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()

    const queries: string[] = [
      Query.equal('recipientId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(options.limit ?? 30),
      Query.offset(options.offset ?? 0)
    ]

    if (options.unreadOnly) {
      queries.push(Query.equal('isRead', false))
    }

    const result = await tablesDB.listRows(databaseId, tableId, queries)
    const rows = ((result?.rows || []) as NotificationRow[]).map((row) => this.normalize(row))

    const actorIds = rows.map((row) => row.actorId).filter(Boolean)
    const userMap = await this.resolveUserMap(actorIds)

    return rows.map((row) => ({
      ...row,
      actorName: userMap[row.actorId]?.name || '',
      actorAvatar: userMap[row.actorId]?.avatar || ''
    })) as NotificationListItem[]
  }

  async getUnreadCount() {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()

    const result = await tablesDB.listRows(databaseId, tableId, [
      Query.equal('recipientId', userId),
      Query.equal('isRead', false),
      Query.limit(1)
    ])

    return result?.total ?? 0
  }

  async markAsRead(notificationId: string) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    await tablesDB.updateRow(databaseId, tableId, notificationId, { isRead: true })
  }

  async markAllAsRead() {
    const userId = await this.getAuthUserId()
    const { databaseId, tableId } = this.getDatabaseAndTable()

    const result = await tablesDB.listRows(databaseId, tableId, [
      Query.equal('recipientId', userId),
      Query.equal('isRead', false),
      Query.limit(100)
    ])

    const rows = (result?.rows || []) as NotificationRow[]
    await Promise.all(
      rows.map(async (row) => {
        try {
          await tablesDB.updateRow(databaseId, tableId, row.$id, { isRead: true })
        } catch (error) {
          console.error(`Failed to mark notification ${row.$id} as read:`, error)
        }
      })
    )
  }

  async deleteNotification(notificationId: string) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    await tablesDB.deleteRow(databaseId, tableId, notificationId)
  }
}

const notificationsService = new NotificationsService()
export default notificationsService
