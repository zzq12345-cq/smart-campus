import { ID, Permission, Query, Role } from 'appwrite'
import authService from '@/services/auth'
import pushSchedulerService from '@/services/push-scheduler'
import type {
  MarketItem,
  MarketItemCategory,
  MarketItemCreateData,
  MarketItemStatus
} from '@/types/market-item'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import { MINDGUARD_DATABASE_ID, MARKET_ITEMS_TABLE_ID } from '@/utils/appwrite-shared'

export interface MarketItemListOptions {
  category?: MarketItemCategory | 'all'
  status?: MarketItemStatus
  limit?: number
  offset?: number
}

class MarketItemsService {
  private getDatabaseAndTable() {
    return {
      databaseId: MINDGUARD_DATABASE_ID,
      tableId: MARKET_ITEMS_TABLE_ID
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

  private buildItemPermissions(authorId: string) {
    return [
      Permission.read(Role.any()),
      Permission.update(Role.user(authorId)),
      Permission.delete(Role.user(authorId))
    ]
  }

  async createItem(data: MarketItemCreateData, userId?: string) {
    const authorId = userId || (await this.getAuthUserId())
    const { databaseId, tableId } = this.getDatabaseAndTable()

    const payload = {
      authorId,
      title: data.title,
      description: data.description,
      price: data.price,
      condition: data.condition,
      category: data.category,
      images: data.images || [],
      status: 'available' as MarketItemStatus,
      contactNote: data.contactNote || '',
      viewCount: 0
    }
    const permissions = this.buildItemPermissions(authorId)
    return (await tablesDB.createRow(databaseId, tableId, ID.unique(), payload, permissions)) as MarketItem
  }

  async getItems(options: MarketItemListOptions = {}) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const queries: string[] = []

    queries.push(Query.equal('status', (options.status || 'available') as string))

    if (options.category && options.category !== 'all') {
      queries.push(Query.equal('category', options.category))
    }

    queries.push(Query.orderDesc('$createdAt'))
    queries.push(Query.limit(options.limit ?? 20))
    queries.push(Query.offset(options.offset ?? 0))

    const result = await tablesDB.listRows(databaseId, tableId, queries)
    return (result?.rows || []) as MarketItem[]
  }

  async getItem(id: string) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    return (await tablesDB.getRow(databaseId, tableId, id)) as MarketItem
  }

  async getMyItems(userId?: string) {
    const authorId = userId || (await this.getAuthUserId())
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const queries: string[] = [
      Query.equal('authorId', authorId),
      Query.orderDesc('$createdAt'),
      Query.limit(100)
    ]
    const result = await tablesDB.listRows(databaseId, tableId, queries)
    return (result?.rows || []) as MarketItem[]
  }

  async updateItemStatus(id: string, status: MarketItemStatus) {
    const { databaseId, tableId } = this.getDatabaseAndTable()

    // Get current item to access author info and previous status
    const currentItem = await this.getItem(id)

    // Update status
    const updated = (await tablesDB.updateRow(databaseId, tableId, id, { status })) as MarketItem

    // Trigger notification if status changed to sold or reserved
    if (status !== currentItem.status && (status === 'sold' || status === 'reserved')) {
      const statusText = status === 'sold' ? '已售出' : '已预留'
      pushSchedulerService.scheduleOrderStatusReminders(
        id,
        currentItem.authorId,
        statusText,
        currentItem.title
      ).catch(() => {
        // Silent error handling - don't interrupt main flow
      })
    }

    return updated
  }

  async deleteItem(id: string) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    await tablesDB.deleteRow(databaseId, tableId, id)
    return true
  }

  async incrementViewCount(id: string, currentCount: number) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    try {
      await tablesDB.updateRow(databaseId, tableId, id, { viewCount: currentCount + 1 })
    } catch {
      // silently ignore permission errors on view count
    }
  }

  async searchItems(keyword: string) {
    const { databaseId, tableId } = this.getDatabaseAndTable()
    const trimmed = keyword.trim()
    if (!trimmed) {
      return this.getItems()
    }

    const queries: string[] = [
      Query.equal('status', 'available'),
      Query.contains('title', trimmed),
      Query.orderDesc('$createdAt'),
      Query.limit(50)
    ]

    const result = await tablesDB.listRows(databaseId, tableId, queries)
    return (result?.rows || []) as MarketItem[]
  }
}

const marketItemsService = new MarketItemsService()
export default marketItemsService
