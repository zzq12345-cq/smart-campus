import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import pointsService from '@/services/points'
import { AI_COSTS, DAILY_TASKS, ROBOT_FREE_DEFAULTS } from '@/data/points-constants'
import type { DailyTaskId, PointTransaction, RobotInventoryItem, RobotItemType, RobotSkinId, UserAchievement } from '@/types/points'

export const usePointsStore = defineStore('points', () => {
  const balance = ref(0)
  const totalEarned = ref(0)
  const totalSpent = ref(0)
  const dailyTaskStatus = ref<Record<string, boolean>>({})
  const achievements = ref<UserAchievement[]>([])
  const robotInventory = ref<RobotInventoryItem[]>([])
  const transactions = ref<PointTransaction[]>([])
  const loading = ref(false)
  const initialized = ref(false)

  const todayPoints = computed(() =>
    DAILY_TASKS.reduce((sum, task) => dailyTaskStatus.value[task.id] ? sum + task.points : sum, 0)
  )

  const todayMaxPoints = computed(() =>
    DAILY_TASKS.reduce((sum, task) => sum + task.points, 0)
  )

  const completedTaskCount = computed(() =>
    DAILY_TASKS.filter(t => dailyTaskStatus.value[t.id]).length
  )

  const ownedSkinIds = computed(() =>
    robotInventory.value
      .filter(i => i.itemType === 'skin')
      .map(i => i.itemId as RobotSkinId)
  )

  const equippedSkinId = computed<RobotSkinId>(() => {
    const active = robotInventory.value.find(
      i => i.itemType === 'skin' && i.isActive
    )
    return (active?.itemId as RobotSkinId) || 'default'
  })

  function ownsSkin(skinId: RobotSkinId): boolean {
    return skinId === 'default' || ownedSkinIds.value.includes(skinId)
  }

  function isSkinEquipped(skinId: RobotSkinId): boolean {
    return equippedSkinId.value === skinId
  }

  async function init(userId: string) {
    loading.value = true
    try {
      await pointsService.ensureBalance(userId)
      const balanceRow = await pointsService.getBalanceRow(userId)
      if (balanceRow) {
        balance.value = balanceRow.balance
        totalEarned.value = balanceRow.totalEarned
        totalSpent.value = balanceRow.totalSpent
      }
      const [tasks, achs, inv, txns] = await Promise.allSettled([
        pointsService.getDailyTaskStatus(userId),
        pointsService.listAchievements(userId),
        pointsService.getRobotInventory(userId),
        pointsService.listTransactions(userId)
      ])
      if (tasks.status === 'fulfilled') dailyTaskStatus.value = tasks.value
      if (achs.status === 'fulfilled') achievements.value = achs.value
      if (inv.status === 'fulfilled') robotInventory.value = inv.value
      if (txns.status === 'fulfilled') transactions.value = txns.value
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  async function refreshBalance(userId: string) {
    const row = await pointsService.getBalanceRow(userId)
    if (row) {
      balance.value = row.balance
      totalEarned.value = row.totalEarned
      totalSpent.value = row.totalSpent
    }
  }

  async function refreshDailyTasks(userId: string) {
    dailyTaskStatus.value = await pointsService.getDailyTaskStatus(userId)
  }

  async function refreshAchievements(userId: string) {
    achievements.value = await pointsService.listAchievements(userId)
  }

  async function refreshRobotInventory(userId: string) {
    robotInventory.value = await pointsService.getRobotInventory(userId)
  }

  async function refreshTransactions(userId: string) {
    transactions.value = await pointsService.listTransactions(userId)
  }

  async function completeDailyTask(userId: string, taskId: DailyTaskId): Promise<boolean> {
    const task = DAILY_TASKS.find(t => t.id === taskId)
    if (!task) return false
    const done = await pointsService.completeDailyTask(userId, taskId, task.points, `Daily task: ${taskId}`)
    if (done) {
      dailyTaskStatus.value[taskId] = true
      balance.value += task.points
      totalEarned.value += task.points
    }
    return done
  }

  async function checkAndUnlockAchievement(userId: string, achievementId: string, incrementBy?: number) {
    const result = await pointsService.checkAchievement(userId, achievementId, incrementBy)
    if (result.unlocked) {
      await refreshBalance(userId)
      await refreshAchievements(userId)
    }
    return result
  }

  async function spendForAi(
    userId: string,
    costType: keyof typeof AI_COSTS,
    description: string
  ): Promise<boolean> {
    const amount = AI_COSTS[costType]
    if (!(await pointsService.canAfford(userId, amount))) return false
    const result = await pointsService.spendPoints({
      userId, amount, type: 'ai_analysis',
      refId: `ai:${costType}:${Date.now()}`, description
    })
    if (result) {
      balance.value -= amount
      totalSpent.value += amount
      return true
    }
    return false
  }

  async function purchaseRobotItem(userId: string, itemType: RobotItemType, itemId: string, cost: number): Promise<boolean> {
    const result = await pointsService.purchaseRobotItem(userId, itemType, itemId, cost)
    if (result) {
      balance.value -= cost
      totalSpent.value += cost
      await refreshRobotInventory(userId)
      return true
    }
    return false
  }

  async function equipRobotItem(userId: string, itemType: RobotItemType, itemId: string) {
    await pointsService.equipRobotItem(userId, itemType, itemId)
    await refreshRobotInventory(userId)
  }

  return {
    balance, totalEarned, totalSpent,
    dailyTaskStatus, achievements, robotInventory, transactions,
    loading, initialized,
    todayPoints, todayMaxPoints, completedTaskCount,
    ownedSkinIds, equippedSkinId,
    init, refreshBalance, refreshDailyTasks, refreshAchievements,
    refreshRobotInventory, refreshTransactions,
    completeDailyTask, checkAndUnlockAchievement, spendForAi,
    purchaseRobotItem, equipRobotItem,
    ownsSkin, isSkinEquipped
  }
})
