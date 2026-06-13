import { ID, Permission, Query, Role } from 'appwrite'
import { tablesDBProxy as tablesDB } from '@/utils/appwrite-proxy'
import { UNISMART_DATABASE_ID } from '@/utils/appwrite-shared'
import {
  POINT_BALANCES_TABLE_ID,
  POINT_TRANSACTIONS_TABLE_ID,
  USER_ACHIEVEMENTS_TABLE_ID,
  ROBOT_INVENTORY_TABLE_ID
} from '@/utils/appwrite-shared'
import { INITIAL_POINTS, ACHIEVEMENTS, ROBOT_FREE_DEFAULTS } from '@/data/points-constants'
import type {
  PointBalance,
  PointTransaction,
  PointTransactionType,
  UserAchievement,
  RobotInventoryItem,
  RobotItemType,
  DailyTaskId
} from '@/types/points'

class PointsService {
  private perms(userId: string) {
    return [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId))
    ]
  }

  private todayStr() {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // ---- balance ----

  async ensureBalance(userId: string): Promise<void> {
    const existing = await this.getBalanceRow(userId)
    if (existing) return
    await tablesDB.createRow(
      UNISMART_DATABASE_ID, POINT_BALANCES_TABLE_ID, userId,
      { balance: INITIAL_POINTS, totalEarned: INITIAL_POINTS, totalSpent: 0 },
      this.perms(userId)
    )
    await this.createTxn(userId, INITIAL_POINTS, 'sign_up_bonus', 'sign_up_bonus', 'Sign-up bonus')
  }

  async getBalanceRow(userId: string): Promise<PointBalance | null> {
    try {
      return (await tablesDB.getRow(UNISMART_DATABASE_ID, POINT_BALANCES_TABLE_ID, userId)) as PointBalance
    } catch {
      return null
    }
  }

  async canAfford(userId: string, amount: number): Promise<boolean> {
    const row = await this.getBalanceRow(userId)
    return (row?.balance ?? 0) >= amount
  }

  // ---- transactions ----

  private async createTxn(
    userId: string, amount: number, type: PointTransactionType,
    refId: string, description: string
  ): Promise<PointTransaction> {
    return (await tablesDB.createRow(
      UNISMART_DATABASE_ID, POINT_TRANSACTIONS_TABLE_ID, ID.unique(),
      { userId, amount, type, refId, description },
      [Permission.read(Role.user(userId)), Permission.delete(Role.user(userId))]
    )) as PointTransaction
  }

  async awardPoints(input: {
    userId: string; amount: number; type: PointTransactionType; refId: string; description: string
  }): Promise<void> {
    const { userId, amount } = input
    await tablesDB.incrementRowColumn(UNISMART_DATABASE_ID, POINT_BALANCES_TABLE_ID, userId, 'balance', amount)
    await tablesDB.incrementRowColumn(UNISMART_DATABASE_ID, POINT_BALANCES_TABLE_ID, userId, 'totalEarned', amount)
    await this.createTxn(input.userId, input.amount, input.type, input.refId, input.description)
  }

  async spendPoints(input: {
    userId: string; amount: number; type: PointTransactionType; refId: string; description: string
  }): Promise<PointTransaction | null> {
    const { userId, amount, type, refId, description } = input
    if (!(await this.canAfford(userId, amount))) return null
    await tablesDB.decrementRowColumn(UNISMART_DATABASE_ID, POINT_BALANCES_TABLE_ID, userId, 'balance', amount, 0)
    await tablesDB.incrementRowColumn(UNISMART_DATABASE_ID, POINT_BALANCES_TABLE_ID, userId, 'totalSpent', amount)
    return this.createTxn(userId, -amount, type, refId, description)
  }

  async listTransactions(userId: string, options: { limit?: number; offset?: number } = {}): Promise<PointTransaction[]> {
    const result = await tablesDB.listRows(
      UNISMART_DATABASE_ID, POINT_TRANSACTIONS_TABLE_ID,
      [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(options.limit ?? 20),
        Query.offset(options.offset ?? 0)
      ]
    )
    return (result?.rows ?? []) as PointTransaction[]
  }

  // ---- daily tasks ----

  async getDailyTaskStatus(userId: string): Promise<Record<string, boolean>> {
    const today = this.todayStr()
    const result = await tablesDB.listRows(
      UNISMART_DATABASE_ID, POINT_TRANSACTIONS_TABLE_ID,
      [
        Query.equal('userId', userId),
        Query.equal('type', 'daily_task'),
        Query.startsWith('refId', today),
        Query.limit(20)
      ]
    )
    const status: Record<string, boolean> = {}
    for (const row of (result?.rows ?? []) as PointTransaction[]) {
      const parts = row.refId.split(':')
      if (parts.length >= 2) status[parts[1]] = true
    }
    return status
  }

  async completeDailyTask(
    userId: string, taskId: DailyTaskId, points: number, description: string
  ): Promise<boolean> {
    const today = this.todayStr()
    const refId = `${today}:${taskId}`
    const existing = await tablesDB.listRows(
      UNISMART_DATABASE_ID, POINT_TRANSACTIONS_TABLE_ID,
      [Query.equal('userId', userId), Query.equal('refId', refId), Query.limit(1)]
    )
    if ((existing?.rows?.length ?? 0) > 0) return false
    await this.awardPoints({ userId, amount: points, type: 'daily_task', refId, description })
    return true
  }

  // ---- achievements ----

  async checkAchievement(
    userId: string, achievementId: string, incrementBy: number = 1
  ): Promise<{ unlocked: boolean; progress: number; target: number }> {
    const definition = ACHIEVEMENTS.find(a => a.id === achievementId)
    if (!definition) return { unlocked: false, progress: 0, target: 0 }

    const result = await tablesDB.listRows(
      UNISMART_DATABASE_ID, USER_ACHIEVEMENTS_TABLE_ID,
      [Query.equal('userId', userId), Query.equal('achievementId', achievementId), Query.limit(1)]
    )
    const rows = result?.rows ?? []
    let progress: number
    let rowId: string

    if (rows.length > 0) {
      const existing = rows[0] as UserAchievement
      rowId = existing.$id
      if (existing.unlocked) return { unlocked: true, progress: existing.progress, target: existing.target }
      progress = Math.min(existing.progress + incrementBy, definition.target)
      await tablesDB.updateRow(
        UNISMART_DATABASE_ID, USER_ACHIEVEMENTS_TABLE_ID, rowId,
        { progress }, this.perms(userId)
      )
    } else {
      progress = Math.min(incrementBy, definition.target)
      const created = (await tablesDB.createRow(
        UNISMART_DATABASE_ID, USER_ACHIEVEMENTS_TABLE_ID, ID.unique(),
        { userId, achievementId, progress, target: definition.target, unlocked: false },
        this.perms(userId)
      )) as UserAchievement
      rowId = created.$id
    }

    if (progress >= definition.target) {
      await tablesDB.updateRow(
        UNISMART_DATABASE_ID, USER_ACHIEVEMENTS_TABLE_ID, rowId,
        { unlocked: true, unlockedAt: new Date().toISOString() }, this.perms(userId)
      )
      await this.awardPoints({
        userId, amount: definition.points, type: 'achievement',
        refId: `achievement:${achievementId}`, description: `Achievement: ${achievementId}`
      })
      return { unlocked: true, progress, target: definition.target }
    }

    return { unlocked: false, progress, target: definition.target }
  }

  async listAchievements(userId: string): Promise<UserAchievement[]> {
    const result = await tablesDB.listRows(
      UNISMART_DATABASE_ID, USER_ACHIEVEMENTS_TABLE_ID,
      [Query.equal('userId', userId), Query.limit(50)]
    )
    return (result?.rows ?? []) as UserAchievement[]
  }

  // ---- robot inventory ----

  async getRobotInventory(userId: string): Promise<RobotInventoryItem[]> {
    const result = await tablesDB.listRows(
      UNISMART_DATABASE_ID, ROBOT_INVENTORY_TABLE_ID,
      [Query.equal('userId', userId), Query.limit(20)]
    )
    return (result?.rows ?? []) as RobotInventoryItem[]
  }

  async purchaseRobotItem(
    userId: string, itemType: RobotItemType, itemId: string, cost: number
  ): Promise<RobotInventoryItem | null> {
    if (ROBOT_FREE_DEFAULTS[itemType] === itemId) return null
    const inv = await this.getRobotInventory(userId)
    if (inv.some(i => i.itemType === itemType && i.itemId === itemId)) return null

    const spent = await this.spendPoints({
      userId, amount: cost, type: 'robot_purchase',
      refId: `robot:${itemType}:${itemId}`, description: `Robot ${itemType}: ${itemId}`
    })
    if (!spent) return null

    try {
      return (await tablesDB.createRow(
        UNISMART_DATABASE_ID, ROBOT_INVENTORY_TABLE_ID, ID.unique(),
        { userId, itemType, itemId, isActive: false }, this.perms(userId)
      )) as RobotInventoryItem
    } catch (e) {
      // Rollback: refund points if inventory creation fails
      await this.awardPoints({
        userId, amount: cost, type: 'robot_purchase_refund',
        refId: `robot:refund:${itemType}:${itemId}`, description: `Refund: robot ${itemType} purchase failed`
      }).catch(() => undefined)
      return null
    }
  }

  async equipRobotItem(userId: string, itemType: RobotItemType, itemId: string): Promise<void> {
    const inventory = await this.getRobotInventory(userId)
    // Check if target item exists in inventory (or is a free default)
    const isDefault = ROBOT_FREE_DEFAULTS[itemType] === itemId
    const target = inventory.find(i => i.itemType === itemType && i.itemId === itemId)
    if (!target && !isDefault) {
      throw new Error(`Item ${itemType}:${itemId} not found in inventory`)
    }

    for (const item of inventory) {
      if (item.itemType === itemType && item.isActive) {
        await tablesDB.updateRow(
          UNISMART_DATABASE_ID, ROBOT_INVENTORY_TABLE_ID, item.$id,
          { isActive: false }, this.perms(userId)
        )
      }
    }
    if (target) {
      await tablesDB.updateRow(
        UNISMART_DATABASE_ID, ROBOT_INVENTORY_TABLE_ID, target.$id,
        { isActive: true }, this.perms(userId)
      )
    }
    const settings = uni.getStorageSync('mine.robot-settings') || {}
    settings[itemType] = itemId
    uni.setStorageSync('mine.robot-settings', settings)
  }
}

const pointsService = new PointsService()
export default pointsService
